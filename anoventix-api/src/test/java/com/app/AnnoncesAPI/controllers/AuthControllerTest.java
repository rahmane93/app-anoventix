package com.app.AnnoncesAPI.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.EmailService;

import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
public class AuthControllerTest {
    
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
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
        doNothing().when(emailService).sendEmail(any(), any(), any());
        
        // Supprimer dans l'ordre inverse des dépendances (contraintes FK)
        // 1. Supprimer les médias (référencent les annonces)
        mediaRepository.deleteAll();
        
        // 2. Supprimer les bien_immo avant annonce (contraintes FK)
        jdbcTemplate.execute("DELETE FROM signalements");
        jdbcTemplate.execute("DELETE FROM historique_annonce");
        bienImmoRepository.deleteAll();

        // 3. Supprimer les annonces génériques
        annonceRepository.deleteAll();
        
        // 4. Dissocier les utilisateurs de leurs entreprises
        userRepository.findAll().forEach(user -> {
            user.setEntreprise(null);
            userRepository.save(user);
        });
        
        // 5. Supprimer les entreprises
        entrepriseRepository.deleteAll();

        // 6. Enfin supprimer les utilisateurs
        userRepository.deleteAll();
    }
    

    // Vérifie que l'inscription échoue si l'email est déjà utilisé
    @Test
    public void testRegisterUserWithExistingUsername() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "user2@example.com");
        payload.put("nom", "User");
        payload.put("prenom", "Two");
        payload.put("password", "Test123!");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)));

        // 2eme compte avec email identique au 1er compte
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").exists());

        // 3eme compte avec email identique
        payload.put("nom", "User3");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").exists());
    }
    // Vérifie que l'inscription échoue si l'adresse email est manquante
    @Test
    public void testRegisterUserWithMissingFields() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("nom", "User");
        payload.put("prenom", "Test");
        payload.put("password", "Test123!");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // Vérifie que l'inscription échoue si le format de l'email est invalide
    @Test
    public void testRegisterUserWithInvalidEmailFormat() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "invalid-email-format");
        payload.put("nom", "User");
        payload.put("prenom", "Test");
        payload.put("password", "Test123!");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // Vérifie que l'inscription échoue si le mot de passe est trop faible
    @Test
    public void testRegisterUserWithWeakPassword() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "user7@example.com");
        payload.put("nom", "User");
        payload.put("prenom", "Test");
        payload.put("password", "123");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // Vérifie que la connexion réussit avec des identifiants valides et que le compte est activé
    @Test
    public void testLoginSuccess() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "user8@example.com");
        payload.put("nom", "User");
        payload.put("prenom", "Eight");
        payload.put("password", "Test123!");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated());
        String activationCode = userRepository.findByEmail("user8@example.com").orElseThrow(() -> new AssertionError("User should exist after signup")).getActivationCode();
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate")
            .param("token", activationCode));
        Map<String, Object> login = new HashMap<>();
        login.put("identifier", "user8@example.com");
        login.put("password", "Test123!");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login)))
            .andExpect(MockMvcResultMatchers.status().isOk());
    }

    // Vérifie que la connexion échoue si le mot de passe est incorrect
    @Test
    public void testLoginWithWrongPassword() throws Exception {
        Map<String, Object> login = new HashMap<>();
        login.put("identifier", "unknown@example.com");
        login.put("password", "WrongPassword!");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login)))
            .andExpect(MockMvcResultMatchers.status().is4xxClientError());
    }

    // Vérifie que la connexion échoue si le compte n'est pas activé
    @Test
    public void testLoginWithUnactivatedAccount() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "user9@example.com");
        payload.put("nom", "User");
        payload.put("prenom", "Nine");
        payload.put("password", "Test123!");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated());
        Map<String, Object> login = new HashMap<>();
        login.put("identifier", "user9@example.com");
        login.put("password", "Test123!");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login)))
            .andExpect(MockMvcResultMatchers.status().is4xxClientError());
    }

    // Vérifie que la connexion échoue si l'utilisateur n'existe pas
    @Test
    public void testLoginWithUnknownUsername() throws Exception {
        Map<String, Object> login = new HashMap<>();
        login.put("identifier", "unknown@example.com");
        login.put("password", "Test123!");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login)))
            .andExpect(MockMvcResultMatchers.status().is4xxClientError())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").exists());
    }

    // Vérifie que la connexion échoue si le mot de passe est absent
    @Test
    public void testLoginWithMissingFields() throws Exception {
        Map<String, Object> login = new HashMap<>();
        login.put("identifier", "user10@example.com");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    /// Vérifie que l'activation réussit si l'email et le code sont valides
    @Test
    public void testActivateAccountSuccess() throws Exception {
        final String EMAIL = "user13@example.com";
        final String PASSWORD = "Test123!";

        // Inscription d'un nouvel utilisateur
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", EMAIL);
        payload.put("nom", "User");
        payload.put("prenom", "Thirteen");
        payload.put("password", PASSWORD);
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated()); // Inscription réussit, donc 201

        // Récupère le token d'activation généré en base
        String activationToken = userRepository.findByEmail(EMAIL).get().getActivationCode();

        // Appelle l'endpoint d'activation avec le token valide
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate")
            .param("token", activationToken))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.content().string(org.hamcrest.Matchers.containsString("Compte activé avec succès")));
    }

    // Vérifie que l'activation échoue si le code est invalide
    @Test
    public void testActivateAccountWithInvalidCode() throws Exception {
        // Inscription d'un nouvel utilisateur
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "user11@example.com");
        payload.put("nom", "User");
        payload.put("prenom", "Eleven");
        payload.put("password", "Testf123!@");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated()); // Inscription réussit, donc 201

        // Activation du compte avec un token invalide
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate")
            .param("token", "invalid-token-uuid"))
            .andExpect(MockMvcResultMatchers.status().isBadRequest())
            .andExpect(MockMvcResultMatchers.content().string(org.hamcrest.Matchers.containsString("invalide")));
    }

    // Vérifie que l'activation échoue si le token est inconnu
    @Test
    public void testActivateAccountWithUnknownToken() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate")
            .param("token", "unknown-token-00000000-0000-0000-0000-000000000000"))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // Vérifie que l'activation échoue si le token est absent
    @Test
    public void testActivateAccountWithMissingToken() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate"))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }
    // Vérifie que le reset retourne toujours 200 (sécurité : ne révèle pas si l'email existe)
    @Test
    public void testForgotPasswordWithUnknownEmail() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "unknown@example.com"))))
            .andExpect(MockMvcResultMatchers.status().isOk());
    }

    // Vérifie que le reset échoue si l'email est manquant (validation @NotBlank)
    @Test
    public void testForgotPasswordWithMissingFields() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // ECART-36 : un compte suspendu ne reçoit pas de code, et un code émis avant la
    // suspension ne sert plus ; la réponse reste celle d'un email inconnu.
    @Test
    public void testForgotPassword_compteSuspendu_aucunCodeUtilisable() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "suspendu@example.com");
        payload.put("nom", "User");
        payload.put("prenom", "Suspendu");
        payload.put("password", "Test123!");
        payload.put("role", "particulier");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated());

        // Code obtenu pendant que le compte était encore en règle…
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "suspendu@example.com"))))
            .andExpect(MockMvcResultMatchers.status().isOk());
        var user = userRepository.findByEmail("suspendu@example.com").orElseThrow();
        String ancienCode = user.getResetPasswordToken();
        // …puis suspension par la modération.
        user.setStatut(com.app.AnnoncesAPI.enums.StatutUtilisateur.SUSPENDU);
        user.setResetPasswordToken(null);
        userRepository.save(user);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "suspendu@example.com"))))
            .andExpect(MockMvcResultMatchers.status().isOk());
        org.assertj.core.api.Assertions.assertThat(
                userRepository.findByEmail("suspendu@example.com").orElseThrow().getResetPasswordToken()).isNull();

        user = userRepository.findByEmail("suspendu@example.com").orElseThrow();
        user.setResetPasswordToken(ancienCode);
        user.setResetPasswordTokenExpiry(System.currentTimeMillis() + 60_000);
        userRepository.save(user);
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "email", "suspendu@example.com", "token", ancienCode, "newPassword", "Nouveau123!"))))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // Vérifie que le reset réussit si l'email et le token sont valides
    @Test
    public void testResetPasswordSuccess() throws Exception {
        // creation du compte
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "user12@example.com");
        payload.put("nom", "User");
        payload.put("prenom", "Twelve");
        payload.put("password", "Test123!");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated()); // Inscription réussit, donc 201
        // activation du compte
        String activationCode = userRepository.findByEmail("user12@example.com").get().getActivationCode();
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate")
            .param("token", activationCode))
            .andExpect(MockMvcResultMatchers.status().isOk());

        // demande de réinitialisation de mot de passe
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "user12@example.com"))))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").exists());

        // Simuler l'envoi d'un email de réinitialisation de mot de passe
        String resetToken = userRepository.findByEmail("user12@example.com").get().getResetPasswordToken();
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "user12@example.com", "token", resetToken, "newPassword", "NewTest123!"))))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Mot de passe réinitialisé avec succès."));
    }

    // Vérifie que le reset échoue si le token est invalide
    @Test
    public void testResetPasswordWithInvalidToken() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "user12@example.com", "token", "invalidtoken", "newPassword", "NewTest123!"))))
            .andExpect(MockMvcResultMatchers.status().isBadRequest())
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Token invalide ou expiré."));
    }

    // Vérifie que le reset échoue si l'email n'existe pas
    @Test
    public void testResetPasswordWithUnknownEmail() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "unknown@example.com", "token", "sometoken", "newPassword", "NewTest123!"))))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // Vérifie que le reset échoue si des champs sont manquants
    @Test
    public void testResetPasswordWithMissingFields() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "user12@example.com", "newPassword", "NewTest123!"))))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // Vérifie qu'on ne peut pas créer un compte admin
    @Test
    public void testCannotCreateAdminAccount() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "adminuser@example.com");
        payload.put("nom", "Admin");
        payload.put("prenom", "User");
        payload.put("password", "Test123!");
        payload.put("role", "ADMINISTRATEUR");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    // Vérifie la gestion des champs très longs et caractères spéciaux
    @Test
    public void testInputLengthAndSpecialChars() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "verylongemailaddress_abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()@example.com");
        payload.put("nom", "NomAvecDesCaractèresTrèsLongsEtSpéciaux_abcdefghijklmnopqrstuvwxyz");
        payload.put("prenom", "PrénomAvecDesCaractèresTrèsLongsEtSpéciaux_abcdefghijklmnopqrstuvwxyz");
        payload.put("password", "Test123!@#$%^&*()_+=-abcdefghijklmnopqrstuvwxyz0123456789");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isBadRequest());
    }

    /// Vérifie qu'une inscription standard réussit
    @Test
    public void testRegisterUserSuccess() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", "user1@example.com");
        payload.put("nom", "User");
        payload.put("prenom", "One");
        payload.put("password", "Test123!");
        payload.put("role", "PARTICULIER");
        mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
            .andExpect(MockMvcResultMatchers.status().isCreated()) // L'inscription réussit, donc 201 CREATED
            .andExpect(MockMvcResultMatchers.jsonPath("$.message").exists());
        //Activation du compte
        String activationCode = userRepository.findByEmail("user1@example.com").orElseThrow(() -> new AssertionError("User should exist after signup")).getActivationCode();
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/activate")
            .param("token", activationCode))
            .andExpect(MockMvcResultMatchers.status().isOk())
            .andExpect(MockMvcResultMatchers.content().string(org.hamcrest.Matchers.containsString("Compte activé")));
    }


    
}