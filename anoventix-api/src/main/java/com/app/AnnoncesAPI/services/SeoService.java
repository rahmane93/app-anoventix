package com.app.AnnoncesAPI.services;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.Utilities.Utility;
import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.enums.StatutVerificationEntreprise;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.services.SharePageService.MetaPartage;
import com.app.AnnoncesAPI.services.SharePageService.SharePage;

/**
 * Référencement, bases (DEC-24, RG-12-22, RG-12-23) : {@code sitemap.xml} généré par l'API (régénéré au plus
 * toutes les heures), {@code robots.txt} et aperçu de partage des pages d'agence.
 */
@Service
public class SeoService {

    /** Limite du protocole sitemap : 50 000 URL par fichier. */
    static final int URLS_MAX = 50_000;
    static final Duration VALIDITE_SITEMAP = Duration.ofHours(1);
    private static final String GABARIT_AGENCE = "entreprise-publique/[entrepriseId].html";
    private static final DateTimeFormatter DATE_W3C = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final BienImmoRepository annonces;
    private final EntrepriseRepository entreprises;
    private final SharePageService partage;

    private volatile Instant sitemapGenereLe;
    private volatile String sitemap;

    public SeoService(BienImmoRepository annonces, EntrepriseRepository entreprises, SharePageService partage) {
        this.annonces = annonces;
        this.entreprises = entreprises;
        this.partage = partage;
    }

    // ── sitemap.xml ────────────────────────────────────────────────────────

    /** URL canoniques des annonces visibles, des agences vérifiées et des pages légales. */
    public String sitemap() {
        Instant maintenant = Instant.now();
        String courant = sitemap;
        if (courant != null && sitemapGenereLe != null && sitemapGenereLe.plus(VALIDITE_SITEMAP).isAfter(maintenant)) {
            return courant;
        }
        synchronized (this) {
            if (sitemap == null || sitemapGenereLe == null || !sitemapGenereLe.plus(VALIDITE_SITEMAP).isAfter(maintenant)) {
                sitemap = genererSitemap();
                sitemapGenereLe = maintenant;
            }
            return sitemap;
        }
    }

    /** Force la régénération au prochain appel (tests, publication d'un lot). */
    public void invalider() {
        sitemapGenereLe = null;
    }

    @Transactional(readOnly = true)
    String genererSitemap() {
        String site = partage.urlSite();
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        int total = 0;
        for (String page : List.of("/", "/cgu", "/confidentialite", "/mentions-legales")) {
            ajouter(xml, site + page, null);
            total++;
        }
        for (Entreprise agence : entreprises.findByStatutVerificationAndActiveTrue(StatutVerificationEntreprise.VERIFIEE)) {
            if (total >= URLS_MAX) break;
            ajouter(xml, site + "/entreprise-publique/" + agence.getId(), agence.getDateModification());
            total++;
        }
        List<BienImmo> visibles = annonces.findByVisiblePublicTrue(
                PageRequest.of(0, Math.max(0, URLS_MAX - total), Sort.by(Sort.Direction.DESC, "dateModification"))).getContent();
        for (BienImmo a : visibles) {
            ajouter(xml, site + "/annonce/" + SharePageService.segmentCanonique(a), a.getDateModification());
        }
        return xml.append("</urlset>\n").toString();
    }

    private static void ajouter(StringBuilder xml, String url, LocalDateTime modifie) {
        xml.append("  <url><loc>").append(Utility.escapeHtml(url)).append("</loc>");
        if (modifie != null) {
            xml.append("<lastmod>").append(modifie.atOffset(ZoneOffset.UTC).format(DATE_W3C)).append("</lastmod>");
        }
        xml.append("</url>\n");
    }

    // ── robots.txt ─────────────────────────────────────────────────────────

    public String robots() {
        return "User-agent: *\n"
                + "Disallow: /administration/\n"
                + "Disallow: /messagerie/\n"
                + "Disallow: /conversation/\n"
                + "Disallow: /api/\n"
                + "Disallow: /uploads/private/\n"
                + "Sitemap: " + partage.urlSite() + "/sitemap.xml\n";
    }

    // ── Aperçu de partage d'une agence ─────────────────────────────────────

    /**
     * Page d'une agence avec ses balises Open Graph : nom, photo, nombre d'annonces en ligne et badge
     * « Agence vérifiée ». Une agence inconnue ou désactivée reçoit la page générique (le site affichera
     * « Cette agence n'est plus disponible »).
     */
    @Transactional(readOnly = true)
    public SharePage renderAgence(String identifiant) {
        String gabarit = partage.gabarit(GABARIT_AGENCE);
        Optional<Entreprise> agence = lire(identifiant).filter(e -> !Boolean.FALSE.equals(e.getActive()));
        if (agence.isEmpty()) {
            return new SharePage.Html(gabarit, false);
        }
        Entreprise e = agence.get();
        long enLigne = annonces.findByOwnerEntrepriseIdAndVisiblePublicTrue(e.getId(), PageRequest.of(0, 1)).getTotalElements();
        List<String> faits = new ArrayList<>();
        if (e.getStatutVerification() == StatutVerificationEntreprise.VERIFIEE) {
            faits.add("Agence vérifiée");
        }
        faits.add(enLigne + (enLigne > 1 ? " annonces en ligne" : " annonce en ligne"));
        if (e.getAdresse() != null && !e.getAdresse().isBlank()) {
            faits.add(e.getAdresse().trim());
        }
        String resume = String.join(" · ", faits);
        String texte = e.getDescription() == null ? "" : e.getDescription().replaceAll("\\s+", " ").trim();
        String description = texte.isEmpty() ? resume : resume + " — " + texte;
        if (description.length() > 200) {
            description = description.substring(0, 199).trim() + "…";
        }
        String url = partage.urlSite() + "/entreprise-publique/" + e.getId();
        Optional<String> photo = e.getPhotoProfil() == null || e.getPhotoProfil().isBlank()
                ? Optional.empty() : Optional.of(partage.urlMedia(e.getPhotoProfil()));
        return new SharePage.Html(partage.injecterMeta(gabarit,
                new MetaPartage(e.getNom(), e.getNom() + " | AnoventiX", description, url, photo)), true);
    }

    private Optional<Entreprise> lire(String identifiant) {
        try {
            return entreprises.findById(UUID.fromString(identifiant));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
