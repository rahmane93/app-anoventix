package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.app.AnnoncesAPI.entities.AppareilPush;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.repositories.AppareilPushRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

/**
 * Notifications push (DEC-13) : enregistrement des appareils et envoi. L'envoi part après la validation de
 * la transaction en cours et en arrière-plan : il ne ralentit ni ne fait échouer l'action de l'utilisateur.
 */
@Service
public class PushService {

    private static final Logger logger = LoggerFactory.getLogger(PushService.class);
    private static final int APPAREILS_MAX_PAR_COMPTE = 10;

    private final AppareilPushRepository appareils;
    private final UserRepository utilisateurs;
    private final ExpoPushClient client;

    public PushService(AppareilPushRepository appareils, UserRepository utilisateurs, ExpoPushClient client) {
        this.appareils = appareils;
        this.utilisateurs = utilisateurs;
        this.client = client;
    }

    /** Enregistre (ou rattache au compte courant) le jeton de l'appareil. */
    @Transactional
    public void enregistrer(UUID userId, String jeton, String plateforme) {
        if (jeton == null || !jeton.matches("^(Expo|Exponent)PushToken\\[[^\\]]{5,180}\\]$")) {
            throw new IllegalArgumentException("Jeton de notification invalide.");
        }
        User user = utilisateurs.getReferenceById(userId);
        AppareilPush appareil = appareils.findByJeton(jeton).orElseGet(AppareilPush::new);
        appareil.setJeton(jeton);
        appareil.setUser(user);
        appareil.setPlateforme(plateforme == null || plateforme.isBlank() ? "android" : plateforme);
        appareil.setDateEnregistrement(LocalDateTime.now());
        appareils.save(appareil);
        // Un compte garde ses appareils les plus récents : les plus anciens sont retirés.
        List<AppareilPush> tous = new ArrayList<>(appareils.findByUserId(userId));
        tous.sort((a, b) -> b.getDateEnregistrement().compareTo(a.getDateEnregistrement()));
        for (int i = APPAREILS_MAX_PAR_COMPTE; i < tous.size(); i++) {
            appareils.delete(tous.get(i));
        }
    }

    @Transactional
    public void supprimer(UUID userId, String jeton) {
        appareils.supprimerDuCompte(jeton, userId);
    }

    @Transactional
    public void supprimerTous(UUID userId) {
        appareils.supprimerTousDuCompte(userId);
    }

    /**
     * Envoie une notification à tous les appareils du compte, une fois la transaction validée. Le texte ne
     * doit jamais contenir le contenu d'un message (écran verrouillé).
     */
    public void notifier(UUID userId, String titre, String corps, Map<String, Object> donnees) {
        List<String> jetons = appareils.findByUserId(userId).stream().map(AppareilPush::getJeton).toList();
        if (jetons.isEmpty()) {
            return;
        }
        List<Map<String, Object>> messages = new ArrayList<>();
        for (String jeton : jetons) {
            messages.add(Map.of("to", jeton, "title", titre, "body", corps, "data", donnees,
                    "channelId", "default", "priority", "high", "sound", "default"));
        }
        Runnable envoi = () -> CompletableFuture.runAsync(() -> {
            try {
                List<String> invalides = client.envoyer(messages);
                if (!invalides.isEmpty()) {
                    retirerInvalides(invalides);
                }
            } catch (RuntimeException e) {
                logger.warn("Notification push perdue : {}", e.getMessage());
            }
        });
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    envoi.run();
                }
            });
        } else {
            envoi.run();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void retirerInvalides(List<String> jetons) {
        appareils.supprimerJetons(jetons);
    }
}
