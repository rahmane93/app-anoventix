package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Comptes jamais activés (DEC-06, RG-01-47) : relance avec un nouveau lien à J+5 (E19), suppression
 * définitive à J+7. Un compte non activé n'a rien à conserver : ni annonce, ni message. Les agents invités
 * ne sont pas concernés (leur sort dépend du professionnel). Tâche quotidienne de 03:15 ; la suppression
 * de l'un des comptes n'empêche pas celle des autres.
 */
@Service
public class PurgeComptesNonActivesService {

    private static final Logger logger = LoggerFactory.getLogger(PurgeComptesNonActivesService.class);

    static final int JOURS_RELANCE = 5;
    static final int JOURS_SUPPRESSION = 7;

    private final JdbcTemplate jdbc;
    private final AuthService authService;
    private final TransactionTemplate transaction;

    public PurgeComptesNonActivesService(JdbcTemplate jdbc, AuthService authService, TransactionTemplate transaction) {
        this.jdbc = jdbc;
        this.authService = authService;
        this.transaction = transaction;
    }

    @Scheduled(cron = "0 15 3 * * *")
    public void purger() {
        LocalDateTime maintenant = LocalDateTime.now();
        try {
            int relances = relancer(maintenant);
            if (relances > 0) {
                logger.info("Comptes non activés : {} relance(s) envoyée(s)", relances);
            }
        } catch (RuntimeException e) {
            logger.error("Comptes non activés : échec des relances", e);
        }
        try {
            int supprimes = supprimer(maintenant);
            if (supprimes > 0) {
                logger.info("Comptes non activés : {} compte(s) supprimé(s)", supprimes);
            }
        } catch (RuntimeException e) {
            logger.error("Comptes non activés : échec des suppressions", e);
        }
    }

    /** Comptes inscrits depuis 5 jours au moins et pas encore relancés (et pas encore à supprimer). */
    int relancer(LocalDateTime maintenant) {
        List<UUID> ids = jdbc.queryForList("""
                SELECT id FROM account
                WHERE statut = 'EN_ATTENTE_ACTIVATION' AND parent_user_id IS NULL
                  AND NOT relance_activation_envoyee
                  AND created_at <= ? AND created_at > ?
                """, UUID.class, maintenant.minusDays(JOURS_RELANCE), maintenant.minusDays(JOURS_SUPPRESSION));
        int envoyees = 0;
        for (UUID id : ids) {
            try {
                authService.relancerActivation(id);
                envoyees++;
            } catch (RuntimeException e) {
                logger.warn("Relance d'activation impossible pour le compte {}", id, e);
            }
        }
        return envoyees;
    }

    /** Comptes inscrits depuis 7 jours au moins et toujours non activés : suppression définitive. */
    int supprimer(LocalDateTime maintenant) {
        List<UUID> ids = jdbc.queryForList("""
                SELECT id FROM account
                WHERE statut = 'EN_ATTENTE_ACTIVATION' AND parent_user_id IS NULL AND created_at <= ?
                """, UUID.class, maintenant.minusDays(JOURS_SUPPRESSION));
        int supprimes = 0;
        for (UUID id : ids) {
            try {
                transaction.executeWithoutResult(s -> {
                    jdbc.update("DELETE FROM account_favoris WHERE user_id = ?", id);
                    jdbc.update("DELETE FROM account WHERE id = ? AND statut = 'EN_ATTENTE_ACTIVATION'", id);
                });
                supprimes++;
            } catch (RuntimeException e) {
                // Une référence inattendue : le compte est laissé en place, les autres sont traités.
                logger.warn("Suppression impossible du compte non activé {}", id, e);
            }
        }
        return supprimes;
    }
}
