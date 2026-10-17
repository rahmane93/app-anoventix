package com.app.AnnoncesAPI.controllers;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.EmailService;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;

/**
 * Classe de tests pour les endpoints sécurisés nécessitant une authentification JWT.
 * Contrairement à AuthControllerTest, cette classe n'utilise PAS addFilters=false,
 * ce qui permet de tester le comportement réel de Spring Security avec JWT.
 */
@SpringBootTest
public class AuthControllerSecuredTest {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AnnonceRepository annonceRepository;
    
    @Autowired
    private BienImmoRepository bienImmoRepository;

    @Autowired
    private MediaRepository mediaRepository;
    
    @Autowired
    private EntrepriseRepository entrepriseRepository;
    
    @MockitoBean
    private EmailService emailService;

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    public void setup() throws Exception {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        // Mock les méthodes d'envoi d'email pour éviter les erreurs SMTP
        doNothing().when(emailService).sendEmail(any(), any(), any());
        
        // Supprimer dans l'ordre inverse des dépendances (contraintes FK)
        mediaRepository.deleteAll();
        jdbcTemplate.execute("DELETE FROM signalements");
        jdbcTemplate.execute("DELETE FROM historique_annonce");
        bienImmoRepository.deleteAll();
        annonceRepository.deleteAll();
        
        // Dissocier les utilisateurs de leurs entreprises
        userRepository.findAll().forEach(user -> {
            user.setEntreprise(null);
            userRepository.save(user);
        });
        
        // Supprimer les entreprises
        entrepriseRepository.deleteAll();

        // Enfin supprimer les utilisateurs
        userRepository.deleteAll();
    }

    /**
     * Méthode helper pour créer un utilisateur, l'activer et obtenir son JWT.
     * @param username Nom d'utilisateur
     * @param email Email
     * @param password Mot de passe
     * @return Le token JWT
     */
    private String signupActivateAndGetJWT(String username, String email, String password) throws Exception {
        // 1. Inscription
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("nom", username);
        payload.put("prenom", username);
        payload.put("password", password);
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated());
        
        // 2. Activation
        String activationToken = userRepository.findByEmail(email)
            .orElseThrow(() -> new AssertionError("User should exist after signup"))
            .getActivationCode();
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate")
            .param("token", activationToken));
        
        // 3. Connexion pour obtenir le JWT
        Map<String, Object> login = new HashMap<>();
        login.put("identifier", email);
        login.put("password", password);
        String response = mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login)))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andReturn().getResponse().getContentAsString();
        
        return objectMapper.readTree(response).get("token").asString();
    }

    // --- TESTS MODIFICATION DE MOT DE PASSE ---

    /**
     * Vérifie que la modification du mot de passe réussit avec les bons paramètres et authentification.
     */
    @Test
    public void testChangePasswordSuccess() throws Exception {
        // Création, activation et connexion
        String jwt = signupActivateAndGetJWT("changepassuser", "changepassuser@example.com", "OldPass123!");

        // Requête de changement de mot de passe avec JWT valide
        Map<String, Object> changePayload = new HashMap<>();
        changePayload.put("oldPassword", "OldPass123!");
        changePayload.put("newPassword", "NewPass456!");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/change-password")
            .header("Authorization", "Bearer " + jwt)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(changePayload)))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Mot de passe modifié avec succès."));
    }

    /**
     * Vérifie que la modification échoue si l'ancien mot de passe est incorrect.
     */
    @Test
    public void testChangePasswordWrongOldPassword() throws Exception {
        // Création, activation et connexion
        String jwt = signupActivateAndGetJWT("changepassuser2", "changepassuser2@example.com", "OldPass123!");

        // Mauvais ancien mot de passe
        Map<String, Object> changePayload = new HashMap<>();
        changePayload.put("oldPassword", "WrongOldPass!");
        changePayload.put("newPassword", "NewPass456!");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/change-password")
            .header("Authorization", "Bearer " + jwt)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(changePayload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Ancien mot de passe incorrect."));
    }

    /**
     * Vérifie que la modification échoue si le nouveau mot de passe est trop faible.
     */
    @Test
    public void testChangePasswordWeakNewPassword() throws Exception {
        // Création, activation et connexion
        String jwt = signupActivateAndGetJWT("changepassuser3", "changepassuser3@example.com", "OldPass123!");

        // Nouveau mot de passe trop faible
        Map<String, Object> changePayload = new HashMap<>();
        changePayload.put("oldPassword", "OldPass123!");
        changePayload.put("newPassword", "123");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/change-password")
            .header("Authorization", "Bearer " + jwt)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(changePayload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Erreur: Mot de passe trop faible."));
    }

    /**
     * Vérifie que la modification échoue si non authentifié (pas de JWT).
     */
    @Test
    public void testChangePasswordUnauthenticated() throws Exception {
        Map<String, Object> changePayload = new HashMap<>();
        changePayload.put("oldPassword", "OldPass123!");
        changePayload.put("newPassword", "NewPass456!");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/change-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(changePayload)))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Authentification requise."));
    }

    /**
     * Vérifie que la modification échoue si le JWT est invalide.
     */
    @Test
    public void testChangePasswordInvalidJWT() throws Exception {
        Map<String, Object> changePayload = new HashMap<>();
        changePayload.put("oldPassword", "OldPass123!");
        changePayload.put("newPassword", "NewPass456!");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/change-password")
            .header("Authorization", "Bearer invalid_jwt_token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(changePayload)))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
    }

    // --- TESTS ENDPOINTS PROTÉGÉS ---

    /**
     * Vérifie qu'un endpoint protégé retourne une erreur 401 si non authentifié.
     */
    @Test
    public void testProtectedEndpointRequiresAuth() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/users"))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
    }

    /**
     * Vérifie qu'un endpoint protégé est accessible avec un JWT valide.
     * Note: Ce test vérifie l'authentification JWT fonctionne en vérifiant que l'on n'obtient pas un 401.
     * L'endpoint /api/users nécessite un rôle ADMIN/MODERATEUR, mais on teste juste que le JWT est traité correctement.
     */
    @Test
    public void testProtectedEndpointWithValidJWT() throws Exception {
        // Création, activation et connexion
        String jwt = signupActivateAndGetJWT("protecteduser", "protecteduser@example.com", "Test123!");

        // Accès à un endpoint protégé avec JWT valide
        // Avec filtres de sécurité activés, on vérifie que le JWT est accepté (pas de 401)
        // On peut recevoir 403 (pas autorisé) ou 400 mais pas 401 (non authentifié)
        mockMvc.perform(MockMvcRequestBuilders.get("/api/users")
            .header("Authorization", "Bearer " + jwt))
            .andExpect(MockMvcResultMatchers.status().is4xxClientError())
            .andExpect(result -> {
                int status = result.getResponse().getStatus();
                if (status == 401) {
                    throw new AssertionError("JWT valide ne devrait pas retourner 401 Unauthorized, reçu: " + status);
                }
            });
    }

    /**
     * Vérifie qu'un endpoint protégé retourne 401 avec un JWT expiré ou invalide.
     */
    @Test
    public void testProtectedEndpointWithInvalidJWT() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/users")
            .header("Authorization", "Bearer invalid_jwt_token"))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
    }

    /**
     * Vérifie qu'un endpoint protégé retourne 401 si le header Authorization est mal formaté.
     */
    @Test
    public void testProtectedEndpointWithMalformedAuthHeader() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/users")
            .header("Authorization", "InvalidFormat token"))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
    }

    // --- TESTS REFRESH TOKEN ---

    @Test
    public void testRefreshToken_success() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "refreshuser@example.com");
        payload.put("nom", "Refresh");
        payload.put("prenom", "User");
        payload.put("password", "Test123!");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated());

        String activationToken = userRepository.findByEmail("refreshuser@example.com")
            .orElseThrow().getActivationCode();
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate")
            .param("token", activationToken));

        Map<String, Object> login = new HashMap<>();
        login.put("identifier", "refreshuser@example.com");
        login.put("password", "Test123!");
        String signinResponse = mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login)))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andReturn().getResponse().getContentAsString();

        String refreshToken = objectMapper.readTree(signinResponse).get("refreshToken").asString();

        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/refresh")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.jsonPath("$.token").exists());
    }

    @Test
    public void testRefreshToken_withInvalidToken() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/refresh")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("refreshToken", "invalid_refresh_token"))))
            .andExpect(MockMvcResultMatchers.status().is4xxClientError());
    }

    // --- TESTS LOGOUT ---

    @Test
    public void testLogout_success() throws Exception {
        String jwt = signupActivateAndGetJWT("logoutuser", "logoutuser@example.com", "Test123!");

        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/logout")
            .header("Authorization", "Bearer " + jwt))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Déconnexion effectuée."));
    }

    // --- TESTS RÉVOCATION / DURCISSEMENT DES TOKENS ---

    private tools.jackson.databind.JsonNode signin(String email, String password) throws Exception {
        String response = mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("identifier", email, "password", password))))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    @Test
    public void testRefreshTokenCannotBeUsedAsAccessToken() throws Exception {
        signupActivateAndGetJWT("rtbearer", "rtbearer@example.com", "Test123!");
        String refreshToken = signin("rtbearer@example.com", "Test123!").get("refreshToken").asString();

        mockMvc.perform(MockMvcRequestBuilders.get("/api/users/me")
            .header("Authorization", "Bearer " + refreshToken))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
    }

    @Test
    public void testSuspendedUserTokenIsRejected() throws Exception {
        String jwt = signupActivateAndGetJWT("suspended", "suspended@example.com", "Test123!");
        String refreshToken = signin("suspended@example.com", "Test123!").get("refreshToken").asString();

        var user = userRepository.findByEmail("suspended@example.com").orElseThrow();
        user.setStatut(com.app.AnnoncesAPI.enums.StatutUtilisateur.SUSPENDU);
        userRepository.save(user);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/users/me")
            .header("Authorization", "Bearer " + jwt))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/refresh")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
            .andExpect(MockMvcResultMatchers.status().isForbidden());
    }

    @Test
    public void testChangePasswordRevokesOldTokensAndReturnsNewOnes() throws Exception {
        String oldJwt = signupActivateAndGetJWT("rotate", "rotate@example.com", "OldPass123!");
        String oldRefresh = signin("rotate@example.com", "OldPass123!").get("refreshToken").asString();
        // iat est à la seconde : on s'assure que les anciens tokens sont d'une seconde antérieure.
        Thread.sleep(1100);

        String response = mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/change-password")
            .header("Authorization", "Bearer " + oldJwt)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("oldPassword", "OldPass123!", "newPassword", "NewPass456!"))))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.jsonPath("$.token").exists())
            .andExpect(MockMvcResultMatchers.jsonPath("$.refreshToken").exists())
            .andReturn().getResponse().getContentAsString();
        String newJwt = objectMapper.readTree(response).get("token").asString();

        mockMvc.perform(MockMvcRequestBuilders.get("/api/users/me")
            .header("Authorization", "Bearer " + oldJwt))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/refresh")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("refreshToken", oldRefresh))))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
        mockMvc.perform(MockMvcRequestBuilders.get("/api/users/me")
            .header("Authorization", "Bearer " + newJwt))
            .andExpect(MockMvcResultMatchers.status().isOk());
    }

    @Test
    public void testLogoutRevokesRefreshToken() throws Exception {
        signupActivateAndGetJWT("logoutrt", "logoutrt@example.com", "Test123!");
        var tokens = signin("logoutrt@example.com", "Test123!");
        String jwt = tokens.get("token").asString();
        String refreshToken = tokens.get("refreshToken").asString();

        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/logout")
            .header("Authorization", "Bearer " + jwt)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
            .andExpect(MockMvcResultMatchers.status().isOk());

        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/refresh")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
            .andExpect(MockMvcResultMatchers.status().isUnauthorized());
    }

    @Test
    public void testLoginEmailInsensibleALaCasse() throws Exception {
        signupActivateAndGetJWT("casse", "casse@example.com", "Test123!");
        signin("CASSE@Example.COM", "Test123!");
    }

    @Test
    public void testSuppressionCompte_reactivableParLUtilisateur() throws Exception {
        String jwt = signupActivateAndGetJWT("rgpd1", "rgpd1@example.com", "Test123!");
        mockMvc.perform(MockMvcRequestBuilders.delete("/api/users/me")
            .header("Authorization", "Bearer " + jwt))
            .andExpect(MockMvcResultMatchers.status().isNoContent());

        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/reactivate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("identifier", "rgpd1@example.com", "password", "Test123!"))))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.jsonPath("$.token").exists());
    }

    @Test
    public void testDesactivationAdmin_nonReactivableParLUtilisateur() throws Exception {
        signupActivateAndGetJWT("rgpd2", "rgpd2@example.com", "Test123!");
        // Désactivation par un admin : pas de date de demande de suppression.
        var user = userRepository.findByEmail("rgpd2@example.com").orElseThrow();
        user.setStatut(com.app.AnnoncesAPI.enums.StatutUtilisateur.INACTIF);
        userRepository.save(user);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/reactivate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("identifier", "rgpd2@example.com", "password", "Test123!"))))
            .andExpect(MockMvcResultMatchers.status().isForbidden());
    }

    @Test
    public void testResendActivation_regenereLeLien() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "resend@example.com", "nom", "R",
                "prenom", "R", "password", "Test123!", "role", "PARTICULIER"))))
            .andExpect(MockMvcResultMatchers.status().isCreated());
        String ancien = userRepository.findByEmail("resend@example.com").orElseThrow().getActivationCode();

        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/resend-activation")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "resend@example.com"))))
            .andExpect(MockMvcResultMatchers.status().isOk());

        String nouveau = userRepository.findByEmail("resend@example.com").orElseThrow().getActivationCode();
        org.junit.jupiter.api.Assertions.assertNotEquals(ancien, nouveau);

        // Email inconnu : même réponse (anti-énumération).
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/resend-activation")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "inconnu@example.com"))))
            .andExpect(MockMvcResultMatchers.status().isOk());
    }

    @Test
    public void testExportDonnees() throws Exception {
        String jwt = signupActivateAndGetJWT("export", "export@example.com", "Test123!");
        mockMvc.perform(MockMvcRequestBuilders.get("/api/users/me/export")
            .header("Authorization", "Bearer " + jwt))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.jsonPath("$.profil.email").value("export@example.com"))
            .andExpect(MockMvcResultMatchers.jsonPath("$.annonces").isArray());
    }

    @Test
    public void testLoginLockedAfterTooManyFailures() throws Exception {
        signupActivateAndGetJWT("lockme", "lockme@example.com", "Test123!");
        Map<String, Object> bad = Map.of("identifier", "lockme@example.com", "password", "Wrong123!");
        for (int i = 0; i < com.app.AnnoncesAPI.security.LoginAttemptTracker.MAX_FAILURES; i++) {
            mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(bad)))
                .andExpect(MockMvcResultMatchers.status().isUnauthorized());
        }
        // Même avec le bon mot de passe, le compte est verrouillé.
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("identifier", "lockme@example.com", "password", "Test123!"))))
            .andExpect(MockMvcResultMatchers.status().isTooManyRequests());
    }
}
