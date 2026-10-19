package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.ArrayList;
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

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Ordre des photos d'une annonce et choix de la photo principale. */
@SpringBootTest
class OrdrePhotosTest {

    private static final String MOT_DE_PASSE = "Photos-2026";
    private static final String LOC_ID = "loc-photos-test";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "historique_annonce", "medias", "bien_immo", "annonce");

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
    private String jwtAutre;
    private BienImmo annonce;

    @BeforeEach
    void preparer() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        proprietaire = compte("proprio@example.com");
        compte("autre@example.com");
        jwtProprietaire = connexion("proprio@example.com");
        jwtAutre = connexion("autre@example.com");
        annonce = annonce();
    }

    @AfterEach
    void nettoyerApres() {
        vider();
    }

    @Test
    void lesPhotosAjouteesUneAUneSePlacentALaSuite() throws Exception {
        for (int i = 0; i < 3; i++) {
            ajouterPhoto().andExpect(status().isOk());
        }
        assertThat(jdbc.queryForList("SELECT ordre FROM medias WHERE annonce_id = ? ORDER BY id", Integer.class,
                annonce.getId())).containsExactly(1, 2, 3);
    }

    @Test
    void leProprietaireChoisitLaPhotoPrincipaleEtLOrdre() throws Exception {
        List<Long> ids = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            JsonNode a = mapper.readTree(ajouterPhoto().andReturn().getResponse().getContentAsString());
            ids.add(a.get("medias").get(i).get("id").asLong());
        }
        List<Long> nouvelOrdre = List.of(ids.get(2), ids.get(0), ids.get(1));

        ordonner(jwtAutre, nouvelOrdre).andExpect(status().isForbidden());
        ordonner(jwtProprietaire, List.of(ids.get(2), ids.get(0))).andExpect(status().isBadRequest());
        ordonner(jwtProprietaire, List.of(ids.get(2), ids.get(0), ids.get(0))).andExpect(status().isBadRequest());

        ordonner(jwtProprietaire, nouvelOrdre).andExpect(status().isOk())
                .andExpect(jsonPath("$.medias[0].id").value(ids.get(2)))
                .andExpect(jsonPath("$.medias[1].id").value(ids.get(0)))
                .andExpect(jsonPath("$.medias[2].id").value(ids.get(1)));

        // Suppression : l'ordre reste continu et la principale ne change pas.
        mvc.perform(delete("/api/biens-immo/{id}/medias/{m}", annonce.getId(), ids.get(0))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtProprietaire))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.medias[0].id").value(ids.get(2)))
                .andExpect(jsonPath("$.medias[0].ordre").value(1))
                .andExpect(jsonPath("$.medias[1].ordre").value(2));
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private ResultActions ajouterPhoto() throws Exception {
        return mvc.perform(multipart("/api/biens-immo/{id}/medias", annonce.getId())
                .file(TestPhotos.photo())
                .with(r -> { r.setMethod("PUT"); return r; })
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtProprietaire));
    }

    private ResultActions ordonner(String jwt, List<Long> ids) throws Exception {
        return mvc.perform(put("/api/biens-immo/{id}/medias/ordre", annonce.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("mediaIds", ids))));
    }

    private void vider() {
        for (String table : TABLES) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.deleteAll();
    }

    private User compte(String email) {
        User user = new User();
        user.setEmail(email);
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
        b.setReferenceAnnonce("VE-PH-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre("Appartement de test");
        b.setDescription("Annonce créée par OrdrePhotosTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.APPARTEMENT);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisation());
        b.setOwner(proprietaire);
        b.setActif(true);
        return bienImmoRepository.save(b);
    }

    private Localisation localisation() {
        return localisationRepository.findById(LOC_ID).orElseGet(() -> {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Kaloum");
            loc.setQuartier("Photos");
            return localisationRepository.save(loc);
        });
    }
}
