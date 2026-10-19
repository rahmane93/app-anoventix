package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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

import com.app.AnnoncesAPI.entities.Avertissement;
import com.app.AnnoncesAPI.entities.Licence;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.NiveauAvertissement;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeLicence;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.AvertissementRepository;
import com.app.AnnoncesAPI.repositories.LicenceRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.ObjectMapper;

/** Export RGPD (droit d'accès) : toutes les données de l'utilisateur, aucune donnée de tiers (ECART-32). */
@SpringBootTest
class ExportDonneesTest {

    private static final String EMAIL = "export@example.com";
    private static final String MOT_DE_PASSE = "Export-2026";

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AvertissementRepository avertissementRepository;
    @Autowired private LicenceRepository licenceRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;

    @BeforeEach
    void preparer() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        for (String table : List.of("refresh_token", "message", "conversation", "signalements",
                "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "avertissements",
                "licence")) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
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
    void lExportContientAvertissementsEtLicencesSansDonneesDeTiers() throws Exception {
        User user = new User();
        user.setEmail(EMAIL);
        user.setPassword(encoder.encode(MOT_DE_PASSE));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setRole(roleRepository.findByName(TypeRole.PARTICULIER).orElseThrow());
        user.setPieceIdentiteUrl("private/piece-identite/x/piece.jpg");
        user = userRepository.save(user);

        Avertissement avertissement = new Avertissement();
        avertissement.setUtilisateur(user);
        avertissement.setMotif("Propos déplacés dans une annonce");
        avertissement.setEmitPar("moderateur.secret@anoventix.test");
        avertissement.setNiveau(NiveauAvertissement.LEGER);
        avertissementRepository.save(avertissement);

        Licence licence = new Licence();
        licence.setCle("ANX-TEST-EXPO-RT01");
        licence.setType(TypeLicence.PARTICULIER);
        licence.setOwner(user);
        licence.setDateDebut(LocalDate.now());
        licence.setDateFin(LocalDate.now().plusYears(1));
        licenceRepository.save(licence);

        String jwt = mapper.readTree(mvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", EMAIL, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();

        String export = mvc.perform(get("/api/users/me/export").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profil.email").value(EMAIL))
                .andExpect(jsonPath("$.profil.pieceIdentiteFournie").value(true))
                .andExpect(jsonPath("$.avertissements.length()").value(1))
                .andExpect(jsonPath("$.avertissements[0].motif").value("Propos déplacés dans une annonce"))
                .andExpect(jsonPath("$.avertissements[0].niveau").value("LEGER"))
                .andExpect(jsonPath("$.licences.length()").value(1))
                .andExpect(jsonPath("$.licences[0].cle").value("ANX-TEST-EXPO-RT01"))
                .andExpect(jsonPath("$.entreprise").value(org.hamcrest.Matchers.nullValue()))
                .andReturn().getResponse().getContentAsString();

        // Ni le mot de passe, ni l'identité du modérateur, ni le chemin du fichier de la pièce.
        assertThat(export).doesNotContain("moderateur.secret", "piece.jpg", encoder.encode(MOT_DE_PASSE).substring(0, 10),
                "\"password\"");
    }
}
