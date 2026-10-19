package com.app.AnnoncesAPI.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeUsage;

/**
 * La règle de visibilité publique existe en deux exemplaires : en Java
 * ({@code Annonce.estVisiblePubliquement}) pour les contrôles en mémoire, en SQL
 * (fonction annonce_est_visible, migration V15) pour les requêtes. Ces tests
 * vérifient qu'ils donnent le même résultat et que la colonne visible_public suit
 * toutes les écritures, y compris les mises à jour en masse.
 */
@SpringBootTest
class VisibiliteAnnonceTest {

    private static final String LOC_ID = "loc-visibilite-test";

    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private AnnonceRepository annonceRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private TransactionTemplate transaction;
    @Autowired private EntrepriseRepository entrepriseRepository;

    private final List<Long> annonces = new ArrayList<>();
    private final List<UUID> comptes = new ArrayList<>();
    private final List<UUID> entreprises = new ArrayList<>();

    @AfterEach
    void nettoyer() {
        annonces.forEach(bienImmoRepository::deleteById);
        comptes.forEach(userRepository::deleteById);
        entreprises.forEach(entrepriseRepository::deleteById);
    }

    @Test
    void laColonneConcordeAvecLaRegleJavaPourLeStatutDuCompteEtLEntreprise() {
        for (StatutUtilisateur statut : StatutUtilisateur.values()) {
            for (Boolean entrepriseActive : new Boolean[] { null, true, false }) {
                User owner = compte(false);
                owner.setStatut(statut);
                if (entrepriseActive != null) {
                    owner.setEntreprise(entreprise(entrepriseActive));
                }
                owner = userRepository.save(owner);
                BienImmo annonce = annonce(owner, true, StatutAnnonce.PUBLIEE);

                boolean attendu = statut == StatutUtilisateur.ACTIF && !Boolean.FALSE.equals(entrepriseActive);
                assertThat(colonne(annonce.getId()))
                        .as("statut=%s entrepriseActive=%s", statut, entrepriseActive).isEqualTo(attendu);
                // L'entreprise du propriétaire est paresseuse : la règle Java s'évalue dans une transaction.
                Long id = annonce.getId();
                boolean regleJava = Boolean.TRUE.equals(
                        transaction.execute(t -> bienImmoRepository.findById(id).orElseThrow().estVisiblePubliquement()));
                assertThat(regleJava).isEqualTo(attendu);
            }
        }
    }

    @Test
    void suitLaDesactivationDeLEntrepriseEtLeChangementDeStatutDuCompte() {
        Entreprise entreprise = entreprise(true);
        User owner = compte(false);
        owner.setEntreprise(entreprise);
        owner = userRepository.save(owner);
        BienImmo annonce = annonce(owner, true, StatutAnnonce.PUBLIEE);
        assertThat(colonne(annonce.getId())).isTrue();

        entreprise.setActive(false);
        entrepriseRepository.save(entreprise);
        assertThat(colonne(annonce.getId())).as("entreprise désactivée").isFalse();

        entreprise.setActive(true);
        entrepriseRepository.save(entreprise);
        assertThat(colonne(annonce.getId())).as("entreprise réactivée").isTrue();

        owner = userRepository.findById(owner.getId()).orElseThrow();
        owner.setStatut(StatutUtilisateur.SUSPENDU);
        userRepository.save(owner);
        assertThat(colonne(annonce.getId())).as("compte suspendu").isFalse();
    }

    private Entreprise entreprise(boolean active) {
        Entreprise e = new Entreprise();
        e.setNom("Agence test " + UUID.randomUUID().toString().substring(0, 6));
        e.setActive(active);
        e = entrepriseRepository.save(e);
        entreprises.add(e.getId());
        return e;
    }

    @Test
    void laColonneConcordeAvecLaRegleJavaPourChaqueEtat() {
        for (boolean compteMasque : new boolean[] { false, true }) {
            User owner = compte(compteMasque);
            for (boolean actif : new boolean[] { true, false }) {
                for (StatutAnnonce statut : StatutAnnonce.values()) {
                    BienImmo annonce = annonce(owner, actif, statut);

                    assertThat(colonne(annonce.getId()))
                            .as("actif=%s statut=%s compteMasque=%s", actif, statut, compteMasque)
                            .isEqualTo(annonce.estVisiblePubliquement());
                }
            }
        }
    }

    @Test
    void suitLesChangementsDeLAnnonce() {
        BienImmo annonce = annonce(compte(false), true, StatutAnnonce.PUBLIEE);
        assertThat(colonne(annonce.getId())).isTrue();

        annonce.setStatutModeration(StatutAnnonce.MASQUEE);
        annonce.setActif(false);
        bienImmoRepository.save(annonce);
        assertThat(colonne(annonce.getId())).isFalse();

        annonce = bienImmoRepository.findById(annonce.getId()).orElseThrow();
        annonce.setStatutModeration(StatutAnnonce.PUBLIEE);
        annonce.setActif(true);
        bienImmoRepository.save(annonce);
        assertThat(colonne(annonce.getId())).isTrue();
    }

    @Test
    void suitLeMasquageDuCompteProprietaire() {
        User owner = compte(false);
        BienImmo annonce = annonce(owner, true, StatutAnnonce.PUBLIEE);

        owner.setAnnoncesMasquees(true);
        userRepository.save(owner);
        assertThat(colonne(annonce.getId())).isFalse();
        assertThat(bienImmoRepository.findByVisiblePublicTrue(Pageable.unpaged()))
                .extracting(BienImmo::getId)
                .doesNotContain(annonce.getId());

        owner.setAnnoncesMasquees(false);
        userRepository.save(owner);
        assertThat(colonne(annonce.getId())).isTrue();
    }

    @Test
    void suitLesMisesAJourEnMasse() {
        User owner = compte(false);
        BienImmo annonce = annonce(owner, true, StatutAnnonce.PUBLIEE);

        transaction.executeWithoutResult(s -> annonceRepository.deactivateByOwnerId(owner.getId()));

        assertThat(colonne(annonce.getId())).isFalse();
    }

    private boolean colonne(Long annonceId) {
        return jdbc.queryForObject("SELECT visible_public FROM annonce WHERE id = ?", Boolean.class, annonceId);
    }

    private User compte(boolean annoncesMasquees) {
        User u = new User();
        u.setEmail("visi-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com");
        u.setPassword("hash");
        u.setStatut(StatutUtilisateur.ACTIF);
        u.setAnnoncesMasquees(annoncesMasquees);
        u = userRepository.save(u);
        comptes.add(u.getId());
        return u;
    }

    private BienImmo annonce(User owner, boolean actif, StatutAnnonce statut) {
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-TEST-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre("Appartement de test");
        b.setDescription("Annonce créée par VisibiliteAnnonceTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.APPARTEMENT);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(localisation());
        b.setOwner(owner);
        b.setActif(actif);
        b.setStatutModeration(statut);
        b = bienImmoRepository.save(b);
        annonces.add(b.getId());
        return b;
    }

    private Localisation localisation() {
        return localisationRepository.findById(LOC_ID).orElseGet(() -> {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Conakry");
            loc.setPrefecture("Conakry");
            loc.setCommune("Matam");
            loc.setQuartier("Taouyah (VisibiliteAnnonceTest)");
            return localisationRepository.save(loc);
        });
    }
}
