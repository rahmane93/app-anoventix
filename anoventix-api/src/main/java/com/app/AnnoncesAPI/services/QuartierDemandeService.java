package com.app.AnnoncesAPI.services;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.DemandeQuartier;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.StatutDemandeQuartier;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.DemandeQuartierRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;

/**
 * Quartier manquant (DEC-22, RG-05-16 à RG-05-18) : l'annonce est publiée sur la commune (entrée technique
 * « Autre quartier »), le nom saisi devient une demande d'ajout traitée par l'administrateur.
 */
@Service
public class QuartierDemandeService {

    static final int NOM_MAX = 100;
    /** Écart d'orthographe toléré pour proposer un quartier existant comme variante. */
    static final int DISTANCE_PROCHE = 2;

    private final LocalisationRepository localisations;
    private final DemandeQuartierRepository demandes;
    private final AnnonceRepository annonces;
    private final EmailNotificationService emails;
    private final AuditService audit;

    public QuartierDemandeService(LocalisationRepository localisations, DemandeQuartierRepository demandes,
                                  AnnonceRepository annonces, EmailNotificationService emails, AuditService audit) {
        this.localisations = localisations;
        this.demandes = demandes;
        this.annonces = annonces;
        this.emails = emails;
        this.audit = audit;
    }

    /** Une proposition de quartier existant pour une demande (variante d'orthographe). */
    public record QuartierProche(String id, String quartier) {}

    /** Une demande avec ce dont l'administrateur a besoin pour décider. */
    public record DemandeDetail(Long id, String nom, String region, String prefecture, String commune,
                                Long annonceId, String annonceTitre, String demandeurEmail,
                                LocalDateTime dateDemande, StatutDemandeQuartier statut,
                                List<QuartierProche> quartiersProches) {}

    // ── Côté annonceur ─────────────────────────────────────────────────────

    /** Entrée « Autre quartier » de la commune, créée à la première utilisation. */
    @Transactional
    public Localisation autreQuartier(String region, String prefecture, String commune) {
        return localisations.findFirstByRegionAndPrefectureAndCommuneAndTechniqueTrue(region, prefecture, commune)
                .orElseGet(() -> {
                    Localisation modele = localisations
                            .findFirstByRegionAndPrefectureAndCommuneAndTechniqueFalse(region, prefecture, commune)
                            .orElseThrow(() -> new ResourceNotFoundException("Commune introuvable : " + commune));
                    Localisation technique = new Localisation();
                    technique.setId("autre-" + UUID.randomUUID());
                    technique.setRegion(modele.getRegion());
                    technique.setPrefecture(modele.getPrefecture());
                    technique.setCommune(modele.getCommune());
                    technique.setTypeCommune(modele.getTypeCommune());
                    technique.setQuartier("Autre quartier");
                    technique.setTechnique(true);
                    return localisations.save(technique);
                });
    }

    /**
     * Enregistre (ou met à jour) la demande liée à une annonce rattachée à l'entrée technique. Sans nom saisi ni
     * demande en cours, l'annonce ne peut pas être publiée sur « Autre quartier ».
     */
    @Transactional
    public void enregistrerDemande(Annonce annonce, String nomSaisi, User demandeur) {
        String nom = nomSaisi == null ? "" : nomSaisi.trim();
        if (nom.length() > NOM_MAX) {
            throw new IllegalArgumentException("Le nom du quartier ne peut pas dépasser " + NOM_MAX + " caractères.");
        }
        var enAttente = demandes.findByAnnonceIdAndStatut(annonce.getId(), StatutDemandeQuartier.EN_ATTENTE);
        if (nom.isEmpty()) {
            if (enAttente.isEmpty()) {
                throw new IllegalArgumentException("Indiquez le nom de votre quartier.");
            }
            return;
        }
        DemandeQuartier d = enAttente.orElseGet(DemandeQuartier::new);
        d.setNom(nom);
        d.setLocalisation(annonce.getLocalisation());
        d.setAnnonce(annonce);
        d.setDemandeur(demandeur);
        demandes.save(d);
    }

    // ── Côté administration ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<DemandeDetail> lister(StatutDemandeQuartier statut, Pageable pageable) {
        return demandes.findByStatutOrderByDateDemandeAsc(statut, pageable).map(this::detail);
    }

    @Transactional(readOnly = true)
    public long enAttente() {
        return demandes.countByStatut(StatutDemandeQuartier.EN_ATTENTE);
    }

    /** Crée le quartier (nom éventuellement corrigé) et y rattache les annonces concernées. */
    @Transactional
    public DemandeDetail ajouter(Long id, String nomCorrige, String admin) {
        DemandeQuartier d = enAttente(id);
        String nom = nomCorrige == null || nomCorrige.isBlank() ? d.getNom() : nomCorrige.trim();
        if (nom.length() > NOM_MAX) {
            throw new IllegalArgumentException("Le nom du quartier ne peut pas dépasser " + NOM_MAX + " caractères.");
        }
        Localisation technique = d.getLocalisation();
        localisations.trouverQuartier(technique.getRegion(), technique.getPrefecture(), technique.getCommune(), nom)
                .ifPresent(existant -> {
                    throw new IllegalStateException("Le quartier « " + existant.getQuartier()
                            + " » existe déjà dans cette commune : rattachez la demande à ce quartier.");
                });
        Localisation nouveau = new Localisation();
        nouveau.setId(UUID.randomUUID().toString());
        nouveau.setRegion(technique.getRegion());
        nouveau.setPrefecture(technique.getPrefecture());
        nouveau.setCommune(technique.getCommune());
        nouveau.setTypeCommune(technique.getTypeCommune());
        nouveau.setQuartier(nom);
        localisations.save(nouveau);
        // Les autres demandes de la commune pour le même nom (aux accents et à la casse près) sont traitées d'un coup.
        for (DemandeQuartier autre : demandes.findByLocalisationIdAndStatut(technique.getId(), StatutDemandeQuartier.EN_ATTENTE)) {
            if (autre.getId().equals(d.getId()) || normaliser(autre.getNom()).equals(normaliser(nom))) {
                cloturer(autre, StatutDemandeQuartier.AJOUTEE, nouveau, null, admin);
            }
        }
        audit.enregistrer(ActionAudit.QUARTIER_AJOUTE, d.getId(), nom + " (" + technique.getCommune() + ")");
        return detail(d);
    }

    /** Variante d'orthographe : l'annonce rejoint un quartier existant de la même commune. */
    @Transactional
    public DemandeDetail rattacher(Long id, String localisationId, String admin) {
        DemandeQuartier d = enAttente(id);
        Localisation cible = localisations.findById(localisationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quartier introuvable."));
        Localisation technique = d.getLocalisation();
        if (cible.isTechnique() || !cible.getCommune().equals(technique.getCommune())
                || !cible.getPrefecture().equals(technique.getPrefecture())) {
            throw new IllegalArgumentException("Le quartier choisi doit appartenir à la même commune.");
        }
        cloturer(d, StatutDemandeQuartier.RATTACHEE, cible, null, admin);
        audit.enregistrer(ActionAudit.QUARTIER_RATTACHE, d.getId(), d.getNom() + " → " + cible.getQuartier());
        return detail(d);
    }

    /** Refus avec motif : l'annonce reste rattachée à la commune. */
    @Transactional
    public DemandeDetail refuser(Long id, String motif, String admin) {
        DemandeQuartier d = enAttente(id);
        String texte = motif == null ? "" : motif.trim();
        if (texte.isEmpty()) {
            throw new IllegalArgumentException("Un motif de refus est obligatoire.");
        }
        if (texte.length() > 255) {
            throw new IllegalArgumentException("Le motif ne peut pas dépasser 255 caractères.");
        }
        cloturer(d, StatutDemandeQuartier.REFUSEE, null, texte, admin);
        audit.enregistrer(ActionAudit.QUARTIER_REFUSE, d.getId(), texte);
        return detail(d);
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private DemandeQuartier enAttente(Long id) {
        DemandeQuartier d = demandes.findById(id).orElseThrow(() -> new ResourceNotFoundException("Demande introuvable."));
        if (d.getStatut() != StatutDemandeQuartier.EN_ATTENTE) {
            throw new IllegalStateException("Cette demande a déjà été traitée.");
        }
        return d;
    }

    private void cloturer(DemandeQuartier d, StatutDemandeQuartier statut, Localisation finale, String motif, String admin) {
        d.setStatut(statut);
        d.setLocalisationFinale(finale);
        d.setMotifRefus(motif);
        d.setDateDecision(LocalDateTime.now());
        d.setDecidePar(admin);
        demandes.save(d);
        Annonce annonce = d.getAnnonce();
        // Rattachement aussitôt, sauf si l'annonceur a déjà choisi un autre lieu entre-temps.
        if (finale != null && annonce.getLocalisation().getId().equals(d.getLocalisation().getId())) {
            annonce.setLocalisation(finale);
            annonces.save(annonce);
        }
        User demandeur = d.getDemandeur();
        if (statut == StatutDemandeQuartier.REFUSEE) {
            emails.notifier(demandeur, "Votre quartier n'a pas été ajouté", "Quartier non ajouté",
                    "Le quartier « " + d.getNom() + " » n'a pas été ajouté à la liste. Votre annonce « " + annonce.getTitre()
                            + " » reste en ligne, rattachée à la commune de " + d.getLocalisation().getCommune()
                            + ".\nMotif : " + motif);
        } else {
            emails.notifier(demandeur, "Votre quartier a été ajouté", "Quartier ajouté",
                    "Votre annonce « " + annonce.getTitre() + " » est maintenant rattachée au quartier « "
                            + finale.getQuartier() + " » (" + finale.getCommune() + ").");
        }
    }

    private DemandeDetail detail(DemandeQuartier d) {
        Localisation l = d.getLocalisation();
        String cherche = normaliser(d.getNom());
        List<QuartierProche> proches = localisations.findByRegionAndPrefectureAndCommuneAndTechniqueFalse(
                        l.getRegion(), l.getPrefecture(), l.getCommune()).stream()
                .filter(q -> q.getQuartier() != null)
                .filter(q -> {
                    String n = normaliser(q.getQuartier());
                    return n.contains(cherche) || cherche.contains(n) || distance(n, cherche) <= DISTANCE_PROCHE;
                })
                .map(q -> new QuartierProche(q.getId(), q.getQuartier()))
                .limit(5)
                .toList();
        return new DemandeDetail(d.getId(), d.getNom(), l.getRegion(), l.getPrefecture(), l.getCommune(),
                d.getAnnonce().getId(), d.getAnnonce().getTitre(), d.getDemandeur().getEmail(), d.getDateDemande(),
                d.getStatut(), proches);
    }

    static String normaliser(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    /** Distance de Levenshtein. */
    static int distance(String a, String b) {
        int[] prec = new int[b.length() + 1];
        int[] cour = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) prec[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            cour[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cout = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                cour[j] = Math.min(Math.min(cour[j - 1] + 1, prec[j] + 1), prec[j - 1] + cout);
            }
            int[] t = prec; prec = cour; cour = t;
        }
        return prec[b.length()];
    }
}
