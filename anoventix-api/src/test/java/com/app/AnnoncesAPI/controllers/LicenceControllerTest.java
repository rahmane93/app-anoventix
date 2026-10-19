package com.app.AnnoncesAPI.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;


import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.ParametrePlateforme;
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
import com.app.AnnoncesAPI.repositories.LicenceRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.ParametrePlateformeRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.SignalementRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.EmailService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Parcours complet : l'admin ouvre les licences, un particulier bute sur la limite gratuite puis active une clé. */
@SpringBootTest
public class LicenceControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AnnonceRepository annonceRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private MediaRepository mediaRepository;
    @Autowired private HistoriqueAnnonceRepository historiqueAnnonceRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private SignalementRepository signalementRepository;
    @Autowired private EntrepriseRepository entrepriseRepository;
    @Autowired private LicenceRepository licenceRepository;
    @Autowired private ParametrePlateformeRepository parametreRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private com.app.AnnoncesAPI.services.LicenceService licenceService;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private EmailService emailService;

    private MockMvc mockMvc;
    private static final String LOC_ID = "test-licence-loc-001";

    @BeforeEach
    void setup() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        nettoyer();
        if (!localisationRepository.existsById(LOC_ID)) {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Ratoma");
            loc.setQuartier("Kipé (LicenceControllerTest)");
            localisationRepository.save(loc);
        }
    }

    // Les autres classes de test partagent la base : ni licence (clé étrangère vers account)
    // ni mode licence actif ne doivent leur survivre.
    @AfterEach
    void nettoyer() {
        jdbc.execute("DELETE FROM email_sortant");
        licenceRepository.deleteAll();
        parametreRepository.deleteAll();
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
    }

    private String jwt(String email, TypeRole role) throws Exception {
        Role r = roleRepository.findByName(role).orElseThrow();
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("Test123!"));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setStatutPieceIdentite(StatutPieceIdentite.VALIDEE);
        user.setTelephone("+2246" + String.format("%08d", Math.abs(email.hashCode()) % 100_000_000));
        user.setRole(r);
        userRepository.save(user);
        String response = mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("identifier", email, "password", "Test123!"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asString();
    }

    private ResultActions publier(String jwt) throws Exception {
        return mockMvc.perform(multipart("/api/biens-immo")
                .file(TestPhotos.photo())
                .param("titre", "Maison familiale à Kipé")
                .param("description", "Maison de cinq pièces avec cour intérieure dans un quartier calme de Ratoma")
                .param("prix", "300000000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "MAISON")
                .param("typeUsage", "HABITATION")
                .param("documentsDisponibles", "Titre foncier")
                .header("Authorization", "Bearer " + jwt));
    }

    private JsonNode get200(String url, String jwt) throws Exception {
        String body = mockMvc.perform(get(url).header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    @Test
    void parcoursComplet() throws Exception {
        String admin = jwt("admin-licence@test.com", TypeRole.ADMINISTRATEUR);
        String particulier = jwt("part-licence@test.com", TypeRole.PARTICULIER);

        // Mode coupé : publication illimitée, licence invisible, activation refusée.
        for (int i = 0; i < 6; i++) publier(particulier).andExpect(status().isCreated());
        assertEquals(false, get200("/api/licences/me", particulier).get("modeActif").asBoolean());
        historiqueAnnonceRepository.deleteAll();
        mediaRepository.deleteAll();
        bienImmoRepository.deleteAll();
        annonceRepository.deleteAll();

        // L'admin règle tarifs + contact, ouvre les licences et génère une clé particulier.
        mockMvc.perform(put("/api/licences/admin/reglages")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prixParticulier\":150000,\"prixProfessionnel\":1500000,\"contactTelephone\":\"+224 620 00 00 00\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prixParticulier").value(150000));
        mockMvc.perform(put("/api/licences/admin/mode")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\":true}"))
                .andExpect(status().isOk())
                // Préavis de 30 jours (DEC-18) : la date d'effet est fixée à J+30.
                .andExpect(jsonPath("$.dateEffet").value(java.time.LocalDate.now().plusDays(30).toString()));
        assertEquals(true, get200("/api/licences/me", particulier).get("enPreavis").asBoolean());
        // Simule l'arrivée de la date d'effet : le mode s'applique.
        parametreRepository.save(new ParametrePlateforme("licence.date-effet", java.time.LocalDate.now().minusDays(1).toString()));
        String cle = vendre(admin, "part-licence@test.com", "ORANGE_MONEY", "OM-2026-001");

        // Le particulier voit le prix de sa licence et le contact.
        JsonNode me = get200("/api/licences/me", particulier);
        assertEquals("AUCUNE", me.get("statut").asString());
        assertEquals(150000, me.get("prix").asLong());
        assertEquals("+224 620 00 00 00", me.get("contactTelephone").asString());

        // 5 gratuites, la 6e est refusée.
        for (int i = 0; i < 5; i++) publier(particulier).andExpect(status().isCreated());
        publier(particulier).andExpect(status().isPaymentRequired());

        // Activation puis 6e annonce acceptée.
        mockMvc.perform(post("/api/licences/activer")
                        .header("Authorization", "Bearer " + particulier)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cle\":\"" + cle.toLowerCase() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("ACTIVE"));
        long sixieme = objectMapper.readTree(publier(particulier).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        // Une clé nominative est refusée à un autre compte.
        String autre = jwt("autre-licence@test.com", TypeRole.PARTICULIER);
        String cleNominative = vendre(admin, "part-licence@test.com", "ESPECES", null);
        mockMvc.perform(post("/api/licences/activer")
                        .header("Authorization", "Bearer " + autre)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cle\":\"" + cleNominative + "\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.message").value("Cette clé est réservée à un autre compte."));

        // La clé ne se réutilise pas.
        mockMvc.perform(post("/api/licences/activer")
                        .header("Authorization", "Bearer " + particulier)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cle\":\"" + cle + "\"}"))
                .andExpect(status().isUnprocessableContent());

        // Liste admin : filtres par statut et recherche par email.
        jwt("pro-licence@test.com", TypeRole.PROFESSIONNEL);
        vendre(admin, "pro-licence@test.com", "VIREMENT", "VIR-77");
        assertEquals(3, get200("/api/licences/admin/cles", admin).get("totalItems").asInt());
        // Trace de la vente dans la liste, filtre par période et par référence de paiement.
        JsonNode vente = get200("/api/licences/admin/cles?q=OM-2026-001", admin).get("data").get(0);
        assertEquals("part-licence@test.com", vente.get("acheteurEmail").asString());
        assertEquals(150000, vente.get("montant").asLong());
        assertEquals("ORANGE_MONEY", vente.get("moyenPaiement").asString());
        assertEquals("admin-licence@test.com", vente.get("generePar").asString());
        assertEquals(3, get200("/api/licences/admin/cles?du=" + java.time.LocalDate.now() + "&au=" + java.time.LocalDate.now(), admin)
                .get("totalItems").asInt());
        assertEquals(0, get200("/api/licences/admin/cles?au=" + java.time.LocalDate.now().minusDays(1), admin)
                .get("totalItems").asInt());
        JsonNode actives = get200("/api/licences/admin/cles?statut=ACTIVE", admin);
        assertEquals(1, actives.get("totalItems").asInt());
        assertEquals("part-licence@test.com", actives.get("data").get(0).get("ownerEmail").asString());
        assertEquals(2, get200("/api/licences/admin/cles?statut=LIBRE", admin).get("totalItems").asInt());
        assertEquals(2, get200("/api/licences/admin/cles?q=part-licence", admin).get("totalItems").asInt());
        assertEquals(0, get200("/api/licences/admin/cles?statut=EXPIREE", admin).get("totalItems").asInt());

        // Expiration avec 6 annonces actives : compte bloqué.
        licenceRepository.findByCle(cle).ifPresent(l -> {
            l.setDateFin(java.time.LocalDate.now().minusDays(1));
            licenceRepository.save(l);
        });
        me = get200("/api/licences/me", particulier);
        assertEquals("EXPIREE", me.get("statut").asString());
        assertEquals(true, me.get("bloque").asBoolean());
        assertEquals(6, me.get("annoncesActives").asInt());
        mockMvc.perform(multipart("/api/biens-immo/" + sixieme + "/medias")
                        .file(TestPhotos.photo())
                        .with(r -> { r.setMethod("PUT"); return r; })
                        .header("Authorization", "Bearer " + particulier))
                .andExpect(status().isPaymentRequired());

        // Réduire reste permis ; sous le seuil, retour au gratuit.
        mockMvc.perform(put("/api/biens-immo/" + sixieme + "/cloturer")
                        .param("motif", "RETIRE")
                        .header("Authorization", "Bearer " + particulier))
                .andExpect(status().isNoContent());
        assertEquals(false, get200("/api/licences/me", particulier).get("bloque").asBoolean());
    }

    @Test
    void uneCleActiveeAvantLOuvertureDuModeDemarreQuandLeModePrendEffet() throws Exception {
        String admin = jwt("admin-licence@test.com", TypeRole.ADMINISTRATEUR);
        String particulier = jwt("part-licence@test.com", TypeRole.PARTICULIER);
        String cle = vendre(admin, "part-licence@test.com", "ESPECES", null);

        // Mode inactif : l'activation est acceptée, la licence attend son démarrage (DEC-28).
        mockMvc.perform(post("/api/licences/activer")
                        .header("Authorization", "Bearer " + particulier)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cle\":\"" + cle + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.dateFin").doesNotExist());

        // Le mode est ouvert (préavis) : elle attend toujours, et la publication reste libre.
        mockMvc.perform(put("/api/licences/admin/mode").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"actif\":true}"))
                .andExpect(status().isOk());
        assertEquals("EN_ATTENTE", get200("/api/licences/me", particulier).get("statut").asString());
        for (int i = 0; i < 6; i++) publier(particulier).andExpect(status().isCreated());

        // La date d'effet arrive : la clé démarre ce jour-là.
        parametreRepository.save(new ParametrePlateforme("licence.date-effet", java.time.LocalDate.now().toString()));
        assertEquals(1, licenceService.demarrerLicencesEnAttente());
        JsonNode me = get200("/api/licences/me", particulier);
        assertEquals("ACTIVE", me.get("statut").asString());
        assertEquals(java.time.LocalDate.now().toString(), me.get("dateDebut").asString());
        assertEquals(false, me.get("bloque").asBoolean());
    }

    @Test
    void laVenteExigeUneReferenceSaufEnEspecesEtUnAcheteurConnu() throws Exception {
        String admin = jwt("admin-licence@test.com", TypeRole.ADMINISTRATEUR);
        jwt("part-licence@test.com", TypeRole.PARTICULIER);

        mockMvc.perform(post("/api/licences/admin/cles").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"acheteur\":\"part-licence@test.com\",\"montant\":150000,\"moyenPaiement\":\"MTN_MOMO\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/licences/admin/cles").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"acheteur\":\"inconnu@test.com\",\"montant\":150000,\"moyenPaiement\":\"ESPECES\"}"))
                .andExpect(status().isNotFound());
        // Le reçu part par email à l'acheteur.
        vendre(admin, "part-licence@test.com", "ESPECES", null);
        assertEquals(1, emailsSortantsPour("part-licence@test.com"));
    }

    private int emailsSortantsPour(String destinataire) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = ?", Integer.class, destinataire);
    }

    /** Vente d'une clé nominative ; retourne la clé. */
    private String vendre(String admin, String acheteur, String moyen, String reference) throws Exception {
        Map<String, Object> corps = new java.util.HashMap<>(Map.of("acheteur", acheteur, "montant", 150000, "moyenPaiement", moyen));
        if (reference != null) corps.put("referencePaiement", reference);
        return objectMapper.readTree(mockMvc.perform(post("/api/licences/admin/cles")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("cle").asString();
    }

    @Test
    void endpointsAdmin_interditsAuxAutresRoles() throws Exception {
        String moderateur = jwt("modo-licence@test.com", TypeRole.MODERATEUR);
        mockMvc.perform(get("/api/licences/admin/cles").header("Authorization", "Bearer " + moderateur))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/licences/admin/mode")
                        .header("Authorization", "Bearer " + moderateur)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\":true}"))
                .andExpect(status().isForbidden());
    }
}
