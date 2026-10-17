package com.app.AnnoncesAPI.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.entities.EmailSortant;
import com.app.AnnoncesAPI.repositories.EmailSortantRepository;

/**
 * Point d'entrée unique pour envoyer un email : l'inscrit dans la file d'envoi
 * (table email_sortant), dans la transaction de l'appelant. L'envoi réel, avec
 * nouveaux essais, est fait par {@link EnvoiEmailsPlanifie}.
 *
 * Conséquences pour l'appelant : si sa transaction est annulée, l'email ne part
 * pas ; s'il réussit, l'email partira même si le serveur SMTP est momentanément
 * indisponible.
 */
@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final EmailSortantRepository file;

    public NotificationService(EmailSortantRepository file) {
        this.file = file;
    }

    /** Lien d'activation : contenu sensible, effacé de la file après l'envoi. */
    @Transactional
    public void envoyerActivation(String email, String htmlBody) {
        ajouter(email, "Activez votre compte AnoventiX", htmlBody, true);
    }

    /** Code de réinitialisation : contenu sensible, effacé de la file après l'envoi. */
    @Transactional
    public void envoyerReinitialisation(String email, String htmlBody) {
        ajouter(email, "Votre code de réinitialisation AnoventiX", htmlBody, true);
    }

    /**
     * @param contenuSensible vrai si le corps contient un secret (mot de passe, code, lien
     *                        d'accès) : il est effacé de la file dès l'envoi ou l'abandon.
     */
    @Transactional
    public void envoyer(String email, String sujet, String htmlBody, boolean contenuSensible) {
        ajouter(email, sujet, htmlBody, contenuSensible);
    }

    private void ajouter(String email, String sujet, String htmlBody, boolean contenuSensible) {
        EmailSortant e = file.save(new EmailSortant(email, sujet, htmlBody, contenuSensible));
        // Ni le corps ni le secret qu'il peut contenir ne sont journalisés.
        logger.info("Email {} mis en file pour {} : {}", e.getId(), email, sujet);
    }
}
