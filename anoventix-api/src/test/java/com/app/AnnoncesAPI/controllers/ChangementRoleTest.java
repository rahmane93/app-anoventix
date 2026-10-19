package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.ResultActions;
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

/** Changement de rôle encadré (ECART-22). */
@SpringBootTest
class ChangementRoleTest {

    private static final String MOT_DE_PASSE = "Role-2026";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private EntrepriseRepository entrepriseRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;
    private String jwtAdmin;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        compte("admin@example.com", TypeRole.ADMINISTRATEUR);
        jwtAdmin = mapper.readTree(mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", "admin@example.com", "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();
    }

    @AfterEach
    void nettoyerApres() {
        vider();
    }

    @Test
    void unModerateurPromuPerdSesAnnoncesPubliquesEtLesRetrouveEnRedevenantParticulier() throws Exception {
        User u = compte("membre@example.com", TypeRole.PARTICULIER);

        changer(u.getId(), "MODERATEUR").andExpect(status().isOk());
        User promu = userRepository.findById(u.getId()).orElseThrow();
        assertThat(promu.isModerateur()).isTrue();
        assertThat(promu.isAnnoncesMasquees()).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = 'membre@example.com'",
                Integer.class)).isEqualTo(1);

        changer(u.getId(), "PARTICULIER").andExpect(status().isOk());
        assertThat(userRepository.findById(u.getId()).orElseThrow().isAnnoncesMasquees()).isFalse();
    }

    @Test
    void unProfessionnelQuiDirigeUneEntrepriseNeChangePasDeRole() throws Exception {
        User pro = compte("pro@example.com", TypeRole.PROFESSIONNEL);
        Entreprise e = new Entreprise();
        e.setNom("Agence Rôle");
        e.setAnnonceurProfessionnel(pro);
        e = entrepriseRepository.save(e);
        pro.setEntreprise(e);
        userRepository.save(pro);

        changer(pro.getId(), "PARTICULIER").andExpect(status().isUnprocessableContent());
    }

    @Test
    void unAgentRattacheNeChangePasDeRoleMaisUnAgentRetireOui() throws Exception {
        User pro = compte("pro2@example.com", TypeRole.PROFESSIONNEL);
        Entreprise e = new Entreprise();
        e.setNom("Agence Équipe");
        e.setAnnonceurProfessionnel(pro);
        e = entrepriseRepository.save(e);
        User agent = compte("agent@example.com", TypeRole.AGENT_PROFESSIONNEL);
        agent.setEntreprise(e);
        agent = userRepository.save(agent);

        changer(agent.getId(), "PARTICULIER").andExpect(status().isUnprocessableContent());

        agent.setStatut(StatutUtilisateur.INACTIF);
        userRepository.save(agent);
        changer(agent.getId(), "PARTICULIER").andExpect(status().isOk());
        User apres = userRepository.findById(agent.getId()).orElseThrow();
        assertThat(apres.getEntreprise()).isNull();
        assertThat(apres.isParticulier()).isTrue();
    }

    @Test
    void lesRolesAgentEtAdministrateurNeSAttribuentPasIci() throws Exception {
        User u = compte("membre2@example.com", TypeRole.PARTICULIER);
        changer(u.getId(), "AGENT_PROFESSIONNEL").andExpect(status().isBadRequest());
        changer(u.getId(), "ADMINISTRATEUR").andExpect(status().isBadRequest());
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private ResultActions changer(UUID id, String role) throws Exception {
        return mvc.perform(put("/api/admin/utilisateurs/{id}/role", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"" + role + "\"}"));
    }

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
}
