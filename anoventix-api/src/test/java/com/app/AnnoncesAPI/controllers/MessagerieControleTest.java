package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
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

import tools.jackson.databind.ObjectMapper;

/** Messagerie : blocage, archivage, suppression pour soi, comptes injoignables et limites d'envoi. */
@SpringBootTest
class MessagerieControleTest {

    private static final String MOT_DE_PASSE = "Messagerie-2026";
    private static final String LOC_ID = "loc-messagerie-test";
    private static final List<String> TABLES = List.of("blocage_utilisateur", "refresh_token", "verification_connexion",
            "code_secours", "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;
    private User vendeur;
    private User acheteur;
    private String jwtVendeur;
    private String jwtAcheteur;
    private long conversationId;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        vendeur = compte("vendeur@example.com", "Mamadou");
        acheteur = compte("acheteur@example.com", "Aïssatou");
        jwtVendeur = connexion("vendeur@example.com");
        jwtAcheteur = connexion("acheteur@example.com");
        BienImmo annonce = annonce();
        conversationId = mapper.readTree(mvc.perform(post("/api/messagerie/conversations")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("annonceId", annonce.getId()))))
                .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString()).get("id").asLong();
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

    // ── Blocage ────────────────────────────────────────────────────────────

    @Test
    void unInterlocuteurBloqueNePeutPlusEcrireEtCeluiQuiBloqueDoitDebloquerPourLuiEcrire() throws Exception {
        envoyer(jwtAcheteur, "Bonjour").andExpect(status().isCreated());

        mvc.perform(post("/api/messagerie/blocages/{id}", acheteur.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)).andExpect(status().isCreated());

        // Le bloqué reçoit un refus neutre, le bloqueur est invité à débloquer.
        envoyer(jwtAcheteur, "Vous êtes là ?").andExpect(status().isForbidden());
        envoyer(jwtVendeur, "Désolé").andExpect(status().isUnprocessableContent());
        mvc.perform(get("/api/messagerie/conversations/{id}", conversationId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur))
                .andExpect(jsonPath("$.bloqueParMoi").value(true))
                .andExpect(jsonPath("$.ecriturePossible").value(false));
        mvc.perform(get("/api/messagerie/blocages").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur))
                .andExpect(jsonPath("$.length()").value(1));

        mvc.perform(delete("/api/messagerie/blocages/{id}", acheteur.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)).andExpect(status().isNoContent());
        envoyer(jwtAcheteur, "Re-bonjour").andExpect(status().isCreated());
    }

    @Test
    void onNeBloquePasSoiMemeNiLaModeration() throws Exception {
        mvc.perform(post("/api/messagerie/blocages/{id}", vendeur.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)).andExpect(status().isBadRequest());
        User modo = compte("modo@example.com", "Modo");
        modo.setRole(roleRepository.findByName(TypeRole.MODERATEUR).orElseThrow());
        userRepository.save(modo);
        mvc.perform(post("/api/messagerie/blocages/{id}", modo.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)).andExpect(status().isBadRequest());
    }

    // ── Archivage et suppression pour soi ──────────────────────────────────

    @Test
    void uneConversationArchiveeSortDeLaBoiteEtUnNouveauMessageLaRamene() throws Exception {
        envoyer(jwtAcheteur, "Bonjour").andExpect(status().isCreated());

        mvc.perform(put("/api/messagerie/conversations/{id}/archiver", conversationId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtVendeur)).andExpect(status().isNoContent());
        assertThat(nombreConversations(jwtVendeur, "ACTIVE")).isZero();
        assertThat(nombreConversations(jwtVendeur, "ARCHIVEE")).isEqualTo(1);
        // L'interlocuteur n'est pas concerné.
        assertThat(nombreConversations(jwtAcheteur, "ACTIVE")).isEqualTo(1);

        envoyer(jwtAcheteur, "Un nouveau message").andExpect(status().isCreated());
        assertThat(nombreConversations(jwtVendeur, "ACTIVE")).isEqualTo(1);
        assertThat(nombreConversations(jwtVendeur, "ARCHIVEE")).isZero();
    }

    @Test
    void uneConversationSupprimeePourSoiNEstPlusListeeMaisLAutreLaGarde() throws Exception {
        mvc.perform(delete("/api/messagerie/conversations/{id}", conversationId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur)).andExpect(status().isNoContent());

        assertThat(nombreConversations(jwtAcheteur, "ACTIVE")).isZero();
        assertThat(nombreConversations(jwtAcheteur, "ARCHIVEE")).isZero();
        mvc.perform(get("/api/messagerie/conversations").param("etat", "SUPPRIMEE")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur)).andExpect(status().isBadRequest());
        assertThat(nombreConversations(jwtVendeur, "ACTIVE")).isEqualTo(1);
    }

    // ── Comptes injoignables et limites ────────────────────────────────────

    @Test
    void onNEcritPlusAUnCompteSuspenduOuAnonymise() throws Exception {
        jdbc.update("UPDATE account SET statut = 'SUSPENDU' WHERE id = ?", vendeur.getId());

        envoyer(jwtAcheteur, "Allô ?").andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.message").value("Cet utilisateur n'est plus joignable."));
        mvc.perform(get("/api/messagerie/conversations/{id}", conversationId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAcheteur))
                .andExpect(jsonPath("$.ecriturePossible").value(false))
                .andExpect(jsonPath("$.ecritureImpossibleMotif").value("Cet utilisateur n'est plus joignable."));
    }

    @Test
    void lesMessagesSontLimitesParJour() throws Exception {
        jdbc.update("INSERT INTO message (signale, supprime, conversation_id, created_at, sender_id, content) "
                + "SELECT false, false, ?, NOW(), ?, 'rempli' FROM generate_series(1, 300)", conversationId, acheteur.getId());

        envoyer(jwtAcheteur, "Un de trop").andExpect(status().isTooManyRequests());
        // Le vendeur, lui, n'a rien envoyé aujourd'hui.
        envoyer(jwtVendeur, "Réponse").andExpect(status().isCreated());
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

    private BienImmo annonce() {
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-MSG-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre("Villa de Kipé");
        b.setDescription("Annonce créée par MessagerieControleTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.VILLA);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisationRepository.findById(LOC_ID).orElseGet(() -> {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Ratoma");
            loc.setQuartier("Kipé (MessagerieControleTest)");
            return localisationRepository.save(loc);
        }));
        b.setOwner(vendeur);
        b.setActif(true);
        return bienImmoRepository.save(b);
    }

    private ResultActions envoyer(String jwt, String contenu) throws Exception {
        return mvc.perform(post("/api/messagerie/conversations/{id}/messages", conversationId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("content", contenu))));
    }

    private int nombreConversations(String jwt, String etat) throws Exception {
        return mapper.readTree(mvc.perform(get("/api/messagerie/conversations").param("etat", etat)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("data").size();
    }
}
