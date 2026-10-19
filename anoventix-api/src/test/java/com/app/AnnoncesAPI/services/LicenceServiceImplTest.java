package com.app.AnnoncesAPI.services;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Licence;
import com.app.AnnoncesAPI.entities.ParametrePlateforme;
import com.app.AnnoncesAPI.entities.Role;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.TypeLicence;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.exceptions.LicenceRequiseException;
import com.app.AnnoncesAPI.payload.response.LicenceResponse;
import com.app.AnnoncesAPI.enums.MoyenPaiement;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.payload.request.VenteLicenceRequest;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.LicenceRepository;
import com.app.AnnoncesAPI.repositories.ParametrePlateformeRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

/** Annonces gratuites puis licence annuelle, uniquement quand l'admin a activé le mode. */
class LicenceServiceImplTest {

    private final LicenceRepository licenceRepo = mock(LicenceRepository.class);
    private final ParametrePlateformeRepository paramRepo = mock(ParametrePlateformeRepository.class);
    private final BienImmoRepository bienRepo = mock(BienImmoRepository.class);
    private final UserRepository userRepo = mock(UserRepository.class);
    private final EmailNotificationService emails = mock(EmailNotificationService.class);
    private final AuditService audit = mock(AuditService.class);
    private LicenceServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new LicenceServiceImpl(licenceRepo, paramRepo, bienRepo, userRepo,
                mock(EntrepriseRepository.class), emails, audit);
        ReflectionTestUtils.setField(service, "annoncesGratuites", 5);
        when(licenceRepo.findFirstByOwnerIdAndDateFinIsNotNullOrderByDateFinDesc(any())).thenReturn(Optional.empty());
    }

    private static User compte(TypeRole role) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail(role.name().toLowerCase() + "@example.com");
        Role r = new Role();
        r.setName(role);
        u.setRole(r);
        return u;
    }

    private void modeActif(boolean actif) {
        when(paramRepo.findById(LicenceServiceImpl.PARAM_MODE_ACTIF))
                .thenReturn(Optional.of(new ParametrePlateforme(LicenceServiceImpl.PARAM_MODE_ACTIF, String.valueOf(actif))));
    }

    private void licenceDe(User owner, LocalDate fin) {
        Licence l = new Licence();
        l.setOwner(owner);
        l.setType(TypeLicence.PARTICULIER);
        l.setDateDebut(fin.minusYears(1).plusDays(1));
        l.setDateFin(fin);
        when(licenceRepo.findFirstByOwnerIdAndDateFinIsNotNullOrderByDateFinDesc(owner.getId())).thenReturn(Optional.of(l));
    }

    private Licence cleLibre(String cle, TypeLicence type) {
        Licence l = new Licence();
        l.setCle(cle);
        l.setType(type);
        when(licenceRepo.findByCle(cle)).thenReturn(Optional.of(l));
        return l;
    }

    // ─── Contrôle à la publication ────────────────────────────────────────────

    @Test
    void modeAbsent_publicationLibre() {
        when(paramRepo.findById(any())).thenReturn(Optional.empty());
        User u = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(50L);

        assertDoesNotThrow(() -> service.verifierPublication(u));
    }

    @Test
    void modeCoupe_publicationLibre() {
        modeActif(false);
        User u = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(50L);

        assertDoesNotThrow(() -> service.verifierPublication(u));
    }

    @Test
    void modeActif_sousLeSeuilGratuit_ok() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(4L);

        assertDoesNotThrow(() -> service.verifierPublication(u));
    }

    @Test
    void modeActif_seuilAtteintSansLicence_refuse() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(5L);

        assertThrows(LicenceRequiseException.class, () -> service.verifierPublication(u));
    }

    @Test
    void modeActif_seuilAtteintAvecLicenceValide_ok() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(5L);
        licenceDe(u, LocalDate.now());

        assertDoesNotThrow(() -> service.verifierPublication(u));
    }

    @Test
    void modeActif_licenceExpiree_refuse() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(5L);
        licenceDe(u, LocalDate.now().minusDays(1));

        assertThrows(LicenceRequiseException.class, () -> service.verifierPublication(u));
    }

    @Test
    void agent_compteurEntrepriseEtLicenceDuPro() {
        modeActif(true);
        User pro = compte(TypeRole.PROFESSIONNEL);
        User agent = compte(TypeRole.AGENT_PROFESSIONNEL);
        Entreprise e = new Entreprise();
        e.setId(UUID.randomUUID());
        e.setAnnonceurProfessionnel(pro);
        pro.setEntreprise(e);
        agent.setEntreprise(e);
        when(bienRepo.countActiveAnnoncesByEntreprise(e.getId())).thenReturn(5L);

        assertThrows(LicenceRequiseException.class, () -> service.verifierPublication(agent));

        licenceDe(pro, LocalDate.now().plusMonths(3));
        assertDoesNotThrow(() -> service.verifierPublication(agent));
        verify(bienRepo, never()).countByOwnerIdAndActifTrue(any());
    }

    // ─── Blocage du compte ────────────────────────────────────────────────────

    @Test
    void bloque_auDelaDuGratuitSansLicenceValide() {
        modeActif(true);
        User sansLicence = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(sansLicence.getId())).thenReturn(6L);
        User expire = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(expire.getId())).thenReturn(6L);
        licenceDe(expire, LocalDate.now().minusDays(1));

        assertTrue(service.estBloque(sansLicence));
        assertTrue(service.estBloque(expire));
        assertThrows(LicenceRequiseException.class, () -> service.verifierNonBloque(expire));
    }

    @Test
    void nonBloque_retourAuGratuitSousLeSeuil() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(5L);
        licenceDe(u, LocalDate.now().minusDays(1));

        assertFalse(service.estBloque(u));
        assertDoesNotThrow(() -> service.verifierNonBloque(u));
    }

    @Test
    void nonBloque_licenceValideOuModeCoupe() {
        User u = compte(TypeRole.PARTICULIER);
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(20L);

        modeActif(false);
        assertFalse(service.estBloque(u));

        modeActif(true);
        licenceDe(u, LocalDate.now());
        assertFalse(service.estBloque(u));
    }

    @Test
    void agent_bloqueQuandLaLicenceDuProExpire() {
        modeActif(true);
        User pro = compte(TypeRole.PROFESSIONNEL);
        User agent = compte(TypeRole.AGENT_PROFESSIONNEL);
        Entreprise e = new Entreprise();
        e.setId(UUID.randomUUID());
        e.setAnnonceurProfessionnel(pro);
        pro.setEntreprise(e);
        agent.setEntreprise(e);
        when(bienRepo.countActiveAnnoncesByEntreprise(e.getId())).thenReturn(8L);
        licenceDe(pro, LocalDate.now().minusDays(1));

        assertTrue(service.estBloque(agent));
        assertTrue(service.estBloque(pro));
    }

    @Test
    void moderateur_jamaisBloque() {
        modeActif(true);
        User modo = compte(TypeRole.MODERATEUR);
        when(bienRepo.countByOwnerIdAndActifTrue(modo.getId())).thenReturn(20L);

        assertFalse(service.estBloque(modo));
    }

    // ─── Activation ───────────────────────────────────────────────────────────

    /** Mode activé, mais la date d'effet est dans le futur : préavis de 30 jours (DEC-18). */
    private void modeEnPreavis(LocalDate effet) {
        modeActif(true);
        when(paramRepo.findById(LicenceServiceImpl.PARAM_DATE_EFFET))
                .thenReturn(Optional.of(new ParametrePlateforme(LicenceServiceImpl.PARAM_DATE_EFFET, effet.toString())));
    }

    @Test
    void activation_modeCoupe_cleEnAttenteDeDemarrage() {
        modeActif(false);
        User u = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(u.getId())).thenReturn(Optional.of(u));
        Licence l = cleLibre("ANX-AAAA-BBBB-CCCC", TypeLicence.PARTICULIER);

        service.activer(u.getId(), "ANX-AAAA-BBBB-CCCC");

        assertEquals(u, l.getOwner());
        assertEquals(null, l.getDateDebut());
        assertEquals(null, l.getDateFin());
        verify(licenceRepo).save(l);
    }

    @Test
    void activation_pendantLePreavis_cleEnAttenteEtPublicationLibre() {
        modeEnPreavis(LocalDate.now().plusDays(10));
        User u = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(u.getId())).thenReturn(Optional.of(u));
        when(bienRepo.countByOwnerIdAndActifTrue(u.getId())).thenReturn(50L);
        Licence l = cleLibre("ANX-AAAA-BBBB-CCCC", TypeLicence.PARTICULIER);

        service.activer(u.getId(), "ANX-AAAA-BBBB-CCCC");

        assertEquals(null, l.getDateFin());
        // Préavis : aucune limite avant la date d'effet, aucun blocage.
        assertDoesNotThrow(() -> service.verifierPublication(u));
        assertFalse(service.estBloque(u));
    }

    @Test
    void lesClesEnAttenteDemarrentLeJourDeLEffetEtSEnchainent() {
        modeEnPreavis(LocalDate.now());
        User u = compte(TypeRole.PARTICULIER);
        Licence premiere = new Licence();
        premiere.setOwner(u);
        premiere.setType(TypeLicence.PARTICULIER);
        Licence seconde = new Licence();
        seconde.setOwner(u);
        seconde.setType(TypeLicence.PARTICULIER);
        when(licenceRepo.findByOwnerIsNotNullAndDateFinIsNullOrderByDateActivationAsc())
                .thenReturn(java.util.List.of(premiere, seconde));

        assertEquals(2, service.demarrerLicencesEnAttente());

        assertEquals(LocalDate.now(), premiere.getDateDebut());
        assertEquals(LocalDate.now().plusYears(1).minusDays(1), premiere.getDateFin());
        assertEquals(premiere.getDateFin().plusDays(1), seconde.getDateDebut());
    }

    @Test
    void lesClesEnAttenteNeDemarrentPasAvantLaDateDEffet() {
        modeEnPreavis(LocalDate.now().plusDays(3));
        Licence l = new Licence();
        l.setOwner(compte(TypeRole.PARTICULIER));
        when(licenceRepo.findByOwnerIsNotNullAndDateFinIsNullOrderByDateActivationAsc()).thenReturn(java.util.List.of(l));

        assertEquals(0, service.demarrerLicencesEnAttente());
        assertEquals(null, l.getDateFin());
    }

    @Test
    void activation_cleNominative_refuseeAUnAutreCompte() {
        modeActif(true);
        User acheteur = compte(TypeRole.PARTICULIER);
        User autre = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(autre.getId())).thenReturn(Optional.of(autre));
        cleLibre("ANX-AAAA-BBBB-CCCC", TypeLicence.PARTICULIER).setAcheteur(acheteur);

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> service.activer(autre.getId(), "ANX-AAAA-BBBB-CCCC"));
        assertEquals("Cette clé est réservée à un autre compte.", e.getMessage());
        verify(licenceRepo, never()).save(any());
    }

    @Test
    void activation_cleNominative_accepteePourLAcheteur() {
        modeActif(true);
        User acheteur = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(acheteur.getId())).thenReturn(Optional.of(acheteur));
        Licence l = cleLibre("ANX-AAAA-BBBB-CCCC", TypeLicence.PARTICULIER);
        l.setAcheteur(acheteur);

        service.activer(acheteur.getId(), "ANX-AAAA-BBBB-CCCC");

        assertEquals(acheteur, l.getOwner());
    }

    @Test
    void activation_unAnAPartirDAujourdhui() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(u.getId())).thenReturn(Optional.of(u));
        Licence l = cleLibre("ANX-AAAA-BBBB-CCCC", TypeLicence.PARTICULIER);

        service.activer(u.getId(), " anx-aaaa-bbbb-cccc ");

        assertEquals(u, l.getOwner());
        assertEquals(LocalDate.now(), l.getDateDebut());
        assertEquals(LocalDate.now().plusYears(1).minusDays(1), l.getDateFin());
    }

    @Test
    void activation_renouvellementProlongeDepuisLaFinEnCours() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(u.getId())).thenReturn(Optional.of(u));
        LocalDate finActuelle = LocalDate.now().plusMonths(2);
        licenceDe(u, finActuelle);
        Licence l = cleLibre("ANX-AAAA-BBBB-CCCC", TypeLicence.PARTICULIER);

        service.activer(u.getId(), "ANX-AAAA-BBBB-CCCC");

        assertEquals(finActuelle.plusDays(1), l.getDateDebut());
        assertEquals(finActuelle.plusYears(1), l.getDateFin());
    }

    @Test
    void activation_cleDejaUtilisee_refusee() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(u.getId())).thenReturn(Optional.of(u));
        cleLibre("ANX-AAAA-BBBB-CCCC", TypeLicence.PARTICULIER).setOwner(compte(TypeRole.PARTICULIER));

        assertThrows(IllegalStateException.class, () -> service.activer(u.getId(), "ANX-AAAA-BBBB-CCCC"));
    }

    @Test
    void activation_typeIncompatible_refusee() {
        modeActif(true);
        User u = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(u.getId())).thenReturn(Optional.of(u));
        cleLibre("ANX-AAAA-BBBB-CCCC", TypeLicence.PROFESSIONNEL);

        assertThrows(IllegalStateException.class, () -> service.activer(u.getId(), "ANX-AAAA-BBBB-CCCC"));
        verify(licenceRepo, never()).save(any());
    }

    // ─── Lecture / génération ─────────────────────────────────────────────────

    @Test
    void agent_voitLaLicenceDuProEnPartage() {
        modeActif(true);
        User pro = compte(TypeRole.PROFESSIONNEL);
        User agent = compte(TypeRole.AGENT_PROFESSIONNEL);
        Entreprise e = new Entreprise();
        e.setAnnonceurProfessionnel(pro);
        agent.setEntreprise(e);
        when(userRepo.findById(agent.getId())).thenReturn(Optional.of(agent));
        licenceDe(pro, LocalDate.now().plusDays(10));

        LicenceResponse r = service.getMaLicence(agent.getId());

        assertEquals("ACTIVE", r.getStatut());
        assertEquals(pro.getEmail(), r.getCompteOwner());
        assertTrue(r.isPartage());
    }

    private VenteLicenceRequest vente(String acheteur, MoyenPaiement moyen, String reference) {
        VenteLicenceRequest v = new VenteLicenceRequest();
        v.setAcheteur(acheteur);
        v.setMontant(150_000L);
        v.setMoyenPaiement(moyen);
        v.setReferencePaiement(reference);
        return v;
    }

    private User acheteurActif(TypeRole role) {
        User u = compte(role);
        u.setStatut(StatutUtilisateur.ACTIF);
        when(userRepo.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
        return u;
    }

    @Test
    void vente_cleNominativeAuBonFormat_traceEtRecu() {
        when(licenceRepo.findByCle(any())).thenReturn(Optional.empty());
        when(licenceRepo.save(any(Licence.class))).thenAnswer(i -> i.getArgument(0));
        User pro = acheteurActif(TypeRole.PROFESSIONNEL);

        var reponse = service.vendre("admin@anoventix.test", vente(pro.getEmail(), MoyenPaiement.ORANGE_MONEY, "OM-123"));

        assertTrue(reponse.getCle().matches("ANX-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}"), reponse.getCle());
        // Le type découle du rôle de l'acheteur ; la vente est tracée.
        assertEquals(TypeLicence.PROFESSIONNEL, reponse.getType());
        assertEquals(pro.getEmail(), reponse.getAcheteurEmail());
        assertEquals("admin@anoventix.test", reponse.getGenerePar());
        assertEquals(150_000L, reponse.getMontant());
        assertEquals("OM-123", reponse.getReferencePaiement());
        // Reçu : la clé est un secret.
        verify(emails).notifierSensible(org.mockito.ArgumentMatchers.eq(pro), any(), any(),
                org.mockito.ArgumentMatchers.contains(reponse.getCle()));
    }

    @Test
    void vente_referenceObligatoireSaufEspeces() {
        when(licenceRepo.findByCle(any())).thenReturn(Optional.empty());
        when(licenceRepo.save(any(Licence.class))).thenAnswer(i -> i.getArgument(0));
        User u = acheteurActif(TypeRole.PARTICULIER);

        assertThrows(IllegalArgumentException.class,
                () -> service.vendre("admin", vente(u.getEmail(), MoyenPaiement.MTN_MOMO, "  ")));
        assertDoesNotThrow(() -> service.vendre("admin", vente(u.getEmail(), MoyenPaiement.ESPECES, null)));
    }

    @Test
    void vente_refuseePourUnCompteQuiNePeutPasAcheter() {
        User modo = acheteurActif(TypeRole.MODERATEUR);

        assertThrows(IllegalArgumentException.class,
                () -> service.vendre("admin", vente(modo.getEmail(), MoyenPaiement.ESPECES, null)));
    }

    @Test
    void affecterAcheteur_surUneCleAuPorteurSeulement() {
        User u = acheteurActif(TypeRole.PARTICULIER);
        Licence libre = new Licence();
        libre.setType(TypeLicence.PARTICULIER);
        libre.setCle("ANX-AAAA-BBBB-CCCC");
        when(licenceRepo.findById(1L)).thenReturn(Optional.of(libre));
        when(licenceRepo.save(any(Licence.class))).thenAnswer(i -> i.getArgument(0));

        service.affecterAcheteur("admin", 1L, vente(u.getEmail(), MoyenPaiement.ESPECES, null));

        assertEquals(u, libre.getAcheteur());
        assertThrows(IllegalStateException.class,
                () -> service.affecterAcheteur("admin", 1L, vente(u.getEmail(), MoyenPaiement.ESPECES, null)));
    }

    @Test
    void activerLeModeFixeUnPreavisDe30JoursEtPrevientLesComptesAuDela() {
        when(paramRepo.findById(LicenceServiceImpl.PARAM_MODE_ACTIF)).thenReturn(Optional.empty());
        User u = acheteurActif(TypeRole.PARTICULIER);
        when(bienRepo.proprietairesAuDela(5L)).thenReturn(java.util.List.<Object[]>of(new Object[] { u.getId(), 7L }));
        when(userRepo.findById(u.getId())).thenReturn(Optional.of(u));

        service.setModeActif(true);

        verify(paramRepo).save(new ParametrePlateforme(LicenceServiceImpl.PARAM_DATE_EFFET,
                LocalDate.now().plusDays(30).toString()));
        verify(emails).notifier(org.mockito.ArgumentMatchers.eq(u), any(),  any(),
                org.mockito.ArgumentMatchers.contains(LocalDate.now().plusDays(30)
                        .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
    }

    @Test
    void desactiverLeModeEstImmediatEtEffaceLaDateDEffet() {
        service.setModeActif(false);

        verify(paramRepo).deleteById(LicenceServiceImpl.PARAM_DATE_EFFET);
    }
}
