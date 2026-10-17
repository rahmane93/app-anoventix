package com.app.AnnoncesAPI.services;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.app.AnnoncesAPI.Utilities.Identifiants;
import com.app.AnnoncesAPI.Utilities.Utility;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.jsonwebtoken.Claims;

import com.app.AnnoncesAPI.entities.Role;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.exceptions.TooManyAttemptsException;
import com.app.AnnoncesAPI.payload.request.LoginRequest;
import com.app.AnnoncesAPI.payload.request.SignupRequest;
import com.app.AnnoncesAPI.payload.response.JwtResponse;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.security.JwtUtils;
import com.app.AnnoncesAPI.security.LoginAttemptTracker;
import com.app.AnnoncesAPI.security.TokenBlacklist;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthServiceImpl.class);
    private static final String EMAIL_REGEX = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
    /** Durée de vie d'un token d'activation : 48 heures (P1.4). */
    private static final long ACTIVATION_TTL_MS = 48L * 60L * 60L * 1000L;
    /** Durée de vie d'un token de reset password : 15 minutes. */
    private static final long RESET_TTL_MS = 15L * 60L * 1000L;
    
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;
    private final TokenBlacklist tokenBlacklist;
    private final NotificationService notificationService;
    private final LoginAttemptTracker loginAttemptTracker;
    private final CompteSuppressionService compteSuppressionService;
    private final String baseUrl;

    public AuthServiceImpl(AuthenticationManager authenticationManager,
                           UserRepository userRepository,
                           RoleRepository roleRepository,
                           PasswordEncoder encoder,
                           JwtUtils jwtUtils,
                           TokenBlacklist tokenBlacklist,
                           NotificationService notificationService,
                           LoginAttemptTracker loginAttemptTracker,
                           CompteSuppressionService compteSuppressionService,
                           @Value("${app.base-url}") String baseUrl) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.encoder = encoder;
        this.jwtUtils = jwtUtils;
        this.tokenBlacklist = tokenBlacklist;
        this.notificationService = notificationService;
        this.loginAttemptTracker = loginAttemptTracker;
        this.compteSuppressionService = compteSuppressionService;
        this.baseUrl = baseUrl;
    }

    @Override
    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        if (loginRequest == null || loginRequest.getIdentifier() == null || loginRequest.getPassword() == null
                || loginRequest.getIdentifier().isBlank() || loginRequest.getPassword().isBlank()) {
            throw new IllegalArgumentException("Paramètres de connexion manquants.");
        }

        String identifier = loginRequest.getIdentifier();
        String attemptKey = LoginAttemptTracker.loginKey(identifier);
        checkNotLocked(attemptKey);
        User user = resolveUserCountingFailure(identifier, attemptKey);

        // Vérifier le statut du compte
        // Les agents avec mustChangePassword peuvent se connecter (statut EN_ATTENTE_ACTIVATION toléré)
        boolean isAgentPendingPasswordChange = Boolean.TRUE.equals(user.getMustChangePassword())
                && user.getStatut() == StatutUtilisateur.EN_ATTENTE_ACTIVATION;

        if (user.getStatut() != StatutUtilisateur.ACTIF && !isAgentPendingPasswordChange) {
            switch (user.getStatut()) {
                case EN_ATTENTE_ACTIVATION:
                    throw new DisabledException("Votre compte n'est pas activé. Veuillez cliquer sur le lien d'activation reçu par email.");
                case INACTIF: {
                    // Suppression demandée par l'utilisateur, encore réversible : on l'indique
                    // (l'app propose alors « Réactiver mon compte »), mais seulement si le mot de
                    // passe est correct, pour ne pas révéler l'état du compte à un tiers.
                    LocalDateTime demande = user.getDateSuppressionDemandee();
                    LocalDateTime limite = demande != null
                            ? demande.plusDays(User.DELAI_GRACE_SUPPRESSION_JOURS) : null;
                    if (limite != null && limite.isAfter(LocalDateTime.now())
                            && encoder.matches(loginRequest.getPassword(), user.getPassword())) {
                        throw new DisabledException("Votre compte est en cours de suppression. Vous pouvez le réactiver jusqu'au "
                                + limite.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ".");
                    }
                    throw new DisabledException("Votre compte a été désactivé. Contactez l'administrateur.");
                }
                case SUSPENDU:
                    throw new DisabledException("Votre compte est temporairement suspendu. Contactez l'administrateur.");
                default:
                    throw new DisabledException("Compte désactivé.");
            }
        }

        try {
            // Authentification via email (principal Spring Security = email)
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getEmail(), loginRequest.getPassword()));

            String jwt = jwtUtils.generateJwtToken(authentication);
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String refreshToken = jwtUtils.generateRefreshToken(userDetails.getUsername());
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            loginAttemptTracker.reset(attemptKey);
            logger.info("Connexion reussie pour l'utilisateur ID={}", user.getId());
            if (userDetails.isMustChangePassword()) {
                logger.info("Changement de mot de passe requis pour l'utilisateur ID={}", user.getId());
            }

            return new JwtResponse(
                    userDetails.getId(),
                    userDetails.getEmail(),
                    jwt,
                    refreshToken,
                    roles,
                    userDetails.isMustChangePassword());
        } catch (BadCredentialsException e) {
            loginAttemptTracker.recordFailure(attemptKey);
            logger.warn("❌ Échec de connexion pour: {} - Mot de passe incorrect", identifier);
            throw new BadCredentialsException("Identifiant ou mot de passe incorrect.");
        }
    }

    @Override
    public JwtResponse reactivateAccount(LoginRequest request) {
        if (request == null
                || request.getIdentifier() == null || request.getIdentifier().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Identifiant et mot de passe requis.");
        }

        String identifier = request.getIdentifier();
        String attemptKey = LoginAttemptTracker.loginKey(identifier);
        checkNotLocked(attemptKey);
        User user = resolveUserCountingFailure(identifier, attemptKey);

        // Vérification du mot de passe AVANT toute info sur le statut — évite l'énumération.
        if (!encoder.matches(request.getPassword(), user.getPassword())) {
            loginAttemptTracker.recordFailure(attemptKey);
            logger.warn("Echec reactivation pour {} : mot de passe incorrect.", identifier);
            throw new BadCredentialsException("Identifiant ou mot de passe incorrect.");
        }

        // Seul un compte INACTIF est réactivable par l'utilisateur lui-même.
        switch (user.getStatut()) {
            case ACTIF -> throw new IllegalStateException("Votre compte est déjà actif.");
            case SUSPENDU -> throw new DisabledException(
                    "Votre compte est suspendu. Contactez l'administrateur.");
            case EN_ATTENTE_ACTIVATION -> throw new DisabledException(
                    "Votre compte n'est pas activé. Cliquez sur le lien d'activation reçu par email.");
            case INACTIF -> {
                // Seule une suppression demandée par l'utilisateur lui-même, pendant le délai
                // de grâce, est réversible par lui. Un compte désactivé par un admin ne l'est pas.
                LocalDateTime demande = user.getDateSuppressionDemandee();
                if (demande == null
                        || demande.plusDays(User.DELAI_GRACE_SUPPRESSION_JOURS).isBefore(LocalDateTime.now())) {
                    throw new DisabledException(
                            "Votre compte a été désactivé. Contactez l'administrateur.");
                }
            }
        }
        loginAttemptTracker.reset(attemptKey);

        user.setStatut(StatutUtilisateur.ACTIF);
        user.setMotifStatut(null);
        user.setDateSuppressionDemandee(null);
        userRepository.save(user);
        compteSuppressionService.restaurerApresReactivation(user);
        logger.info("Compte réactivé pour: {}", user.getEmail());

        // Émission d'un JWT comme un signin standard.
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getEmail(), request.getPassword()));
        String jwt = jwtUtils.generateJwtToken(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String refreshToken = jwtUtils.generateRefreshToken(userDetails.getUsername());
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        return new JwtResponse(
                userDetails.getId(),
                userDetails.getEmail(),
                jwt,
                refreshToken,
                roles,
                userDetails.isMustChangePassword());
    }

    @Override
    public String refreshAccessToken(String refreshToken) {
        Claims claims = jwtUtils.parseValidClaims(refreshToken)
                .filter(c -> JwtUtils.isOfType(c, JwtUtils.TYPE_REFRESH))
                .orElseThrow(() -> new BadCredentialsException("Refresh token invalide ou expiré."));

        User user = userRepository.findByEmail(claims.getSubject())
                .orElseThrow(() -> new BadCredentialsException("Refresh token invalide ou expiré."));

        // Le refresh ne doit pas prolonger la session d'un compte suspendu / désactivé,
        // ni survivre à un changement de mot de passe.
        if (!UserDetailsImpl.build(user).isEnabled()) {
            throw new DisabledException("Votre compte n'est pas actif. Contactez l'administrateur.");
        }
        if (JwtUtils.isIssuedBefore(claims, user.getPasswordChangedAt())) {
            throw new BadCredentialsException("Session expirée suite à un changement de mot de passe. Veuillez vous reconnecter.");
        }
        return jwtUtils.buildAccessToken(user.getEmail());
    }

    @Override
    public void logout(String accessToken, String refreshToken) {
        revokeQuietly(accessToken);
        revokeQuietly(refreshToken);
    }

    private void revokeQuietly(String token) {
        if (token != null && !token.isBlank()) {
            try {
                long expiresAt = jwtUtils.getExpirationMs(token);
                tokenBlacklist.revoke(token, expiresAt);
            } catch (Exception e) {
                logger.warn("Impossible de revoquer le token lors du logout: {}", e.getMessage());
            }
        }
    }

    @Override
    public void registerUser(SignupRequest signUpRequest) {
        if (signUpRequest == null || signUpRequest.getEmail() == null || signUpRequest.getPassword() == null
                || signUpRequest.getEmail().isBlank() || signUpRequest.getPassword().isBlank()) {
            throw new IllegalArgumentException("Paramètres d'inscription manquants.");
        }
        signUpRequest.setEmail(Identifiants.normaliserEmail(signUpRequest.getEmail()));

        if (!isValidEmail(signUpRequest.getEmail())) {
            throw new IllegalArgumentException("Erreur: Format d'email invalide.");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new IllegalArgumentException("Erreur: Email déjà utilisé!");
        }

        // Le téléphone sert d'identifiant de connexion : une seule forme (+224…, sans espaces).
        String telephone = Identifiants.normaliserTelephone(signUpRequest.getTelephone());
        if (telephone != null && userRepository.existsByTelephone(telephone)) {
            throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé.");
        }

        if (signUpRequest.getRole() != null) {
            Set<String> forbidden = Set.of("administrateur", "moderateur");
            if (forbidden.contains(signUpRequest.getRole().toLowerCase())) {
                throw new IllegalArgumentException("Attribution de ce rôle interdite lors de l'inscription.");
            }
        }

        if (!isValidPassword(signUpRequest.getPassword())) {
            throw new IllegalArgumentException("Erreur: Mot de passe trop faible.");
        }

        User user = new User();
        user.setEmail(signUpRequest.getEmail());
        user.setNom(signUpRequest.getNom());
        user.setPrenom(signUpRequest.getPrenom());
        user.setTelephone(telephone);
        user.setPassword(encoder.encode(signUpRequest.getPassword()));

        // P1.5 — Validation stricte du rôle. Toute valeur non reconnue est rejetée
        // (avant : fallback silencieux vers PARTICULIER, qui masquait les typos).
        String strRole = signUpRequest.getRole();
        Role role;
        if (strRole == null || strRole.isBlank()) {
            role = roleRepository.findByName(TypeRole.PARTICULIER)
                    .orElseThrow(() -> new IllegalStateException("Rôle PARTICULIER introuvable en base."));
        } else {
            role = switch (strRole.toLowerCase()) {
                case "particulier"   -> roleRepository.findByName(TypeRole.PARTICULIER)
                        .orElseThrow(() -> new IllegalStateException("Rôle PARTICULIER introuvable en base."));
                case "professionnel" -> roleRepository.findByName(TypeRole.PROFESSIONNEL)
                        .orElseThrow(() -> new IllegalStateException("Rôle PROFESSIONNEL introuvable en base."));
                default -> throw new IllegalArgumentException(
                        "Rôle invalide : '" + strRole + "'. Valeurs autorisées : 'particulier' ou 'professionnel'.");
            };
        }
        user.setRole(role);
        logger.info("Utilisateur {} enregistré avec le rôle: {}", user.getEmail(), role.getName().name());
        envoyerLienActivation(user);
    }

    @Override
    public void resendActivation(String email) {
        email = Identifiants.normaliserEmail(email);
        if (email == null || !isValidEmail(email)) {
            throw new IllegalArgumentException("Erreur: Format d'email invalide.");
        }
        // Limite par adresse (et non par IP) : sinon l'endpoint sert à inonder une boîte mail.
        String attemptKey = LoginAttemptTracker.resendKey(email);
        if (loginAttemptTracker.isBlocked(attemptKey, LoginAttemptTracker.MAX_RENVOIS)) {
            throw new TooManyAttemptsException(
                    "Trop de demandes pour cette adresse. Réessayez dans "
                    + LoginAttemptTracker.WINDOW.toMinutes() + " minutes.");
        }
        loginAttemptTracker.recordFailure(attemptKey);

        // Réponse identique que le compte existe ou non (anti-énumération) : on sort en silence.
        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty() || userOpt.get().getStatut() != StatutUtilisateur.EN_ATTENTE_ACTIVATION
                || Boolean.TRUE.equals(userOpt.get().getMustChangePassword())) {
            logger.info("Renvoi d'activation ignoré (compte inexistant ou déjà activé)");
            return;
        }
        envoyerLienActivation(userOpt.get());
    }

    /** Génère un nouveau token d'activation (48 h), le sauvegarde et envoie l'email. */
    private void envoyerLienActivation(User user) {
        user.setActivationCode(UUID.randomUUID().toString());
        user.setActivationCodeExpiry(System.currentTimeMillis() + ACTIVATION_TTL_MS);
        userRepository.save(user);

        String activationLink = baseUrl + "/activate?token=" + user.getActivationCode();
        String mailBody = buildActivationEmailBody(user.getPrenom(), user.getNom(), activationLink);
        notificationService.envoyerActivation(user.getEmail(), mailBody);
        logger.info("Demande d'envoi d'email d'activation initiée pour: {}", user.getEmail());
    }

    @Override
    public void activateAccount(String token) {
        logger.info("Tentative d'activation de compte");

        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token d'activation manquant.");
        }

        User user = userRepository.findByActivationCode(token)
                .orElseThrow(() -> new IllegalArgumentException("Lien d'activation invalide ou déjà utilisé."));

        // P1.4 — Vérification d'expiration du token (48h).
        // expiry == null : compte legacy créé avant l'introduction de l'expiration → accepté.
        Long expiry = user.getActivationCodeExpiry();
        if (expiry != null && System.currentTimeMillis() > expiry) {
            logger.warn("Tentative d'activation avec un token expiré pour: {}", user.getEmail());
            throw new IllegalArgumentException(
                    "Lien d'activation expiré. Demandez un nouveau lien d'activation.");
        }

        user.setStatut(StatutUtilisateur.ACTIF);
        user.setActivationCode(null);
        user.setActivationCodeExpiry(null);
        userRepository.save(user);

        logger.info("Compte activé avec succès pour: {}", user.getEmail());
    }

    @Override
    public void forgotPassword(String email) {
        logger.info("Demande de réinitialisation de mot de passe pour: {}", email);

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email manquant.");
        }
        email = Identifiants.normaliserEmail(email);
        if (!isValidEmail(email)) {
            throw new IllegalArgumentException("Erreur: Format d'email invalide.");
        }

        // P2.10 — Si l'email n'existe pas, log warn silencieux et return.
        // Aucune exception levée → la réponse HTTP reste indistinguable d'un succès,
        // mais l'opérateur peut tracer les demandes pour des emails inconnus.
        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            logger.warn("Demande de reset password pour un email inconnu: {} — silent.", email);
            return;
        }
        User user = userOpt.get();

        // P1.3 — Code 8 chiffres (100M combinaisons, TTL 15 min, usage unique).
        String resetToken = String.format("%08d", new SecureRandom().nextInt(100_000_000));
        user.setResetPasswordToken(resetToken);
        user.setResetPasswordTokenExpiry(System.currentTimeMillis() + RESET_TTL_MS);
        userRepository.save(user);
        // Nouveau code → nouveau quota d'essais.
        loginAttemptTracker.reset(LoginAttemptTracker.resetKey(email));

        // Le token est passé tel quel au template ; on ne logge JAMAIS le token en clair.
        String htmlBody = buildPasswordResetEmailBody(resetToken);
        notificationService.envoyerReinitialisation(user.getEmail(), htmlBody);
        logger.info("Email de réinitialisation envoyé pour: {}", email);
    }

    @Override
    public void resetPassword(String email, String token, String newPassword) {
        logger.info("Tentative de réinitialisation de mot de passe pour: {}", email);
        
        if (email == null || token == null || newPassword == null || email.isBlank() 
                || token.isBlank() || newPassword.isBlank()) {
            throw new IllegalArgumentException("Paramètres de réinitialisation manquants.");
        }
        email = Identifiants.normaliserEmail(email);

        // Le code ne fait que 8 chiffres : on limite les essais par email (et non par IP),
        // sinon il est brute-forçable en répartissant les requêtes sur plusieurs IP.
        String attemptKey = LoginAttemptTracker.resetKey(email);
        if (loginAttemptTracker.isBlocked(attemptKey)) {
            throw new TooManyAttemptsException(
                    "Trop de tentatives. Demandez un nouveau code de réinitialisation.");
        }

        User user = userRepository.findByEmailAndResetPasswordToken(email, token)
                .orElse(null);

        if (user == null || user.getResetPasswordTokenExpiry() == null 
                || user.getResetPasswordTokenExpiry() < System.currentTimeMillis()) {
            loginAttemptTracker.recordFailure(attemptKey);
            throw new IllegalArgumentException("Token invalide ou expiré.");
        }

        if (!isValidPassword(newPassword)) {
            throw new IllegalArgumentException("Erreur: Mot de passe trop faible.");
        }

        user.setPassword(encoder.encode(newPassword));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        // Invalide toutes les sessions existantes (access + refresh tokens).
        user.setPasswordChangedAt(System.currentTimeMillis());
        userRepository.save(user);
        loginAttemptTracker.reset(attemptKey);
        
        logger.info("Mot de passe réinitialisé avec succès pour: {}", email);
    }

    @Override
    public JwtResponse changePassword(String email, String oldPassword, String newPassword) {
        logger.info("Tentative de changement de mot de passe pour: {}", email);

        if (oldPassword == null || newPassword == null || oldPassword.isBlank() || newPassword.isBlank()) {
            throw new IllegalArgumentException("Paramètres manquants.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));

        if (!encoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Ancien mot de passe incorrect.");
        }

        if (!isValidPassword(newPassword)) {
            throw new IllegalArgumentException("Erreur: Mot de passe trop faible.");
        }

        user.setPassword(encoder.encode(newPassword));
        // Invalide toutes les sessions existantes (access + refresh tokens), y compris
        // celles d'un éventuel attaquant. La session courante reçoit de nouveaux tokens.
        user.setPasswordChangedAt(System.currentTimeMillis());

        // Si l'utilisateur avait un mot de passe temporaire, l'effacer et activer le compte
        if (Boolean.TRUE.equals(user.getMustChangePassword())) {
            user.setMustChangePassword(false);
            if (user.getStatut() == StatutUtilisateur.EN_ATTENTE_ACTIVATION) {
                user.setStatut(StatutUtilisateur.ACTIF);
            }
            logger.info("✅ Flag mustChangePassword remis à false pour: {}", email);
        }

        userRepository.save(user);

        logger.info("Mot de passe modifié avec succès pour: {}", email);

        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());
        return new JwtResponse(
                user.getId(),
                user.getEmail(),
                jwtUtils.buildAccessToken(user.getEmail()),
                jwtUtils.generateRefreshToken(user.getEmail()),
                roles,
                userDetails.isMustChangePassword());
    }

    private void checkNotLocked(String attemptKey) {
        if (loginAttemptTracker.isBlocked(attemptKey)) {
            throw new TooManyAttemptsException(
                    "Trop de tentatives de connexion. Réessayez dans "
                    + LoginAttemptTracker.WINDOW.toMinutes() + " minutes.");
        }
    }

    /** {@link #resolveUser} en comptant un identifiant inconnu comme un échec (anti-énumération). */
    private User resolveUserCountingFailure(String identifier, String attemptKey) {
        try {
            return resolveUser(identifier);
        } catch (BadCredentialsException e) {
            loginAttemptTracker.recordFailure(attemptKey);
            throw e;
        }
    }

    /**
     * Résout un utilisateur à partir d'un email ou d'un numéro de téléphone.
     * Lève ResourceNotFoundException si aucun compte n'est trouvé.
     */
    private User resolveUser(String identifier) {
        String trimmed = identifier.trim();
        if (trimmed.contains("@")) {
            // Repli sur la saisie brute : comptes legacy à casse mixte non migrés (conflit V6).
            return userRepository.findByEmail(Identifiants.normaliserEmail(trimmed))
                    .or(() -> userRepository.findByEmail(trimmed))
                    .orElseThrow(() -> new BadCredentialsException("Identifiant ou mot de passe incorrect."));
        }
        String telephone = Identifiants.normaliserTelephone(trimmed);
        return userRepository.findByTelephone(telephone)
                .or(() -> userRepository.findByTelephone(trimmed))
                .orElseThrow(() -> new BadCredentialsException("Identifiant ou mot de passe incorrect."));
    }

    @Override
    public boolean isValidEmail(String email) {
        return email != null && email.matches(EMAIL_REGEX);
    }

    @Override
    public boolean isValidPassword(String password) {
        return password != null && password.length() >= 8 
                && password.matches(".*[a-z].*") 
                && password.matches(".*[A-Z].*") 
                && password.matches(".*[0-9].*") 
                && password.matches(".*[!@#$%^&*()-+].*");
    }

    private String buildPasswordResetEmailBody(String code) {
        return Utility.renderEmail("templates/email-password-reset.html",
                Map.of("code", code, "minutes", String.valueOf(RESET_TTL_MS / 60_000)),
                "Votre code : " + code + ". Il expire dans " + (RESET_TTL_MS / 60_000) + " minutes.",
                "Vous n'avez pas demandé cette réinitialisation ? Ignorez cet e-mail : votre mot de passe reste inchangé.");
    }

    private String buildActivationEmailBody(String prenom, String nom, String activationLink) {
        return Utility.renderEmail("templates/email-activation.html", Map.of(
                "prenom", prenom,
                "nom", nom,
                "activationLink", activationLink),
                "Confirmez votre adresse e-mail pour commencer à utiliser AnoventiX.",
                "Vous n'avez pas créé de compte sur AnoventiX ? Ignorez simplement cet e-mail.");
    }
}
