package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.ObjectMapper;

/** Dossier de vérification d'identité : pièce + selfie (EVO-01, DEC-08, DEC-25). */
@SpringBootTest
class VerificationIdentiteTest {

    private static final String MOT_DE_PASSE = "Verification-2026";
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
    private User titulaire;
    private String jwtTitulaire;
    private String jwtAdmin;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        titulaire = compte("titulaire@example.com", TypeRole.PARTICULIER);
        compte("admin@example.com", TypeRole.ADMINISTRATEUR);
        jwtTitulaire = connexion("titulaire@example.com");
        jwtAdmin = connexion("admin@example.com");
    }

    @AfterEach
    void nettoyerApres() {
        vider();
    }

    private void vider() {
        for (String table : TABLES) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
    }

    @Test
    void laPieceEtLeSelfiePartentEnsemble() throws Exception {
        envoyer(jwtTitulaire, TestPhotos.image("file", 800, 600), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La photo de la pièce et le selfie sont obligatoires."));
        envoyer(jwtTitulaire, null, TestPhotos.image("selfie", 800, 800)).andExpect(status().isBadRequest());

        envoyer(jwtTitulaire, TestPhotos.image("file", 800, 600), TestPhotos.image("selfie", 800, 800))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statutPieceIdentite").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.selfieFourni").value(true))
                .andExpect(jsonPath("$.dateEnvoiVerification").exists())
                // L'API n'expose jamais le chemin du fichier du selfie.
                .andExpect(jsonPath("$.selfieUrl").doesNotExist());
    }

    @Test
    void unSelfieTropPetitEstRefuseEtLaPieceNEstPasEnregistree() throws Exception {
        envoyer(jwtTitulaire, TestPhotos.image("file", 800, 600), TestPhotos.image("selfie", 640, 480))
                .andExpect(status().isBadRequest());

        User u = userRepository.findById(titulaire.getId()).orElseThrow();
        assertThat(u.getPieceIdentiteUrl()).isNull();
        assertThat(u.getSelfieUrl()).isNull();
    }

    @Test
    void unTypeDePieceInconnuEstRefuse() throws Exception {
        mvc.perform(multipart("/api/users/me/piece-identite")
                .file(TestPhotos.image("file", 800, 600)).file(TestPhotos.image("selfie", 800, 800))
                .param("typePieceIdentite", "CARTE_BANCAIRE").param("numeroPieceIdentite", "X1")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtTitulaire))
                .andExpect(status().isBadRequest());
    }

    @Test
    void laModerationNeValidePasUnDossierSansSelfie() throws Exception {
        // Dossier d'avant la mise en service : pièce envoyée, pas de selfie.
        jdbc.update("UPDATE account SET piece_identite_url = ?, statut_piece_identite = 'EN_ATTENTE' WHERE id = ?",
                "private/piece-identite/x/piece.jpg", titulaire.getId());

        decider(StatutPieceIdentite.VALIDEE, null)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.message").value("Le selfie de vérification est manquant."));

        // Un rejet reste possible sans selfie.
        decider(StatutPieceIdentite.REJETEE, "Selfie manquant").andExpect(status().isOk());
    }

    @Test
    void leSelfieSeulCompleteUnDossierEnAttenteSansSelfieEtRienD_Autre() throws Exception {
        // Pas de dossier : refusé.
        selfieSeul(jwtTitulaire).andExpect(status().isUnprocessableContent());

        jdbc.update("UPDATE account SET piece_identite_url = ?, statut_piece_identite = 'EN_ATTENTE' WHERE id = ?",
                "private/piece-identite/x/piece.jpg", titulaire.getId());
        selfieSeul(jwtTitulaire).andExpect(status().isCreated()).andExpect(jsonPath("$.selfieFourni").value(true));
        // Le selfie est déjà là : un deuxième envoi seul est refusé.
        selfieSeul(jwtTitulaire).andExpect(status().isUnprocessableContent());

        decider(StatutPieceIdentite.VALIDEE, null).andExpect(status().isOk());
    }

    @Test
    void laDecisionEstTraceeEtUnDossierValideEstFige() throws Exception {
        envoyer(jwtTitulaire, TestPhotos.image("file", 800, 600), TestPhotos.image("selfie", 800, 800))
                .andExpect(status().isCreated());

        decider(StatutPieceIdentite.VALIDEE, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateDecisionVerification").exists());

        User u = userRepository.findById(titulaire.getId()).orElseThrow();
        assertThat(u.getDecisionVerificationPar()).isEqualTo("admin@example.com");
        assertThat(u.getDateDecisionVerification()).isNotNull();

        envoyer(jwtTitulaire, TestPhotos.image("file", 800, 600), TestPhotos.image("selfie", 800, 800))
                .andExpect(status().isUnprocessableContent());
        selfieSeul(jwtTitulaire).andExpect(status().isUnprocessableContent());
    }

    @Test
    void leSelfieNEstServiQuAuTitulaireEtALaModeration() throws Exception {
        envoyer(jwtTitulaire, TestPhotos.image("file", 800, 600), TestPhotos.image("selfie", 800, 800))
                .andExpect(status().isCreated());
        compte("curieux@example.com", TypeRole.PARTICULIER);

        mvc.perform(get("/api/users/{id}/selfie", titulaire.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtTitulaire))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string(HttpHeaders.CACHE_CONTROL, "private, no-store"));
        mvc.perform(get("/api/users/{id}/selfie", titulaire.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk());
        mvc.perform(get("/api/users/{id}/selfie", titulaire.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + connexion("curieux@example.com")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users/{id}/selfie", titulaire.getId())).andExpect(status().isUnauthorized());

        // La consultation par la modération est journalisée, celle du titulaire non.
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_event WHERE action = 'PIECE_IDENTITE_CONSULTEE' AND motif = 'selfie'",
                Integer.class)).isEqualTo(1);
    }

    @Test
    void laFileDeVerificationVaDuPlusAncienAuPlusRecentEtLesDossiersSansDateEnTete() throws Exception {
        User recent = compte("recent@example.com", TypeRole.PARTICULIER);
        User ancien = compte("ancien@example.com", TypeRole.PARTICULIER);
        User avantSelfie = compte("avant@example.com", TypeRole.PARTICULIER);
        for (User u : List.of(recent, ancien, avantSelfie)) {
            jdbc.update("UPDATE account SET statut_piece_identite = 'EN_ATTENTE' WHERE id = ?", u.getId());
        }
        jdbc.update("UPDATE account SET date_envoi_verification = NOW() - INTERVAL '1 hour' WHERE id = ?", recent.getId());
        jdbc.update("UPDATE account SET date_envoi_verification = NOW() - INTERVAL '3 days' WHERE id = ?", ancien.getId());

        String json = mvc.perform(get("/api/admin/pieces-identite/en-attente")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> emails = new java.util.ArrayList<>();
        mapper.readTree(json).get("data").forEach(n -> emails.add(n.get("email").asString()));

        assertThat(emails).containsExactly("avant@example.com", "ancien@example.com", "recent@example.com");
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

    private String connexion(String email) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", email, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();
    }

    private ResultActions envoyer(String jwt, org.springframework.mock.web.MockMultipartFile piece,
                                  org.springframework.mock.web.MockMultipartFile selfie) throws Exception {
        var requete = multipart("/api/users/me/piece-identite")
                .param("typePieceIdentite", "CARTE_IDENTITE").param("numeroPieceIdentite", "CNI-" + UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt);
        if (piece != null) {
            requete.file(piece);
        }
        if (selfie != null) {
            requete.file(selfie);
        }
        return mvc.perform(requete);
    }

    private ResultActions selfieSeul(String jwt) throws Exception {
        return mvc.perform(multipart("/api/users/me/selfie").file(TestPhotos.image("selfie", 800, 800))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt));
    }

    private ResultActions decider(StatutPieceIdentite statut, String motif) throws Exception {
        Map<String, Object> corps = motif == null
                ? Map.of("statut", statut.name())
                : Map.of("statut", statut.name(), "motifRejet", motif);
        return mvc.perform(put("/api/users/{id}/piece-identite/statut", titulaire.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(corps)));
    }
}
