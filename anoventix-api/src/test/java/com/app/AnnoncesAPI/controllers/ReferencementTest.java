package com.app.AnnoncesAPI.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.StatutVerificationEntreprise;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.SeoService;

/** Référencement, bases (DEC-24) : sitemap.xml, robots.txt et aperçu de partage des agences. */
@SpringBootTest
class ReferencementTest {

    private static final String LOC_ID = "loc-seo-test";
    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private EntrepriseRepository entrepriseRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private SeoService seo;
    @Autowired private JdbcTemplate jdbc;

    private MockMvc mvc;
    private User proprietaire;

    @BeforeEach
    void preparer() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        vider();
        proprietaire = new User();
        proprietaire.setEmail("seo@example.com");
        proprietaire.setPassword("hash");
        proprietaire.setStatut(StatutUtilisateur.ACTIF);
        proprietaire.setRole(roleRepository.findByName(TypeRole.PARTICULIER).orElseThrow());
        proprietaire = userRepository.save(proprietaire);
        seo.invalider();
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
    void leSitemapListeLesAnnoncesVisiblesEtLesAgencesVerifieesSeulement() throws Exception {
        BienImmo visible = annonce("Villa de Kipé", StatutAnnonce.PUBLIEE, true);
        BienImmo masquee = annonce("Maison masquée", StatutAnnonce.MASQUEE, false);
        Entreprise verifiee = entreprise("Agence Kaloum", StatutVerificationEntreprise.VERIFIEE);
        Entreprise nonVerifiee = entreprise("Agence Inconnue", StatutVerificationEntreprise.NON_VERIFIEE);

        String xml = mvc.perform(get("/share/sitemap.xml"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(xml).contains("<urlset").contains("https://www.anoventix.com/annonce/villa-de-kipe-" + visible.getPublicId())
                .contains("<lastmod>")
                .contains("https://www.anoventix.com/entreprise-publique/" + verifiee.getId())
                .contains("https://www.anoventix.com/cgu").contains("https://www.anoventix.com/confidentialite")
                .doesNotContain(masquee.getPublicId())
                .doesNotContain(nonVerifiee.getId().toString());
    }

    @Test
    void leSitemapEstMisEnCacheUneHeure() throws Exception {
        String avant = mvc.perform(get("/share/sitemap.xml")).andReturn().getResponse().getContentAsString();
        BienImmo nouvelle = annonce("Villa neuve", StatutAnnonce.PUBLIEE, true);

        String apres = mvc.perform(get("/share/sitemap.xml")).andReturn().getResponse().getContentAsString();
        assertThat(apres).isEqualTo(avant).doesNotContain(nouvelle.getPublicId());

        seo.invalider();
        assertThat(mvc.perform(get("/share/sitemap.xml")).andReturn().getResponse().getContentAsString())
                .contains(nouvelle.getPublicId());
    }

    @Test
    void robotsExclutLesZonesPriveesEtIndiqueLeSitemap() throws Exception {
        String robots = mvc.perform(get("/share/robots.txt")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(robots).contains("Disallow: /administration/", "Disallow: /messagerie/", "Disallow: /conversation/",
                "Disallow: /api/", "Disallow: /uploads/private/", "Sitemap: https://www.anoventix.com/sitemap.xml");
    }

    @Test
    void laPageDUneAgenceAUnApercuDePartageAvecSonBadge() throws Exception {
        Entreprise agence = entreprise("Agence Kaloum", StatutVerificationEntreprise.VERIFIEE);
        annonce("Villa de Kipé", StatutAnnonce.PUBLIEE, true);
        proprietaire.setEntreprise(agence);
        userRepository.save(proprietaire);

        String html = mvc.perform(get("/share/agence/{id}", agence.getId())).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(html).contains("og:title\" content=\"Agence Kaloum\"")
                .contains("Agence vérifiée").contains("1 annonce en ligne")
                .contains("https://www.anoventix.com/entreprise-publique/" + agence.getId());
    }

    @Test
    void uneAgenceInconnueOuDesactiveeReçoitLaPageGeneriqueEn404() throws Exception {
        Entreprise desactivee = entreprise("Agence fermée", StatutVerificationEntreprise.VERIFIEE);
        desactivee.setActive(false);
        entrepriseRepository.save(desactivee);

        mvc.perform(get("/share/agence/{id}", desactivee.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/share/agence/{id}", UUID.randomUUID())).andExpect(status().isNotFound());
        mvc.perform(get("/share/agence/pas-un-identifiant")).andExpect(status().isNotFound());
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private BienImmo annonce(String titre, StatutAnnonce statut, boolean actif) {
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-SEO-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre(titre);
        b.setDescription("Annonce créée par ReferencementTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.VILLA);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisation());
        b.setOwner(proprietaire);
        b.setActif(actif);
        b.setStatutModeration(statut);
        return bienImmoRepository.save(b);
    }

    private Entreprise entreprise(String nom, StatutVerificationEntreprise statut) {
        Entreprise e = new Entreprise();
        e.setNom(nom);
        e.setStatutVerification(statut);
        return entrepriseRepository.save(e);
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
}
