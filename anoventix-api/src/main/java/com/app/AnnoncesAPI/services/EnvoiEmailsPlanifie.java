package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.app.AnnoncesAPI.entities.EmailSortant;
import com.app.AnnoncesAPI.repositories.EmailSortantRepository;

/**
 * Envoie les emails de la file (table email_sortant).
 *
 * Chaque email est traité dans sa propre transaction, ligne verrouillée
 * (FOR UPDATE SKIP LOCKED) : un échec n'affecte que lui, et plusieurs instances
 * peuvent tourner sans envoyer deux fois. En cas d'échec, nouvel essai après
 * 1 min, 5 min, 15 min, 1 h puis 6 h ; ensuite l'email est abandonné et
 * l'abandon est journalisé en ERROR (à relier à la supervision).
 */
@Service
public class EnvoiEmailsPlanifie {

    private static final Logger logger = LoggerFactory.getLogger(EnvoiEmailsPlanifie.class);

    /** Emails envoyés au plus par passage, pour ne pas monopoliser le planificateur. */
    static final int LOT = 50;
    private static final int CONSERVATION_JOURS = 30;

    private final EmailSortantRepository file;
    private final EmailService emailService;
    private final TransactionTemplate transaction;
    private final boolean actif;

    public EnvoiEmailsPlanifie(EmailSortantRepository file,
                               EmailService emailService,
                               TransactionTemplate transaction,
                               @Value("${app.email.file.envoi-actif:true}") boolean actif) {
        this.file = file;
        this.emailService = emailService;
        this.transaction = transaction;
        this.actif = actif;
    }

    @Scheduled(fixedDelayString = "${app.email.file.intervalle-ms:10000}")
    public void envoyerEmailsPlanifies() {
        if (actif) {
            envoyerEnAttente();
        }
    }

    /** @return nombre d'emails traités (envoyés ou en échec). */
    public int envoyerEnAttente() {
        int traites = 0;
        while (traites < LOT && Boolean.TRUE.equals(transaction.execute(s -> envoyerLeProchain()))) {
            traites++;
        }
        return traites;
    }

    private boolean envoyerLeProchain() {
        Optional<EmailSortant> prochain = file.verrouillerProchainAEnvoyer(LocalDateTime.now());
        if (prochain.isEmpty()) {
            return false;
        }
        EmailSortant email = prochain.get();
        try {
            emailService.sendEmail(email.getDestinataire(), email.getSujet(), email.getCorpsHtml());
            email.marquerEnvoye();
        } catch (Exception e) {
            if (email.marquerEchec(e.getMessage())) {
                logger.error("Email {} abandonné après {} essais ({}) : {}",
                        email.getId(), email.getTentatives(), email.getSujet(), e.getMessage());
            } else {
                logger.warn("Échec d'envoi de l'email {} (essai {}), nouvel essai à {} : {}",
                        email.getId(), email.getTentatives(), email.getProchainEssai(), e.getMessage());
            }
        }
        return true;
    }

    /** Les emails envoyés ou abandonnés sont supprimés de la file après 30 jours. */
    @Scheduled(cron = "0 45 3 * * *")
    public void purgerEmailsTraites() {
        Integer supprimes = transaction.execute(s ->
                file.supprimerTraitesAvant(LocalDateTime.now().minusDays(CONSERVATION_JOURS)));
        logger.info("File d'emails : {} email(s) traité(s) de plus de {} jours supprimé(s)",
                supprimes, CONSERVATION_JOURS);
    }
}
