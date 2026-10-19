package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.HistoriqueAnnonce;
import com.app.AnnoncesAPI.entities.Signalement;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.MotifSignalement;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutSignalement;
import com.app.AnnoncesAPI.exceptions.ConflitException;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.HistoriqueAnnonceRepository;
import com.app.AnnoncesAPI.repositories.SignalementRepository;

/**
 * Cycle de modération d'une annonce : masquage, rejet définitif, remise en ligne, réexamen
 * demandé par le propriétaire (DEC-09), masquage automatique après signalements (DEC-11).
 * Toutes les transitions passent ici, pour que l'historique, le journal d'audit, les emails et
 * la clôture des signalements restent cohérents quel que soit le point d'entrée.
 */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class ModerationAnnonceService {

    public static final String SYSTEME = "Système";
    static final int REEXAMENS_MAX = 3;
    static final String MOTIF_AUTOMATIQUE =
            "Masquée automatiquement après plusieurs signalements, en attente de vérification";

    private final AnnonceRepository annonceRepository;
    private final SignalementRepository signalementRepository;
    private final HistoriqueAnnonceRepository historiqueRepository;
    private final AnnonceExpirationService annonceExpirationService;
    private final EmailNotificationService emailNotificationService;
    private final AuditService audit;
    private final int seuilMasquageAuto;

    public ModerationAnnonceService(AnnonceRepository annonceRepository,
                                    SignalementRepository signalementRepository,
                                    HistoriqueAnnonceRepository historiqueRepository,
                                    AnnonceExpirationService annonceExpirationService,
                                    EmailNotificationService emailNotificationService,
                                    AuditService audit,
                                    @Value("${moderation.seuil-masquage-auto:3}") int seuilMasquageAuto) {
        this.annonceRepository = annonceRepository;
        this.signalementRepository = signalementRepository;
        this.historiqueRepository = historiqueRepository;
        this.annonceExpirationService = annonceExpirationService;
        this.emailNotificationService = emailNotificationService;
        this.audit = audit;
        this.seuilMasquageAuto = seuilMasquageAuto;
    }

    /**
     * Masque l'annonce. Si le propriétaire avait demandé un réexamen, c'est un masquage maintenu
     * avec un nouveau motif (RG-03-32) : l'annonce reste corrigeable et une nouvelle demande est possible.
     */
    public void masquer(Annonce annonce, String motif, String auteur) {
        boolean maintien = annonce.isReexamenDemande() && annonce.getStatutModeration() == StatutAnnonce.MASQUEE;
        String ancien = annonce.getStatutModeration().name();
        annonce.setStatutModeration(StatutAnnonce.MASQUEE);
        annonce.setMotifModeration(motif);
        annonce.setActif(false);
        annonce.setDateMasquage(LocalDateTime.now());
        annonce.setMasquageAutomatique(false);
        effacerDemandeReexamen(annonce);
        annonceRepository.save(annonce);
        cloreSignalements(annonce, StatutSignalement.TRAITE, auteur);

        historique(annonce, "statutModeration", ancien, StatutAnnonce.MASQUEE.name(), auteur);
        historique(annonce, "raison", null, motif, auteur);
        if (maintien) {
            audit.enregistrer(ActionAudit.ANNONCE_MASQUAGE_MAINTENU, annonce.getId(), motif);
            notifier(annonce, "Votre annonce reste masquée", "Votre demande de réexamen n'a pas abouti", motif);
        } else {
            audit.enregistrer(ActionAudit.ANNONCE_MASQUEE, annonce.getId(), motif);
            notifier(annonce, "Votre annonce a été masquée", "Votre annonce a été masquée par la modération", motif);
        }
    }

    /** Rejet définitif (DEC-10) : l'annonce ne peut plus ni être modifiée ni remise en ligne. */
    public void rejeter(Annonce annonce, String motif, String auteur) {
        String ancien = annonce.getStatutModeration().name();
        annonce.setStatutModeration(StatutAnnonce.REJETEE);
        annonce.setMotifModeration(motif);
        annonce.setActif(false);
        annonce.setDateMasquage(LocalDateTime.now());
        annonce.setMasquageAutomatique(false);
        effacerDemandeReexamen(annonce);
        annonceRepository.save(annonce);
        cloreSignalements(annonce, StatutSignalement.TRAITE, auteur);

        historique(annonce, "statutModeration", ancien, StatutAnnonce.REJETEE.name(), auteur);
        historique(annonce, "raison", null, motif, auteur);
        audit.enregistrer(ActionAudit.ANNONCE_REJETEE, annonce.getId(), motif);
        notifier(annonce, "Votre annonce a été rejetée", "Votre annonce a été rejetée par la modération", motif);
    }

    public void remettreEnLigne(Annonce annonce, String auteur) {
        if (annonce.getStatutModeration() == StatutAnnonce.REJETEE) {
            throw new ConflitException("Une annonce rejetée ne peut pas être remise en ligne.");
        }
        String ancien = annonce.getStatutModeration().name();
        annonce.setStatutModeration(StatutAnnonce.PUBLIEE);
        annonce.setMotifModeration(null);
        annonce.setMasquageAutomatique(false);
        effacerDemandeReexamen(annonce);
        // Ne remet actif=true que si l'annonce n'a pas été clôturée volontairement par son propriétaire.
        if (annonce.getMotifCloture() == null) {
            annonce.setActif(true);
            annonceExpirationService.prolonger(annonce);
        }
        annonceRepository.save(annonce);
        cloreSignalements(annonce, StatutSignalement.IGNORE, auteur);

        historique(annonce, "statutModeration", ancien, StatutAnnonce.PUBLIEE.name(), auteur);
        audit.enregistrer(ActionAudit.ANNONCE_REMISE_EN_LIGNE, annonce.getId(), "Statut précédent : " + ancien);
        notifier(annonce, "Votre annonce est de nouveau en ligne", "Votre annonce est de nouveau en ligne", null);
    }

    /** Demande de réexamen d'une annonce masquée par son propriétaire (RG-03-30, RG-03-31). */
    public void demanderReexamen(Annonce annonce, String message, User demandeur) {
        if (annonce.getStatutModeration() != StatutAnnonce.MASQUEE) {
            throw new ConflitException(annonce.getStatutModeration() == StatutAnnonce.REJETEE
                    ? "Une annonce rejetée ne peut pas faire l'objet d'une demande de réexamen."
                    : "Seule une annonce masquée par la modération peut faire l'objet d'un réexamen.");
        }
        if (annonce.isReexamenDemande()) {
            throw new ConflitException("Une demande de réexamen est déjà en cours pour cette annonce.");
        }
        if (annonce.getNbReexamens() >= REEXAMENS_MAX) {
            throw new ConflitException("Vous avez atteint le nombre maximal de demandes de réexamen pour cette "
                    + "annonce : contactez le support.");
        }
        String texte = message == null ? null : message.trim();
        if (texte != null && texte.isEmpty()) {
            texte = null;
        }
        if (texte != null && texte.length() > 500) {
            throw new IllegalArgumentException("Le message ne peut pas dépasser 500 caractères.");
        }
        annonce.setReexamenDemande(true);
        annonce.setDateReexamen(LocalDateTime.now());
        annonce.setMessageReexamen(texte);
        annonce.setNbReexamens(annonce.getNbReexamens() + 1);
        annonceRepository.save(annonce);

        historique(annonce, "reexamen", null, texte == null ? "demandé" : texte, demandeur.getEmail());
        audit.enregistrer(ActionAudit.ANNONCE_REEXAMEN_DEMANDE, annonce.getId(), texte);
    }

    /**
     * Masque l'annonce dès qu'elle a reçu {@code moderation.seuil-masquage-auto} signalements
     * « arnaque / fraude » en attente, de signaleurs distincts (DEC-11). Les signalements restent
     * EN_ATTENTE : la modération les clôt par sa décision. Retourne vrai si l'annonce a été masquée.
     */
    public boolean evaluerSignalements(Annonce annonce) {
        if (annonce.getStatutModeration() != StatutAnnonce.PUBLIEE || !Boolean.TRUE.equals(annonce.getActif())) {
            return false;
        }
        // Seuil à 0 (ou moins) : masquage automatique désactivé.
        if (seuilMasquageAuto <= 0) {
            return false;
        }
        long distincts = signalementRepository.compterSignaleursEnAttente(
                annonce.getId(), MotifSignalement.ARNAQUE_FRAUDE.name());
        if (distincts < seuilMasquageAuto) {
            return false;
        }
        String ancien = annonce.getStatutModeration().name();
        annonce.setStatutModeration(StatutAnnonce.MASQUEE);
        annonce.setMotifModeration(MOTIF_AUTOMATIQUE);
        annonce.setActif(false);
        annonce.setDateMasquage(LocalDateTime.now());
        annonce.setMasquageAutomatique(true);
        annonceRepository.save(annonce);

        historique(annonce, "statutModeration", ancien, StatutAnnonce.MASQUEE.name(), SYSTEME);
        historique(annonce, "raison", null, MOTIF_AUTOMATIQUE, SYSTEME);
        audit.enregistrerParLeSysteme(ActionAudit.ANNONCE_MASQUEE_AUTOMATIQUEMENT, annonce.getId(),
                distincts + " signalements « arnaque / fraude »");
        notifier(annonce, "Votre annonce a été masquée", "Votre annonce a été masquée en attendant une vérification",
                MOTIF_AUTOMATIQUE);
        return true;
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private void effacerDemandeReexamen(Annonce annonce) {
        annonce.setReexamenDemande(false);
        annonce.setDateReexamen(null);
        annonce.setMessageReexamen(null);
    }

    /** La décision de la modération clôt d'un coup tous les signalements de l'annonce (RG-09-34). */
    private void cloreSignalements(Annonce annonce, StatutSignalement statut, String auteur) {
        List<Signalement> enAttente = signalementRepository
                .findByAnnonceIdAndStatutAndAnnuleFalse(annonce.getId(), StatutSignalement.EN_ATTENTE);
        LocalDateTime maintenant = LocalDateTime.now();
        for (Signalement s : enAttente) {
            s.setStatut(statut);
            s.setTraitePar(auteur);
            s.setDateTraitement(maintenant);
        }
        signalementRepository.saveAll(enAttente);
    }

    private void historique(Annonce annonce, String champ, String ancienne, String nouvelle, String modifiePar) {
        HistoriqueAnnonce h = new HistoriqueAnnonce();
        h.setAnnonce(annonce);
        h.setChamp(champ);
        h.setAncienneValeur(ancienne);
        h.setNouvelleValeur(nouvelle);
        h.setModifiePar(modifiePar);
        historiqueRepository.save(h);
    }

    private void notifier(Annonce annonce, String sujet, String titre, String motif) {
        StringBuilder message = new StringBuilder()
                .append("Annonce : « ").append(annonce.getTitre()).append(" » (réf. ")
                .append(annonce.getReferenceAnnonce()).append(").");
        if (motif != null && !motif.isBlank()) {
            message.append("\nMotif communiqué par la modération : ").append(motif);
        }
        emailNotificationService.notifier(annonce.getOwner(), sujet, titre, message.toString());
    }
}
