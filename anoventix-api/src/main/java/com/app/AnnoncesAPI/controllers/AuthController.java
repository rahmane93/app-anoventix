package com.app.AnnoncesAPI.controllers;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.app.AnnoncesAPI.payload.request.ChangePasswordRequest;
import com.app.AnnoncesAPI.payload.request.LoginRequest;
import com.app.AnnoncesAPI.payload.request.ForgotPasswordRequest;
import com.app.AnnoncesAPI.payload.request.RefreshTokenRequest;
import com.app.AnnoncesAPI.payload.request.ResetPasswordRequest;
import com.app.AnnoncesAPI.payload.request.SignupRequest;
import com.app.AnnoncesAPI.payload.response.JwtResponse;
import com.app.AnnoncesAPI.payload.response.MessageResponse;
import com.app.AnnoncesAPI.services.AuthService;

import jakarta.validation.Valid;


@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signin")
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.authenticateUser(loginRequest));
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
            Authentication authentication) {
        // Tous les tokens existants sont invalidés : le client DOIT remplacer les siens
        // par ceux renvoyés ici, sinon il sera déconnecté à la requête suivante.
        JwtResponse tokens = authService.changePassword(
                authentication.getName(), dto.getOldPassword(), dto.getNewPassword());
        return ResponseEntity.ok(java.util.Map.of(
                "message", "Mot de passe modifié avec succès.",
                "token", tokens.getToken(),
                "refreshToken", tokens.getRefreshToken(),
                "type", "Bearer"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshTokenRequest body) {
        String newAccessToken = authService.refreshAccessToken(body.getRefreshToken());
        return ResponseEntity.ok(java.util.Map.of("token", newAccessToken, "type", "Bearer"));
    }

    @PostMapping("/reactivate")
    public ResponseEntity<JwtResponse> reactivate(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.reactivateAccount(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(Authentication authentication,
                                    jakarta.servlet.http.HttpServletRequest request,
                                    @RequestBody(required = false) RefreshTokenRequest body) {
        String header = request.getHeader("Authorization");
        String accessToken = (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
        // Body optionnel { "refreshToken": "..." } : sans lui, le refresh token resterait
        // utilisable jusqu'à son expiration (7 jours).
        String refreshToken = body != null ? body.getRefreshToken() : null;
        authService.logout(accessToken, refreshToken);
        // P2.9 — Vide le SecurityContext de la requête courante (best-practice
        // même en mode stateless : évite tout effet de bord sur ce thread).
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        return ResponseEntity.ok(new MessageResponse("Déconnexion effectuée."));
    }

}

