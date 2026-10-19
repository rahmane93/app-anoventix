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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.HistoriqueAnnonceRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.SignalementRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.EmailService;
import tools.jackson.databind.ObjectMapper;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;

@SpringBootTest
public class MessagingControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private AnnonceRepository annonceRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private MediaRepository mediaRepository;
    @Autowired private EntrepriseRepository entrepriseRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private SignalementRepository signalementRepository;
    @Autowired private HistoriqueAnnonceRepository historiqueAnnonceRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private EmailService emailService;

    private MockMvc mockMvc;
    private int phoneIndex = 0;
    private static final String LOC_ID = "test-msg-loc-001";

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
            loc.setCommune("Dixinn");
            loc.setQuartier("Landréah (MessagingControllerTest)");
            localisationRepository.save(loc);
        }
    }

    private String nextPhone() {
        return "+22465" + String.format("%07d", ++phoneIndex);
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

    private Long createBien(String jwt) throws Exception {
        String response = mockMvc.perform(multipart("/api/biens-immo")
                .file(TestPhotos.photo())
                .param("titre", "Villa à louer à Dixinn")
                .param("description", "Belle villa avec jardin et piscine dans un quartier résidentiel calme")
                .param("prix", "500000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "LOCATION")
                .param("typeBien", "MAISON")
                .param("typeUsage", "HABITATION")
                .param("documentsDisponibles", "Titre foncier")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private Long createConversation(String jwt, Long annonceId) throws Exception {
        String response = mockMvc.perform(post("/api/messagerie/conversations")
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("annonceId", annonceId))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void testCreateConversation_authenticated() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("msg1", "msg1@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        String userJwt = signupActivateAndGetJWT("msg2", "msg2@test.com", "Test123!");
        mockMvc.perform(post("/api/messagerie/conversations")
                .header("Authorization", "Bearer " + userJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("annonceId", annonceId))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists());
    }

    @Test
    void testCreateConversation_unauthenticated() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("msg3", "msg3@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        mockMvc.perform(post("/api/messagerie/conversations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("annonceId", annonceId))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetMyConversations_authenticated() throws Exception {
        String jwt = signupActivateAndGetJWT("msg4", "msg4@test.com", "Test123!");

        mockMvc.perform(get("/api/messagerie/conversations").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void testGetMyConversations_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/messagerie/conversations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetConversationById_participant() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("msg5", "msg5@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        String userJwt = signupActivateAndGetJWT("msg6", "msg6@test.com", "Test123!");
        Long convId = createConversation(userJwt, annonceId);

        mockMvc.perform(get("/api/messagerie/conversations/{id}", convId)
                .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(convId));
    }

    @Test
    void testGetConversationById_notParticipant() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("msg7", "msg7@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        String participantJwt = signupActivateAndGetJWT("msg8", "msg8@test.com", "Test123!");
        Long convId = createConversation(participantJwt, annonceId);

        String strangerJwt = signupActivateAndGetJWT("msg9", "msg9@test.com", "Test123!");
        mockMvc.perform(get("/api/messagerie/conversations/{id}", convId)
                .header("Authorization", "Bearer " + strangerJwt))
                .andExpect(status().isNotFound());
    }

    @Test
    void testSendMessage_authenticated() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("msg10", "msg10@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        String userJwt = signupActivateAndGetJWT("msg11", "msg11@test.com", "Test123!");
        Long convId = createConversation(userJwt, annonceId);

        mockMvc.perform(post("/api/messagerie/conversations/{id}/messages", convId)
                .header("Authorization", "Bearer " + userJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "Bonjour, l'appartement est-il toujours disponible?"))))
                .andExpect(status().isCreated());
    }

    @Test
    void testMarkConversationAsRead_authenticated() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("msg12", "msg12@test.com", "Test123!");
        Long annonceId = createBien(ownerJwt);

        String userJwt = signupActivateAndGetJWT("msg13", "msg13@test.com", "Test123!");
        Long convId = createConversation(userJwt, annonceId);

        mockMvc.perform(put("/api/messagerie/conversations/{id}/read", convId)
                .header("Authorization", "Bearer " + userJwt))
                .andExpect(status().isNoContent());
    }
}
