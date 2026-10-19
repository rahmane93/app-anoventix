package com.app.AnnoncesAPI.services;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.Utilities.Utility;
import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;

/**
 * Page web d'une annonce partagée sur les réseaux sociaux.
 *
 * <p>Le site est un export statique Expo : toutes les annonces partagent le même fichier
 * {@code annonce/[id].html}, complété côté navigateur. Les robots d'aperçu (Facebook,
 * WhatsApp, LinkedIn, X…) n'exécutent pas le JavaScript : ce service sert donc ce même
 * fichier en y injectant les balises Open Graph de l'annonce. Le HTML est identique pour
 * tous les visiteurs (pas de détection d'user-agent) ; l'app s'hydrate ensuite normalement.
 */
@Service
public class SharePageService {

    private static final Logger log = LoggerFactory.getLogger(SharePageService.class);

    private static final String TEMPLATE_RELATIVE_PATH = "annonce/[id].html";
    private static final int DESCRIPTION_MAX_LENGTH = 200;
    private static final Pattern TITLE_TAG = Pattern.compile("<title[^>]*>.*?</title>", Pattern.DOTALL);
    private static final Pattern DESCRIPTION_META = Pattern.compile("<meta\\s+name=\"description\"[^>]*>");
    private static final Pattern HEAD_OPEN = Pattern.compile("<head[^>]*>");
    private static final Pattern NUMERIC = Pattern.compile("\\d{1,18}");

    private static final Map<TypeAnnonce, String> TYPE_ANNONCE_LABELS = Map.of(
            TypeAnnonce.VENTE, "À vendre",
            TypeAnnonce.LOCATION, "À louer",
            TypeAnnonce.BAIL, "Bail commercial");

    private static final Map<TypeBien, String> TYPE_BIEN_LABELS = Map.of(
            TypeBien.APPARTEMENT, "Appartement",
            TypeBien.MAISON, "Maison",
            TypeBien.VILLA, "Villa",
            TypeBien.TERRAIN, "Terrain",
            TypeBien.DOMAINE, "Domaine",
            TypeBien.MAGASIN, "Magasin",
            TypeBien.BUREAU, "Bureau",
            TypeBien.ENTREPOT, "Entrepôt",
            TypeBien.AUTRE, "Bien");

    /** Résultat : soit une redirection permanente vers l'URL canonique, soit une page HTML. */
    public sealed interface SharePage {
        record Redirect(String location) implements SharePage {}
        record Html(String body, boolean found) implements SharePage {}
    }

    private final BienImmoRepository bienImmoRepository;
    private final String webUrl;
    private final String mediaBaseUrl;
    private final Path webRoot;

    private final java.util.concurrent.ConcurrentHashMap<String, CachedTemplate> gabarits =
            new java.util.concurrent.ConcurrentHashMap<>();

    private record CachedTemplate(Path realPath, FileTime modifiedAt, String html) {}

    public SharePageService(BienImmoRepository bienImmoRepository,
                            @Value("${app.web.url:https://www.anoventix.com}") String webUrl,
                            @Value("${app.web.media-base-url:https://anoventix.com}") String mediaBaseUrl,
                            @Value("${app.web.root:/var/www/web/current}") String webRoot) {
        this.bienImmoRepository = bienImmoRepository;
        this.webUrl = stripTrailingSlash(webUrl);
        this.mediaBaseUrl = stripTrailingSlash(mediaBaseUrl);
        this.webRoot = Path.of(webRoot);
    }

    /**
     * {@code segment} = « slug-publicId » (forme canonique) ou un id numérique (anciens liens
     * /annonce/30, redirigés). Seules les annonces visibles publiquement ont un aperçu : pour
     * les autres, la page générique est servie (l'app affichera l'annonce au propriétaire connecté).
     */
    @Transactional(readOnly = true)
    public SharePage render(String segment) {
        Optional<BienImmo> annonce = findPublicAnnonce(segment);
        if (annonce.isEmpty()) {
            return new SharePage.Html(template(), false);
        }
        BienImmo a = annonce.get();
        String canonicalSegment = canonicalSegment(a);
        if (!canonicalSegment.equals(segment)) {
            return new SharePage.Redirect("/annonce/" + canonicalSegment);
        }
        return new SharePage.Html(injectMeta(template(), a, webUrl + "/annonce/" + canonicalSegment), true);
    }

    private Optional<BienImmo> findPublicAnnonce(String segment) {
        Optional<BienImmo> annonce = NUMERIC.matcher(segment).matches()
                ? bienImmoRepository.findById(Long.parseLong(segment))
                : bienImmoRepository.findByPublicId(segment.substring(segment.lastIndexOf('-') + 1));
        return annonce.filter(BienImmo::estVisiblePubliquement);
    }

    private static String canonicalSegment(BienImmo annonce) {
        return Utility.slugify(annonce.getTitre()) + "-" + annonce.getPublicId();
    }

    private String injectMeta(String html, BienImmo annonce, String canonicalUrl) {
        return injecterMeta(html, new MetaPartage(annonce.getTitre(), annonce.getTitre() + " | AnoventiX",
                description(annonce), canonicalUrl, firstImageUrl(annonce)));
    }

    /** Ce qu'un robot d'aperçu doit lire sur une page : titre, description, URL canonique, image. */
    public record MetaPartage(String titrePartage, String titrePage, String description, String urlCanonique,
                              Optional<String> image) {}

    /** Injecte titre, description, lien canonique et balises Open Graph dans le gabarit de la page. */
    public String injecterMeta(String html, MetaPartage m) {
        StringBuilder meta = new StringBuilder();
        meta.append("<title>").append(Utility.escapeHtml(m.titrePage())).append("</title>");
        appendMeta(meta, "name", "description", m.description());
        meta.append("<link rel=\"canonical\" href=\"").append(Utility.escapeHtml(m.urlCanonique())).append("\"/>");
        appendMeta(meta, "property", "og:type", "website");
        appendMeta(meta, "property", "og:site_name", "AnoventiX");
        appendMeta(meta, "property", "og:locale", "fr_FR");
        appendMeta(meta, "property", "og:url", m.urlCanonique());
        appendMeta(meta, "property", "og:title", m.titrePartage());
        appendMeta(meta, "property", "og:description", m.description());
        appendMeta(meta, "name", "twitter:title", m.titrePartage());
        appendMeta(meta, "name", "twitter:description", m.description());
        m.image().ifPresentOrElse(image -> {
            appendMeta(meta, "property", "og:image", image);
            appendMeta(meta, "property", "og:image:alt", m.titrePartage());
            appendMeta(meta, "name", "twitter:card", "summary_large_image");
            appendMeta(meta, "name", "twitter:image", image);
        }, () -> appendMeta(meta, "name", "twitter:card", "summary"));

        String cleaned = DESCRIPTION_META.matcher(TITLE_TAG.matcher(html).replaceAll("")).replaceAll("");
        var head = HEAD_OPEN.matcher(cleaned);
        if (!head.find()) {
            return cleaned;
        }
        return cleaned.substring(0, head.end()) + meta + cleaned.substring(head.end());
    }

    /** URL absolue d'un média (le chemin enregistré est relatif au domaine des médias). */
    public String urlMedia(String url) {
        return url.startsWith("http") ? url : mediaBaseUrl + url;
    }

    /** URL du site (sans barre finale). */
    public String urlSite() {
        return webUrl;
    }

    /** Segment canonique d'une annonce : « slug-publicId ». */
    public static String segmentCanonique(BienImmo annonce) {
        return canonicalSegment(annonce);
    }

    /** « À vendre · Terrain · 150 000 000 GNF · 600 m² · Kaloum, Conakry — début de la description… » */
    private static String description(BienImmo annonce) {
        List<String> facts = new ArrayList<>();
        facts.add(TYPE_ANNONCE_LABELS.getOrDefault(annonce.getTypeAnnonce(), ""));
        facts.add(TYPE_BIEN_LABELS.getOrDefault(annonce.getTypeBien(), ""));
        BigDecimal prix = annonce.getPrixRevise() != null ? annonce.getPrixRevise() : annonce.getPrix();
        if (prix != null && prix.signum() > 0) {
            String suffix = annonce.getTypeAnnonce() == TypeAnnonce.VENTE ? "" : " / mois";
            facts.add(NumberFormat.getIntegerInstance(Locale.FRANCE).format(prix) + " GNF" + suffix);
        }
        // Location / bail : « Caution 2 mois · Avance 3 mois » ; un champ vide n'est pas affiché (RG-03-35).
        if (annonce.getTypeAnnonce() != TypeAnnonce.VENTE) {
            if (annonce.getCautionMois() != null && annonce.getCautionMois() > 0) {
                facts.add("Caution " + annonce.getCautionMois() + " mois");
            }
            if (annonce.getAvanceMois() != null && annonce.getAvanceMois() > 0) {
                facts.add("Avance " + annonce.getAvanceMois() + " mois");
            }
        }
        if (annonce.getSurfaceTotal() != null && annonce.getSurfaceTotal() > 0) {
            facts.add(NumberFormat.getIntegerInstance(Locale.FRANCE).format(annonce.getSurfaceTotal()) + " m²");
        }
        String lieu = lieu(annonce.getLocalisation());
        if (!lieu.isEmpty()) facts.add(lieu);

        String summary = String.join(" · ", facts.stream().filter(s -> !s.isBlank()).toList());
        String texte = annonce.getDescription() == null ? "" : annonce.getDescription().replaceAll("\\s+", " ").trim();
        String full = texte.isEmpty() ? summary : summary + " — " + texte;
        return full.length() <= DESCRIPTION_MAX_LENGTH ? full : full.substring(0, DESCRIPTION_MAX_LENGTH - 1).trim() + "…";
    }

    private static String lieu(Localisation localisation) {
        if (localisation == null) return "";
        return String.join(", ", Stream.of(localisation.isTechnique() ? null : localisation.getQuartier(),
                        localisation.getCommune(), localisation.getPrefecture())
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .toList());
    }

    private Optional<String> firstImageUrl(BienImmo annonce) {
        if (annonce.getMedias() == null) return Optional.empty();
        return annonce.getMedias().stream()
                .filter(m -> m.getUrl() != null && (m.getTypeMime() == null || m.getTypeMime().startsWith("image/")))
                .min(Comparator.comparing(Media::getOrdre, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(Media::getUrl)
                .map(this::urlMedia);
    }

    private static void appendMeta(StringBuilder sb, String attribute, String key, String content) {
        sb.append("<meta ").append(attribute).append("=\"").append(key)
          .append("\" content=\"").append(Utility.escapeHtml(content)).append("\"/>");
    }

    /**
     * Gabarit exporté par Expo, relu seulement quand le déploiement change : web/current est
     * un lien basculé à chaque version, d'où la comparaison du chemin réel et de la date.
     */
    private String template() {
        return gabarit(TEMPLATE_RELATIVE_PATH);
    }

    /** Gabarit d'une page de l'export web (chemin relatif à la racine du site), mis en cache par fichier. */
    public String gabarit(String cheminRelatif) {
        Path chemin = webRoot.resolve(cheminRelatif);
        try {
            Path realPath = chemin.toRealPath();
            FileTime modifiedAt = Files.getLastModifiedTime(realPath);
            CachedTemplate cached = gabarits.get(cheminRelatif);
            if (cached != null && cached.realPath().equals(realPath) && cached.modifiedAt().equals(modifiedAt)) {
                return cached.html();
            }
            String html = Files.readString(realPath, StandardCharsets.UTF_8);
            gabarits.put(cheminRelatif, new CachedTemplate(realPath, modifiedAt, html));
            return html;
        } catch (IOException e) {
            log.warn("Gabarit web introuvable ({}) : page minimale servie", chemin);
            return Objects.requireNonNullElse(gabarits.get(cheminRelatif), FALLBACK).html();
        }
    }

    private static final CachedTemplate FALLBACK = new CachedTemplate(null, null,
            "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"/>"
            + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>"
            + "<title>AnoventiX</title></head><body></body></html>");

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
