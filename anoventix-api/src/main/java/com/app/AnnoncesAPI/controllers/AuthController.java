package com.app.AnnoncesAPI.controllers;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.app.AnnoncesAPI.payload.request.AcceptInvitationRequest;
import com.app.AnnoncesAPI.payload.request.ChangePasswordRequest;
import com.app.AnnoncesAPI.payload.request.LoginRequest;
import com.app.AnnoncesAPI.payload.request.ForgotPasswordRequest;
import com.app.AnnoncesAPI.payload.request.RefreshTokenRequest;
import com.app.AnnoncesAPI.payload.request.RenvoiCodeRequest;
import com.app.AnnoncesAPI.payload.request.VerificationCodeRequest;
import com.app.AnnoncesAPI.payload.request.ResetPasswordRequest;
import com.app.AnnoncesAPI.payload.request.SignupRequest;
import com.app.AnnoncesAPI.payload.response.DoubleAuthentificationResponse;
import com.app.AnnoncesAPI.payload.response.JwtResponse;
import com.app.AnnoncesAPI.payload.response.MessageResponse;
import com.app.AnnoncesAPI.payload.response.RefreshResponse;
import com.app.AnnoncesAPI.security.AdresseClient;
import com.app.AnnoncesAPI.security.SessionCookie;
import com.app.AnnoncesAPI.services.InvitationAgentService;
import com.app.AnnoncesAPI.services.VerificationConnexionService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import com.app.AnnoncesAPI.services.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;


@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final SessionCookie sessionCookie;
    private final VerificationConnexionService verificationConnexionService;
    private final AdresseClient adresseClient;
    private final InvitationAgentService invitationAgentService;

    public AuthController(AuthService authService, SessionCookie sessionCookie,
                          VerificationConnexionService verificationConnexionService, AdresseClient adresseClient,
                          InvitationAgentService invitationAgentService) {
        this.invitationAgentService = invitationAgentService;
        this.authService = authService;
        this.sessionCookie = sessionCookie;
        this.verificationConnexionService = verificationConnexionService;
        this.adresseClient = adresseClient;
    }

    @PostMapping("/signin")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Session ouverte",
                content = @Content(schema = @Schema(implementation = JwtResponse.class))),
        @ApiResponse(responseCode = "202",
                description = "Modérateur ou administrateur : un code a été envoyé par email, à saisir via /verification-code",
                content = @Content(schema = @Schema(implementation = DoubleAuthentificationResponse.class)))
    })
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest,
                                              HttpServletRequest request,
                                              HttpServletResponse response) {
        AuthService.Connexion connexion = authService.authenticateUser(loginRequest);
        if (connexion.verification() != null) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(connexion.verification());
        }
        return ResponseEntity.ok(confierAuCookie(connexion.jwt(), request, response));
    }

    /**
     * Double authentification du staff (DEC-03) : code reçu par email (6 chiffres) ou code de secours.
     * Ouvre la session comme une connexion ; la première fois, la réponse contient les codes de secours.
     */
    @PostMapping("/verification-code")
    public ResponseEntity<JwtResponse> verifierCode(@Valid @RequestBody VerificationCodeRequest body,
                                                    HttpServletRequest request,
                                                    HttpServletResponse response) {
        JwtResponse session = verificationConnexionService.verifier(
                body.getVerificationId(), body.getCode(), request.getHeader("User-Agent"), adresseClient.de(request));
        return ResponseEntity.ok(confierAuCookie(session, request, response));
    }

    /**
     * Invitation d'un agent : le lien reçu par email donne le jeton, l'agent choisit son
     * mot de passe et son compte devient actif. Le jeton ne sert qu'une fois (7 jours).
     */
    @PostMapping("/accept-invitation")
    public ResponseEntity<MessageResponse> accepterInvitation(@Valid @RequestBody AcceptInvitationRequest body) {
        invitationAgentService.accepter(body.getToken(), body.getPassword());
        return ResponseEntity.ok(new MessageResponse("Votre mot de passe est enregistré. Vous pouvez vous connecter."));
    }

    /** « Renvoyer le code » : annule le code en courset en envoie un nouveau (3 renvois par 15 minutes). */
    @PostMapping("/verification-code/renvoyer")
    public ResponseEntity<DoubleAuthentificationResponse> renvoyerCode(@Valid @RequestBody RenvoiCodeRequest body) {
        return ResponseEntity.ok(verificationConnexionService.renvoyer(body.getVerificationId()));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        authService.registerUser(signUpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new MessageResponse("Votre compte a été créé. Un lien d'activation vous a été envoyé par email."));
    }

    /**
     * Activation au format JSON (app mobile, deep link). Le lien de l'email
     * pointe sur la page HTML {@code GET /activate} ; les deux partagent la
     * même logique métier. Token absent / inconnu / expiré → 400.
     */
    @GetMapping("/activate")
    public ResponseEntity<MessageResponse> activateAccount(@RequestParam(required = false) String token) {
        authService.activateAccount(token);
        return ResponseEntity.ok(new MessageResponse("Compte activé avec succès. Vous pouvez vous connecter."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        // Le service ne lève plus d'exception si l'email est inconnu (cf. P2.10) :
        // il loggue silencieusement et retourne. La réponse HTTP est indistinguable
        // d'un succès, ce qui empêche l'énumération d'emails.
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(new MessageResponse("Si un compte est associé à cet email, un lien a été envoyé."));
    }

    /**
     * Renvoie le lien d'activation. Réponse identique que le compte existe ou non
     * (anti-énumération) ; limité par IP (RateLimitFilter) et par adresse.
     */
    @PostMapping("/resend-activation")
    public ResponseEntity<MessageResponse> resendActivation(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.resendActivation(request.getEmail());
        return ResponseEntity.ok(new MessageResponse(
                "Si un compte en attente d'activation est associé à cet email, un nouveau lien a été envoyé."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getEmail(), request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(new MessageResponse("Mot de passe réinitialisé avec succès."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest dto,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response) {
        // Tous les tokens existants sont invalidés : le client DOIT remplacer les siens
        // par ceux renvoyés ici, sinon il sera déconnecté à la requête suivante.
        JwtResponse tokens = confierAuCookie(authService.changePassword(
                authentication.getName(), dto.getOldPassword(), dto.getNewPassword()), request, response);
        java.util.Map<String, String> corps = new java.util.LinkedHashMap<>();
        corps.put("message", "Mot de passe modifié avec succès.");
        corps.put("token", tokens.getToken());
        if (tokens.getRefreshToken() != null) {
            corps.put("refreshToken", tokens.getRefreshToken());
        }
        corps.put("type", "Bearer");
        return ResponseEntity.ok(corps);
    }

    /**
     * Renouvelle la session : l'ancien jeton de rafraîchissement est consommé, un nouveau est
     * délivré (rotation). Application : jeton dans le corps. Site web ({@code X-Client: web}) :
     * jeton dans un cookie HttpOnly ; le corps ne sert qu'à migrer un jeton resté dans le
     * stockage du navigateur par une version antérieure.
     */
    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(@RequestBody(required = false) RefreshTokenRequest body,
                                                   HttpServletRequest request,
                                                   HttpServletResponse response) {
        boolean web = sessionCookie.estClientWeb(request);
        String refreshToken = body != null && body.getRefreshToken() != null && !body.getRefreshToken().isBlank()
                ? body.getRefreshToken()
                : (web ? sessionCookie.lire(request).orElse(null) : null);
        if (refreshToken == null) {
            throw new BadCredentialsException("Refresh token invalide ou expiré.");
        }
        RefreshResponse tokens = authService.refresh(refreshToken);
        if (web) {
            sessionCookie.poser(response, tokens.refreshToken());
            return ResponseEntity.ok(tokens.sansRefreshToken());
        }
        return ResponseEntity.ok(tokens);
    }

    @PostMapping("/reactivate")
    public ResponseEntity<JwtResponse> reactivate(@Valid @RequestBody LoginRequest loginRequest,
                                                  HttpServletRequest request,
                                                  HttpServletResponse response) {
        return ResponseEntity.ok(confierAuCookie(authService.reactivateAccount(loginRequest), request, response));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(Authentication authentication,
                                    HttpServletRequest request,
                                    HttpServletResponse response,
                                    @RequestBody(required = false) RefreshTokenRequest body) {
        String header = request.getHeader("Authorization");
        String accessToken = (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
        // Body optionnel { "refreshToken": "..." } (application) ou cookie (site web) : sans lui,
        // la session resterait utilisable jusqu'à l'expiration de son jeton.
        String refreshToken = body != null ? body.getRefreshToken() : null;
        if (refreshToken == null && sessionCookie.estClientWeb(request)) {
            refreshToken = sessionCookie.lire(request).orElse(null);
        }
        authService.logout(accessToken, refreshToken);
        if (sessionCookie.estClientWeb(request)) {
            sessionCookie.effacer(response);
        }
        // P2.9 — Vide le SecurityContext de la requête courante (best-practice
        // même en mode stateless : évite tout effet de bord sur ce thread).
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        return ResponseEntity.ok(new MessageResponse("Déconnexion effectuée."));
    }

    /**
     * Site web : le jeton de rafraîchissement part dans un cookie HttpOnly et quitte le corps de la
     * réponse. Application : réponse inchangée.
     */
    private JwtResponse confierAuCookie(JwtResponse tokens, HttpServletRequest request, HttpServletResponse response) {
        if (sessionCookie.estClientWeb(request) && tokens.getRefreshToken() != null) {
            sessionCookie.poser(response, tokens.getRefreshToken());
            tokens.setRefreshToken(null);
        }
        return tokens;
    }
}

