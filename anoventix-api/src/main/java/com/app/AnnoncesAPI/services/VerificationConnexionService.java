package com.app.AnnoncesAPI.services;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.app.AnnoncesAPI.entities.CodeSecours;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.entities.VerificationConnexion;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.exceptions.TooManyAttemptsException;
import com.app.AnnoncesAPI.payload.response.DoubleAuthentificationResponse;
import com.app.AnnoncesAPI.payload.response.JwtResponse;
import com.app.AnnoncesAPI.repositories.CodeSecoursRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.repositories.VerificationConnexionRepository;
import com.app.AnnoncesAPI.security.JwtUtils;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

/**
 * Double authentification des modérateurs et administrateurs, à chaque connexion (DEC-03,
 * module 01 §4.8).
 *
 * <ol>
 *   <li>Mot de passe correct : {@link #demarrer} envoie un code à 6 chiffres par email (10 min).</li>
 *   <li>{@link #verifier} : le code (ou un code de secours) ouvre la session. 5 essais par code,
 *       usage unique.</li>
 *   <li>La première fois, 8 codes de secours sont remis (une seule fois) pour les jours où
 *       l'email est indisponible.</li>
 *   <li>Chaque connexion réussie déclenche un email d'alerte au titulaire.</li>
 * </ol>
 *
 * Le code n'est jamais journalisé ni stocké en clair.
 */
@Service
public class VerificationConnexionService {

    private static final Logger logger = LoggerFactory.getLogger(VerificationConnexionService.class);

    static final Duration VALIDITE_CODE = Duration.ofMinutes(10);
    static final int TENTATIVES_MAX = 5;
    /** Un envoi initial et 3 renvois par fenêtre de 15 minutes (RG-01-37). */
    static final int ENVOIS_MAX = 4;
    static final Duration FENETRE_ENVOIS = Duration.ofMinutes(15);
    static final int NOMBRE_CODES_SECOURS = 8;

    /** Sans O, I, 0, 1 : lisibles à la dictée. */
    private static final String ALPHABET_SECOURS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String MESSAGE_INVALIDE = "Code invalide ou expiré.";
    private static final DateTimeFormatter DATE_ALERTE = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    private final VerificationConnexionRepository verifications;
    private final CodeSecoursRepository codesSecours;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;
    private final SessionService sessionService;
    private final EmailNotificationService emails;
    private final String emailSupport;
    private final TransactionTemplate transaction;
    private final SecureRandom aleatoire = new SecureRandom();

    public VerificationConnexionService(VerificationConnexionRepository verifications,
                                        CodeSecoursRepository codesSecours,
                                        UserRepository users,
                                        PasswordEncoder encoder,
                                        JwtUtils jwtUtils,
                                        SessionService sessionService,
                                        EmailNotificationService emails,
                                        PlatformTransactionManager transactionManager,
                                        @Value("${app.support-email:support@anoventix.com}") String emailSupport) {
        this.verifications = verifications;
        this.codesSecours = codesSecours;
        this.users = users;
        this.encoder = encoder;
        this.jwtUtils = jwtUtils;
        this.sessionService = sessionService;
        this.emails = emails;
        this.emailSupport = emailSupport;
        // Transaction propre à chaque saisie : un mauvais code doit enregistrer l'essai malgré
        // l'exception (AuthServiceImpl, transactionnel, annulerait tout).
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Les comptes concernés par la double authentification. */
    public static boolean concerne(User user) {
        return user.getRole() != null
                && (user.getRole().getName() == TypeRole.MODERATEUR
                    || user.getRole().getName() == TypeRole.ADMINISTRATEUR);
    }

    // ─── Étape 1 : envoi du code ───────────────────────────────────────────

    /** Crée un défi et envoie le code. S'exécute dans la transaction de la connexion. */
    @Transactional
    public DoubleAuthentificationResponse demarrer(User user) {
        LocalDateTime maintenant = LocalDateTime.now();
        // Limite aussi l'envoi massif d'emails vers la boîte d'un compte du staff.
        if (verifications.countByUserIdAndCreeLeAfter(user.getId(), maintenant.minus(FENETRE_ENVOIS)) >= ENVOIS_MAX) {
            throw new TooManyAttemptsException("Trop de codes demandés. Réessayez dans quelques minutes.");
        }
        verifications.annulerActifs(user.getId(), maintenant);

        String code = String.format("%06d", aleatoire.nextInt(1_000_000));
        VerificationConnexion defi = verifications.save(new VerificationConnexion(
                UUID.randomUUID(), user.getId(), encoder.encode(code), maintenant.plus(VALIDITE_CODE)));

        emails.notifierSensible(user, "Votre code de connexion AnoventiX", "Code de connexion",
                "Votre code de vérification : " + code
                        + "\n\nIl est valable " + VALIDITE_CODE.toMinutes() + " minutes et ne sert qu'une fois."
                        + "\nSi vous n'avez pas essayé de vous connecter, changez votre mot de passe sans attendre.");
        logger.info("Double authentification : code envoyé au compte {}", user.getId());
        return DoubleAuthentificationResponse.parEmail(defi.getId(), VALIDITE_CODE.toSeconds());
    }

    /** « Renvoyer le code » : annule le défi en cours et en envoie un nouveau (3 renvois par 15 minutes). */
    @Transactional
    public DoubleAuthentificationResponse renvoyer(UUID verificationId) {
        VerificationConnexion defi = verifications.findById(verificationId)
                .filter(d -> d.getUtiliseLe() == null)
                .orElseThrow(() -> new BadCredentialsException(MESSAGE_INVALIDE));
        User user = users.findById(defi.getUserId()).orElseThrow(() -> new BadCredentialsException(MESSAGE_INVALIDE));
        if (!UserDetailsImpl.build(user).isEnabled() || !concerne(user)) {
            throw new BadCredentialsException(MESSAGE_INVALIDE);
        }
        return demarrer(user);
    }

    // ─── Étape 2 : saisie du code ──────────────────────────────────────────

    /** Résultat d'une saisie réussie : les jetons, plus les codes de secours à la première fois. */
    public JwtResponse verifier(UUID verificationId, String saisie, String appareil, String adresseIp) {
        Resultat resultat = transaction.execute(statut -> {
            try {
                return new Resultat(verifierEnBase(verificationId, saisie, appareil, adresseIp), null);
            } catch (AuthenticationException e) {
                return new Resultat(null, e);
            }
        });
        if (resultat.echec() != null) {
            throw resultat.echec();
        }
        return resultat.reponse();
    }

    private record Resultat(JwtResponse reponse, AuthenticationException echec) {}

    private JwtResponse verifierEnBase(UUID verificationId, String saisie, String appareil, String adresseIp) {
        VerificationConnexion defi = verifications.verrouiller(verificationId)
                .orElseThrow(() -> new BadCredentialsException(MESSAGE_INVALIDE));
        if (!defi.estUtilisable()) {
            throw new BadCredentialsException(MESSAGE_INVALIDE);
        }
        User user = users.findById(defi.getUserId()).orElseThrow(() -> new BadCredentialsException(MESSAGE_INVALIDE));
        if (!UserDetailsImpl.build(user).isEnabled()) {
            throw new DisabledException("Votre compte n'est pas actif. Contactez l'administrateur.");
        }

        String code = saisie.trim();
        boolean valide = estCodeSecours(code)
                ? consommerCodeSecours(user, code)
                : encoder.matches(code, defi.getCodeHash());
        if (!valide) {
            boolean epuise = defi.enregistrerEchec(TENTATIVES_MAX);
            logger.warn("Double authentification : code incorrect pour le compte {} (essai {}/{})",
                    user.getId(), defi.getTentatives(), TENTATIVES_MAX);
            throw new BadCredentialsException(epuise
                    ? "Trop d'essais. Reconnectez-vous pour recevoir un nouveau code."
                    : "Code incorrect. Il vous reste " + (TENTATIVES_MAX - defi.getTentatives()) + " essai(s).");
        }

        defi.marquerUtilise();
        return ouvrirSession(user, appareil, adresseIp);
    }

    private JwtResponse ouvrirSession(User user, String appareil, String adresseIp) {
        UserDetailsImpl details = UserDetailsImpl.build(user);
        JwtResponse reponse = new JwtResponse(
                user.getId(),
                user.getEmail(),
                jwtUtils.buildAccessToken(user.getEmail()),
                sessionService.ouvrirSession(user),
                details.getAuthorities().stream().map(a -> a.getAuthority()).toList(),
                details.isMustChangePassword());

        // Première connexion avec double authentification : codes de secours, montrés une seule fois.
        if (user.getCodesSecoursGeneresLe() == null) {
            reponse.setCodesSecours(genererCodesSecours(user));
        }

        emails.notifier(user, "Nouvelle connexion à votre compte AnoventiX", "Nouvelle connexion",
                "Connexion à votre compte le " + LocalDateTime.now().format(DATE_ALERTE)
                        + "\nAppareil : " + (appareil == null || appareil.isBlank() ? "inconnu" : appareil)
                        + "\nAdresse IP approximative : " + masquer(adresseIp)
                        + "\n\nSi ce n'était pas vous, changez votre mot de passe et écrivez à " + emailSupport + ".");
        logger.info("Double authentification : connexion du compte {} validée", user.getId());
        return reponse;
    }

    // ─── Codes de secours ──────────────────────────────────────────────────

    /** Format d'un code de secours : XXXX-XXXX (le code email ne contient que des chiffres). */
    private static boolean estCodeSecours(String saisie) {
        return saisie.length() > 6 && saisie.contains("-");
    }

    private boolean consommerCodeSecours(User user, String saisie) {
        String code = saisie.toUpperCase();
        for (CodeSecours candidat : codesSecours.findByUserIdAndUtiliseLeIsNull(user.getId())) {
            if (encoder.matches(code, candidat.getCodeHash())) {
                candidat.marquerUtilise();
                return true;
            }
        }
        return false;
    }

    /** Régénération depuis le profil : les codes précédents sont annulés. Le mot de passe est redemandé. */
    @Transactional
    public List<String> regenererCodesSecours(UUID userId, String motDePasse) {
        User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));
        if (!concerne(user)) {
            throw new IllegalStateException("Les codes de secours concernent les comptes de modération et d'administration.");
        }
        if (!encoder.matches(motDePasse, user.getPassword())) {
            throw new BadCredentialsException("Mot de passe incorrect.");
        }
        return genererCodesSecours(user);
    }

    private List<String> genererCodesSecours(User user) {
        codesSecours.supprimerDe(user.getId());
        List<String> clairs = new ArrayList<>();
        for (int i = 0; i < NOMBRE_CODES_SECOURS; i++) {
            String code = nouveauCodeSecours();
            clairs.add(code);
            codesSecours.save(new CodeSecours(user.getId(), encoder.encode(code)));
        }
        user.setCodesSecoursGeneresLe(LocalDateTime.now());
        users.save(user);
        return clairs;
    }

    private String nouveauCodeSecours() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            if (i == 4) {
                sb.append('-');
            }
            sb.append(ALPHABET_SECOURS.charAt(aleatoire.nextInt(ALPHABET_SECOURS.length())));
        }
        return sb.toString();
    }

    // ─── Divers ────────────────────────────────────────────────────────────

    /** Adresse IP approximative : dernier octet IPv4 masqué, IPv6 tronquée. */
    static String masquer(String ip) {
        if (ip == null || ip.isBlank()) {
            return "inconnue";
        }
        if (ip.contains(".")) {
            int dernier = ip.lastIndexOf('.');
            return ip.substring(0, dernier) + ".xxx";
        }
        String[] blocs = ip.split(":");
        return String.join(":", java.util.Arrays.copyOf(blocs, Math.min(4, blocs.length))) + "::";
    }

    @Scheduled(cron = "0 25 3 * * *")
    @Transactional
    public void purgerDefisAnciens() {
        int supprimes = verifications.supprimerCreesAvant(LocalDateTime.now().minusDays(7));
        logger.info("Double authentification : {} défi(s) de plus de 7 jours supprimé(s)", supprimes);
    }
}
