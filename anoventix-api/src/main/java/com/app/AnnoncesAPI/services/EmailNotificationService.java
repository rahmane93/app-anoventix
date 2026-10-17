package com.app.AnnoncesAPI.services;

import java.util.Map;

import org.springframework.stereotype.Service;

import com.app.AnnoncesAPI.Utilities.Utility;
import com.app.AnnoncesAPI.entities.User;

/**
 * Notifications email aux utilisateurs (modération, pièce d'identité, expiration d'annonce),
 * mises en forme avec le gabarit commun.
 *
 * <p>L'email est inscrit dans la file d'envoi, dans la transaction de l'appelant : un email
 * « votre annonce a été rejetée » ne part donc que si la décision est bien enregistrée.
 */
@Service
public class EmailNotificationService {

    private final NotificationService notificationService;

    public EmailNotificationService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * @param destinataire utilisateur notifié (ignoré s'il n'a pas d'email exploitable)
     * @param sujet        objet de l'email
     * @param titre        titre affiché dans le corps
     * @param message      texte (sauts de ligne conservés) ; échappé par le template
     */
    public void notifier(User destinataire, String sujet, String titre, String message) {
        if (destinataire == null || destinataire.getEmail() == null
                || destinataire.getEmail().endsWith("@anonyme.invalid")) {
            return;
        }
        String corps = Utility.renderEmail("templates/email-notification.html",
                Map.of("titre", titre, "message", message),
                titre,
                "Vous recevez cet e-mail car vous avez un compte AnoventiX. Retrouvez le détail dans l'application.");
        notificationService.envoyer(destinataire.getEmail(), sujet, corps, false);
    }
}
