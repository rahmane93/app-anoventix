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

import com.app.AnnoncesAPI.repositories.UserRepository;

/**
 * Comptes inactifs (SFG §11.2, DEC-26) : relance par email après 2 ans sans connexion, puis anonymisation 3 mois
 * plus tard si le titulaire ne s'est pas reconnecté. Une connexion (ou le rafraîchissement d'une session) remet
 * le compteur à zéro et annule la relance ({@code SessionService}). Les comptes du staff ne sont pas concernés.
 */
@Service
public class InactiviteComptesService {

    private static final Logger logger = LoggerFactory.getLogger(InactiviteComptesService.class);

    static final int ANNEES_INACTIVITE = 2;
    static final int MOIS_AVANT_ANONYMISATION = 3;
    private static final int LOT = 200;

    /** Comptes concernés : annonceurs et particuliers, ni en attente d'activation ni déjà supprimés. */
    private static final String COMPTES_CONCERNES = """
            a.statut IN ('ACTIF', 'SUSPENDU', 'INACTIF')
              AND a.date_suppression_definitive IS NULL
              AND a.date_suppression_demandee IS NULL
              AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = a.role_id AND r.name IN ('ADMINISTRATEUR', 'MODERATEUR'))
            """;

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final EmailNotificationService emails;
    private final CompteSuppressionService suppression;
    private final TransactionTemplate transaction;

    public InactiviteComptesService(JdbcTemplate jdbc, UserRepository userRepository, EmailNotificationService emails,
                                    CompteSuppressionService suppression, TransactionTemplate transaction) {
        this.jdbc = jdbc;
        this.userRepository = userRepository;
        this.emails = emails;
        this.suppression = suppression;
        this.transaction = transaction;
    }

    @Scheduled(cron = "0 45 3 * * *")
    public void traiter() {
        LocalDateTime maintenant = LocalDateTime.now();
        try {
            int relances = relancer(maintenant);
            int anonymises = anonymiser(maintenant);
            if (relances + anonymises > 0) {
                logger.info("Comptes inactifs : {} relance(s), {} anonymisation(s)", relances, anonymises);
            }
        } catch (RuntimeException e) {
            logger.error("Comptes inactifs : échec du traitement", e);
        }
    }

    /** Sans connexion depuis 2 ans et pas encore relancés : email, puis date de relance posée. */
    int relancer(LocalDateTime maintenant) {
        List<UUID> ids = jdbc.queryForList("SELECT a.id FROM account a WHERE " + COMPTES_CONCERNES
                + " AND a.date_relance_inactivite IS NULL AND a.derniere_connexion < ? LIMIT " + LOT,
                UUID.class, maintenant.minusYears(ANNEES_INACTIVITE));
        int envoyees = 0;
        for (UUID id : ids) {
            try {
                transaction.executeWithoutResult(t -> userRepository.findById(id).ifPresent(u -> {
                    emails.notifier(u, "Votre compte AnoventiX va être supprimé",
                            "Votre compte est inactif depuis " + ANNEES_INACTIVITE + " ans",
                            "Vous ne vous êtes pas connecté depuis " + ANNEES_INACTIVITE + " ans. Sans connexion de votre part "
                                    + "dans les " + MOIS_AVANT_ANONYMISATION + " mois, votre compte et vos annonces seront "
                                    + "supprimés et vos données personnelles effacées.\nPour garder votre compte, il suffit "
                                    + "de vous connecter.");
                    jdbc.update("UPDATE account SET date_relance_inactivite = ? WHERE id = ?", maintenant, id);
                }));
                envoyees++;
            } catch (RuntimeException e) {
                logger.warn("Comptes inactifs : relance impossible pour {} : {}", id, e.getMessage());
            }
        }
        return envoyees;
    }

    /** Relancés depuis 3 mois sans connexion depuis : compte (et entreprise d'un professionnel) effacés. */
    int anonymiser(LocalDateTime maintenant) {
        List<UUID> ids = jdbc.queryForList("SELECT a.id FROM account a WHERE " + COMPTES_CONCERNES
                + " AND a.date_relance_inactivite < ? AND a.derniere_connexion < a.date_relance_inactivite LIMIT " + LOT,
                UUID.class, maintenant.minusMonths(MOIS_AVANT_ANONYMISATION));
        int effaces = 0;
        for (UUID id : ids) {
            try {
                suppression.supprimerPourInactivite(id);
                effaces++;
            } catch (RuntimeException e) {
                logger.warn("Comptes inactifs : anonymisation impossible pour {} : {}", id, e.getMessage());
            }
        }
        return effaces;
    }
}
