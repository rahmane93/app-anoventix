package com.app.AnnoncesAPI.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.ObjectMapper;

/** Comptes inactifs : relance après 2 ans sans connexion, anonymisation 3 mois plus tard (SFG §11.2). */
@SpringBootTest
class InactiviteComptesTest {

    private static final String MOT_DE_PASSE = "Inactif-2026";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private InactiviteComptesService service;
    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;

    @BeforeEach
    void preparer() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
    }

    @AfterEach
    void nettoyerApres() {
        vider();
    }

    @Test
    void unCompteSansConnexionDepuisDeuxAnsEstRelanceEtUneConnexionAnnuleLaRelance() throws Exception {
        User u = compte("dormeur@example.com", TypeRole.PARTICULIER);
        compte("modo@example.com", TypeRole.MODERATEUR);
        jdbc.update("UPDATE account SET derniere_connexion = NOW() - INTERVAL '3 years'");

        assertThat(service.relancer(LocalDateTime.now())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = 'dormeur@example.com'",
                Integer.class)).isEqualTo(1);
        // Une seule relance.
        assertThat(service.relancer(LocalDateTime.now())).isZero();

        mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", "dormeur@example.com", "password", MOT_DE_PASSE))))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT date_relance_inactivite FROM account WHERE id = ?",
                LocalDateTime.class, u.getId())).isNull();
    }

    @Test
    void sansConnexionTroisMoisApresLaRelanceLeCompteEstAnonymise() {
        User u = compte("parti@example.com", TypeRole.PARTICULIER);
        jdbc.update("UPDATE account SET derniere_connexion = NOW() - INTERVAL '3 years', "
                + "date_relance_inactivite = NOW() - INTERVAL '4 months' WHERE id = ?", u.getId());

        assertThat(service.anonymiser(LocalDateTime.now())).isEqualTo(1);
        User apres = userRepository.findById(u.getId()).orElseThrow();
        assertThat(apres.getEmail()).endsWith("@anonyme.invalid");
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
