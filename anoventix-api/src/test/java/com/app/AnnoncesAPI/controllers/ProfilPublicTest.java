package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

/** Profil public minimal d'un compte (DEC-21) : public, sans donnée de contact. */
@SpringBootTest
class ProfilPublicTest {

    private static final String LOC_ID = "loc-profil-test";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private JdbcTemplate jdbc;

    private MockMvc mvc;

    @BeforeEach
    void preparer() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
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
    void leProfilPublicNExposeNiTelephoneNiEmailNiStatutEtNeListeQueLesAnnoncesVisibles() throws Exception {
        User u = compte("aminata@example.com", TypeRole.PARTICULIER, StatutUtilisateur.ACTIF);
        u.setPrenom("Aminata");
        u.setNom("Diallo");
        u.setTelephone("+224622123456");
        u.setStatutPieceIdentite(StatutPieceIdentite.VALIDEE);
        userRepository.save(u);
        annonce(u, "Villa visible", StatutAnnonce.PUBLIEE, true);
        annonce(u, "Annonce masquée", StatutAnnonce.MASQUEE, false);
        annonce(u, "Annonce clôturée", StatutAnnonce.PUBLIEE, false);

        String json = mvc.perform(get("/api/users/{id}/profil-public", u.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prenom").value("Aminata"))
                .andExpect(jsonPath("$.initialeNom").value("D."))
                .andExpect(jsonPath("$.identiteVerifiee").value(true))
                .andExpect(jsonPath("$.membreDepuis").exists())
                .andExpect(jsonPath("$.annonces.data.length()").value(1))
                .andExpect(jsonPath("$.annonces.data[0].titre").value("Villa visible"))
                .andReturn().getResponse().getContentAsString();

        // Ni le nom complet, ni le téléphone, ni l'email, ni le statut du compte.
        assertThat(json).doesNotContain("Diallo", "622123456", "aminata@example.com", "ACTIF", "\"statut\"");
    }

    @Test
    void uneIdentiteNonVerifieeNEstPasAnnoncee() throws Exception {
        User u = compte("sans.piece@example.com", TypeRole.PARTICULIER, StatutUtilisateur.ACTIF);
        u.setPrenom("Moussa");
        userRepository.save(u);

        mvc.perform(get("/api/users/{id}/profil-public", u.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identiteVerifiee").value(false));
    }

    @Test
    void uneReponse404SertAuxComptesSuspendusDesactivesAnonymisesEtAuStaff() throws Exception {
        User suspendu = compte("suspendu@example.com", TypeRole.PARTICULIER, StatutUtilisateur.SUSPENDU);
        User inactif = compte("inactif@example.com", TypeRole.PARTICULIER, StatutUtilisateur.INACTIF);
        User anonyme = compte("supprime-abc@anonyme.invalid", TypeRole.PARTICULIER, StatutUtilisateur.ACTIF);
        User modo = compte("modo@example.com", TypeRole.MODERATEUR, StatutUtilisateur.ACTIF);
        User admin = compte("admin@example.com", TypeRole.ADMINISTRATEUR, StatutUtilisateur.ACTIF);

        for (User u : List.of(suspendu, inactif, anonyme, modo, admin)) {
            mvc.perform(get("/api/users/{id}/profil-public", u.getId())).andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/users/{id}/profil-public", UUID.randomUUID())).andExpect(status().isNotFound());
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private User compte(String email, TypeRole role, StatutUtilisateur statut) {
        User user = new User();
        user.setEmail(email);
        user.setPassword("hash");
        user.setStatut(statut);
        user.setRole(roleRepository.findByName(role).orElseThrow());
        return userRepository.save(user);
    }

    private BienImmo annonce(User owner, String titre, StatutAnnonce statut, boolean actif) {
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-PRO-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre(titre);
        b.setDescription("Annonce créée par ProfilPublicTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.VILLA);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisation());
        b.setOwner(owner);
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
            loc.setCommune("Ratoma");
            loc.setQuartier("Kipé (ProfilPublicTest)");
            return localisationRepository.save(loc);
        });
    }
}
