package com.app.AnnoncesAPI.controllers;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

/** Administration des localisations : doublons refusés, coordonnées de référence (ECART-45). */
@SpringBootTest
class LocalisationAdministrationTest {

    private static final String MOT_DE_PASSE = "Localisation-2026";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;
    private String jwtAdmin;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        User admin = new User();
        admin.setEmail("admin@example.com");
        admin.setPassword(encoder.encode(MOT_DE_PASSE));
        admin.setStatut(StatutUtilisateur.ACTIF);
        admin.setRole(roleRepository.findByName(TypeRole.ADMINISTRATEUR).orElseThrow());
        userRepository.save(admin);
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
    void unQuartierEnDoubleEstRefuseAuxAccentsEtALaCassePres() throws Exception {
        String id = mapper.readTree(creer("Quartier Témoin", 9.5123, -13.7001).andExpect(status().isCreated())
                .andExpect(jsonPath("$.latitude").value(9.5123))
                .andReturn().getResponse().getContentAsString()).get("id").asString();

        creer("quartier temoin", null, null).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("existe déjà")));

        // Modifier le quartier lui-même (sans changer son nom) reste possible.
        mvc.perform(put("/api/localisations/{id}", id).header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(corps("Quartier Témoin", 9.6, -13.6))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.longitude").value(-13.6));
        mvc.perform(get("/api/localisations/{id}", id)).andExpect(jsonPath("$.latitude").value(9.6));

        // Journal d'audit (ECART-63) : création et modification tracées avec leur auteur.
        org.assertj.core.api.Assertions.assertThat(jdbc.queryForList(
                "SELECT action FROM audit_event WHERE cible_id = ? AND acteur_libelle = 'admin@example.com' ORDER BY id",
                String.class, id)).containsExactly("LOCALISATION_CREEE", "LOCALISATION_MODIFIEE");
    }

    @Test
    void lesCoordonneesVontParDeux() throws Exception {
        creer("Quartier Moitié", 9.5, null).andExpect(status().isBadRequest());
        creer("Quartier Lointain", 120.0, 10.0).andExpect(status().isBadRequest());
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private ResultActions creer(String quartier, Double lat, Double lng) throws Exception {
        return mvc.perform(post("/api/localisations").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(corps(quartier, lat, lng))));
    }

    private static Map<String, Object> corps(String quartier, Double lat, Double lng) {
        Map<String, Object> c = new HashMap<>();
        c.put("region", "Région Test");
        c.put("prefecture", "Préfecture Test");
        c.put("commune", "Commune Test");
        c.put("quartier", quartier);
        c.put("typeCommune", "urbaine");
        c.put("latitude", lat);
        c.put("longitude", lng);
        return c;
    }

    private void vider() {
        for (String table : TABLES) {
            jdbc.execute("DELETE FROM " + table);
        }
        jdbc.update("DELETE FROM localisation WHERE commune = 'Commune Test'");
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); u.setParentUser(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
    }
}
