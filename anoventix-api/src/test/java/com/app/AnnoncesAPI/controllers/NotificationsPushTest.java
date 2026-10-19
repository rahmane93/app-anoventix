package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.AlerteRechercheService;
import com.app.AnnoncesAPI.services.ExpoPushClient;

import tools.jackson.databind.ObjectMapper;

/** Notifications push des messages (DEC-13) et alertes de recherche (DEC-16). */
@SpringBootTest
class NotificationsPushTest {

    private static final String MOT_DE_PASSE = "Notifications-2026";
    private static final String JETON = "ExponentPushToken[abcdefghijklmnopqrstuv]";
    private static final String LOC_ID = "loc-notifications-test";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private AlerteRechercheService alertes;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;
    @MockitoBean private ExpoPushClient expo;

    private MockMvc mvc;
    private User vendeur;
    private User acheteur;
    private String jwtVendeur;
    private String jwtAcheteur;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        vendeur = compte("vendeur@example.com", "Mamadou");
        acheteur = compte("acheteur@example.com", "Aïssatou");
        jwtVendeur = connexion("vendeur@example.com");
        jwtAcheteur = connexion("acheteur@example.com");
    }

    @AfterEach
    void nettoyerApres() {
        vider();
    }

    private void vider() {
        for (String table : List.of("appareil_push", "alerte_recherche")) {
            jdbc.execute("DELETE FROM " + table);
        }
        for (String table : TABLES) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
    }

    // ── Appareils et interrupteurs ─────────────────────────────────────────

    @Test
    void unAppareilSEnregistreSeRetireEtUnJetonInvalideEstRefuse() throws Exception {
        enregistrer(jwtVendeur, JETON).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM appareil_push", Integer.class)).isEqualTo(1);

        enregistrer(jwtVendeur, "n-importe-quoi").andExpect(status().isBadRequest());

        mvc.perform(delete("/api/push/appareils").param("jeton", JETON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM appareil_push", Integer.class)).isZero();
    }

    @Test
    void unAppareilChangeDeCompteQuandUnAutreSeConnecteDessus() throws Exception {
        enregistrer(jwtVendeur, JETON).andExpect(status().isCreated());
        enregistrer(jwtAcheteur, JETON).andExpect(status().isCreated());

        assertThat(jdbc.queryForObject("SELECT user_id FROM appareil_push WHERE jeton = ?", UUID.class, JETON))
                .isEqualTo(acheteur.getId());
        // L'ancien propriétaire ne peut pas retirer l'appareil d'un autre.
        mvc.perform(delete("/api/push/appareils").param("jeton", JETON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM appareil_push", Integer.class)).isEqualTo(1);
    }

    @Test
    void lesInterrupteursSeLisentEtSeModifient() throws Exception {
        mvc.perform(get("/api/users/me/notifications").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur))
                .andExpect(status().isOk()).andExpect(jsonPath("$.messages").value(true))
                .andExpect(jsonPath("$.alertes").value(true));

        mvc.perform(put("/api/users/me/notifications").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("messages", false, "alertes", true))))
                .andExpect(status().isOk());

        assertThat(userRepository.findById(vendeur.getId()).orElseThrow().isNotifMessages()).isFalse();
    }

    // ── Messages ───────────────────────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void unMessageNotifieLeDestinataireSansSonContenu() throws Exception {
        enregistrer(jwtVendeur, JETON).andExpect(status().isCreated());
        Long conversation = ouvrirConversation(annonce("Villa de Kipé"));

        envoyer(conversation, "Bonjour, quel est votre dernier prix ? Mon numéro est 622 00 00 00");

        ArgumentCaptor<List<Map<String, Object>>> captor = ArgumentCaptor.forClass(List.class);
        verify(expo, timeout(3000)).envoyer(captor.capture());
        Map<String, Object> message = captor.getValue().get(0);
        assertThat(message.get("to")).isEqualTo(JETON);
        assertThat((String) message.get("body")).contains("Aïssatou").contains("Villa de Kipé")
                .doesNotContain("dernier prix").doesNotContain("622");
        assertThat(((Map<String, Object>) message.get("data")).get("type")).isEqualTo("message");
    }

    @Test
    void lInterrupteurNouveauxMessagesCoupeLaNotification() throws Exception {
        enregistrer(jwtVendeur, JETON).andExpect(status().isCreated());
        mvc.perform(put("/api/users/me/notifications").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("messages", false, "alertes", true)))).andExpect(status().isOk());
        Long conversation = ouvrirConversation(annonce("Villa de Kipé"));

        envoyer(conversation, "Bonjour");

        verify(expo, after(800).never()).envoyer(anyList());
    }

    @Test
    void sansAppareilEnregistreRienNEstEnvoye() throws Exception {
        Long conversation = ouvrirConversation(annonce("Villa de Kipé"));

        envoyer(conversation, "Bonjour");

        verify(expo, never()).envoyer(anyList());
    }

    // ── Alertes de recherche ───────────────────────────────────────────────

    @Test
    void uneAlerteSeCreeSeRenommeSeMetEnPauseEtSeSupprime() throws Exception {
        String reponse = mvc.perform(post("/api/alertes").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("nom", "Villas à Kipé",
                        "criteres", Map.of("typeBien", "VILLA", "commune", "Ratoma")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteres.typeBien").value("VILLA"))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(reponse).get("id").asLong();

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/alertes/{id}", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("nom", "Villas", "active", false))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nom").value("Villas"))
                .andExpect(jsonPath("$.active").value(false));

        // Une alerte est privée à son compte.
        mvc.perform(delete("/api/alertes/{id}", id).header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/alertes/{id}", id).header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur))
                .andExpect(status().isNoContent());
    }

    @Test
    void uneAlerteExigeUnCritereEtLeCompteEstLimiteADixAlertes() throws Exception {
        mvc.perform(post("/api/alertes").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("nom", "Vide", "criteres", Map.of()))))
                .andExpect(status().isBadRequest());

        for (int i = 0; i < AlerteRechercheService.ALERTES_MAX; i++) {
            creerAlerte(jwtAcheteur, "Alerte " + i).andExpect(status().isCreated());
        }
        creerAlerte(jwtAcheteur, "Une de trop").andExpect(status().isConflict());
    }

    @Test
    @SuppressWarnings("unchecked")
    void lAlerteNotifieLesNouvellesAnnoncesUneFoisParJour() throws Exception {
        enregistrer(jwtAcheteur, JETON).andExpect(status().isCreated());
        creerAlerte(jwtAcheteur, "Villas").andExpect(status().isCreated());
        // Horloges JVM et base (Docker) pas forcément alignées à la milliseconde : la vérification part d'avant.
        jdbc.update("UPDATE alerte_recherche SET derniere_verification = derniere_verification - INTERVAL '1 minute'");
        annonce("Villa neuve");
        annonce("Villa avec jardin");
        BienImmo appartement = annonce("Appartement");
        appartement.setTypeBien(TypeBien.APPARTEMENT);
        bienImmoRepository.save(appartement);

        assertThat(alertes.verifier(java.time.LocalDateTime.now())).isEqualTo(1);

        ArgumentCaptor<List<Map<String, Object>>> captor = ArgumentCaptor.forClass(List.class);
        verify(expo, timeout(3000)).envoyer(captor.capture());
        assertThat((String) captor.getValue().get(0).get("body")).contains("2 nouvelles annonces").contains("Villas");

        // Une autre annonce le même jour : pas de deuxième notification.
        annonce("Villa de plus");
        assertThat(alertes.verifier(java.time.LocalDateTime.now())).isZero();
        // Le lendemain, elle part avec le décompte accumulé.
        assertThat(alertes.verifier(java.time.LocalDateTime.now().plusDays(1).plusMinutes(1))).isEqualTo(1);
    }

    @Test
    void uneAlerteDontLesNotificationsNeSontPlusOuvertesEstMiseEnPause() throws Exception {
        creerAlerte(jwtAcheteur, "Villas").andExpect(status().isCreated());
        jdbc.update("UPDATE alerte_recherche SET derniere_notification = NOW() - INTERVAL '8 months', "
                + "date_creation = NOW() - INTERVAL '9 months'");

        alertes.verifier(java.time.LocalDateTime.now());

        assertThat(jdbc.queryForObject("SELECT active FROM alerte_recherche", Boolean.class)).isFalse();
    }

    @Test
    void lInterrupteurAlertesEtLeStatutDuCompteSuspendentLesEnvois() throws Exception {
        enregistrer(jwtAcheteur, JETON).andExpect(status().isCreated());
        creerAlerte(jwtAcheteur, "Villas").andExpect(status().isCreated());
        mvc.perform(put("/api/users/me/notifications").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("messages", true, "alertes", false)))).andExpect(status().isOk());
        annonce("Villa neuve");

        assertThat(alertes.verifier(java.time.LocalDateTime.now())).isZero();
        verify(expo, never()).envoyer(anyList());
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private User compte(String email, String prenom) {
        User user = new User();
        user.setEmail(email);
        user.setPrenom(prenom);
        user.setNom("Diallo");
        user.setPassword(encoder.encode(MOT_DE_PASSE));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setRole(roleRepository.findByName(TypeRole.PARTICULIER).orElseThrow());
        return userRepository.save(user);
    }

    private String connexion(String email) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", email, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();
    }

    private org.springframework.test.web.servlet.ResultActions enregistrer(String jwt, String jeton) throws Exception {
        return mvc.perform(post("/api/push/appareils").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("jeton", jeton, "plateforme", "android"))));
    }

    private org.springframework.test.web.servlet.ResultActions creerAlerte(String jwt, String nom) throws Exception {
        return mvc.perform(post("/api/alertes").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("nom", nom, "criteres", Map.of("typeBien", "VILLA")))));
    }

    private BienImmo annonce(String titre) {
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-NOT-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre(titre);
        b.setDescription("Annonce créée par NotificationsPushTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.VILLA);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisation());
        b.setOwner(vendeur);
        b.setActif(true);
        return bienImmoRepository.save(b);
    }

    private Localisation localisation() {
        return localisationRepository.findById(LOC_ID).orElseGet(() -> {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Ratoma");
            loc.setQuartier("Kipé");
            return localisationRepository.save(loc);
        });
    }

    private Long ouvrirConversation(BienImmo annonce) throws Exception {
        String reponse = mvc.perform(post("/api/messagerie/conversations")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("annonceId", annonce.getId()))))
                .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(reponse).get("id").asLong();
    }

    private void envoyer(Long conversation, String contenu) throws Exception {
        mvc.perform(post("/api/messagerie/conversations/{id}/messages", conversation)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("content", contenu)))).andExpect(status().is2xxSuccessful());
    }
}
