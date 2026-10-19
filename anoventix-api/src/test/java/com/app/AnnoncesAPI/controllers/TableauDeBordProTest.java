package com.app.AnnoncesAPI.controllers;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.ObjectMapper;

/** Périmètre du tableau de bord professionnel. */
@SpringBootTest
class TableauDeBordProTest {

    private static final String MOT_DE_PASSE = "Tableau-2026";
    private static final String LOC_ID = "loc-tableau-test";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private EntrepriseRepository entrepriseRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;
    private User pro;
    private User agent;
    private Entreprise entreprise;

    @BeforeEach
    void preparer() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        pro = compte("pro@example.com", TypeRole.PROFESSIONNEL);
        entreprise = new Entreprise();
        entreprise.setNom("Agence Tableau");
        entreprise.setAnnonceurProfessionnel(pro);
        entreprise = entrepriseRepository.save(entreprise);
        pro.setEntreprise(entreprise);
        pro = userRepository.save(pro);
        agent = compte("agent@example.com", TypeRole.AGENT_PROFESSIONNEL);
        agent.setEntreprise(entreprise);
        agent = userRepository.save(agent);

        annonce(pro, 10);
        annonce(agent, 30);
        annonce(agent, 5);
    }

    @AfterEach
    void nettoyerApres() {
        vider();
    }

    @Test
    void leProfessionnelVoitToutLEntrepriseSansFigurerDansLEquipe() throws Exception {
        mvc.perform(get("/api/stats/pro").header(HttpHeaders.AUTHORIZATION, "Bearer " + connexion("pro@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perimetre").value("ENTREPRISE"))
                .andExpect(jsonPath("$.portefeuille.annoncesPubliees").value(3))
                .andExpect(jsonPath("$.visibilite.totalVues").value(45))
                .andExpect(jsonPath("$.visibilite.top5ParVues[0].vueCount").value(30))
                .andExpect(jsonPath("$.equipe.agentsActifs").value(1))
                .andExpect(jsonPath("$.equipe.performances.length()").value(1))
                .andExpect(jsonPath("$.equipe.performances[0].agentEmail").value("agent@example.com"))
                .andExpect(jsonPath("$.equipe.performances[0].nbAnnonces").value(2));
    }

    @Test
    void lAgentNeVoitQueSesAnnonces() throws Exception {
        mvc.perform(get("/api/stats/pro").header(HttpHeaders.AUTHORIZATION, "Bearer " + connexion("agent@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perimetre").value("PERSONNEL"))
                .andExpect(jsonPath("$.portefeuille.annoncesPubliees").value(2))
                .andExpect(jsonPath("$.visibilite.totalVues").value(35));
    }

    @Test
    void publicationImpossibleExpliqueeQuandLEntrepriseEstDesactiveeOuLesAnnoncesMasquees() throws Exception {
        String jwt = connexion("pro@example.com");
        mvc.perform(get("/api/stats/pro").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(jsonPath("$.conformite.canCreateAnnonce").value(true))
                .andExpect(jsonPath("$.conformite.motifPublicationImpossible").doesNotExist());

        pro.setAnnoncesMasquees(true);
        pro = userRepository.save(pro);
        mvc.perform(get("/api/stats/pro").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(jsonPath("$.conformite.canCreateAnnonce").value(false))
                .andExpect(jsonPath("$.conformite.motifPublicationImpossible").value(
                        org.hamcrest.Matchers.containsString("masquées")));

        pro.setAnnoncesMasquees(false);
        pro = userRepository.save(pro);
        entreprise.setActive(false);
        entrepriseRepository.save(entreprise);
        mvc.perform(get("/api/stats/pro").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(jsonPath("$.conformite.canCreateAnnonce").value(false))
                .andExpect(jsonPath("$.conformite.motifPublicationImpossible").value(
                        org.hamcrest.Matchers.containsString("désactivée")));
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private void vider() {
        for (String table : TABLES) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
    }

    private User compte(String email, TypeRole role) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode(MOT_DE_PASSE));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setStatutPieceIdentite(StatutPieceIdentite.VALIDEE);
        user.setRole(roleRepository.findByName(role).orElseThrow());
        return userRepository.save(user);
    }

    private String connexion(String email) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", email, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();
    }

    private void annonce(User owner, long vues) {
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-TB-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre("Annonce de test");
        b.setDescription("Annonce créée par TableauDeBordProTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.APPARTEMENT);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisation());
        b.setOwner(owner);
        b.setActif(true);
        b.setVueCount(vues);
        bienImmoRepository.save(b);
    }

    private Localisation localisation() {
        return localisationRepository.findById(LOC_ID).orElseGet(() -> {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Kaloum");
            loc.setQuartier("Tableau");
            return localisationRepository.save(loc);
        });
    }
}
