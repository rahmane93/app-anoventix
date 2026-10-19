package com.app.AnnoncesAPI.services;

import java.util.UUID;

import com.app.AnnoncesAPI.payload.request.LoginRequest;
import com.app.AnnoncesAPI.payload.request.SignupRequest;
import com.app.AnnoncesAPI.payload.response.DoubleAuthentificationResponse;
import com.app.AnnoncesAPI.payload.response.JwtResponse;
import com.app.AnnoncesAPI.payload.response.RefreshResponse;

public interface AuthService {
    
    /**
     * Authentifie un utilisateur et génère un token JWT
     */
    Connexion authenticateUser(LoginRequest loginRequest);

    /**
     * Issue d'une connexion : session ouverte (jetons), ou, pour un modérateur ou un administrateur,
     * code de vérification à saisir d'abord (DEC-03).
     */
    record Connexion(JwtResponse jwt, DoubleAuthentificationResponse verification) {
        static Connexion session(JwtResponse jwt) {
            return new Connexion(jwt, null);
        }

        static Connexion verificationRequise(DoubleAuthentificationResponse verification) {
            return new Connexion(null, verification);
        }
    }
    
    /**
     * Enregistre un nouvel utilisateur
     */
    void registerUser(SignupRequest signupRequest);
    
    /**
     * Active un compte utilisateur via un token reçu par email
     */
    void activateAccount(String token);
    
    /**
     * Initie le processus de réinitialisation de mot de passe
     */
    void forgotPassword(String email);
    
    /**
     * Réinitialise le mot de passe avec un token
     */
    void resetPassword(String email, String token, String newPassword);
    
    /**
     * Change le mot de passe d'un utilisateur authentifié.
     * Invalide tous les tokens existants et retourne de nouveaux tokens pour la session courante.
     */
    JwtResponse changePassword(String username, String oldPassword, String newPassword);

    /**
     * Échange un refresh token valide contre un nouvel access token et un nouveau refresh token
     * (le précédent n'est plus utilisable : rotation, voir {@link SessionService}).
     */
    RefreshResponse refresh(String refreshToken);

    /**
     * Révoque l'access token courant et, s'il est fourni, le refresh token (logout)
     */
    void logout(String accessToken, String refreshToken);

    /**
     * Renvoie un lien d'activation si le compte existe et n'est pas encore activé.
     * Silencieux sinon (anti-énumération).
     */
    void resendActivation(String email);

    /**
     * Relance à J+5 d'un compte jamais activé : nouveau lien d'activation (E19), une seule fois
     * (DEC-06). Ne fait rien si le compte a été activé entre-temps.
     */
    void relancerActivation(UUID userId);

    /**
     * Réactive un compte précédemment soft-deleté (statut INACTIF) après vérification
     * des credentials. Retourne un JwtResponse identique à un signin classique.
     *
     * @throws org.springframework.security.authentication.BadCredentialsException si le mot de passe est incorrect
     * @throws org.springframework.security.authentication.DisabledException si le compte n'est pas dans un état réactivable
     *         (ex: SUSPENDU par un admin, EN_ATTENTE_ACTIVATION)
     */
    JwtResponse reactivateAccount(LoginRequest request);

    /**
     * Valide le format d'un email
     */
    boolean isValidEmail(String email);
    
    /**
     * Valide la complexité d'un mot de passe
     */
    boolean isValidPassword(String password);
}
