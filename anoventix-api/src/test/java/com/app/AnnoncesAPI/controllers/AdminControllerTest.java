package com.app.AnnoncesAPI.controllers;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
import com.app.AnnoncesAPI.enums.StatutAnnonce;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;

@SpringBootTest
public class AdminControllerTest {

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

    @MockitoBean private EmailService emailService;

    private MockMvc mockMvc;
    private int phoneIndex = 0;
    private static final String LOC_ID = "test-admin-loc-001";

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
            loc.setCommune("Kaloum");
            loc.setQuartier("Almamya (AdminControllerTest)");
            localisationRepository.save(loc);
        }
    }

    private String nextPhone() {
        return "+22464" + String.format("%07d", ++phoneIndex);
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

    private String createPrivilegedUserAndGetJWT(String username, TypeRole role) {
        Role r = roleRepository.findByName(role).orElseThrow();
        User user = new User();
        user.setEmail(username + "@test.com");
        user.setPassword(passwordEncoder.encode("Admin123!"));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setTelephone(nextPhone());
        user.setRole(r);
        userRepository.save(user);

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
                .param("titre", "Bien immobilier à modérer")
                .param("description", "Annonce immobilière créée pour les tests de modération administrative")
                .param("prix", "200000000")
                .param("localisationId", LOC_ID)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "MAISON")
                .param("typeUsage", "HABITATION")
                .param("documentsDisponibles", "Titre foncier")
                .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    // --- Stats ---

    @Test
    void testGetStats_asAdmin() throws Exception {
        String jwt = createPrivilegedUserAndGetJWT("admin1", TypeRole.ADMINISTRATEUR);

        mockMvc.perform(get("/api/admin/stats").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUtilisateurs").exists());
    }

    @Test
    void testGetStats_asModerator() throws Exception {
        String jwt = createPrivilegedUserAndGetJWT("mod1", TypeRole.MODERATEUR);

        mockMvc.perform(get("/api/admin/stats").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk());
    }

    @Test
    void testGetStats_asRegularUser() throws Exception {
        String jwt = signupActivateAndGetJWT("regular1", "regular1@test.com", "Test123!");

        mockMvc.perform(get("/api/admin/stats").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetStats_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/admin/stats"))
                .andExpect(status().isUnauthorized());
    }

    // --- Liste annonces ---

    @Test
    void testGetAllAnnonces_asModerator() throws Exception {
        String jwt = createPrivilegedUserAndGetJWT("mod2", TypeRole.MODERATEUR);

        mockMvc.perform(get("/api/admin/annonces").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    // --- Signalements ---

    @Test
    void testGetSignalements_asAdmin() throws Exception {
        String jwt = createPrivilegedUserAndGetJWT("admin2", TypeRole.ADMINISTRATEUR);

        mockMvc.perform(get("/api/admin/signalements").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.totalItems").isNumber());
    }

    // --- Modération ---

    @Test
    void testMasquerAnnonce_asModerator() throws Exception {
        String modJwt = createPrivilegedUserAndGetJWT("mod3", TypeRole.MODERATEUR);
        String ownerJwt = signupActivateAndGetJWT("owner1", "owner1@test.com", "Test123!");
        Long bienId = createBien(ownerJwt);

        mockMvc.perform(put("/api/admin/annonces/{id}/masquer", bienId)
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk());
    }

    @Test
    void testJournalAudit_actionDuModerateurTraceeEtLisibleParLAdminSeulement() throws Exception {
        String modJwt = createPrivilegedUserAndGetJWT("mod-audit", TypeRole.MODERATEUR);
        String adminJwt = createPrivilegedUserAndGetJWT("admin-audit", TypeRole.ADMINISTRATEUR);
        String ownerJwt = signupActivateAndGetJWT("owner-audit", "owner-audit@test.com", "Test123!");
        Long bienId = createBien(ownerJwt);

        mockMvc.perform(put("/api/admin/annonces/{id}/masquer", bienId)
                .param("raison", "Photos sans rapport avec le bien")
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/audit")
                .param("cibleType", "ANNONCE").param("cibleId", String.valueOf(bienId))
                .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.data[0].action").value("ANNONCE_MASQUEE"))
                .andExpect(jsonPath("$.data[0].acteurLibelle").value("mod-audit@test.com"))
                .andExpect(jsonPath("$.data[0].acteurRole").value("MODERATEUR"))
                .andExpect(jsonPath("$.data[0].motif").value("Photos sans rapport avec le bien"))
                .andExpect(jsonPath("$.data[0].adresseIp").exists());

        mockMvc.perform(get("/api/admin/audit").header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isForbidden());
    }

    @Test
    void testRejeterAnnonce_asAdmin() throws Exception {
        String adminJwt = createPrivilegedUserAndGetJWT("admin3", TypeRole.ADMINISTRATEUR);
        String ownerJwt = signupActivateAndGetJWT("owner2", "owner2@test.com", "Test123!");
        Long bienId = createBien(ownerJwt);

        mockMvc.perform(put("/api/admin/annonces/{id}/rejeter", bienId)
                .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk());
    }

    @Test
    void testPublierAnnonce_asAdmin() throws Exception {
        String adminJwt = createPrivilegedUserAndGetJWT("admin4", TypeRole.ADMINISTRATEUR);
        String ownerJwt = signupActivateAndGetJWT("owner3", "owner3@test.com", "Test123!");
        Long bienId = createBien(ownerJwt);

        mockMvc.perform(put("/api/admin/annonces/{id}/masquer", bienId)
                .header("Authorization", "Bearer " + adminJwt));

        mockMvc.perform(put("/api/admin/annonces/{id}/publier", bienId)
                .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk());
    }

    // --- Masquage de toutes les annonces d'un compte ---

    private String userId(String jwt) throws Exception {
        return objectMapper.readTree(
                mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + jwt))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asString();
    }

    /** Ids des annonces renvoyées par un endpoint de liste public ({@code data}). */
    private java.util.Set<Long> idsPublics(org.springframework.test.web.servlet.RequestBuilder requete) throws Exception {
        var data = objectMapper.readTree(mockMvc.perform(requete)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data");
        var ids = new java.util.HashSet<Long>();
        data.forEach(n -> ids.add(n.get("id").asLong()));
        return ids;
    }

    @Test
    void testMasquageSystemeDuCompte_invisibleEtReversibleSansToucherAuxAnnonces() throws Exception {
        String adminJwt = createPrivilegedUserAndGetJWT("admin-masse", TypeRole.ADMINISTRATEUR);
        String ownerJwt = signupActivateAndGetJWT("owner-masse", "owner-masse@test.com", "Test123!");
        String autreJwt = signupActivateAndGetJWT("autre-masse", "autre-masse@test.com", "Test123!");
        Long visible = createBien(ownerJwt);
        Long aCloturer = createBien(ownerJwt);
        Long cacheeParLui = createBien(ownerJwt);
        Long cloturee = createBien(ownerJwt);
        Long autre = createBien(autreJwt);
        mockMvc.perform(put("/api/biens-immo/{id}/toggle-actif", cacheeParLui)
                        .header("Authorization", "Bearer " + ownerJwt))
                .andExpect(status().is2xxSuccessful());
        mockMvc.perform(put("/api/biens-immo/{id}/cloturer", cloturee)
                        .param("motif", "VENDU")
                        .header("Authorization", "Bearer " + ownerJwt))
                .andExpect(status().isNoContent());
        String ownerId = userId(ownerJwt);

        mockMvc.perform(put("/api/admin/utilisateurs/{userId}/annonces/masquer", ownerId)
                        .param("raison", "Fraude suspectée")
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Annonces du compte masquées (2 annonce(s) visible(s) retirée(s) du public)."));

        // Les annonces elles-mêmes ne sont pas modifiées.
        var v = annonceRepository.findById(visible).orElseThrow();
        assertEquals(StatutAnnonce.PUBLIEE, v.getStatutModeration());
        assertTrue(v.getActif());
        assertFalse(annonceRepository.findById(cacheeParLui).orElseThrow().getActif());

        // Invisibles partout côté public, sauf pour le propriétaire.
        for (var requete : java.util.List.of(
                get("/api/biens-immo"),
                get("/api/biens-immo/filter"),
                get("/api/biens-immo/filter").param("q", "immobilier"))) {
            var ids = idsPublics(requete);
            assertFalse(ids.contains(visible));
            assertTrue(ids.contains(autre));
        }
        mockMvc.perform(get("/api/biens-immo/{id}", visible).header("Authorization", "Bearer " + autreJwt))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/biens-immo/{id}", visible).header("Authorization", "Bearer " + ownerJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proprietaireMasque").value(true));
        mockMvc.perform(get("/api/biens-immo/{id}/similaires", visible))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/messagerie/conversations")
                        .header("Authorization", "Bearer " + autreJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("annonceId", visible))))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/users/me/favoris/{id}", visible).header("Authorization", "Bearer " + autreJwt))
                .andExpect(status().isNotFound());

        // Propriétaire : ni publier ni réafficher ; clôturer reste permis.
        mockMvc.perform(multipart("/api/biens-immo")
                        .file(TestPhotos.photo())
                        .param("titre", "Nouvelle annonce pendant le masquage")
                        .param("description", "Annonce créée alors que le compte est masqué par la modération")
                        .param("prix", "100000000")
                        .param("localisationId", LOC_ID)
                        .param("typeAnnonce", "VENTE")
                        .param("typeBien", "MAISON")
                        .param("typeUsage", "HABITATION")
                        .param("documentsDisponibles", "Titre foncier")
                        .header("Authorization", "Bearer " + ownerJwt))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/biens-immo/{id}/toggle-actif", cacheeParLui)
                        .header("Authorization", "Bearer " + ownerJwt))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/biens-immo/{id}/cloturer", aCloturer)
                        .param("motif", "RETIRE")
                        .header("Authorization", "Bearer " + ownerJwt))
                .andExpect(status().isNoContent());

        // Réaffichage : retour exact à l'état de chaque annonce.
        mockMvc.perform(put("/api/admin/utilisateurs/{userId}/annonces/afficher", ownerId)
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Annonces du compte réaffichées (1 annonce(s) de nouveau visible(s))."));
        var ids = idsPublics(get("/api/biens-immo"));
        assertTrue(ids.contains(visible));
        assertFalse(ids.contains(cacheeParLui));
        assertFalse(ids.contains(cloturee));
        assertFalse(annonceRepository.findById(cacheeParLui).orElseThrow().getActif());
        assertTrue(annonceRepository.findById(cloturee).orElseThrow().getMotifCloture() != null);
    }

    @Test
    void testMasquageSystemeDuCompte_moderateurInterditEtMotifObligatoire() throws Exception {
        String modJwt = createPrivilegedUserAndGetJWT("mod-masse", TypeRole.MODERATEUR);
        String adminJwt = createPrivilegedUserAndGetJWT("admin-masse2", TypeRole.ADMINISTRATEUR);
        String ownerJwt = signupActivateAndGetJWT("owner-masse2", "owner-masse2@test.com", "Test123!");
        createBien(ownerJwt);
        String ownerId = userId(ownerJwt);

        mockMvc.perform(put("/api/admin/utilisateurs/{userId}/annonces/masquer", ownerId)
                        .param("raison", "Fraude suspectée")
                        .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/admin/utilisateurs/{userId}/annonces/masquer", ownerId)
                        .param("raison", "  ")
                        .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAnnoncesInternesEntreprise_reserveesAuxMembresEtALaModeration() throws Exception {
        String proJwt = createPrivilegedUserAndGetJWT("pro-membre", TypeRole.PROFESSIONNEL);
        String autreProJwt = createPrivilegedUserAndGetJWT("pro-exterieur", TypeRole.PROFESSIONNEL);
        String modJwt = createPrivilegedUserAndGetJWT("mod-entreprise", TypeRole.MODERATEUR);
        User pro = userRepository.findByEmail("pro-membre@test.com").orElseThrow();
        com.app.AnnoncesAPI.entities.Entreprise entreprise = new com.app.AnnoncesAPI.entities.Entreprise();
        entreprise.setNom("Agence Kaloum");
        entreprise.setAnnonceurProfessionnel(pro);
        entreprise = entrepriseRepository.save(entreprise);
        pro.setEntreprise(entreprise);
        userRepository.save(pro);

        mockMvc.perform(get("/api/entreprises/{id}/annonces", entreprise.getId())
                        .header("Authorization", "Bearer " + autreProJwt))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/entreprises/{id}/annonces", entreprise.getId())
                        .header("Authorization", "Bearer " + proJwt))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/entreprises/{id}/annonces", entreprise.getId())
                        .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk());
    }

    // ECART-31 : page publique d'agence sans données de gestion ; fiche de gestion réservée aux membres.
    @Test
    void testPageEntreprise_publiqueSansDonneesDeGestionEtFicheReservee() throws Exception {
        String proJwt = createPrivilegedUserAndGetJWT("pro-vitrine", TypeRole.PROFESSIONNEL);
        String autreProJwt = createPrivilegedUserAndGetJWT("pro-curieux", TypeRole.PROFESSIONNEL);
        String modJwt = createPrivilegedUserAndGetJWT("mod-vitrine", TypeRole.MODERATEUR);
        User pro = userRepository.findByEmail("pro-vitrine@test.com").orElseThrow();
        com.app.AnnoncesAPI.entities.Entreprise entreprise = new com.app.AnnoncesAPI.entities.Entreprise();
        entreprise.setNom("Agence Vitrine");
        entreprise.setNumeroRCCM("RC-GN-2026-999");
        entreprise.setTelephone("+224621000001");
        entreprise.setEmail("contact@vitrine.test");
        entreprise.setAnnonceurProfessionnel(pro);
        entreprise = entrepriseRepository.save(entreprise);
        pro.setEntreprise(entreprise);
        userRepository.save(pro);

        // Visiteur : nom et description, mais ni RCCM, ni quotas, ni email du propriétaire, ni contacts.
        String publique = mockMvc.perform(get("/api/entreprises/{id}/profil", entreprise.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entreprise.nom").value("Agence Vitrine"))
                .andExpect(jsonPath("$.entreprise.telephone").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.entreprise.email").value(org.hamcrest.Matchers.nullValue()))
                .andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(publique)
                .doesNotContain("RC-GN-2026-999", "quotaAnnonces", "annoncesRestantes", "pro-vitrine@test.com",
                        "annonceurProfessionnel");

        // Connecté : les contacts de l'agence sont fournis, le reste de la fiche publique reste absent.
        mockMvc.perform(get("/api/entreprises/{id}/profil", entreprise.getId())
                        .header("Authorization", "Bearer " + autreProJwt))
                .andExpect(jsonPath("$.entreprise.telephone").value("+224621000001"))
                .andExpect(jsonPath("$.entreprise.numeroRCCM").doesNotExist());

        // Fiche de gestion : membres et modération seulement.
        mockMvc.perform(get("/api/entreprises/{id}", entreprise.getId()).header("Authorization", "Bearer " + autreProJwt))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/entreprises/{id}", entreprise.getId()).header("Authorization", "Bearer " + proJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.numeroRCCM").value("RC-GN-2026-999"));
        mockMvc.perform(get("/api/entreprises/{id}", entreprise.getId()).header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk());
        User curieux = userRepository.findByEmail("pro-curieux@test.com").orElseThrow();
        mockMvc.perform(get("/api/entreprises/user/{id}", pro.getId()).header("Authorization", "Bearer " + autreProJwt))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/entreprises/user/{id}", pro.getId()).header("Authorization", "Bearer " + proJwt))
                .andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(curieux.getId()).isNotEqualTo(pro.getId());
    }

    // --- Gestion des rôles ---

    @Test
    void testOctroierRole_asAdmin() throws Exception {
        String adminJwt = createPrivilegedUserAndGetJWT("admin5", TypeRole.ADMINISTRATEUR);
        String targetJwt = signupActivateAndGetJWT("target1", "target1@test.com", "Test123!");
        String targetId = objectMapper.readTree(
                mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + targetJwt))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asString();

        mockMvc.perform(put("/api/admin/utilisateurs/{userId}/role", targetId)
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"MODERATEUR\"}")
                .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk());
    }

    @Test
    void testOctroierRole_asModerator_forbidden() throws Exception {
        String modJwt = createPrivilegedUserAndGetJWT("mod4", TypeRole.MODERATEUR);
        String targetJwt = signupActivateAndGetJWT("target2", "target2@test.com", "Test123!");
        String targetId = objectMapper.readTree(
                mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + targetJwt))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asString();

        mockMvc.perform(put("/api/admin/utilisateurs/{userId}/role", targetId)
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"MODERATEUR\"}")
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isForbidden());
    }

    // --- Recherche / filtres admin ---

    @Test
    void testGetAllAnnonces_rechercheTexteEtFiltres() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("owner-rech", "owner-rech@test.com", "Test123!");
        String modJwt = createPrivilegedUserAndGetJWT("mod-rech", TypeRole.MODERATEUR);
        Long visible = createBien(ownerJwt);
        Long masquee = createBien(ownerJwt);
        mockMvc.perform(put("/api/admin/annonces/{id}/masquer", masquee)
                .param("raison", "Test")
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk());
        String reference = bienImmoRepository.findById(visible).orElseThrow().getReferenceAnnonce();

        // Référence exacte : trouvée même hors de la première page côté app.
        mockMvc.perform(get("/api/admin/annonces").param("q", reference.toLowerCase())
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(visible));

        // Propriétaire (email) + statut combinés.
        mockMvc.perform(get("/api/admin/annonces").param("q", "owner-rech").param("statut", "MASQUEE")
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(masquee));

        // Aucune annonce clôturée.
        mockMvc.perform(get("/api/admin/annonces").param("cloturee", "true")
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        mockMvc.perform(get("/api/admin/annonces").param("statut", "PUBLIEE").param("cloturee", "false")
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    void testRechercherUtilisateurs_filtreStatut() throws Exception {
        String adminJwt = createPrivilegedUserAndGetJWT("admin-statut", TypeRole.ADMINISTRATEUR);
        signupActivateAndGetJWT("actif-statut", "actif-statut@test.com", "Test123!");
        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "email", "attente-statut@test.com", "password", "Test123!",
                        "nom", "Attente", "prenom", "Attente", "role", "PARTICULIER"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/admin/utilisateurs").param("statut", "EN_ATTENTE_ACTIVATION")
                .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].email").value("attente-statut@test.com"));

        // Sans paramètre « search » : liste complète (admin appelant exclu).
        mockMvc.perform(get("/api/admin/utilisateurs").header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void testIgnorerSignalementMessage() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("owner-msg", "owner-msg@test.com", "Test123!");
        String userJwt = signupActivateAndGetJWT("user-msg", "user-msg@test.com", "Test123!");
        String modJwt = createPrivilegedUserAndGetJWT("mod-msg", TypeRole.MODERATEUR);
        Long annonceId = createBien(ownerJwt);

        String conv = mockMvc.perform(post("/api/messagerie/conversations")
                .header("Authorization", "Bearer " + userJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("annonceId", annonceId))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long convId = objectMapper.readTree(conv).get("id").asLong();
        String msg = mockMvc.perform(post("/api/messagerie/conversations/{id}/messages", convId)
                .header("Authorization", "Bearer " + userJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "Message tout à fait correct"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long messageId = objectMapper.readTree(msg).get("id").asLong();
        mockMvc.perform(post("/api/messagerie/messages/{id}/signaler", messageId)
                .header("Authorization", "Bearer " + ownerJwt))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/messages/{id}/ignorer", messageId)
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk());

        // Sorti de la file et du compteur, contenu intact.
        mockMvc.perform(get("/api/admin/messages/signales").header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        mockMvc.perform(get("/api/admin/stats").header("Authorization", "Bearer " + modJwt))
                .andExpect(jsonPath("$.messagesSignalesEnAttente").value(0));
        org.assertj.core.api.Assertions.assertThat(messageRepository.findById(messageId).orElseThrow().getContent())
                .isEqualTo("Message tout à fait correct");

        // Deuxième appel : plus signalé.
        mockMvc.perform(put("/api/admin/messages/{id}/ignorer", messageId)
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isBadRequest());
    }

    // DEC-02 : la modération ne lit une conversation privée que si l'un de ses messages a été signalé.
    @Test
    void testLectureConversation_reserveeAuxConversationsSignaleesEtJournalisee() throws Exception {
        String ownerJwt = signupActivateAndGetJWT("owner-conv", "owner-conv@test.com", "Test123!");
        String userJwt = signupActivateAndGetJWT("user-conv", "user-conv@test.com", "Test123!");
        String modJwt = createPrivilegedUserAndGetJWT("mod-conv", TypeRole.MODERATEUR);
        String adminJwt = createPrivilegedUserAndGetJWT("admin-conv", TypeRole.ADMINISTRATEUR);
        Long annonceId = createBien(ownerJwt);
        Long convId = objectMapper.readTree(mockMvc.perform(post("/api/messagerie/conversations")
                .header("Authorization", "Bearer " + userJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("annonceId", annonceId))))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        Long messageId = objectMapper.readTree(mockMvc.perform(post("/api/messagerie/conversations/{id}/messages", convId)
                .header("Authorization", "Bearer " + userJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "Bonjour, toujours disponible ?"))))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        // Aucun message signalé : introuvable, comme une conversation qui n'existe pas.
        mockMvc.perform(get("/api/admin/conversations/{id}/messages", convId)
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/admin/conversations/{id}/messages", 999_999)
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isNotFound());

        // Un message signalé ouvre la conversation, et la lecture est tracée.
        mockMvc.perform(post("/api/messagerie/messages/{id}/signaler", messageId)
                .header("Authorization", "Bearer " + ownerJwt))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/conversations/{id}/messages", convId)
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
        mockMvc.perform(get("/api/admin/audit")
                .param("action", "CONVERSATION_CONSULTEE").param("cibleId", String.valueOf(convId))
                .header("Authorization", "Bearer " + adminJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.data[0].acteurLibelle").value("mod-conv@test.com"));

        // Classé sans suite : le motif est conservé, la conversation reste lisible (décision tracée).
        mockMvc.perform(put("/api/admin/messages/{id}/ignorer", messageId)
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/conversations/{id}/messages", convId)
                .header("Authorization", "Bearer " + modJwt))
                .andExpect(status().isOk());
    }
}
