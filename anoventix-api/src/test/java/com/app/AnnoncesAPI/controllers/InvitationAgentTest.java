package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.ObjectMapper;

/** Invitation d'un agent par lien à usage unique, sans mot de passe temporaire. */
@SpringBootTest
class InvitationAgentTest {

    private static final String MOT_DE_PASSE = "Responsable-2026";
    private static final String EMAIL_AGENT = "agent.invite@example.com";
    private static final Pattern LIEN = Pattern.compile("invitation\\?token=([0-9a-f-]{36})");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private EntrepriseRepository entrepriseRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;
    private Entreprise entreprise;
    private String jwtPro;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        for (String table : List.of("refresh_token", "email_sortant", "audit_event", "message", "conversation",
                "signalements", "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence")) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();

        User pro = compte("responsable@example.com", TypeRole.PROFESSIONNEL);
        entreprise = new Entreprise();
        entreprise.setNom("Agence Kaloum");
        entreprise.setAnnonceurProfessionnel(pro);
        entreprise = entrepriseRepository.save(entreprise);
        pro.setEntreprise(entreprise);
        userRepository.save(pro);
        jwtPro = connexion("responsable@example.com", MOT_DE_PASSE);
    }

    /** Ne laisse rien derrière soi : les autres classes de test vident les comptes (clés étrangères). */
    @org.junit.jupiter.api.AfterEach
    void nettoyerApres() {
        for (String table : List.of("refresh_token", "verification_connexion", "code_secours", "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements", "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence")) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
    }

    @Test
    void lAgentRecoitUnLienEtNonUnMotDePasse() throws Exception {
        creerAgent();

        User agent = userRepository.findByEmail(EMAIL_AGENT).orElseThrow();
        assertThat(agent.getStatut()).isEqualTo(StatutUtilisateur.EN_ATTENTE_ACTIVATION);
        assertThat(agent.getMustChangePassword()).isFalse();

        String corps = dernierEmail();
        assertThat(corps).contains("/invitation?token=").doesNotContain("temporaire").doesNotContain("Mot de passe");
        assertThat(LIEN.matcher(corps).find()).isTrue();
        // Le jeton dure 7 jours.
        assertThat(agent.getActivationCodeExpiry() - System.currentTimeMillis())
                .isBetween(6L * 24 * 3600 * 1000, 7L * 24 * 3600 * 1000 + 60_000);
    }

    @Test
    void sansInvitationAcceptee_lAgentNeSeConnectePas() throws Exception {
        creerAgent();

        // Même en devinant un mot de passe : celui du compte est aléatoire et inconnu.
        mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(identifiants(EMAIL_AGENT, "Nimporte-Quoi-1")))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void lAgentChoisitSonMotDePasseEtLeLienNeSertQuUneFois() throws Exception {
        creerAgent();
        String jeton = jetonDuDernierEmail();

        // Mot de passe trop faible : refusé, le lien reste utilisable.
        accepter(jeton, "faible", status().isBadRequest());
        accepter(jeton, "Agent-Choisi-2026", status().isOk());

        User agent = userRepository.findByEmail(EMAIL_AGENT).orElseThrow();
        assertThat(agent.getStatut()).isEqualTo(StatutUtilisateur.ACTIF);
        assertThat(agent.getActivationCode()).isNull();
        connexion(EMAIL_AGENT, "Agent-Choisi-2026");

        accepter(jeton, "Autre-Mot-2026", status().isBadRequest());
    }

    @Test
    void unLienExpireEstRefuse() throws Exception {
        creerAgent();
        String jeton = jetonDuDernierEmail();
        jdbc.update("UPDATE account SET activation_code_expiry = ? WHERE email = ?",
                System.currentTimeMillis() - 1000, EMAIL_AGENT);

        accepter(jeton, "Agent-Choisi-2026", status().isBadRequest());
    }

    @Test
    void leLienDInvitationNActivePasUnCompteSansMotDePasse() throws Exception {
        creerAgent();
        String jeton = jetonDuDernierEmail();

        mvc.perform(get("/api/auth/activate").param("token", jeton)).andExpect(status().isBadRequest());

        assertThat(userRepository.findByEmail(EMAIL_AGENT).orElseThrow().getStatut())
                .isEqualTo(StatutUtilisateur.EN_ATTENTE_ACTIVATION);
    }

    @Test
    void renvoyerLInvitationInvalideLAncienLien() throws Exception {
        creerAgent();
        String ancien = jetonDuDernierEmail();
        UUID agentId = userRepository.findByEmail(EMAIL_AGENT).orElseThrow().getId();

        mvc.perform(post("/api/entreprises/{e}/agents/{a}/invitation", entreprise.getId(), agentId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtPro))
                .andExpect(status().isOk());

        String nouveau = jetonDuDernierEmail();
        assertThat(nouveau).isNotEqualTo(ancien);
        accepter(ancien, "Agent-Choisi-2026", status().isBadRequest());
        accepter(nouveau, "Agent-Choisi-2026", status().isOk());
    }

    @Test
    void seulLeProprietaireRenvoieUneInvitation() throws Exception {
        creerAgent();
        UUID agentId = userRepository.findByEmail(EMAIL_AGENT).orElseThrow().getId();
        compte("autre.pro@example.com", TypeRole.PROFESSIONNEL);
        String jwtAutre = connexion("autre.pro@example.com", MOT_DE_PASSE);

        mvc.perform(post("/api/entreprises/{e}/agents/{a}/invitation", entreprise.getId(), agentId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAutre))
                .andExpect(status().isForbidden());
    }

    @Test
    void lAgentPeutDemanderLeRenvoiDeSonInvitation() throws Exception {
        creerAgent();
        String ancien = jetonDuDernierEmail();

        mvc.perform(post("/api/auth/resend-activation").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", EMAIL_AGENT))))
                .andExpect(status().isOk());

        String nouveau = jetonDuDernierEmail();
        assertThat(nouveau).isNotEqualTo(ancien);
        assertThat(dernierEmail()).contains("/invitation?token=").doesNotContain("/activate?token=");
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private User compte(String email, TypeRole role) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode(MOT_DE_PASSE));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setRole(roleRepository.findByName(role).orElseThrow());
        return userRepository.save(user);
    }

    private String identifiants(String email, String motDePasse) {
        return mapper.writeValueAsString(Map.of("identifier", email, "password", motDePasse));
    }

    private String connexion(String email, String motDePasse) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(identifiants(email, motDePasse)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();
    }

    private void creerAgent() throws Exception {
        mvc.perform(post("/api/entreprises/{e}/agents", entreprise.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtPro)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                        "email", EMAIL_AGENT, "prenom", "Mariama", "nom", "Barry", "telephone", "+224622000011"))))
                .andExpect(status().isCreated());
    }

    private void accepter(String jeton, String motDePasse, ResultMatcher attendu) throws Exception {
        mvc.perform(post("/api/auth/accept-invitation").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("token", jeton, "password", motDePasse))))
                .andExpect(attendu);
    }

    private String dernierEmail() {
        return jdbc.queryForObject(
                "SELECT corps_html FROM email_sortant WHERE destinataire = ? ORDER BY id DESC LIMIT 1",
                String.class, EMAIL_AGENT);
    }

    private String jetonDuDernierEmail() {
        Matcher m = LIEN.matcher(dernierEmail());
        assertThat(m.find()).as("lien d'invitation dans l'email").isTrue();
        return m.group(1);
    }
}
