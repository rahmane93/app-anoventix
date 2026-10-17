package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;

/**
 * Durée de validité des annonces : une annonce publiée expire au bout de
 * {@code annonce.duree-validite-jours} (180 par défaut), avec une relance email
 * {@code annonce.relance-jours-avant} jours avant. Une annonce expirée est clôturée
 * (motif EXPIREE) et se prolonge gratuitement via PUT /api/biens-immo/{id}/reactiver.
 *
 * <p>But : purger le catalogue des annonces abandonnées (bien vendu hors plateforme,
 * propriétaire inactif), pas facturer.
 */
@Service
public class AnnonceExpirationService {

    private static final Logger logger = LoggerFactory.getLogger(AnnonceExpirationService.class);
    private static final DateTimeFormatter DATE_FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final BienImmoRepository bienImmoRepository;
    private final EmailNotificationService emailNotificationService;

    @Value("${annonce.duree-validite-jours:180}")
    private int dureeValiditeJours;

    @Value("${annonce.relance-jours-avant:7}")
    private int relanceJoursAvant;

    public AnnonceExpirationService(BienImmoRepository bienImmoRepository,
                                    EmailNotificationService emailNotificationService) {
        this.bienImmoRepository = bienImmoRepository;
        this.emailNotificationService = emailNotificationService;
    }

    /** Démarre une nouvelle période de validité (création, remise en ligne, prolongation). */
    public void prolonger(Annonce annonce) {
        annonce.setDateExpiration(LocalDateTime.now().plusDays(dureeValiditeJours));
        annonce.setRelanceExpirationEnvoyee(false);
    }

    /** Job quotidien : relance les annonces qui expirent bientôt, puis clôture les expirées. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void traiterExpirations() {
        LocalDateTime maintenant = LocalDateTime.now();
        relancer(maintenant);
        cloturerExpirees(maintenant);
    }

    void relancer(LocalDateTime maintenant) {
        // Compte masqué par l'administrateur : pas de relance (il ne peut pas prolonger) ;
        // relanceExpirationEnvoyee reste faux, la relance partira si le masquage est levé à temps.
        List<BienImmo> aRelancer = bienImmoRepository
                .findByActifTrueAndStatutModerationAndRelanceExpirationEnvoyeeFalseAndDateExpirationBetween(
                        StatutAnnonce.PUBLIEE, maintenant, maintenant.plusDays(relanceJoursAvant))
                .stream()
                .filter(a -> !a.getOwner().isAnnoncesMasquees())
                .toList();
        for (BienImmo annonce : aRelancer) {
            emailNotificationService.notifier(annonce.getOwner(),
                    "Votre annonce expire bientôt",
                    "Votre annonce expire bientôt",
                    "Votre annonce « " + annonce.getTitre() + " » (réf. " + annonce.getReferenceAnnonce()
                            + ") expirera le " + annonce.getDateExpiration().format(DATE_FR) + ".\n"
                            + "Si le bien est toujours disponible, prolongez-la gratuitement depuis "
                            + "« Mes annonces » après son expiration.");
            annonce.setRelanceExpirationEnvoyee(true);
        }
        if (!aRelancer.isEmpty()) {
            bienImmoRepository.saveAll(aRelancer);
            logger.info("{} relance(s) d'expiration envoyée(s)", aRelancer.size());
        }
    }

    void cloturerExpirees(LocalDateTime maintenant) {
        List<BienImmo> expirees = bienImmoRepository.findByActifTrueAndDateExpirationBefore(maintenant);
        for (BienImmo annonce : expirees) {
            annonce.setActif(false);
            annonce.setMotifCloture(MotifCloture.EXPIREE);
            annonce.setDateCloture(maintenant);
            emailNotificationService.notifier(annonce.getOwner(),
                    "Votre annonce a expiré",
                    "Votre annonce a expiré",
                    "Votre annonce « " + annonce.getTitre() + " » (réf. " + annonce.getReferenceAnnonce()
                            + ") n'est plus visible.\n"
                            + (annonce.getOwner().isAnnoncesMasquees()
                                    ? "Vous pourrez la prolonger gratuitement depuis « Mes annonces » une fois "
                                            + "le masquage de vos annonces levé par la modération."
                                    : "Vous pouvez la prolonger gratuitement depuis « Mes annonces »."));
        }
        if (!expirees.isEmpty()) {
            bienImmoRepository.saveAll(expirees);
            logger.info("{} annonce(s) clôturée(s) pour expiration", expirees.size());
        }
    }
}
