package com.app.AnnoncesAPI.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.media.MediaService;

import tools.jackson.databind.ObjectMapper;

/** Purges de conservation (DEC-26) : ce qui est trop ancien disparaît, le reste est conservé. */
@SpringBootTest
class PurgeConservationTest {

    private static final String LOC_ID = "loc-purge-test";

    @Autowired private PurgeConservationService purge;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private BienImmoRepository bienImmoRepository;
    @Autowired private MediaRepository mediaRepository;
    @Autowired private LocalisationRepository localisationRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper mapper;
    @MockitoSpyBean private MediaService mediaService;

    private User proprietaire;
    private User interlocuteur;

    @BeforeEach
    void preparer() {
        for (String table : List.of("refresh_token", "email_sortant", "audit_event", "message", "conversation",
                "signalements", "avertissements", "historique_annonce", "medias", "account_favoris", "bien_immo",
                "annonce", "licence")) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
        proprietaire = compte("proprietaire.purge@example.com");
        interlocuteur = compte("interlocuteur.purge@example.com");
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

    // ── Vérification d'identité (RG-02-41) ─────────────────────────────────

    @Test
    void lesFichiersDeVerificationSontSupprimes30JoursApresLaDecisionEtLeResteEstGarde() {
        User decide = compte("decide.purge@example.com");
        User recent = compte("recent.purge@example.com");
        User enAttente = compte("attente.purge@example.com");
        jdbc.update("""
                UPDATE account SET piece_identite_url = ?, selfie_url = ?, statut_piece_identite = 'VALIDEE',
                       numero_piece_identite = 'CNI-1', date_decision_verification = ?, decision_verification_par = 'mod@x'
                WHERE id = ?""", "private/piece-identite/d/piece.jpg", "private/piece-identite/d/selfie.jpg",
                LocalDateTime.now().minusDays(31), decide.getId());
        jdbc.update("""
                UPDATE account SET piece_identite_url = ?, selfie_url = ?, statut_piece_identite = 'REJETEE',
                       date_decision_verification = ? WHERE id = ?""", "private/piece-identite/r/piece.jpg",
                "private/piece-identite/r/selfie.jpg", LocalDateTime.now().minusDays(5), recent.getId());
        jdbc.update("UPDATE account SET piece_identite_url = ?, selfie_url = ?, statut_piece_identite = 'EN_ATTENTE' WHERE id = ?",
                "private/piece-identite/a/piece.jpg", "private/piece-identite/a/selfie.jpg", enAttente.getId());

        purge.purgerFichiersVerification(LocalDateTime.now().minusDays(30));

        Map<String, Object> purge = jdbc.queryForMap(
                "SELECT piece_identite_url, selfie_url, statut_piece_identite, numero_piece_identite, "
                + "decision_verification_par FROM account WHERE id = ?", decide.getId());
        assertThat(purge.get("piece_identite_url")).isNull();
        assertThat(purge.get("selfie_url")).isNull();
        // Type, numéro, statut et auteur de la décision sont conservés.
        assertThat(purge.get("statut_piece_identite")).isEqualTo("VALIDEE");
        assertThat(purge.get("numero_piece_identite")).isEqualTo("CNI-1");
        assertThat(purge.get("decision_verification_par")).isEqualTo("mod@x");
        verify(mediaService).deletePieceIdentite("private/piece-identite/d/piece.jpg");
        verify(mediaService).deletePieceIdentite("private/piece-identite/d/selfie.jpg");
        // Décision récente ou dossier en attente : fichiers conservés.
        assertThat(jdbc.queryForObject("SELECT selfie_url FROM account WHERE id = ?", String.class, recent.getId()))
                .isNotNull();
        assertThat(jdbc.queryForObject("SELECT selfie_url FROM account WHERE id = ?", String.class, enAttente.getId()))
                .isNotNull();
    }

    // ── Annonces terminées ─────────────────────────────────────────────────

    @Test
    void lesPhotosDUneAnnonceClotureeDepuisPlusDeDouzeMoisSontSupprimees() {
        BienImmo ancienne = annonceAvecPhoto("/uploads/public/ancienne.jpg", MotifCloture.VENDU, LocalDateTime.now().minusMonths(13));
        BienImmo recente = annonceAvecPhoto("/uploads/public/recente.jpg", MotifCloture.LOUE, LocalDateTime.now().minusMonths(6));
        BienImmo enLigne = annonceAvecPhoto("/uploads/public/en-ligne.jpg", null, null);

        purge.purgerPhotos(LocalDateTime.now().minusMonths(12));

        assertThat(mediaRepository.findByAnnonceId(ancienne.getId())).isEmpty();
        assertThat(mediaRepository.findByAnnonceId(recente.getId())).hasSize(1);
        assertThat(mediaRepository.findByAnnonceId(enLigne.getId())).hasSize(1);
        verify(mediaService).deleteMediaFromDisk("/uploads/public/ancienne.jpg");
        verify(mediaService, never()).deleteMediaFromDisk("/uploads/public/recente.jpg");
        verify(mediaService, never()).deleteMediaFromDisk("/uploads/public/en-ligne.jpg");
        // L'annonce garde son texte (conversations, signalements, historique).
        assertThat(bienImmoRepository.findById(ancienne.getId())).isPresent();
    }

    @Test
    void lesPhotosDUneAnnonceSupprimeeDepuisPlusDeDouzeMoisSontSupprimees() {
        BienImmo supprimee = annonceAvecPhoto("/uploads/public/supprimee.jpg", null, null);
        jdbc.update("UPDATE annonce SET statut_moderation = 'DESACTIVEE', actif = false, date_modification = ? WHERE id = ?",
                LocalDateTime.now().minusMonths(14), supprimee.getId());

        purge.purgerPhotos(LocalDateTime.now().minusMonths(12));

        assertThat(mediaRepository.findByAnnonceId(supprimee.getId())).isEmpty();
    }

    @Test
    void uneAnnonceSansPhotoNePeutPlusEtreReactivee() throws Exception {
        BienImmo ancienne = annonceAvecPhoto("/uploads/public/ancienne.jpg", MotifCloture.RETIRE, LocalDateTime.now().minusMonths(13));
        proprietaire.setPassword(encoder.encode("Proprietaire-2026"));
        userRepository.save(proprietaire);
        MockMvc mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        String jwt = mapper.readTree(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("identifier", proprietaire.getEmail(),
                        "password", "Proprietaire-2026"))))
                .andReturn().getResponse().getContentAsString()).get("token").asString();

        purge.purgerPhotos(LocalDateTime.now().minusMonths(12));

        mvc.perform(put("/api/biens-immo/{id}/reactiver", ancienne.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void lHistoriqueDesAnnoncesTermineesDepuisPlusDeDouzeMoisEstSupprime() {
        BienImmo ancienne = annonceAvecPhoto("/uploads/public/a.jpg", MotifCloture.VENDU, LocalDateTime.now().minusMonths(13));
        BienImmo recente = annonceAvecPhoto("/uploads/public/b.jpg", MotifCloture.VENDU, LocalDateTime.now().minusMonths(2));
        historique(ancienne);
        historique(recente);

        int supprimees = purge.purgerHistorique(LocalDateTime.now().minusMonths(12));

        assertThat(supprimees).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM historique_annonce WHERE annonce_id = ?",
                Integer.class, recente.getId())).isEqualTo(1);
    }

    // ── Messagerie ─────────────────────────────────────────────────────────

    @Test
    void lesConversationsSontSupprimeesDeuxAnsApresLeDernierMessageSaufSignalement() {
        LocalDateTime maintenant = LocalDateTime.now();
        long ancienne = conversation(maintenant.minusYears(3), null, false);
        long recente = conversation(maintenant.minusMonths(3), null, false);
        long signaleeEnAttente = conversation(maintenant.minusYears(3), maintenant.minusYears(3), true);
        long signaleeRecemment = conversation(maintenant.minusYears(3), maintenant.minusMonths(6), false);
        long signaleeAnciennement = conversation(maintenant.minusYears(3), maintenant.minusYears(2), false);

        int supprimees = purge.purgerConversations(maintenant);

        assertThat(supprimees).isEqualTo(2);
        assertThat(conversationsRestantes()).containsExactlyInAnyOrder(recente, signaleeEnAttente, signaleeRecemment);
        assertThat(conversationsRestantes()).doesNotContain(ancienne, signaleeAnciennement);
        // Les messages de la conversation supprimée partent avec elle.
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM message WHERE conversation_id = ?", Integer.class, ancienne))
                .isZero();
    }

    // ── Décisions de modération et journal ─────────────────────────────────

    @Test
    void lesSignalementsTraitesDepuisTroisAnsSontSupprimesPasCeuxEnAttente() {
        signalement("TRAITE", LocalDateTime.now().minusYears(4));
        signalement("TRAITE", LocalDateTime.now().minusMonths(2));
        signalement("EN_ATTENTE", null);

        int supprimes = purge.purgerSignalements(LocalDateTime.now().minusYears(3));

        assertThat(supprimes).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM signalements", Integer.class)).isEqualTo(2);
    }

    @Test
    void lesAvertissementsDePlusDeTroisAnsSontSupprimes() {
        avertissement(LocalDateTime.now().minusYears(4));
        avertissement(LocalDateTime.now().minusMonths(5));

        int supprimes = purge.purgerAvertissements(LocalDateTime.now().minusYears(3));

        assertThat(supprimes).isEqualTo(1);
    }

    @Test
    void leJournalPerdSesAdressesIpApresQuatreVingtDixJoursEtSesLignesApresTroisAns() {
        LocalDateTime maintenant = LocalDateTime.now();
        audit(maintenant.minusDays(10), "10.0.0.1");
        audit(maintenant.minusDays(100), "10.0.0.2");
        audit(maintenant.minusYears(4), "10.0.0.3");

        purge.purgerJournal(maintenant);

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_event", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForList("SELECT adresse_ip FROM audit_event ORDER BY date DESC", String.class))
                .containsExactly("10.0.0.1", null);
    }

    @Test
    void laPurgeComplèteNeFaitRienSurUneBaseSansDonneesAnciennes() {
        annonceAvecPhoto("/uploads/public/neuve.jpg", null, null);

        purge.purger();

        verify(mediaService, never()).deleteMediaFromDisk(anyString());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM medias", Integer.class)).isEqualTo(1);
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private User compte(String email) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode("Mot-de-passe-2026"));
        user.setStatut(StatutUtilisateur.ACTIF);
        user.setRole(roleRepository.findByName(TypeRole.PARTICULIER).orElseThrow());
        return userRepository.save(user);
    }

    private BienImmo annonceAvecPhoto(String url, MotifCloture motif, LocalDateTime dateCloture) {
        Localisation loc = localisationRepository.findById(LOC_ID).orElseGet(() -> {
            Localisation l = new Localisation();
            l.setId(LOC_ID);
            l.setRegion("Conakry");
            l.setPrefecture("Conakry");
            l.setCommune("Matam");
            l.setQuartier("Taouyah (PurgeConservationTest)");
            return localisationRepository.save(l);
        });
        BienImmo b = new BienImmo();
        b.setReferenceAnnonce("VE-PURGE-" + UUID.randomUUID().toString().substring(0, 8));
        b.setTitre("Annonce de purge");
        b.setDescription("Annonce créée par PurgeConservationTest");
        b.setPrix(BigDecimal.valueOf(100_000_000));
        b.setTypeAnnonce(TypeAnnonce.VENTE);
        b.setTypeBien(TypeBien.APPARTEMENT);
        b.setTypeUsage(TypeUsage.HABITATION);
        b.setDocumentsDisponibles("Titre foncier");
        b.setLocalisation(loc);
        b.setOwner(proprietaire);
        b.setActif(motif == null);
        b.setStatutModeration(StatutAnnonce.PUBLIEE);
        b.setMotifCloture(motif);
        b.setDateCloture(dateCloture);
        b = bienImmoRepository.save(b);
        Media photo = new Media();
        photo.setUrl(url);
        photo.setAnnonce(b);
        mediaRepository.save(photo);
        return b;
    }

    private void historique(BienImmo annonce) {
        jdbc.update("INSERT INTO historique_annonce (annonce_id, date_modification, champ, modifie_par) VALUES (?, now(), 'titre', 'x')",
                annonce.getId());
    }

    /** Une annonce par conversation : une seule est permise par annonce et couple de participants. */
    private long conversation(LocalDateTime dernierMessage, LocalDateTime dateSignalement, boolean enAttente) {
        BienImmo annonce = annonceAvecPhoto("/uploads/public/" + UUID.randomUUID() + ".jpg", null, null);
        Long id = jdbc.queryForObject("""
                INSERT INTO conversation (active, annonce_id, created_at, last_message_at, updated_at,
                                          created_by_id, participant_one_id, participant_two_id)
                VALUES (true, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, annonce.getId(), dernierMessage, dernierMessage, dernierMessage,
                interlocuteur.getId(), proprietaire.getId(), interlocuteur.getId());
        jdbc.update("""
                INSERT INTO message (signale, supprime, conversation_id, created_at, sender_id, content, date_signalement)
                VALUES (?, false, ?, ?, ?, 'Bonjour', ?)
                """, enAttente, id, dernierMessage, interlocuteur.getId(), dateSignalement);
        return id;
    }

    private List<Long> conversationsRestantes() {
        return jdbc.queryForList("SELECT id FROM conversation", Long.class);
    }

    /** Une annonce par signalement : un seul est permis par annonce et signaleur. */
    private void signalement(String statut, LocalDateTime dateTraitement) {
        BienImmo annonce = annonceAvecPhoto("/uploads/public/" + UUID.randomUUID() + ".jpg", null, null);
        jdbc.update("""
                INSERT INTO signalements (annule, annonce_id, date, date_traitement, reporter_id, statut, motif)
                VALUES (false, ?, now(), ?, ?, ?, 'Autre')
                """, annonce.getId(), dateTraitement, interlocuteur.getId(), statut);
    }

    private void avertissement(LocalDateTime date) {
        jdbc.update("""
                INSERT INTO avertissements (suspendu_automatiquement, date, utilisateur_id, niveau, emit_par, motif)
                VALUES (false, ?, ?, 'LEGER', 'moderation', 'Motif')
                """, date, proprietaire.getId());
    }

    private void audit(LocalDateTime date, String ip) {
        jdbc.update("""
                INSERT INTO audit_event (date, acteur_libelle, action, cible_type, cible_id, adresse_ip)
                VALUES (?, 'mod@example.com', 'ANNONCE_MASQUEE', 'ANNONCE', '1', ?)
                """, date, ip);
    }
}
