package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.EmailService;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Sessions : jetons de rafraîchissement en base, rotation, détection de
 * rejeu, cookie du site web, et limite de débit du rafraîchissement.
 */
@SpringBootTest
class SessionsTest {

    private static final String EMAIL = "session@example.com";
    private static final String MOT_DE_PASSE = "Session-2026";

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;
    @MockitoBean private EmailService emailService;
    @Value("${jwt.secret}") private String secret;

    private MockMvc mvc;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        doNothing().when(emailService).sendEmail(any(), any(), any());
        jdbc.execute("DELETE FROM refresh_token");
        jdbc.execute("DELETE FROM email_sortant");
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM audit_event");
        jdbc.execute("DELETE FROM message");
        jdbc.execute("DELETE FROM conversation");
        jdbc.execute("DELETE FROM signalements");
        jdbc.execute("DELETE FROM historique_annonce");
        jdbc.execute("DELETE FROM medias");
        jdbc.execute("DELETE FROM account_favoris");
        jdbc.execute("DELETE FROM bien_immo");
        jdbc.execute("DELETE FROM annonce");
        jdbc.execute("DELETE FROM entreprises");
        jdbc.execute("DELETE FROM licence");
        userRepository.deleteAll();

        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", EMAIL, "password", MOT_DE_PASSE,
                        "nom", "Session", "prenom", "Test", "role", "PARTICULIER"))))
                .andExpect(status().isCreated());
        String activation = userRepository.findByEmail(EMAIL).orElseThrow().getActivationCode();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/auth/activate").param("token", activation)).andExpect(status().isOk());
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

    // ── Rotation ───────────────────────────────────────────────────────────

    @Test
    void chaqueRafraichissementDelivreUnNouveauJetonEtConsommeLAncien() throws Exception {
        String premier = connexion().get("refreshToken").asString();

        JsonNode suite = rafraichir(premier, status().isOk());

        assertThat(suite.get("refreshToken").asString()).isNotEqualTo(premier);
        assertThat(suite.get("token").asString()).isNotBlank();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_token", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM refresh_token WHERE utilise_le IS NOT NULL", Integer.class)).isEqualTo(1);
    }

    @Test
    void unJetonRejoueApresLeDelaiRevoqueToutLaSession() throws Exception {
        String premier = connexion().get("refreshToken").asString();
        String second = rafraichir(premier, status().isOk()).get("refreshToken").asString();
        // Le premier jeton a été consommé il y a plus que la tolérance : son rejeu est un vol.
        jdbc.update("UPDATE refresh_token SET utilise_le = now() - interval '1 minute' WHERE utilise_le IS NOT NULL");

        rafraichir(premier, status().isUnauthorized());

        // La victime est déconnectée avec l'attaquant : le jeton légitime ne marche plus.
        rafraichir(second, status().isUnauthorized());
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM refresh_token WHERE revoque_le IS NULL", Integer.class)).isZero();
    }

    @Test
    void deuxRafraichissementsTresRapprochesNeSontPasUnVol() throws Exception {
        String premier = connexion().get("refreshToken").asString();

        rafraichir(premier, status().isOk());
        JsonNode second = rafraichir(premier, status().isOk());

        // Deux onglets, un réessai réseau : la session reste utilisable.
        rafraichir(second.get("refreshToken").asString(), status().isOk());
    }

    @Test
    void laDeconnexionRevoqueLaSessionEnBase() throws Exception {
        JsonNode tokens = connexion();
        String refresh = tokens.get("refreshToken").asString();

        mvc.perform(post("/api/auth/logout")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.get("token").asString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("refreshToken", refresh))))
                .andExpect(status().isOk());

        // Révocation persistée (et non plus gardée en mémoire) : elle survit à un redémarrage.
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM refresh_token WHERE revoque_le IS NOT NULL", Integer.class)).isEqualTo(1);
        rafraichir(refresh, status().isUnauthorized());
    }

    @Test
    void unJetonQuiNeSortPasDeLaBaseEstRefuse() throws Exception {
        String refresh = connexion().get("refreshToken").asString();
        jdbc.execute("DELETE FROM refresh_token");

        rafraichir(refresh, status().isUnauthorized());
    }

    @Test
    void unJetonEmisAvantLaTableEstAccepteUneFoisPuisRemplaceParUnJetonSuivi() throws Exception {
        String herite = Jwts.builder()
                .subject(EMAIL)
                .claim("type", "refresh")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3_600_000))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
                .compact();

        JsonNode suite = rafraichir(herite, status().isOk());

        assertThat(suite.get("refreshToken").asString()).isNotEqualTo(herite);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_token", Integer.class)).isEqualTo(1);
        rafraichir(suite.get("refreshToken").asString(), status().isOk());
    }

    @Test
    void suspendreUnCompteFermeSesSessionsMemeApresLaLevee() throws Exception {
        String refresh = connexion().get("refreshToken").asString();
        var user = userRepository.findByEmail(EMAIL).orElseThrow();

        // Ce que fait la modération : statut non actif, puis levée.
        context.getBean(com.app.AnnoncesAPI.services.SessionService.class).fermerToutesLesSessions(user.getId());
        user.setStatut(StatutUtilisateur.ACTIF);
        userRepository.save(user);

        rafraichir(refresh, status().isUnauthorized());
    }

    // ── Site web : cookie HttpOnly ─────────────────────────────────────────

    @Test
    void leSiteWebRecoitLeJetonDansUnCookieHttpOnlyEtPasDansLeCorps() throws Exception {
        MvcResult resultat = mvc.perform(post("/api/auth/signin")
                .header("X-Client", "web")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", EMAIL, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();

        String cookie = resultat.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(cookie).startsWith("refresh_token=")
                .contains("HttpOnly").contains("Secure").contains("SameSite=Strict").contains("Path=/api/auth");
    }

    @Test
    void leSiteWebSeRafraichitAvecLeCookieSeulEtLeRenouvelle() throws Exception {
        Cookie cookie = cookieDe(mvc.perform(post("/api/auth/signin")
                .header("X-Client", "web")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", EMAIL, "password", MOT_DE_PASSE))))
                .andReturn());

        MvcResult resultat = mvc.perform(post("/api/auth/refresh")
                .header("X-Client", "web").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();

        assertThat(cookieDe(resultat).getValue()).isNotEqualTo(cookie.getValue());
    }

    @Test
    void sansCookieNiCorpsLeRafraichissementEstRefuse() throws Exception {
        mvc.perform(post("/api/auth/refresh").header("X-Client", "web"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    void uneApplicationNeSeRafraichitPasAvecUnCookie() throws Exception {
        Cookie cookie = cookieDe(mvc.perform(post("/api/auth/signin")
                .header("X-Client", "web")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", EMAIL, "password", MOT_DE_PASSE))))
                .andReturn());

        // Sans l'en-tête X-Client, le cookie est ignoré : pas de session ouverte par un simple cookie.
        mvc.perform(post("/api/auth/refresh").cookie(cookie)).andExpect(status().isUnauthorized());
    }

    @Test
    void laDeconnexionDuSiteWebEffaceLeCookieEtRevoqueLaSession() throws Exception {
        MvcResult connexion = mvc.perform(post("/api/auth/signin")
                .header("X-Client", "web")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", EMAIL, "password", MOT_DE_PASSE))))
                .andReturn();
        Cookie cookie = cookieDe(connexion);
        String jwt = mapper.readTree(connexion.getResponse().getContentAsString()).get("token").asString();

        MvcResult sortie = mvc.perform(post("/api/auth/logout")
                .header("X-Client", "web").cookie(cookie)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(sortie.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
        mvc.perform(post("/api/auth/refresh").header("X-Client", "web").cookie(cookie))
                .andExpect(status().isUnauthorized());
    }

    // ── Limite de débit ─────────────────────────────────────────

    @Test
    void leRafraichissementNEstPlusLimiteACinqParQuinzeMinutes() throws Exception {
        // Avant : 5 requêtes par 15 min par IP, partagée par tout un quartier derrière un CGNAT.
        for (int i = 0; i < 40; i++) {
            mvc.perform(post("/api/auth/refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(Map.of("refreshToken", "invalide-" + UUID.randomUUID()))))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private JsonNode connexion() throws Exception {
        return mapper.readTree(mvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", EMAIL, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    private JsonNode rafraichir(String refreshToken, org.springframework.test.web.servlet.ResultMatcher attendu)
            throws Exception {
        String corps = mvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
                .andExpect(attendu)
                .andReturn().getResponse().getContentAsString();
        return corps.isBlank() ? null : mapper.readTree(corps);
    }

    private static Cookie cookieDe(MvcResult resultat) {
        List<String> entetes = resultat.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
        String valeur = entetes.getFirst().split(";", 2)[0].split("=", 2)[1];
        return new Cookie("refresh_token", valeur);
    }
}
