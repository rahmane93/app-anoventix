package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Double authentification du staff par code email (DEC-03), avec codes de secours et
 * email d'alerte. Le code est lu dans la file d'envoi (email_sortant), qui n'envoie rien en test.
 */
@SpringBootTest(properties = "app.security.staff-2fa-actif=true")
class DoubleAuthentificationTest {

    private static final String MOT_DE_PASSE = "Moderation-2026";
    private static final String EMAIL = "moderateur2fa@example.com";
    private static final Pattern CODE_EMAIL = Pattern.compile("Votre code de vérification : (\\d{6})");

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
        for (String table : List.of("refresh_token", "verification_connexion", "code_secours", "email_sortant",
                "audit_event", "message", "conversation", "signalements", "historique_annonce", "medias",
                "account_favoris", "bien_immo", "annonce", "licence")) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
        creerCompte(EMAIL, TypeRole.MODERATEUR);
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

    // ── Connexion en deux temps ────────────────────────────────────────────

    @Test
    void lesModerateursNeRecoiventAucunJetonAvantLeCode() throws Exception {
        String corps = mvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(identifiants(EMAIL)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.verificationRequise").value(true))
                .andExpect(jsonPath("$.verificationId").exists())
                .andExpect(jsonPath("$.methode").value("EMAIL"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        assertThat(corps).doesNotContain("Bearer");
        String code = dernierCodeEnvoye();
        // Le code part par email mais n'est jamais stocké en clair.
        assertThat(jdbc.queryForObject("SELECT code_hash FROM verification_connexion", String.class))
                .isNotEqualTo(code).doesNotContain(code);
    }

    @Test
    void lesAutresComptesSeConnectentSansCode() throws Exception {
        creerCompte("particulier2fa@example.com", TypeRole.PARTICULIER);

        mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(identifiants("particulier2fa@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void leBonCodeOuvreLaSessionEtRemetLesCodesDeSecoursUneSeuleFois() throws Exception {
        UUID verification = connexion();

        JsonNode session = verifier(verification, dernierCodeEnvoye(), status().isOk());

        assertThat(session.get("token").asString()).isNotBlank();
        assertThat(session.get("refreshToken").asString()).isNotBlank();
        assertThat(session.get("codesSecours")).hasSize(8);
        session.get("codesSecours").forEach(c -> assertThat(c.asString()).matches("[A-Z2-9]{4}-[A-Z2-9]{4}"));
        // Codes de secours hachés en base, remis une seule fois.
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM code_secours", Integer.class)).isEqualTo(8);
        assertThat(jdbc.queryForList("SELECT code_hash FROM code_secours", String.class))
                .noneMatch(h -> h.contains(session.get("codesSecours").get(0).asString()));

        // Deuxième connexion : pas de nouveaux codes.
        UUID suivante = connexion();
        JsonNode seconde = verifier(suivante, dernierCodeEnvoye(), status().isOk());
        assertThat(seconde.has("codesSecours")).isFalse();
    }

    @Test
    void chaqueConnexionReussieEnvoieUneAlerteAuTitulaire() throws Exception {
        verifier(connexion(), dernierCodeEnvoye(), status().isOk());

        assertThat(jdbc.queryForList("SELECT sujet FROM email_sortant", String.class))
                .contains("Nouvelle connexion à votre compte AnoventiX");
        // L'alerte ne contient jamais le code.
        String alerte = jdbc.queryForObject(
                "SELECT corps_html FROM email_sortant WHERE sujet LIKE 'Nouvelle connexion%'", String.class);
        assertThat(alerte).contains("Adresse IP approximative").doesNotContain("code de vérification");
    }

    // ── Limites ────────────────────────────────────────────────────────────

    @Test
    void unCodeNeSertQuUneFois() throws Exception {
        UUID verification = connexion();
        String code = dernierCodeEnvoye();
        verifier(verification, code, status().isOk());

        verifier(verification, code, status().isUnauthorized());
    }

    @Test
    void unCodeExpireEstRefuse() throws Exception {
        UUID verification = connexion();
        String code = dernierCodeEnvoye();
        jdbc.update("UPDATE verification_connexion SET expire_le = now() - interval '1 minute'");

        verifier(verification, code, status().isUnauthorized());
    }

    @Test
    void cinqMauvaisEssaisAnnulentLeCodeMemeSiLeBonSuit() throws Exception {
        UUID verification = connexion();
        String bonCode = dernierCodeEnvoye();
        String mauvais = bonCode.equals("000000") ? "111111" : "000000";

        for (int essai = 1; essai <= 5; essai++) {
            verifier(verification, mauvais, status().isUnauthorized());
        }

        // Compté en base (et non en mémoire), et le bon code ne sauve plus rien : il faut se reconnecter.
        assertThat(jdbc.queryForObject("SELECT tentatives FROM verification_connexion", Integer.class)).isEqualTo(5);
        verifier(verification, bonCode, status().isUnauthorized());
    }

    @Test
    void unNouveauCodeAnnuleLePrecedentEtLesRenvoisSontLimites() throws Exception {
        UUID premier = connexion();
        String ancienCode = dernierCodeEnvoye();

        // 3 renvois autorisés : 4 codes au total par fenêtre de 15 minutes.
        UUID courant = premier;
        for (int renvoi = 1; renvoi <= 3; renvoi++) {
            courant = UUID.fromString(mapper.readTree(mvc.perform(post("/api/auth/verification-code/renvoyer")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(Map.of("verificationId", courant))))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString()).get("verificationId").asString());
        }
        mvc.perform(post("/api/auth/verification-code/renvoyer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("verificationId", courant))))
                .andExpect(status().isTooManyRequests());
        // Se reconnecter n'est pas un moyen de contourner la limite.
        mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON).content(identifiants(EMAIL)))
                .andExpect(status().isTooManyRequests());

        // Seul le dernier code reste valable.
        verifier(premier, ancienCode, status().isUnauthorized());
        verifier(courant, dernierCodeEnvoye(), status().isOk());
    }

    // ── Codes de secours ───────────────────────────────────────────────────

    @Test
    void unCodeDeSecoursOuvreLaSessionUneSeuleFois() throws Exception {
        List<String> secours = codesDeSecours(verifier(connexion(), dernierCodeEnvoye(), status().isOk()));

        // L'email est indisponible : le code de secours remplace le code reçu.
        verifier(connexion(), secours.get(0), status().isOk());
        verifier(connexion(), secours.get(0), status().isUnauthorized());
        verifier(connexion(), secours.get(1).toLowerCase(), status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM code_secours WHERE utilise_le IS NOT NULL",
                Integer.class)).isEqualTo(2);
    }

    @Test
    void regenererLesCodesAnnuleLesPrecedentsEtRedemandeLeMotDePasse() throws Exception {
        JsonNode session = verifier(connexion(), dernierCodeEnvoye(), status().isOk());
        List<String> anciens = codesDeSecours(session);
        String jwt = session.get("token").asString();

        mvc.perform(post("/api/users/me/codes-secours")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("password", "Mauvais-mot-de-passe-1"))))
                .andExpect(status().isUnauthorized());

        List<String> nouveaux = codesDeSecours(mapper.readTree(mvc.perform(post("/api/users/me/codes-secours")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codesSecours.length()").value(8))
                .andReturn().getResponse().getContentAsString()));

        assertThat(nouveaux).doesNotContainAnyElementsOf(anciens);
        verifier(connexion(), anciens.get(0), status().isUnauthorized());
        verifier(connexion(), nouveaux.get(0), status().isOk());
    }

    @Test
    void lesCodesDeSecoursNeConcernentQueLeStaff() throws Exception {
        creerCompte("simple2fa@example.com", TypeRole.PARTICULIER);
        String jwt = mapper.readTree(mvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON).content(identifiants("simple2fa@example.com")))
                .andReturn().getResponse().getContentAsString()).get("token").asString();

        mvc.perform(post("/api/users/me/codes-secours")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("password", MOT_DE_PASSE))))
                .andExpect(status().isForbidden());
    }

    // ── Session du staff ───────────────────────────────────────────────────

    @Test
    void laSessionDuStaffDureVingtQuatreHeures() throws Exception {
        verifier(connexion(), dernierCodeEnvoye(), status().isOk());

        Long heures = jdbc.queryForObject(
                "SELECT EXTRACT(EPOCH FROM (expire_le - cree_le)) / 3600 FROM refresh_token", Long.class);
        assertThat(heures).isEqualTo(24L);
    }

    @Test
    void unComptePromuModerateurPerdSesSessionsEtPasseALaDoubleAuthentification() throws Exception {
        User promu = creerCompte("promu2fa@example.com", TypeRole.PARTICULIER);
        String refresh = mapper.readTree(mvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON).content(identifiants("promu2fa@example.com")))
                .andReturn().getResponse().getContentAsString()).get("refreshToken").asString();
        promu.setRole(roleRepository.findByName(TypeRole.MODERATEUR).orElseThrow());
        userRepository.save(promu);

        mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(identifiants("promu2fa@example.com")))
                .andExpect(status().isAccepted());
        assertThat(refresh).isNotBlank();
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private User creerCompte(String email, TypeRole role) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode(MOT_DE_PASSE));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setRole(roleRepository.findByName(role).orElseThrow());
        return userRepository.save(user);
    }

    private String identifiants(String email) {
        return mapper.writeValueAsString(Map.of("identifier", email, "password", MOT_DE_PASSE));
    }

    private UUID connexion() throws Exception {
        jdbc.update("UPDATE verification_connexion SET cree_le = cree_le - interval '1 hour'");
        String corps = mvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON).content(identifiants(EMAIL)))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(mapper.readTree(corps).get("verificationId").asString());
    }

    private JsonNode verifier(UUID verification, String code, ResultMatcher attendu) throws Exception {
        String corps = mvc.perform(post("/api/auth/verification-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("verificationId", verification, "code", code))))
                .andExpect(attendu)
                .andReturn().getResponse().getContentAsString();
        return corps.isBlank() ? null : mapper.readTree(corps);
    }

    /** Code du dernier email de connexion de la file (rien n'est envoyé en test). */
    private String dernierCodeEnvoye() {
        String corps = jdbc.queryForObject(
                "SELECT corps_html FROM email_sortant WHERE sujet LIKE 'Votre code de connexion%' "
                        + "ORDER BY id DESC LIMIT 1", String.class);
        Matcher m = CODE_EMAIL.matcher(corps);
        assertThat(m.find()).as("code dans l'email").isTrue();
        return m.group(1);
    }

    private static List<String> codesDeSecours(JsonNode reponse) {
        return reponse.get("codesSecours").valueStream().map(JsonNode::asString).toList();
    }
}
