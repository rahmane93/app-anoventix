package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
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
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
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

/** Cycle de modération d'une annonce : réexamen (DEC-09), rejet définitif (DEC-10), masquage automatique (DEC-11). */
@SpringBootTest
class ModerationAnnonceTest {

    private static final String MOT_DE_PASSE = "Moderation-2026";
    private static final String LOC_ID = "loc-moderation-test";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
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
    private User proprietaire;
    private String jwtProprietaire;
    private String jwtAdmin;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        proprietaire = compte("proprio@example.com", TypeRole.PARTICULIER);
        compte("admin@example.com", TypeRole.ADMINISTRATEUR);
        jwtProprietaire = connexion("proprio@example.com");
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

    // ── Masquage automatique (DEC-11) ──────────────────────────────────────

    @Test
    void troisSignalementsArnaqueDeSignaleursDistinctsMasquentLAnnonce() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.PUBLIEE, true);

        signaler(annonce, "arnaque1@example.com", "ARNAQUE_FRAUDE");
        signaler(annonce, "arnaque2@example.com", "ARNAQUE_FRAUDE");
        assertThat(recharger(annonce).getStatutModeration()).isEqualTo(StatutAnnonce.PUBLIEE);

        signaler(annonce, "arnaque3@example.com", "ARNAQUE_FRAUDE");

        BienImmo masquee = recharger(annonce);
        assertThat(masquee.getStatutModeration()).isEqualTo(StatutAnnonce.MASQUEE);
        assertThat(masquee.getActif()).isFalse();
        assertThat(masquee.isMasquageAutomatique()).isTrue();
        assertThat(masquee.getMotifModeration()).contains("Masquée automatiquement");
        assertThat(jdbc.queryForObject("SELECT visible_public FROM annonce WHERE id = ?", Boolean.class, annonce.getId()))
                .isFalse();
        // Les signalements restent à traiter, l'historique et l'audit disent « Système ».
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM signalements WHERE statut = 'EN_ATTENTE'", Integer.class))
                .isEqualTo(3);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM historique_annonce WHERE annonce_id = ? AND modifie_par = 'Système'",
                Integer.class, annonce.getId())).isEqualTo(2);
        assertThat(jdbc.queryForObject(
                "SELECT acteur_libelle FROM audit_event WHERE action = 'ANNONCE_MASQUEE_AUTOMATIQUEMENT'", String.class))
                .isEqualTo("Système");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = ?", Integer.class,
                "proprio@example.com")).isEqualTo(1);
    }

    @Test
    void lesAutresMotifsNeCompterntPasPourLeMasquageAutomatique() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.PUBLIEE, true);

        signaler(annonce, "a@example.com", "ARNAQUE_FRAUDE");
        signaler(annonce, "b@example.com", "ARNAQUE_FRAUDE");
        signaler(annonce, "c@example.com", "CONTENU_INAPPROPRIE");
        signaler(annonce, "d@example.com", "AUTRE");

        assertThat(recharger(annonce).getStatutModeration()).isEqualTo(StatutAnnonce.PUBLIEE);
    }

    @Test
    void unSignalementRetireNeCompteplus() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.PUBLIEE, true);
        signaler(annonce, "a@example.com", "ARNAQUE_FRAUDE");
        signaler(annonce, "b@example.com", "ARNAQUE_FRAUDE");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .delete("/api/biens-immo/{id}/signaler", annonce.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + connexion("b@example.com")))
                .andExpect(status().isNoContent());

        signaler(annonce, "c@example.com", "ARNAQUE_FRAUDE");

        assertThat(recharger(annonce).getStatutModeration()).isEqualTo(StatutAnnonce.PUBLIEE);
    }

    @Test
    void laRemiseEnLigneClotLesSignalementsEtLesAnciensNeRemasquentPas() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.PUBLIEE, true);
        signaler(annonce, "a@example.com", "ARNAQUE_FRAUDE");
        signaler(annonce, "b@example.com", "ARNAQUE_FRAUDE");
        signaler(annonce, "c@example.com", "ARNAQUE_FRAUDE");
        assertThat(recharger(annonce).getStatutModeration()).isEqualTo(StatutAnnonce.MASQUEE);

        mvc.perform(put("/api/admin/annonces/{id}/publier", annonce.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk());

        BienImmo enLigne = recharger(annonce);
        assertThat(enLigne.getStatutModeration()).isEqualTo(StatutAnnonce.PUBLIEE);
        assertThat(enLigne.isMasquageAutomatique()).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM signalements WHERE statut = 'IGNORE'", Integer.class))
                .isEqualTo(3);

        // Un quatrième signalement ne repart pas de zéro avec les anciens : il en faut trois nouveaux.
        signaler(annonce, "d@example.com", "ARNAQUE_FRAUDE");
        assertThat(recharger(annonce).getStatutModeration()).isEqualTo(StatutAnnonce.PUBLIEE);
    }

    // ── Correction et réexamen (DEC-09) ────────────────────────────────────

    @Test
    void leProprietairePeutCorrigerUneAnnonceMasqueeMaisPasUneAnnonceRejetee() throws Exception {
        BienImmo masquee = annonce(StatutAnnonce.MASQUEE, false);
        BienImmo rejetee = annonce(StatutAnnonce.REJETEE, false);

        modifier(masquee, "Titre corrigé après masquage").andExpect(status().isOk())
                .andExpect(jsonPath("$.titre").value("Titre corrigé après masquage"))
                .andExpect(jsonPath("$.statutModeration").value("MASQUEE"));
        modifier(rejetee, "Titre corrigé après rejet").andExpect(status().isNotFound());

        // L'annonce corrigée reste invisible du public.
        assertThat(jdbc.queryForObject("SELECT visible_public FROM annonce WHERE id = ?", Boolean.class, masquee.getId()))
                .isFalse();
    }

    @Test
    void demandeDeReexamenPuisRemiseEnLigne() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.MASQUEE, false);

        reexamen(annonce, "J'ai retiré le numéro de téléphone de la description.").andExpect(status().isCreated());

        BienImmo demandee = recharger(annonce);
        assertThat(demandee.isReexamenDemande()).isTrue();
        assertThat(demandee.getNbReexamens()).isEqualTo(1);
        assertThat(demandee.getMessageReexamen()).contains("retiré");

        // Une seule demande en cours.
        reexamen(annonce, null).andExpect(status().isConflict());

        mvc.perform(get("/api/admin/reexamens").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(annonce.getId()))
                .andExpect(jsonPath("$.data[0].reexamenDemande").value(true));

        mvc.perform(put("/api/admin/annonces/{id}/publier", annonce.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk());

        BienImmo enLigne = recharger(annonce);
        assertThat(enLigne.getStatutModeration()).isEqualTo(StatutAnnonce.PUBLIEE);
        assertThat(enLigne.isReexamenDemande()).isFalse();
        assertThat(enLigne.getActif()).isTrue();
        mvc.perform(get("/api/admin/reexamens").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void maintenirLeMasquageLaisseLAnnonceCorrigeableEtPermetUneNouvelleDemande() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.MASQUEE, false);
        reexamen(annonce, null).andExpect(status().isCreated());

        mvc.perform(put("/api/admin/annonces/{id}/masquer", annonce.getId())
                .param("raison", "Les photos ne correspondent pas au bien.")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk());

        BienImmo maintenue = recharger(annonce);
        assertThat(maintenue.getStatutModeration()).isEqualTo(StatutAnnonce.MASQUEE);
        assertThat(maintenue.isReexamenDemande()).isFalse();
        assertThat(maintenue.getMotifModeration()).contains("photos");
        modifier(maintenue, "Photos remplacées").andExpect(status().isOk());
        reexamen(annonce, null).andExpect(status().isCreated());
        assertThat(recharger(annonce).getNbReexamens()).isEqualTo(2);
    }

    @Test
    void troisDemandesAuPlusParAnnonce() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.MASQUEE, false);
        for (int i = 0; i < 3; i++) {
            reexamen(annonce, null).andExpect(status().isCreated());
            mvc.perform(put("/api/admin/annonces/{id}/masquer", annonce.getId())
                    .param("raison", "Toujours non conforme.")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                    .andExpect(status().isOk());
        }

        reexamen(annonce, null).andExpect(status().isConflict());
    }

    @Test
    void seulLeProprietairePeutDemanderUnReexamenEtSeulementSurUneAnnonceMasquee() throws Exception {
        BienImmo masquee = annonce(StatutAnnonce.MASQUEE, false);
        BienImmo enLigne = annonce(StatutAnnonce.PUBLIEE, true);
        BienImmo rejetee = annonce(StatutAnnonce.REJETEE, false);
        compte("autre@example.com", TypeRole.PARTICULIER);

        mvc.perform(post("/api/biens-immo/{id}/reexamen", masquee.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + connexion("autre@example.com")))
                .andExpect(status().isForbidden());
        reexamen(enLigne, null).andExpect(status().isConflict());
        reexamen(rejetee, null).andExpect(status().isConflict());
    }

    // ── Rejet définitif (DEC-10) ───────────────────────────────────────────

    @Test
    void uneAnnonceRejeteeNePeutPlusEtreRemiseEnLigne() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.PUBLIEE, true);

        mvc.perform(put("/api/admin/annonces/{id}/rejeter", annonce.getId())
                .param("raison", "Annonce frauduleuse.")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk());
        mvc.perform(put("/api/admin/annonces/{id}/publier", annonce.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLIT"));

        assertThat(recharger(annonce).getStatutModeration()).isEqualTo(StatutAnnonce.REJETEE);
    }

    // ── Décision sur un signalement (ECART-26) ─────────────────────────────

    @Test
    void laDecisionMasqueLAnnonceEtClotTousSesSignalementsEnUneFois() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.PUBLIEE, true);
        signaler(annonce, "a@example.com", "CONTENU_INAPPROPRIE");
        signaler(annonce, "b@example.com", "AUTRE");
        Long signalementId = jdbc.queryForObject("SELECT MIN(id) FROM signalements", Long.class);

        mvc.perform(put("/api/admin/signalements/{id}/decision", signalementId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("decision", "MASQUER", "motif", "Contenu non conforme."))))
                .andExpect(status().isOk());

        assertThat(recharger(annonce).getStatutModeration()).isEqualTo(StatutAnnonce.MASQUEE);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM signalements WHERE statut = 'TRAITE'", Integer.class))
                .isEqualTo(2);
    }

    @Test
    void masquerSansMotifEstRefuseEtNeChangeRien() throws Exception {
        BienImmo annonce = annonce(StatutAnnonce.PUBLIEE, true);
        signaler(annonce, "a@example.com", "AUTRE");
        Long signalementId = jdbc.queryForObject("SELECT MIN(id) FROM signalements", Long.class);

        mvc.perform(put("/api/admin/signalements/{id}/decision", signalementId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("decision", "MASQUER"))))
                .andExpect(status().isBadRequest());

        assertThat(recharger(annonce).getStatutModeration()).isEqualTo(StatutAnnonce.PUBLIEE);
        assertThat(jdbc.queryForObject("SELECT statut FROM signalements WHERE id = ?", String.class, signalementId))
                .isEqualTo("EN_ATTENTE");
    }

    @Test
    void lesSignalementsDUneAnnonceMasqueeAutomatiquementPassentEnTeteDeFile() throws Exception {
        BienImmo ordinaire = annonce(StatutAnnonce.PUBLIEE, true);
        BienImmo suspecte = annonce(StatutAnnonce.PUBLIEE, true);
        signaler(suspecte, "a@example.com", "ARNAQUE_FRAUDE");
        signaler(suspecte, "b@example.com", "ARNAQUE_FRAUDE");
        signaler(suspecte, "c@example.com", "ARNAQUE_FRAUDE");
        signaler(ordinaire, "d@example.com", "AUTRE");

        mvc.perform(get("/api/admin/signalements").param("statut", "EN_ATTENTE")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].annonceId").value(suspecte.getId()))
                .andExpect(jsonPath("$.data[0].annonceMasqueeAutomatiquement").value(true))
                .andExpect(jsonPath("$.data[3].annonceId").value(ordinaire.getId()));
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

    private BienImmo annonce(StatutAnnonce statut, boolean actif) {
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-MOD-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre("Appartement de test");
        b.setDescription("Annonce créée par ModerationAnnonceTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.APPARTEMENT);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisation());
        b.setOwner(proprietaire);
        b.setActif(actif);
        b.setStatutModeration(statut);
        return bienImmoRepository.save(b);
    }

    private Localisation localisation() {
        return localisationRepository.findById(LOC_ID).orElseGet(() -> {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Matam");
            loc.setQuartier("Taouyah (ModerationAnnonceTest)");
            return localisationRepository.save(loc);
        });
    }

    private BienImmo recharger(BienImmo annonce) {
        return bienImmoRepository.findById(annonce.getId()).orElseThrow();
    }

    /** Le signaleur est créé au besoin. */
    private void signaler(BienImmo annonce, String emailSignaleur, String motif) throws Exception {
        if (userRepository.findByEmail(emailSignaleur).isEmpty()) {
            compte(emailSignaleur, TypeRole.PARTICULIER);
        }
        mvc.perform(post("/api/biens-immo/{id}/signaler", annonce.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + connexion(emailSignaleur))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("motif", motif))))
                .andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.ResultActions modifier(BienImmo annonce, String titre) throws Exception {
        return mvc.perform(put("/api/biens-immo/{id}", annonce.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtProprietaire)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                        "titre", titre,
                        "description", "Description corrigée, suffisamment longue pour être valide",
                        "prix", 120000000,
                        "localisationId", LOC_ID,
                        "typeAnnonce", "VENTE",
                        "typeBien", "APPARTEMENT",
                        "typeUsage", "HABITATION",
                        "documentsDisponibles", "Titre foncier"))));
    }

    private org.springframework.test.web.servlet.ResultActions reexamen(BienImmo annonce, String message) throws Exception {
        var requete = post("/api/biens-immo/{id}/reexamen", annonce.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtProprietaire);
        if (message != null) {
            requete.contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(Map.of("message", message)));
        }
        return mvc.perform(requete);
    }
}
