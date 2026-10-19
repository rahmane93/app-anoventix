package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import com.app.AnnoncesAPI.entities.Conversation;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.Message;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.ObjectMapper;

/** Retrait d'un agent : ses annonces et ses conversations passent à l'agence (DEC-34). */
@SpringBootTest
class RetraitAgentTest {

    private static final String MOT_DE_PASSE = "Retrait-2026";
    private static final String LOC_ID = "loc-retrait-test";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private EntrepriseRepository entrepriseRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;
    private User pro;
    private User agent;
    private User acheteur;
    private Entreprise entreprise;

    @BeforeEach
    void preparer() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        pro = compte("pro@example.com", TypeRole.PROFESSIONNEL);
        entreprise = new Entreprise();
        entreprise.setNom("Agence Retrait");
        entreprise.setAnnonceurProfessionnel(pro);
        entreprise = entrepriseRepository.save(entreprise);
        pro.setEntreprise(entreprise);
        pro = userRepository.save(pro);
        agent = compte("agent@example.com", TypeRole.AGENT_PROFESSIONNEL);
        agent.setEntreprise(entreprise);
        agent.setParentUser(pro);
        agent = userRepository.save(agent);
        acheteur = compte("acheteur@example.com", TypeRole.PARTICULIER);
    }

    @AfterEach
    void nettoyerApres() {
        vider();
    }

    @Test
    void lesAnnoncesEtLesConversationsDeLAgentPassentALAgence() throws Exception {
        BienImmo enLigne = annonce(true, StatutAnnonce.PUBLIEE);
        BienImmo masquee = annonce(false, StatutAnnonce.MASQUEE);
        Conversation c = new Conversation();
        c.setAnnonce(enLigne);
        c.setParticipantOne(acheteur);
        c.setParticipantTwo(agent);
        c.setCreatedBy(acheteur);
        c = conversationRepository.save(c);
        Message m = new Message();
        m.setConversation(c);
        m.setSender(acheteur);
        m.setContent("Bonjour, la villa est-elle disponible ?");
        messageRepository.save(m);

        mvc.perform(delete("/api/entreprises/{e}/agents/{a}", entreprise.getId(), agent.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + connexion("pro@example.com")))
                .andExpect(status().is2xxSuccessful());

        assertThat(bienImmoRepository.findById(enLigne.getId()).orElseThrow().getOwner().getId()).isEqualTo(pro.getId());
        assertThat(bienImmoRepository.findById(masquee.getId()).orElseThrow().getOwner().getId()).isEqualTo(pro.getId());
        assertThat(jdbc.queryForObject("SELECT participant_two_id FROM conversation WHERE id = ?", UUID.class, c.getId()))
                .isEqualTo(pro.getId());
        assertThat(jdbc.queryForObject("SELECT content FROM message WHERE conversation_id = ? ORDER BY id DESC LIMIT 1",
                String.class, c.getId())).contains("Agence Retrait");

        // L'acheteur voit l'agence comme interlocuteur, avec le message d'information non lu.
        mvc.perform(get("/api/messagerie/conversations")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + connexion("acheteur@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].otherParticipantId").value(pro.getId().toString()))
                .andExpect(jsonPath("$.data[0].unreadCount").value(1));
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private void vider() {
        for (String table : TABLES) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); u.setParentUser(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
    }

    private User compte(String email, TypeRole role) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode(MOT_DE_PASSE));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setRole(roleRepository.findByName(role).orElseThrow());
        return userRepository.save(user);
    }

    private String connexion(String email) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", email, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();
    }

    private BienImmo annonce(boolean actif, StatutAnnonce statut) {
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-RA-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre("Villa de l'agent");
        b.setDescription("Annonce créée par RetraitAgentTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.VILLA);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisation());
        b.setOwner(agent);
        b.setActif(actif);
        b.setStatutModeration(statut);
        return bienImmoRepository.save(b);
    }

    private Localisation localisation() {
        return localisationRepository.findById(LOC_ID).orElseGet(() -> {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Kaloum");
            loc.setQuartier("Retrait (RetraitAgentTest)");
            return localisationRepository.save(loc);
        });
    }
}
