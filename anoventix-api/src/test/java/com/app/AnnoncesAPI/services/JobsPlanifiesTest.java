package com.app.AnnoncesAPI.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.media.MediaService;

/**
 * Tests unitaires des jobs planifiés : expiration des annonces et anonymisation RGPD.
 */
class JobsPlanifiesTest {

    // ─── Expiration des annonces ─────────────────────────────────────────────

    private AnnonceExpirationService expirationService(BienImmoRepository repo, EmailNotificationService notif) {
        AnnonceExpirationService service = new AnnonceExpirationService(repo, notif);
        ReflectionTestUtils.setField(service, "dureeValiditeJours", 180);
        ReflectionTestUtils.setField(service, "relanceJoursAvant", 7);
        return service;
    }

    private static BienImmo annonce(LocalDateTime expiration) {
        BienImmo b = new BienImmo();
        b.setTitre("Villa");
        b.setReferenceAnnonce("VE-0101-ABCD");
        b.setActif(true);
        b.setDateExpiration(expiration);
        User proprietaire = new User();
        proprietaire.setStatut(StatutUtilisateur.ACTIF);
        b.setOwner(proprietaire);
        return b;
    }

    @Test
    void prolonger_fixeUneEcheanceA180JoursEtReinitialiseLaRelance() {
        AnnonceExpirationService service = expirationService(mock(BienImmoRepository.class),
                mock(EmailNotificationService.class));
        BienImmo b = annonce(null);
        b.setRelanceExpirationEnvoyee(true);

        service.prolonger(b);

        assertNotNull(b.getDateExpiration());
        assertTrue(b.getDateExpiration().isAfter(LocalDateTime.now().plusDays(179)));
        assertFalse(b.isRelanceExpirationEnvoyee());
    }

    @Test
    void cloturerExpirees_clotureAvecMotifExpireeEtNotifie() {
        BienImmoRepository repo = mock(BienImmoRepository.class);
        EmailNotificationService notif = mock(EmailNotificationService.class);
        LocalDateTime maintenant = LocalDateTime.now();
        BienImmo expiree = annonce(maintenant.minusDays(1));
        when(repo.findByActifTrueAndDateExpirationBefore(maintenant)).thenReturn(List.of(expiree));

        expirationService(repo, notif).cloturerExpirees(maintenant);

        assertFalse(expiree.getActif());
        assertEquals(MotifCloture.EXPIREE, expiree.getMotifCloture());
        assertEquals(maintenant, expiree.getDateCloture());
        verify(notif).notifier(eq(expiree.getOwner()), anyString(), anyString(), anyString());
    }

    @Test
    void relancer_marqueLAnnonceCommeRelancee() {
        BienImmoRepository repo = mock(BienImmoRepository.class);
        EmailNotificationService notif = mock(EmailNotificationService.class);
        LocalDateTime maintenant = LocalDateTime.now();
        BienImmo bientot = annonce(maintenant.plusDays(3));
        when(repo.findByActifTrueAndStatutModerationAndRelanceExpirationEnvoyeeFalseAndDateExpirationBetween(
                any(), eq(maintenant), eq(maintenant.plusDays(7)))).thenReturn(List.of(bientot));

        expirationService(repo, notif).relancer(maintenant);

        assertTrue(bientot.isRelanceExpirationEnvoyee());
        verify(notif).notifier(eq(bientot.getOwner()), anyString(), anyString(), anyString());
    }

    @Test
    void relancer_ignoreLesComptesMasquesParLAdministrateur() {
        BienImmoRepository repo = mock(BienImmoRepository.class);
        EmailNotificationService notif = mock(EmailNotificationService.class);
        LocalDateTime maintenant = LocalDateTime.now();
        BienImmo bientot = annonce(maintenant.plusDays(3));
        bientot.getOwner().setAnnoncesMasquees(true);
        when(repo.findByActifTrueAndStatutModerationAndRelanceExpirationEnvoyeeFalseAndDateExpirationBetween(
                any(), eq(maintenant), eq(maintenant.plusDays(7)))).thenReturn(List.of(bientot));

        expirationService(repo, notif).relancer(maintenant);

        // Pas de relance maintenant ; elle partira si le masquage est levé avant l'échéance.
        assertFalse(bientot.isRelanceExpirationEnvoyee());
        verify(notif, never()).notifier(any(), anyString(), anyString(), anyString());
    }

    // ─── Anonymisation RGPD ──────────────────────────────────────────────────

    private CompteSuppressionService suppressionService(UserRepository userRepo, MediaService media) {
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("hash");
        return new CompteSuppressionService(userRepo, mock(AnnonceRepository.class),
                mock(EntrepriseRepository.class), mock(MediaRepository.class), media, encoder,
                mock(SessionService.class));
    }

    private static User compteSupprime(StatutUtilisateur statut) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail("ancien@example.com");
        u.setNom("Diallo");
        u.setPrenom("Mamadou");
        u.setTelephone("+224620000000");
        u.setPhotoProfil("/uploads/public/x/photo.jpg");
        u.setPieceIdentiteUrl("private/piece-identite/x/piece.jpg");
        u.setNumeroPieceIdentite("GN-1");
        u.setStatut(statut);
        u.setDateSuppressionDemandee(LocalDateTime.now().minusDays(31));
        return u;
    }

    @Test
    void anonymiserComptesExpires_effaceLesDonneesPersonnelles() {
        UserRepository userRepo = mock(UserRepository.class);
        MediaService media = mock(MediaService.class);
        User u = compteSupprime(StatutUtilisateur.INACTIF);
        when(userRepo.findByDateSuppressionDemandeeBefore(any())).thenReturn(List.of(u));

        suppressionService(userRepo, media).anonymiserComptesExpires();

        assertTrue(u.getEmail().endsWith("@anonyme.invalid"));
        assertTrue(u.getEmail().length() <= 50);
        assertNull(u.getTelephone());
        assertNull(u.getNumeroPieceIdentite());
        assertNull(u.getPieceIdentiteUrl());
        assertNull(u.getDateSuppressionDemandee());
        assertEquals(CompteSuppressionService.MOTIF_ANONYMISE, u.getMotifStatut());
        verify(media).deleteMediaFromDisk("/uploads/public/x/photo.jpg");
        verify(media).deletePieceIdentite("private/piece-identite/x/piece.jpg");
    }

    // à l'échéance, un professionnel emporte ses agents et son entreprise, comme lors
    // d'une suppression par un administrateur.
    @Test
    void anonymiserComptesExpires_unProfessionnelEmporteSesAgentsEtSonEntreprise() {
        UserRepository userRepo = mock(UserRepository.class);
        EntrepriseRepository entrepriseRepo = mock(EntrepriseRepository.class);
        MediaService media = mock(MediaService.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("hash");
        CompteSuppressionService service = new CompteSuppressionService(userRepo, mock(AnnonceRepository.class),
                entrepriseRepo, mock(MediaRepository.class), media, encoder, mock(SessionService.class));

        User pro = compteSupprime(StatutUtilisateur.INACTIF);
        User agent = compteSupprime(StatutUtilisateur.INACTIF);
        agent.setEmail("agent@example.com");
        agent.setTelephone("+224620000001");
        agent.setDateSuppressionDemandee(null);
        agent.setPhotoProfil("/uploads/public/agent/photo.jpg");
        com.app.AnnoncesAPI.entities.Entreprise entreprise = new com.app.AnnoncesAPI.entities.Entreprise();
        entreprise.setId(UUID.randomUUID());
        entreprise.setNom("Agence Kaloum");
        entreprise.setTelephone("+224621000000");
        entreprise.setPhotoProfil("/uploads/public/entreprise/logo.jpg");
        when(userRepo.findByDateSuppressionDemandeeBefore(any())).thenReturn(List.of(pro));
        when(entrepriseRepo.findByAnnonceurProfessionnel(pro)).thenReturn(java.util.Optional.of(entreprise));
        when(userRepo.findByEntrepriseId(entreprise.getId())).thenReturn(List.of(pro, agent));

        service.anonymiserComptesExpires();

        assertTrue(pro.getEmail().endsWith("@anonyme.invalid"));
        assertTrue(agent.getEmail().endsWith("@anonyme.invalid"));
        assertNull(agent.getTelephone());
        assertEquals(CompteSuppressionService.MOTIF_ANONYMISE, agent.getMotifStatut());
        assertEquals(CompteSuppressionService.NOM_ENTREPRISE_SUPPRIMEE, entreprise.getNom());
        assertNull(entreprise.getTelephone());
        assertFalse(entreprise.getActive());
        verify(media).deleteMediaFromDisk("/uploads/public/agent/photo.jpg");
        verify(media).deleteMediaFromDisk("/uploads/public/entreprise/logo.jpg");
    }

    @Test
    void anonymiserComptesExpires_epargneUnCompteRedevenuActif() {
        UserRepository userRepo = mock(UserRepository.class);
        MediaService media = mock(MediaService.class);
        User u = compteSupprime(StatutUtilisateur.ACTIF);
        when(userRepo.findByDateSuppressionDemandeeBefore(any())).thenReturn(List.of(u));

        suppressionService(userRepo, media).anonymiserComptesExpires();

        assertEquals("ancien@example.com", u.getEmail());
        assertNull(u.getDateSuppressionDemandee());
        verify(media, never()).deleteMediaFromDisk(anyString());
    }
}
