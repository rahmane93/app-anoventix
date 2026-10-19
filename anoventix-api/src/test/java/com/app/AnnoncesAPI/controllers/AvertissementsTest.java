package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.ObjectMapper;

/** Avertissements (ECART-24) : email au titulaire, validité de 6 mois, niveau choisi, levée par un administrateur. */
@SpringBootTest
class AvertissementsTest {

    private static final String MOT_DE_PASSE = "Avertissement-2026";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "avertissements");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;
    private User titulaire;
    private String jwtAdmin;
    private String jwtModerateur;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        titulaire = compte("titulaire@example.com", TypeRole.PARTICULIER);
        compte("admin@example.com", TypeRole.ADMINISTRATEUR);
        compte("modo@example.com", TypeRole.MODERATEUR);
        jwtAdmin = connexion("admin@example.com");
        jwtModerateur = connexion("modo@example.com");
    }

    @AfterEach
    void nettoyerApres() {
        vider();
    }

    @Test
    void leTitulaireEstPrevenuEtLeTroisiemeSuspend() throws Exception {
        avertir(jwtModerateur, null).andExpect(status().isCreated()).andExpect(jsonPath("$.niveau").value("LEGER"))
                .andExpect(jsonPath("$.enVigueur").value(true));
        avertir(jwtModerateur, null).andExpect(jsonPath("$.niveau").value("MODERE"));
        avertir(jwtModerateur, null).andExpect(jsonPath("$.niveau").value("GRAVE"))
                .andExpect(jsonPath("$.suspenduAutomatiquement").value(true));

        assertThat(statut()).isEqualTo(StatutUtilisateur.SUSPENDU);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = ?", Integer.class,
                "titulaire@example.com")).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = ? AND sujet LIKE '%suspension%'",
                Integer.class, "titulaire@example.com")).isEqualTo(1);
    }

    @Test
    void unAvertissementDePlusDeSixMoisNeComptePlus() throws Exception {
        avertir(jwtModerateur, null).andExpect(status().isCreated());
        avertir(jwtModerateur, null).andExpect(status().isCreated());
        jdbc.update("UPDATE avertissements SET date = NOW() - INTERVAL '7 months'");

        // Les deux anciens ont expiré : le suivant repart de LÉGER, sans suspension.
        avertir(jwtModerateur, null).andExpect(jsonPath("$.niveau").value("LEGER"))
                .andExpect(jsonPath("$.suspenduAutomatiquement").value(false));
        assertThat(statut()).isEqualTo(StatutUtilisateur.ACTIF);

        mvc.perform(get("/api/admin/utilisateurs/{id}/avertissements", titulaire.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtModerateur))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].enVigueur").value(true))
                .andExpect(jsonPath("$[1].enVigueur").value(false))
                .andExpect(jsonPath("$[2].enVigueur").value(false));
        mvc.perform(get("/api/users/{id}", titulaire.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtModerateur))
                .andExpect(jsonPath("$.nbAvertissements").value(1));
    }

    @Test
    void leModerateurPeutChoisirGravePourUneFraude() throws Exception {
        avertir(jwtModerateur, "GRAVE").andExpect(status().isCreated()).andExpect(jsonPath("$.niveau").value("GRAVE"))
                .andExpect(jsonPath("$.suspenduAutomatiquement").value(true));

        assertThat(statut()).isEqualTo(StatutUtilisateur.SUSPENDU);
        assertThat(jdbc.queryForObject("SELECT motif_statut FROM account WHERE id = ?", String.class, titulaire.getId()))
                .startsWith("Suspension suite à un avertissement grave");
    }

    @Test
    void seulUnAdministrateurLeveUnAvertissement() throws Exception {
        long id = mapper.readTree(avertir(jwtModerateur, null).andReturn().getResponse().getContentAsString())
                .get("id").asLong();

        lever(jwtModerateur, id, "Erreur de compte").andExpect(status().isForbidden());
        lever(jwtAdmin, id, " ").andExpect(status().isBadRequest());
        lever(jwtAdmin, id, "Erreur de compte").andExpect(status().isOk())
                .andExpect(jsonPath("$.enVigueur").value(false))
                .andExpect(jsonPath("$.levePar").value("admin@example.com"))
                .andExpect(jsonPath("$.motifLevee").value("Erreur de compte"));
        lever(jwtAdmin, id, "Encore").andExpect(status().isBadRequest());

        // Levé, il ne compte plus : le suivant est de nouveau LÉGER.
        avertir(jwtModerateur, null).andExpect(jsonPath("$.niveau").value("LEGER"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_event WHERE action = 'AVERTISSEMENT_LEVE'",
                Integer.class)).isEqualTo(1);
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private ResultActions avertir(String jwt, String niveau) throws Exception {
        Map<String, Object> corps = new HashMap<>();
        corps.put("motif", "Annonces non conformes");
        if (niveau != null) {
            corps.put("niveau", niveau);
        }
        return mvc.perform(post("/api/admin/utilisateurs/{id}/avertissements", titulaire.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(corps)));
    }

    private ResultActions lever(String jwt, long id, String motif) throws Exception {
        return mvc.perform(post("/api/admin/utilisateurs/{u}/avertissements/{a}/lever", titulaire.getId(), id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("motif", motif))));
    }

    private StatutUtilisateur statut() {
        return userRepository.findById(titulaire.getId()).orElseThrow().getStatut();
    }

    private void vider() {
        for (String table : TABLES) {
            jdbc.execute("DELETE FROM " + table);
        }
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
}
