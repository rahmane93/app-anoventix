package com.app.AnnoncesAPI.controllers;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
public class BienImmoControllerTest {

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
    private static final String LOC_ID = "test-loc-001";

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
            loc.setCommune("Matam");
            loc.setQuartier("Taouyah");
            localisationRepository.save(loc);
        }
    }

    private String nextPhone() {
        return "+22462" + String.format("%07d", ++phoneIndex);
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
                .content(objectMapper.writeValueAsString(Map.of("identifier", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("token").asString();
    }

    private Long createBien(String jwt) throws Exception {
        String response = mockMvc.perform(multipart("/api/biens-immo")
                .file(TestPhotos.photo())
                .param("titre", "Appartement lumineux à Matam")
                .param("description", "Bel appartement de 3 pièces avec vue dégagée dans un quartier calme et résidentiel")
                .param("prix", "250000000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "APPARTEMENT")
                .param("documentsDisponibles", "Titre foncier")
                .param("surfaceTotal", "80.0")
                .param("typeUsage", "HABITATION")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void testCreateBienImmo_authenticated() throws Exception {
        String jwt = signupActivateAndGetJWT("bien1", "bien1@test.com", "Test123!");

        mockMvc.perform(multipart("/api/biens-immo")
                .file(TestPhotos.photo())
                .param("titre", "Maison avec jardin à Ratoma")
                .param("description", "Grande maison familiale avec jardin arboré et garage double intégré")
                .param("prix", "350000000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "MAISON")
                .param("documentsDisponibles", "Titre foncier")
                .param("surfaceTotal", "120.0")
                .param("typeUsage", "HABITATION")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.titre").value("Maison avec jardin à Ratoma"));
    }

    @Test
    void testCreateBienImmo_sansPhoto_refuse() throws Exception {
        String jwt = signupActivateAndGetJWT("bien3", "bien3@test.com", "Test123!");

        mockMvc.perform(multipart("/api/biens-immo")
                .param("titre", "Villa sans photo à Kipé")
                .param("description", "Belle villa spacieuse avec piscine et jardin dans un quartier résidentiel")
                .param("prix", "900000000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "VILLA")
                .param("documentsDisponibles", "Titre foncier")
                .param("typeUsage", "HABITATION")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testCreateBienImmo_unauthenticated() throws Exception {
        mockMvc.perform(multipart("/api/biens-immo")
                .param("titre", "Terrain à bâtir")
                .param("description", "Grand terrain plat idéal pour construction résidentielle en zone urbaine")
                .param("prix", "100000000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "TERRAIN")
                .param("documentsDisponibles", "Titre foncier"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testCreateBienImmo_titreManquant() throws Exception {
        String jwt = signupActivateAndGetJWT("bien2", "bien2@test.com", "Test123!");

        mockMvc.perform(multipart("/api/biens-immo")
                .param("description", "Description suffisamment longue pour passer la validation minimale requise")
                .param("prix", "100000000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "TERRAIN")
                .param("documentsDisponibles", "Titre foncier")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testGetAllBiens_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/biens-immo"))
                .andExpect(status().isOk());
    }

    @Test
    void testGetBienById_notFound() throws Exception {
        mockMvc.perform(get("/api/biens-immo/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetBienById_found() throws Exception {
        String jwt = signupActivateAndGetJWT("bien3", "bien3@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(get("/api/biens-immo/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void testUpdateBienImmo_parLeProprietaire() throws Exception {
        String jwt = signupActivateAndGetJWT("bien4", "bien4@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(put("/api/biens-immo/{id}", id)
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "titre", "Appartement rénové - titre mis à jour",
                        "description", "Appartement entièrement rénové avec des matériaux de haute qualité",
                        "prix", 280000000,
                        "localisationId", LOC_ID,
                        "typeAnnonce", "VENTE",
                        "typeBien", "APPARTEMENT",
                        "typeUsage", "HABITATION",
                        "documentsDisponibles", "Titre foncier"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titre").value("Appartement rénové - titre mis à jour"));
    }

    @Test
    void testUpdateBienImmo_parAutreUtilisateur() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("bien5", "bien5@test.com", "Test123!");
        Long id = createBien(ownerJwt);

        String autreJwt = signupActivateAndGetJWT("bien6", "bien6@test.com", "Test123!");
        mockMvc.perform(put("/api/biens-immo/{id}", id)
                .header("Authorization", "Bearer " + autreJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "titre", "Tentative de modification non autorisée",
                        "description", "Description modifiée sans autorisation par un autre utilisateur",
                        "prix", 280000000,
                        "localisationId", LOC_ID,
                        "typeAnnonce", "VENTE",
                        "typeBien", "APPARTEMENT",
                        "typeUsage", "HABITATION",
                        "documentsDisponibles", "Titre foncier"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void testDeleteBienImmo_parLeProprietaire() throws Exception {
        String jwt = signupActivateAndGetJWT("bien7", "bien7@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(delete("/api/biens-immo/{id}", id)
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNoContent());
    }

    @Test
    void testDeleteBienImmo_parAutreUtilisateur() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("bien8", "bien8@test.com", "Test123!");
        Long id = createBien(ownerJwt);

        String autreJwt = signupActivateAndGetJWT("bien9", "bien9@test.com", "Test123!");
        mockMvc.perform(delete("/api/biens-immo/{id}", id)
                .header("Authorization", "Bearer " + autreJwt))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetMesBiens_authenticated() throws Exception {
        String jwt = signupActivateAndGetJWT("bien10", "bien10@test.com", "Test123!");
        createBien(jwt);

        mockMvc.perform(get("/api/biens-immo/user")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    void testGetMesBiens_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/biens-immo/user"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testSearchBiens_public() throws Exception {
        // Recherche publique, comme /filter et /public/search.
        mockMvc.perform(get("/api/biens-immo/search").param("keyword", "appartement"))
                .andExpect(status().isOk());
    }

    @Test
    void testRecherche_parQuartierSansAccentEtParReference() throws Exception {
        Localisation kipe = new Localisation();
        kipe.setId("test-loc-kipe");
        kipe.setRegion("Conakry");
        kipe.setPrefecture("Conakry");
        kipe.setCommune("Ratoma");
        kipe.setQuartier("Kipé");
        localisationRepository.save(kipe);
        String jwt = signupActivateAndGetJWT("recherche1", "recherche1@test.com", "Test123!");

        String response = mockMvc.perform(multipart("/api/biens-immo")
                .file(TestPhotos.photo())
                .param("titre", "Villa avec piscine")
                .param("description", "Grande villa familiale avec piscine et jardin, proche de la plage")
                .param("prix", "900000000")
                .param("localisationId", "test-loc-kipe")
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "VILLA")
                .param("documentsDisponibles", "Titre foncier")
                .param("typeUsage", "HABITATION")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String reference = objectMapper.readTree(response).get("referenceAnnonce").asString();

        // Le quartier n'est cité ni dans le titre ni dans la description, et sans accent.
        mockMvc.perform(get("/api/biens-immo/filter").param("q", "kipe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.data[0].titre").value("Villa avec piscine"));

        // Nouveau format de référence, avec l'année : VE-aammjj-XXXX.
        org.assertj.core.api.Assertions.assertThat(reference).matches("VE-\\d{6}-[A-Z2-9]{4}");
        mockMvc.perform(get("/api/biens-immo/filter").param("reference", reference.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void testFilterBiens_public() throws Exception {
        mockMvc.perform(get("/api/biens-immo/filter").param("typeAnnonce", "VENTE"))
                .andExpect(status().isOk());
    }

    @Test
    void testSignalerAnnonce_authenticated() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("bien11", "bien11@test.com", "Test123!");
        Long id = createBien(ownerJwt);

        String reporterJwt = signupActivateAndGetJWT("bien12", "bien12@test.com", "Test123!");
        mockMvc.perform(post("/api/biens-immo/{id}/signaler", id)
                .header("Authorization", "Bearer " + reporterJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        Map.of("motif", "CONTENU_INAPPROPRIE", "commentaire", "Annonce trompeuse"))))
                .andExpect(status().isCreated());
    }

    @Test
    void testSignalerAnnonce_deuxFois_refuse() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("sig1", "sig1@test.com", "Test123!");
        Long id = createBien(ownerJwt);
        String reporterJwt = signupActivateAndGetJWT("sig2", "sig2@test.com", "Test123!");
        String body = objectMapper.writeValueAsString(Map.of("motif", "CONTENU_INAPPROPRIE"));

        mockMvc.perform(post("/api/biens-immo/{id}/signaler", id)
                .header("Authorization", "Bearer " + reporterJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/biens-immo/{id}/signaler", id)
                .header("Authorization", "Bearer " + reporterJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void testSignalerRetirerPuisResignaler() throws Exception {
        // Contrainte unique (annonce, reporter) en base : le re-signalement rouvre l'ancien.
        String ownerJwt = signupActivateAndGetJWT("sig4", "sig4@test.com", "Test123!");
        Long id = createBien(ownerJwt);
        String reporterJwt = signupActivateAndGetJWT("sig5", "sig5@test.com", "Test123!");
        String body = objectMapper.writeValueAsString(Map.of("motif", "CONTENU_INAPPROPRIE"));

        mockMvc.perform(post("/api/biens-immo/{id}/signaler", id)
                .header("Authorization", "Bearer " + reporterJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(delete("/api/biens-immo/{id}/signaler", id)
                .header("Authorization", "Bearer " + reporterJwt))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/biens-immo/{id}/signaler", id)
                .header("Authorization", "Bearer " + reporterJwt)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void testSignalerSaPropreAnnonce_refuse() throws Exception {
        String jwt = signupActivateAndGetJWT("sig3", "sig3@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(post("/api/biens-immo/{id}/signaler", id)
                .header("Authorization", "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("motif", "CONTENU_INAPPROPRIE"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testMasquerPuisAfficher_resteDansMesAnnonces() throws Exception {
        String jwt = signupActivateAndGetJWT("mask1", "mask1@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(put("/api/biens-immo/{id}/toggle-actif", id).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNoContent());
        // Masquée par son propriétaire : toujours listée (statut PUBLIEE, actif=false).
        mockMvc.perform(get("/api/biens-immo/user").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].actif").value(false))
                .andExpect(jsonPath("$.data[0].statutModeration").value("PUBLIEE"));
        mockMvc.perform(put("/api/biens-immo/{id}/toggle-actif", id).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNoContent());
    }

    @Test
    void testAnnonceSupprimee_nePeutPasEtreRemiseEnLigne() throws Exception {
        String jwt = signupActivateAndGetJWT("mask2", "mask2@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(delete("/api/biens-immo/{id}", id).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isNoContent());
        mockMvc.perform(put("/api/biens-immo/{id}/toggle-actif", id).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void testNouvelleAnnonce_aUneDateExpiration() throws Exception {
        String jwt = signupActivateAndGetJWT("exp1", "exp1@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(get("/api/biens-immo/{id}", id).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateExpiration").exists());
    }

    @Test
    void testSignalerAnnonce_unauthenticated() throws Exception {
        String jwt = signupActivateAndGetJWT("bien13", "bien13@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(post("/api/biens-immo/{id}/signaler", id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("motif", "CONTENU_INAPPROPRIE"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetSimilaires_public() throws Exception {
        String jwt = signupActivateAndGetJWT("bien14", "bien14@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(get("/api/biens-immo/{id}/similaires", id))
                .andExpect(status().isOk());
    }

    @Test
    void testNearby_public() throws Exception {
        mockMvc.perform(get("/api/biens-immo/nearby")
                .param("lat", "9.5")
                .param("lng", "-13.7"))
                .andExpect(status().isOk());
    }

    @Test
    void testGetHistorique_byOwner() throws Exception {
        String jwt = signupActivateAndGetJWT("bien15", "bien15@test.com", "Test123!");
        Long id = createBien(jwt);

        mockMvc.perform(get("/api/biens-immo/{id}/historique", id)
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk());
    }

    @Test
    void testGetHistorique_byOtherUser() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("bien16", "bien16@test.com", "Test123!");
        Long id = createBien(ownerJwt);

        String autreJwt = signupActivateAndGetJWT("bien17", "bien17@test.com", "Test123!");
        mockMvc.perform(get("/api/biens-immo/{id}/historique", id)
                .header("Authorization", "Bearer " + autreJwt))
                .andExpect(status().isForbidden());
    }
}
