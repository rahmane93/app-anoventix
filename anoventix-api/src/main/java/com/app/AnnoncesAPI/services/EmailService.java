package com.app.AnnoncesAPI.services;

import jakarta.mail.MessagingException;

/**
 * Envoi effectif d'un email (SMTP). Appelé uniquement par la file d'envoi
 * ({@link EnvoiEmailsPlanifie}) : pour envoyer un email, passer par
 * {@link NotificationService}.
 */
public interface EmailService {

    /**
     * @param to      destinataire
     * @param subject objet
     * @param body    corps HTML
     * @throws MessagingException si l'envoi échoue (la file réessaiera)
     */
    void sendEmail(String to, String subject, String body) throws MessagingException;
}
