package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.IntSupplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.services.media.MediaService;

/**
 * Purges de conservation (DEC-26, SFG §11.2) : chaque donnée est supprimée au terme de sa durée de
 * conservation. Tâche quotidienne de 04:00 ; chaque purge est indépendante (l'échec de l'une
 * n'empêche pas les autres) et idempotente.
 *
 * Reste à venir, faute de la date nécessaire : comptes inactifs depuis 2 ans (la date de dernière
 * connexion n'est pas enregistrée).
 */
@Service
public class PurgeConservationService {

    private static final Logger logger = LoggerFactory.getLogger(PurgeConservationService.class);

    /** Photos et historique d'une annonce clôturée ou supprimée : 12 mois. */
    static final int MOIS_ANNONCE_TERMINEE = 12;
    /** Conversations : 2 ans après le dernier message. */
    static final int ANS_CONVERSATION = 2;
    /** Conversation dont un message a été signalé : 1 an après le signalement. */
    static final int ANS_CONVERSATION_SIGNALEE = 1;
    /** Signalements, avertissements et journal d'audit : 3 ans. */
    static final int ANS_DECISIONS = 3;
    /** Adresses IP du journal : 90 jours. */
    static final int JOURS_ADRESSE_IP = 90;
    /** Fichiers de la pièce d'identité et du selfie : 30 jours après la décision (RG-02-41). */
    static final int JOURS_FICHIERS_VERIFICATION = 30;
    /** Photos traitées par passage : borne la durée d'une purge, la suivante reprend. */
    static final int LOT_PHOTOS = 500;

    private final JdbcTemplate jdbc;
    private final MediaRepository mediaRepository;
    private final MediaService mediaService;
    private final TransactionTemplate transaction;

    public PurgeConservationService(JdbcTemplate jdbc, MediaRepository mediaRepository,
                                    MediaService mediaService, TransactionTemplate transaction) {
        this.jdbc = jdbc;
        this.mediaRepository = mediaRepository;
        this.mediaService = mediaService;
        this.transaction = transaction;
    }

    @Scheduled(cron = "0 0 4 * * *")
    public void purger() {
        LocalDateTime maintenant = LocalDateTime.now();
        executer("photos des annonces terminées", () -> purgerPhotos(maintenant.minusMonths(MOIS_ANNONCE_TERMINEE)));
        executer("historique des annonces terminées", () -> purgerHistorique(maintenant.minusMonths(MOIS_ANNONCE_TERMINEE)));
        executer("fichiers de vérification d'identité",
                () -> purgerFichiersVerification(maintenant.minusDays(JOURS_FICHIERS_VERIFICATION)));
        executer("conversations", () -> purgerConversations(maintenant));
        executer("signalements traités", () -> purgerSignalements(maintenant.minusYears(ANS_DECISIONS)));
        executer("avertissements", () -> purgerAvertissements(maintenant.minusYears(ANS_DECISIONS)));
        executer("journal d'audit", () -> purgerJournal(maintenant));
    }

    private void executer(String libelle, IntSupplier purge) {
        try {
            int n = purge.getAsInt();
            if (n > 0) {
                logger.info("Purge de conservation — {} : {} élément(s) supprimé(s)", libelle, n);
            }
        } catch (RuntimeException e) {
            logger.error("Purge de conservation — {} : échec, reprise au prochain passage", libelle, e);
        }
    }

    // ─── Annonces terminées ────────────────────────────────────────────────

    /**
     * Annonce clôturée (vendue, louée, retirée, expirée) ou supprimée depuis plus de 12 mois : ses
     * photos sont effacées du disque et de la base. L'annonce garde son texte pour les conversations,
     * les signalements et l'historique ; elle ne peut plus être remise en ligne (voir BienImmoServiceImpl.reactiver).
     */
    int purgerPhotos(LocalDateTime limite) {
        List<Media> photos = mediaRepository.findPhotosDAnnoncesTerminees(limite, PageRequest.of(0, LOT_PHOTOS));
        // Fichiers d'abord : une fois la ligne supprimée, le chemin serait perdu.
        photos.forEach(m -> mediaService.deleteMediaFromDisk(m.getUrl()));
        transaction.executeWithoutResult(s -> mediaRepository.deleteAll(photos));
        return photos.size();
    }

    int purgerHistorique(LocalDateTime limite) {
        return jdbc.update("""
                DELETE FROM historique_annonce h USING annonce a
                WHERE h.annonce_id = a.id
                  AND ((a.motif_cloture IS NOT NULL AND a.date_cloture < ?)
                    OR (a.statut_moderation = 'DESACTIVEE' AND a.date_modification < ?))
                """, limite, limite);
    }

    // ─── Vérification d'identité ───────────────────────────────────────────

    /**
     * Pièce et selfie décidés (validés ou rejetés) depuis plus de 30 jours : les fichiers sont supprimés
     * du disque ; on garde le type, le numéro, le statut, les dates et l'auteur de la décision.
     */
    int purgerFichiersVerification(LocalDateTime limite) {
        List<java.util.Map<String, Object>> dossiers = jdbc.queryForList("""
                SELECT id, piece_identite_url, selfie_url FROM account
                WHERE date_decision_verification < ?
                  AND (piece_identite_url IS NOT NULL OR selfie_url IS NOT NULL)
                ORDER BY date_decision_verification
                LIMIT ?
                """, limite, LOT_PHOTOS);
        for (java.util.Map<String, Object> d : dossiers) {
            // Fichiers d'abord : une fois les chemins effacés, ils seraient introuvables.
            mediaService.deletePieceIdentite((String) d.get("piece_identite_url"));
            mediaService.deletePieceIdentite((String) d.get("selfie_url"));
            jdbc.update("UPDATE account SET piece_identite_url = NULL, selfie_url = NULL WHERE id = ?", d.get("id"));
        }
        return dossiers.size();
    }

    // ─── Messagerie ────────────────────────────────────────────────────────

    /**
     * Conversation sans nouveau message depuis 2 ans, sauf si un message est signalé en attente de
     * traitement ou a été signalé il y a moins d'un an (la modération peut avoir besoin de la relire).
     */
    int purgerConversations(LocalDateTime maintenant) {
        String aSupprimer = """
                SELECT c.id FROM conversation c
                WHERE c.last_message_at < ?
                  AND NOT EXISTS (SELECT 1 FROM message m WHERE m.conversation_id = c.id AND m.signale)
                  AND NOT EXISTS (SELECT 1 FROM message m WHERE m.conversation_id = c.id AND m.date_signalement >= ?)
                """;
        LocalDateTime limiteMessage = maintenant.minusYears(ANS_CONVERSATION);
        LocalDateTime limiteSignalement = maintenant.minusYears(ANS_CONVERSATION_SIGNALEE);
        Integer supprimees = transaction.execute(s -> {
            jdbc.update("DELETE FROM message WHERE conversation_id IN (" + aSupprimer + ")",
                    limiteMessage, limiteSignalement);
            return jdbc.update("DELETE FROM conversation WHERE id IN (" + aSupprimer + ")",
                    limiteMessage, limiteSignalement);
        });
        return supprimees == null ? 0 : supprimees;
    }

    // ─── Décisions de modération et journal ────────────────────────────────

    int purgerSignalements(LocalDateTime limite) {
        return jdbc.update("DELETE FROM signalements WHERE statut <> 'EN_ATTENTE' AND date_traitement < ?", limite);
    }

    int purgerAvertissements(LocalDateTime limite) {
        return jdbc.update("DELETE FROM avertissements WHERE date < ?", limite);
    }

    /** Adresses IP effacées après 90 jours ; les actions elles-mêmes sont gardées 3 ans. */
    int purgerJournal(LocalDateTime maintenant) {
        int anonymisees = jdbc.update("UPDATE audit_event SET adresse_ip = NULL WHERE adresse_ip IS NOT NULL AND date < ?",
                maintenant.minusDays(JOURS_ADRESSE_IP));
        int supprimees = jdbc.update("DELETE FROM audit_event WHERE date < ?", maintenant.minusYears(ANS_DECISIONS));
        return anonymisees + supprimees;
    }
}
