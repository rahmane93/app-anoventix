package com.app.AnnoncesAPI.services;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.Utilities.MotDePasse;
import com.app.AnnoncesAPI.Utilities.Utility;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.UserRepository;

/**
 * Invitation d'un agent par lien à usage unique.
 *
 * Avant : le professionnel créait l'agent, l'API lui générait un mot de passe temporaire envoyé en
 * clair par email, sans limite de durée. Désormais l'agent reçoit un lien valable 7 jours, une seule
 * fois, et choisit lui-même son mot de passe : aucun mot de passe n'est généré ni transmis. Le compte
 * reste inutilisable (mot de passe aléatoire jamais communiqué) tant que l'invitation n'est pas acceptée.
 *
 * Le jeton réutilise les colonnes de l'activation par email (activation_code, activation_code_expiry).
 */
@Service
public class InvitationAgentService {

    private static final Logger logger = LoggerFactory.getLogger(InvitationAgentService.class);

    static final Duration VALIDITE = Duration.ofDays(7);
    private static final String MESSAGE_INVALIDE = "Lien d'invitation invalide ou expiré. Demandez à votre responsable de vous le renvoyer.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final String urlSite;
    private final SecureRandom aleatoire = new SecureRandom();

    public InvitationAgentService(UserRepository userRepository,
                                  PasswordEncoder passwordEncoder,
                                  NotificationService notificationService,
                                  @Value("${app.web.url:https://www.anoventix.com}") String urlSite) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
        this.urlSite = urlSite.replaceAll("/+$", "");
    }

    /** Mot de passe aléatoire que personne ne connaît : le compte ne s'ouvre qu'après l'invitation. */
    public String motDePasseInutilisable() {
        byte[] octets = new byte[32];
        aleatoire.nextBytes(octets);
        return passwordEncoder.encode(Base64.getEncoder().encodeToString(octets));
    }

    /**
     * Prépare l'invitation (nouveau jeton, ancien invalidé) et met l'email en file. L'email ne part
     * qu'une fois la transaction de l'appelant validée.
     */
    @Transactional
    public void inviter(User agent, User proprietaire, Entreprise entreprise) {
        agent.setActivationCode(UUID.randomUUID().toString());
        agent.setActivationCodeExpiry(System.currentTimeMillis() + VALIDITE.toMillis());
        userRepository.save(agent);

        String nomResponsable = ((proprietaire.getPrenom() != null ? proprietaire.getPrenom() + " " : "")
                + (proprietaire.getNom() != null ? proprietaire.getNom() : "")).trim();
        // HashMap (et non Map.of) car Map.of lève une NPE si une valeur est null.
        Map<String, String> variables = new HashMap<>();
        variables.put("prenom", agent.getPrenom() != null ? agent.getPrenom() : "");
        variables.put("nom", agent.getNom() != null ? agent.getNom() : "");
        variables.put("parentNomComplet", nomResponsable.isBlank() ? proprietaire.getEmail() : nomResponsable);
        variables.put("entrepriseName", entreprise.getNom() != null ? entreprise.getNom() : "");
        variables.put("invitationLink", urlSite + "/invitation?token=" + agent.getActivationCode());
        variables.put("jours", String.valueOf(VALIDITE.toDays()));
        String corps = Utility.renderEmail("templates/email-invitation-agent.html", variables,
                "Vous êtes invité à rejoindre " + variables.get("entrepriseName") + " sur AnoventiX.",
                "Vous ne connaissez pas cette entreprise ? Ignorez simplement cet e-mail.");
        // Le lien donne accès au compte : le corps est effacé de la file dès l'envoi.
        notificationService.envoyer(agent.getEmail(), "Invitation à rejoindre " + variables.get("entrepriseName") + " sur AnoventiX", corps, true);
        logger.info("Invitation envoyée à l'agent {}", agent.getId());
    }

    /** Un compte invité qui n'a pas encore accepté (jeton présent, statut en attente). */
    public static boolean invitationEnAttente(User agent) {
        return agent.getActivationCode() != null && agent.getStatut() == StatutUtilisateur.EN_ATTENTE_ACTIVATION;
    }

    /** L'agent choisit son mot de passe depuis le lien : le compte devient actif. */
    @Transactional
    public void accepter(String jeton, String motDePasse) {
        if (jeton == null || jeton.isBlank()) {
            throw new IllegalArgumentException(MESSAGE_INVALIDE);
        }
        User agent = userRepository.findByActivationCode(jeton)
                .filter(u -> u.getRole() != null && u.getRole().getName() == TypeRole.AGENT_PROFESSIONNEL)
                .filter(u -> u.getStatut() == StatutUtilisateur.EN_ATTENTE_ACTIVATION)
                .orElseThrow(() -> new IllegalArgumentException(MESSAGE_INVALIDE));
        Long expiration = agent.getActivationCodeExpiry();
        if (expiration == null || System.currentTimeMillis() > expiration) {
            throw new IllegalArgumentException(MESSAGE_INVALIDE);
        }
        if (!MotDePasse.estValide(motDePasse)) {
            throw new IllegalArgumentException(MotDePasse.MESSAGE);
        }

        agent.setPassword(passwordEncoder.encode(motDePasse));
        agent.setStatut(StatutUtilisateur.ACTIF);
        // Un agent invité avant ce mécanisme avait un mot de passe temporaire à changer : c'est fait.
        agent.setMustChangePassword(false);
        agent.setActivationCode(null);
        agent.setActivationCodeExpiry(null);
        agent.setPasswordChangedAt(System.currentTimeMillis());
        userRepository.save(agent);
        logger.info("Invitation acceptée par l'agent {}", agent.getId());
    }
}
