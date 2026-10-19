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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Quartier manquant (DEC-22) : « Autre quartier », demande d'ajout et décisions de l'administrateur. */
@SpringBootTest
class QuartierManquantTest {

    private static final String MOT_DE_PASSE = "Quartier-2026";
    private static final String LOC_ID = "loc-quartier-test";
    private static final List<String> TABLES = List.of("demande_quartier", "refresh_token", "verification_connexion",
            "code_secours", "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;

    private MockMvc mvc;
    private String jwtAnnonceur;
    private String jwtAdmin;
    private String locId;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        // Kipé fait partie du référentiel (V14) : un quartier n'existe qu'une fois par commune (ECART-45).
        locId = localisationRepository.trouverQuartier("Conakry", "Conakry", "Ratoma", "Kipé").orElseGet(() -> {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Ratoma");
            loc.setQuartier("Kipé");
            loc.setTypeCommune("Urbaine");
            return localisationRepository.save(loc);
        }).getId();
        compte("annonceur@example.com", TypeRole.PARTICULIER);
        compte("admin@example.com", TypeRole.ADMINISTRATEUR);
        jwtAnnonceur = connexion("annonceur@example.com");
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
        jdbc.execute("DELETE FROM localisation WHERE technique OR id = '" + LOC_ID + "' OR quartier LIKE 'Kipe%'");
    }

    @Test
    void uneAnnoncePeutEtrePubliqueeSurLaCommuneAvecUnQuartierSaisi() throws Exception {
        String technique = autreQuartierId();

        // Sans nom saisi, la publication sur « Autre quartier » est refusée.
        publier(technique, null).andExpect(status().isBadRequest());

        long annonceId = mapper.readTree(publier(technique, "Kipé Centre").andExpect(status().isCreated())
                // L'annonce s'affiche avec la commune seule : pas de quartier.
                .andExpect(jsonPath("$.localisation.commune").value("Ratoma"))
                .andExpect(jsonPath("$.localisation.quartier").doesNotExist())
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        assertThat(jdbc.queryForObject("SELECT nom FROM demande_quartier WHERE annonce_id = ? AND statut = 'EN_ATTENTE'",
                String.class, annonceId)).isEqualTo("Kipé Centre");
        // L'entrée technique n'est jamais proposée dans les listes de quartiers.
        mvc.perform(get("/api/localisations/commune/Ratoma")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem(technique))));
    }

    @Test
    void l_administrateurAjouteLeQuartierEtLAnnonceLuiEstRattachee() throws Exception {
        long annonceId = annonceSurAutreQuartier("Kipé Centre");
        long demandeId = demandeEnAttente();

        mvc.perform(get("/api/admin/quartiers-demandes").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].nom").value("Kipé Centre"))
                .andExpect(jsonPath("$.data[0].commune").value("Ratoma"))
                // Variante d'orthographe proposée : le quartier « Kipé » existe déjà dans la commune.
                .andExpect(jsonPath("$.data[0].quartiersProches[0].quartier").value("Kipé"));

        mvc.perform(put("/api/admin/quartiers-demandes/{id}/ajouter", demandeId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("nom", "Kipe Centre"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("AJOUTEE"));

        assertThat(jdbc.queryForObject("SELECT l.quartier FROM annonce a JOIN localisation l ON l.id = a.localisation_id WHERE a.id = ?",
                String.class, annonceId)).isEqualTo("Kipe Centre");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = 'annonceur@example.com'",
                Integer.class)).isEqualTo(1);
        // La demande est traitée une seule fois.
        mvc.perform(put("/api/admin/quartiers-demandes/{id}/ajouter", demandeId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin)).andExpect(status().isUnprocessableContent());
    }

    @Test
    void uneVarianteSeRattacheAUnQuartierExistant() throws Exception {
        long annonceId = annonceSurAutreQuartier("Kippé");
        long demandeId = demandeEnAttente();

        mvc.perform(put("/api/admin/quartiers-demandes/{id}/rattacher", demandeId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("localisationId", locId))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("RATTACHEE"));

        assertThat(jdbc.queryForObject("SELECT localisation_id FROM annonce WHERE id = ?", String.class, annonceId))
                .isEqualTo(locId);
    }

    @Test
    void unRefusExigeUnMotifEtLAnnonceResteSurLaCommune() throws Exception {
        long annonceId = annonceSurAutreQuartier("Quartier imaginaire");
        long demandeId = demandeEnAttente();

        mvc.perform(put("/api/admin/quartiers-demandes/{id}/refuser", demandeId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("motif", " "))))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/admin/quartiers-demandes/{id}/refuser", demandeId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAdmin).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("motif", "Ce quartier n'existe pas."))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.statut").value("REFUSEE"));

        assertThat(jdbc.queryForObject("SELECT l.technique FROM annonce a JOIN localisation l ON l.id = a.localisation_id WHERE a.id = ?",
                Boolean.class, annonceId)).isTrue();
    }

    @Test
    void laFileEstReserveeAL_administrateur() throws Exception {
        mvc.perform(get("/api/admin/quartiers-demandes").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAnnonceur))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/localisations/autre-quartier").param("region", "Conakry").param("prefecture", "Conakry")
                .param("commune", "Ratoma")).andExpect(status().is4xxClientError());
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private void compte(String email, TypeRole role) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode(MOT_DE_PASSE));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setStatutPieceIdentite(StatutPieceIdentite.VALIDEE);
        user.setRole(roleRepository.findByName(role).orElseThrow());
        userRepository.save(user);
    }

    private String connexion(String email) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", email, "password", MOT_DE_PASSE))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asString();
    }

    private String autreQuartierId() throws Exception {
        JsonNode loc = mapper.readTree(mvc.perform(get("/api/localisations/autre-quartier")
                .param("region", "Conakry").param("prefecture", "Conakry").param("commune", "Ratoma")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAnnonceur))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.technique").value(true))
                .andExpect(jsonPath("$.quartier").doesNotExist())
                .andReturn().getResponse().getContentAsString());
        return loc.get("id").asString();
    }

    private ResultActions publier(String localisationId, String quartierSaisi) throws Exception {
        var requete = multipart("/api/biens-immo")
                .file(TestPhotos.photo())
                .param("titre", "Appartement lumineux près de Kipé")
                .param("description", "Bel appartement de trois pièces dans un quartier calme et résidentiel")
                .param("prix", "250000000")
                .param("localisationId", localisationId)
                .param("typeAnnonce", "VENTE")
                .param("typeBien", "APPARTEMENT")
                .param("documentsDisponibles", "Titre foncier")
                .param("typeUsage", "HABITATION")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAnnonceur);
        if (quartierSaisi != null) requete.param("quartierSaisi", quartierSaisi);
        return mvc.perform(requete);
    }

    private long annonceSurAutreQuartier(String nom) throws Exception {
        return mapper.readTree(publier(autreQuartierId(), nom).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    private long demandeEnAttente() {
        return jdbc.queryForObject("SELECT id FROM demande_quartier WHERE statut = 'EN_ATTENTE' ORDER BY id DESC LIMIT 1", Long.class);
    }
}
