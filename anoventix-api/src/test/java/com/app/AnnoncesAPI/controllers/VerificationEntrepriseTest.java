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

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.ObjectMapper;

/** Vérification des entreprises sur justificatif RCCM (DEC-04). */
@SpringBootTest
class VerificationEntrepriseTest {

    private static final String MOT_DE_PASSE = "Entreprise-2026";
    private static final String RCCM = "RC/CKY/2026/B/1234";
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
    private Entreprise entreprise;
    private String jwtPro;
    private String jwtAdmin;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        User pro = compte("pro@example.com", TypeRole.PROFESSIONNEL);
        pro.setStatutPieceIdentite(StatutPieceIdentite.VALIDEE);
        userRepository.save(pro);
        entreprise = entreprise("Agence Kaloum", RCCM, pro);
        compte("admin@example.com", TypeRole.ADMINISTRATEUR);
        jwtPro = connexion("pro@example.com");
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
    void lEntrepriseDemarreNonVerifieeEtSonProprietaireEnvoieUnJustificatif() throws Exception {
        assertThat(recharger().getStatutVerification().name()).isEqualTo("NON_VERIFIEE");

        envoyer(entreprise, jwtPro, pdf()).andExpect(status().isCreated())
                .andExpect(jsonPath("$.statutVerification").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.justificatifFourni").value(true))
                .andExpect(jsonPath("$.dateEnvoiVerification").exists());
    }

    @Test
    void ilFautUneIdentiteVerifieeUnRccmEtUnFichierValide() throws Exception {
        jdbc.update("UPDATE account SET statut_piece_identite = 'EN_ATTENTE' WHERE email = 'pro@example.com'");
        envoyer(entreprise, jwtPro, pdf()).andExpect(status().isUnprocessableContent());

        jdbc.update("UPDATE account SET statut_piece_identite = 'VALIDEE' WHERE email = 'pro@example.com'");
        envoyer(entreprise, jwtPro, new MockMultipartFile("justificatif", "x.txt", "text/plain", "texte".getBytes()))
                .andExpect(status().isBadRequest());
        // Un PDF, même valide, est refusé : le justificatif est une photo.
        envoyer(entreprise, jwtPro, new MockMultipartFile("justificatif", "x.pdf", "application/pdf", "%PDF-1.4 extrait".getBytes()))
                .andExpect(status().isBadRequest());
        envoyer(entreprise, jwtPro, null).andExpect(status().isBadRequest());
        assertThat(recharger().getStatutVerification().name()).isEqualTo("NON_VERIFIEE");
    }

    @Test
    void seulLeProprietairePeutDemanderEtVoirLeJustificatif() throws Exception {
        compte("autre@example.com", TypeRole.PROFESSIONNEL);
        String jwtAutre = connexion("autre@example.com");
        envoyer(entreprise, jwtAutre, pdf()).andExpect(status().isForbidden());

        envoyer(entreprise, jwtPro, pdf()).andExpect(status().isCreated());
        mvc.perform(get("/api/entreprises/{id}/justificatif", entreprise.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAutre)).andExpect(status().isForbidden());
        mvc.perform(get("/api/entreprises/{id}/justificatif", entreprise.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtPro)).andExpect(status().isOk());
        mvc.perform(get("/api/entreprises/{id}/justificatif", entreprise.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)).andExpect(status().isOk());
        // Seule la consultation par la modération est journalisée.
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_event WHERE action = 'ENTREPRISE_JUSTIFICATIF_CONSULTE'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void laModerationVerifieEtLEntrepriseObtientSonBadge() throws Exception {
        envoyer(entreprise, jwtPro, pdf()).andExpect(status().isCreated());
        mvc.perform(get("/api/admin/entreprises/a-verifier").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(entreprise.getId().toString()));

        decider(entreprise, "VERIFIEE", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.statutVerification").value("VERIFIEE"));

        Entreprise v = recharger();
        assertThat(v.getDecisionVerificationPar()).isEqualTo("admin@example.com");
        assertThat(v.getDateDecisionVerification()).isNotNull();
        mvc.perform(get("/api/entreprises/{id}/profil", entreprise.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entreprise.verifiee").value(true));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = 'pro@example.com'",
                Integer.class)).isEqualTo(1);
        mvc.perform(get("/api/admin/entreprises/a-verifier").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void unRefusExigeUnMotifEtLeProprietairePeutRenvoyer() throws Exception {
        envoyer(entreprise, jwtPro, pdf()).andExpect(status().isCreated());

        decider(entreprise, "REJETEE", null).andExpect(status().isBadRequest());
        decider(entreprise, "REJETEE", "Extrait illisible.").andExpect(status().isOk())
                .andExpect(jsonPath("$.statutVerification").value("REJETEE"))
                .andExpect(jsonPath("$.motifRejetVerification").value("Extrait illisible."));

        envoyer(entreprise, jwtPro, pdf()).andExpect(status().isCreated())
                .andExpect(jsonPath("$.statutVerification").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.motifRejetVerification").doesNotExist());
    }

    @Test
    void uneDecisionNeSePrendQuSurUneDemandeEnAttente() throws Exception {
        decider(entreprise, "VERIFIEE", null).andExpect(status().isUnprocessableContent());
    }

    @Test
    void ApresVerificationLeNomEtLeRccmSontFiges() throws Exception {
        envoyer(entreprise, jwtPro, pdf()).andExpect(status().isCreated());
        decider(entreprise, "VERIFIEE", null).andExpect(status().isOk());

        modifier(entreprise, "Nouveau nom", RCCM).andExpect(status().isUnprocessableContent());
        modifier(entreprise, "Agence Kaloum", "RC/AUTRE/1").andExpect(status().isUnprocessableContent());
        // Les autres champs restent modifiables.
        modifier(entreprise, "Agence Kaloum", RCCM).andExpect(status().isOk());
    }

    @Test
    void leRccmNEstReserveQuUneFoisVerifie() throws Exception {
        User autrePro = compte("concurrent@example.com", TypeRole.PROFESSIONNEL);
        autrePro.setStatutPieceIdentite(StatutPieceIdentite.VALIDEE);
        userRepository.save(autrePro);
        // Deux entreprises non vérifiées peuvent déclarer le même numéro.
        Entreprise concurrente = entreprise("Agence Concurrente", RCCM, autrePro);
        String jwtConcurrent = connexion("concurrent@example.com");

        envoyer(entreprise, jwtPro, pdf()).andExpect(status().isCreated());
        decider(entreprise, "VERIFIEE", null).andExpect(status().isOk());

        // Une fois vérifié, il est réservé : l'autre doit corriger le sien avant toute demande.
        envoyer(concurrente, jwtConcurrent, pdf()).andExpect(status().isConflict());
        modifier(concurrente, "Agence Concurrente", "RC/CKY/2026/B/9999", jwtConcurrent).andExpect(status().isOk());
        // Et elle ne peut pas reprendre le numéro réservé.
        modifier(concurrente, "Agence Concurrente", RCCM, jwtConcurrent)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Ce numéro RCCM est déjà enregistré dans le système"));
        modifier(concurrente, "Agence Concurrente", "RC/CKY/2026/B/9999", jwtConcurrent).andExpect(status().isOk());
        envoyer(concurrente, jwtConcurrent, pdf()).andExpect(status().isCreated());
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

    private Entreprise entreprise(String nom, String rccm, User proprietaire) {
        Entreprise e = new Entreprise();
        e.setNom(nom);
        e.setNumeroRCCM(rccm);
        e.setAnnonceurProfessionnel(proprietaire);
        e = entrepriseRepository.save(e);
        proprietaire.setEntreprise(e);
        userRepository.save(proprietaire);
        return e;
    }

    private Entreprise recharger() {
        return entrepriseRepository.findById(entreprise.getId()).orElseThrow();
    }

    private String connexion(String email) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", email, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();
    }

    private static MockMultipartFile pdf() throws Exception {
        return TestPhotos.image("justificatif", 800, 600);
    }

    private ResultActions envoyer(Entreprise cible, String jwt, MockMultipartFile fichier) throws Exception {
        var requete = multipart("/api/entreprises/{id}/verification", cible.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt);
        if (fichier != null) {
            requete.file(fichier);
        }
        return mvc.perform(requete);
    }

    private ResultActions decider(Entreprise cible, String statut, String motif) throws Exception {
        Map<String, Object> corps = motif == null ? Map.of("statut", statut) : Map.of("statut", statut, "motif", motif);
        return mvc.perform(put("/api/admin/entreprises/{id}/verification", cible.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(corps)));
    }

    private ResultActions modifier(Entreprise cible, String nom, String rccm) throws Exception {
        return modifier(cible, nom, rccm, jwtPro);
    }

    private ResultActions modifier(Entreprise cible, String nom, String rccm, String jwt) throws Exception {
        return mvc.perform(put("/api/entreprises/{id}", cible.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("nom", nom, "numeroRCCM", rccm,
                        "description", "Agence immobilière de Conakry", "adresse", "Kaloum, Conakry",
                        "telephone", cible.getId().equals(entreprise.getId()) ? "+224622000001" : "+224622000002",
                        "email", "contact@agence.example"))));
    }
}
