package com.app.AnnoncesAPI.controllers;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.Role;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.HistoriqueAnnonceRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.SignalementRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.EmailService;
import tools.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;

@SpringBootTest
public class UserControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AnnonceRepository annonceRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private MediaRepository mediaRepository;
    @Autowired private EntrepriseRepository entrepriseRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private SignalementRepository signalementRepository;
    @Autowired private HistoriqueAnnonceRepository historiqueAnnonceRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbcTemplate;

    @MockitoBean private EmailService emailService;

    private MockMvc mockMvc;
    private int phoneIndex = 0;
    private static final String LOC_ID = "test-user-loc-001";

    @BeforeEach
    void setup() throws Exception {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        phoneIndex = 0;

        doNothing().when(emailService).sendEmail(any(), any(), any());

        messageRepository.deleteAll();
        conversationRepository.deleteAll();
        signalementRepository.deleteAll();
        historiqueAnnonceRepository.deleteAll();
        mediaRepository.deleteAll();
        jdbcTemplate.execute("DELETE FROM account_favoris");
        bienImmoRepository.deleteAll();
        annonceRepository.deleteAll();
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        entrepriseRepository.deleteAll();
        userRepository.deleteAll();

        if (!localisationRepository.existsById(LOC_ID)) {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Ratoma");
            loc.setQuartier("Cosa");
            localisationRepository.save(loc);
        }
    }

    private String nextPhone() {
        return "+22463" + String.format("%07d", ++phoneIndex);
    }

    private String signupActivateAndGetJWT(String username, String email, String password) throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "email", email, "password", password,
                        "nom", username, "prenom", username, "role", "PARTICULIER"))))
                .andExpect(status().isCreated());

        String token = userRepository.findByEmail(email).orElseThrow().getActivationCode();
        mockMvc.perform(get("/api/auth/activate").param("token", token));

        userRepository.findByEmail(email).ifPresent(u -> {
            u.setStatutPieceIdentite(StatutPieceIdentite.VALIDEE);
            userRepository.save(u);
        });

        String response = mockMvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        Map.of("identifier", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("token").asString();
    }

    private String createAdminAndGetJWT(String username) {
        Role adminRole = roleRepository.findByName(TypeRole.ADMINISTRATEUR).orElseThrow();
        User admin = new User();
        admin.setEmail(username + "@test.com");
        admin.setPassword(passwordEncoder.encode("Admin123!"));
        admin.setStatut(StatutUtilisateur.ACTIF);
        admin.setTelephone(nextPhone());
        admin.setRole(adminRole);
        userRepository.save(admin);

        try {
            String response = mockMvc.perform(post("/api/auth/signin")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(
                            Map.of("identifier", username + "@test.com", "password", "Admin123!"))))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            return objectMapper.readTree(response).get("token").asString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Long createBien(String jwt) throws Exception {
        String response = mockMvc.perform(multipart("/api/biens-immo")
                .file(TestPhotos.photo())
                .param("titre", "Appartement test pour favoris")
                .param("description", "Appartement de test destiné aux scénarios de tests de favoris utilisateurs")
                .param("prix", "150000000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "APPARTEMENT")
                .param("typeUsage", "HABITATION")
                .param("documentsDisponibles", "Titre foncier")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void testGetMyProfile_authenticated() throws Exception {
        String jwt = signupActivateAndGetJWT("user1", "user1@test.com", "Test123!");

        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("user1@test.com"));
    }

    @Test
    void testGetPresence_soiMemeEnLigne() throws Exception {
        String jwt = signupActivateAndGetJWT("pres1", "pres1@test.com", "Test123!");
        String id = userRepository.findByEmail("pres1@test.com").orElseThrow().getId().toString();

        // La requête elle-même est une activité : on est en ligne.
        mockMvc.perform(get("/api/users/" + id + "/presence").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ONLINE"))
                .andExpect(jsonPath("$.lastSeenAt").isNotEmpty());
    }

    @Test
    void testGetPresence_sansConversationRefuse() throws Exception {
        String jwt = signupActivateAndGetJWT("pres2", "pres2@test.com", "Test123!");
        signupActivateAndGetJWT("pres3", "pres3@test.com", "Test123!");
        String autreId = userRepository.findByEmail("pres3@test.com").orElseThrow().getId().toString();

        mockMvc.perform(get("/api/users/" + autreId + "/presence").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetMyProfile_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testUpdateMyProfile() throws Exception {
        String jwt = signupActivateAndGetJWT("user2", "user2@test.com", "Test123!");

        mockMvc.perform(put("/api/users/me")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("telephone", "00224620000001"))))
                .andExpect(status().isOk())
                // Téléphone normalisé : préfixe 00 → +
                .andExpect(jsonPath("$.telephone").value("+224620000001"));
    }

    @Test
    void testUpdateMyProfile_pieceValideeVerrouillee() throws Exception {
        // Le helper valide la pièce d'identité : son numéro ne doit plus être modifiable.
        String jwt = signupActivateAndGetJWT("user2b", "user2b@test.com", "Test123!");

        mockMvc.perform(put("/api/users/me")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("numeroPieceIdentite", "GN-999999"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAddFavori() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("user3", "user3@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        String userJwt = signupActivateAndGetJWT("user4", "user4@test.com", "Test123!");
        mockMvc.perform(post("/api/users/me/favoris/{id}", annonceId)
                .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isOk());
    }

    @Test
    void testRemoveFavori() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("user5", "user5@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        String userJwt = signupActivateAndGetJWT("user6", "user6@test.com", "Test123!");
        mockMvc.perform(post("/api/users/me/favoris/{id}", annonceId)
                .header("Authorization", "Bearer " + userJwt));

        mockMvc.perform(delete("/api/users/me/favoris/{id}", annonceId)
                .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isOk());
    }

    @Test
    void testGetFavoris() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("user7", "user7@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        String userJwt = signupActivateAndGetJWT("user8", "user8@test.com", "Test123!");
        mockMvc.perform(post("/api/users/me/favoris/{id}", annonceId)
                .header("Authorization", "Bearer " + userJwt));

        mockMvc.perform(get("/api/users/me/favoris").header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void testDeleteMyAccount() throws Exception {
        String jwt = signupActivateAndGetJWT("user9", "user9@test.com", "Test123!");

        mockMvc.perform(delete("/api/users/me").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNoContent());
    }

    @Test
    void testGetAllUsers_asAdmin() throws Exception {
        String adminJwt = createAdminAndGetJWT("adminuser1");

        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void testCompteSupprimeDefinitivement_nonListeNiCompte() throws Exception {
        String adminJwt = createAdminAndGetJWT("adminuser9");
        signupActivateAndGetJWT("parti", "parti@test.com", "Test123!");

        long totalAvant = objectMapper.readTree(mockMvc.perform(get("/api/admin/stats")
                        .header("Authorization", "Bearer " + adminJwt))
                .andReturn().getResponse().getContentAsString()).get("totalUtilisateurs").asLong();

        User supprime = userRepository.findByEmail("parti@test.com").orElseThrow();
        supprime.setDateSuppressionDefinitive(java.time.LocalDateTime.now());
        userRepository.save(supprime);

        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.email == 'parti@test.com')]").isEmpty());
        mockMvc.perform(get("/api/admin/utilisateurs").param("search", "parti")
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());
        mockMvc.perform(get("/api/admin/stats").header("Authorization", "Bearer " + adminJwt))
                .andExpect(jsonPath("$.totalUtilisateurs").value(totalAvant - 1));
    }

    @Test
    void testGetAllUsers_asRegularUser() throws Exception {
        String jwt = signupActivateAndGetJWT("user10", "user10@test.com", "Test123!");

        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isForbidden());
    }

    @Test
    void testUpdateUserStatut_asAdmin() throws Exception {
        String targetJwt = signupActivateAndGetJWT("user11", "user11@test.com", "Test123!");
        String targetUserId = objectMapper.readTree(
                mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + targetJwt))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asString();

        String adminJwt = createAdminAndGetJWT("adminuser2");
        mockMvc.perform(put("/api/users/{id}/statut", targetUserId)
                .header("Authorization", "Bearer " + adminJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("statut", "SUSPENDU"))))
                .andExpect(status().isOk());
    }

    @Test
    void testUpdateUserStatut_asRegularUser() throws Exception {
        String targetJwt = signupActivateAndGetJWT("user12", "user12@test.com", "Test123!");
        String targetUserId = objectMapper.readTree(
                mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + targetJwt))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asString();

        String regularJwt = signupActivateAndGetJWT("user13", "user13@test.com", "Test123!");
        mockMvc.perform(put("/api/users/{id}/statut", targetUserId)
                .header("Authorization", "Bearer " + regularJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("statut", "SUSPENDU"))))
                .andExpect(status().isForbidden());
    }
}
