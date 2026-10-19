package com.app.AnnoncesAPI.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.entities.Role;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.AvertissementRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.HistoriqueAnnonceRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.SignalementRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.media.MediaService;

/**
 * Suppression d'un compte par un administrateur : effet immédiat (annonces, photos,
 * favoris, données personnelles, sessions), entreprise et agents emportés pour un PRO.
 */
class SuppressionCompteAdminTest {

    private final UserRepository userRepo = mock(UserRepository.class);
    private final AnnonceRepository annonceRepo = mock(AnnonceRepository.class);
    private final EntrepriseRepository entrepriseRepo = mock(EntrepriseRepository.class);
    private final MediaRepository mediaRepo = mock(MediaRepository.class);
    private final MediaService media = mock(MediaService.class);

    private CompteSuppressionService service() {
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("hash");
        return new CompteSuppressionService(userRepo, annonceRepo, entrepriseRepo, mediaRepo, media, encoder,
                mock(SessionService.class));
    }

    private static User compte(TypeRole role) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail(role.name().toLowerCase() + "@example.com");
        u.setPrenom("Aïssatou");
        u.setNom("Diallo");
        u.setTelephone("+224620000001");
        u.setStatut(StatutUtilisateur.ACTIF);
        Role r = new Role();
        r.setName(role);
        u.setRole(r);
        return u;
    }

    private BienImmo annonceAvecPhoto(User owner, String url) {
        BienImmo a = new BienImmo();
        a.setId((long) Math.abs(url.hashCode()));
        a.setOwner(owner);
        a.setActif(true);
        a.setStatutModeration(StatutAnnonce.PUBLIEE);
        Media m = new Media();
        m.setUrl(url);
        a.setMedias(new ArrayList<>(List.of(m)));
        when(annonceRepo.findAllByOwnerId(owner.getId())).thenReturn(List.of(a));
        when(mediaRepo.findByAnnonceId(a.getId())).thenReturn(List.of(m));
        return a;
    }

    @Test
    void particulier_annoncesPhotosFavorisEtDonneesEffaces() {
        User u = compte(TypeRole.PARTICULIER);
        BienImmo annonce = annonceAvecPhoto(u, "/uploads/public/a/1.jpg");
        when(entrepriseRepo.findByAnnonceurProfessionnel(u)).thenReturn(Optional.empty());

        service().supprimerParAdministrateur(u);

        assertFalse(annonce.getActif());
        assertEquals(StatutAnnonce.DESACTIVEE, annonce.getStatutModeration());
        assertTrue(annonce.getMedias().isEmpty());
        verify(media).deleteMediaFromDisk("/uploads/public/a/1.jpg");
        verify(annonceRepo).retirerDesFavorisParProprietaire(u.getId());
        assertTrue(u.getEmail().endsWith("@anonyme.invalid"));
        assertNull(u.getTelephone());
        assertEquals(CompteSuppressionService.MOTIF_ANONYMISE, u.getMotifStatut());
        assertNotNull(u.getDateSuppressionDefinitive(), "le compte ne doit plus être listé ni compté");
        assertNotNull(u.getPasswordChangedAt(), "les sessions ouvertes doivent être invalidées");
    }

    @Test
    void professionnel_emporteEntrepriseEtAgents() {
        User pro = compte(TypeRole.PROFESSIONNEL);
        User agent = compte(TypeRole.AGENT_PROFESSIONNEL);
        BienImmo annonceAgent = annonceAvecPhoto(agent, "/uploads/public/b/1.jpg");
        Entreprise e = new Entreprise();
        e.setId(UUID.randomUUID());
        e.setNom("Immo Conakry");
        e.setTelephone("+224620000009");
        e.setPhotoProfil("/uploads/public/e/logo.jpg");
        e.setActive(true);
        when(entrepriseRepo.findByAnnonceurProfessionnel(pro)).thenReturn(Optional.of(e));
        when(userRepo.findByEntrepriseId(e.getId())).thenReturn(List.of(pro, agent));

        service().supprimerParAdministrateur(pro);

        assertFalse(e.getActive());
        assertEquals(CompteSuppressionService.NOM_ENTREPRISE_SUPPRIMEE, e.getNom());
        assertNull(e.getTelephone());
        verify(media).deleteMediaFromDisk("/uploads/public/e/logo.jpg");
        assertTrue(agent.getEmail().endsWith("@anonyme.invalid"));
        assertFalse(annonceAgent.getActif());
        assertTrue(pro.getEmail().endsWith("@anonyme.invalid"));
    }

    // ─── Garde-fous côté AdminService ────────────────────────────────────────

    private AdminServiceImpl adminService(CompteSuppressionService suppression) {
        return new AdminServiceImpl(userRepo, mock(RoleRepository.class), mock(BienImmoRepository.class),
                entrepriseRepo, mock(SignalementRepository.class), annonceRepo,
                mock(HistoriqueAnnonceRepository.class), mock(AvertissementRepository.class),
                mock(MessageRepository.class), mock(NotificationService.class), mock(AnnonceMapper.class),
                mock(EmailNotificationService.class),
                mock(AnnonceExpirationService.class), suppression, mock(AuditService.class),
                mock(SessionService.class), mock(ModerationAnnonceService.class));
    }

    @Test
    void refuseSaProprePersonneEtLesAdministrateurs() {
        CompteSuppressionService suppression = mock(CompteSuppressionService.class);
        AdminServiceImpl admin = adminService(suppression);
        User autreAdmin = compte(TypeRole.ADMINISTRATEUR);
        when(userRepo.findById(autreAdmin.getId())).thenReturn(Optional.of(autreAdmin));
        UUID moi = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () -> admin.supprimerCompte(moi, moi));
        assertThrows(AccessDeniedException.class, () -> admin.supprimerCompte(autreAdmin.getId(), moi));
        verify(suppression, never()).supprimerParAdministrateur(any());
    }

    @Test
    void unCompteDeModerationNePeutPasSAutoSupprimer() {
        CompteSuppressionService suppression = mock(CompteSuppressionService.class);
        UserServiceImpl users = new UserServiceImpl(userRepo, media, annonceRepo, mock(AnnonceMapper.class),
                mock(AvertissementRepository.class), suppression, mock(EmailNotificationService.class),
                mock(AuditService.class), mock(SessionService.class));
        for (TypeRole role : List.of(TypeRole.ADMINISTRATEUR, TypeRole.MODERATEUR)) {
            User u = compte(role);
            when(userRepo.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
            assertThrows(AccessDeniedException.class, () -> users.deleteMyAccount(u.getEmail()));
        }
        verify(suppression, never()).demanderSuppression(any());

        User particulier = compte(TypeRole.PARTICULIER);
        when(userRepo.findByEmail(particulier.getEmail())).thenReturn(Optional.of(particulier));
        users.deleteMyAccount(particulier.getEmail());
        verify(suppression).demanderSuppression(particulier);
    }

    @Test
    void supprimeUnCompteOrdinaire() {
        CompteSuppressionService suppression = mock(CompteSuppressionService.class);
        User u = compte(TypeRole.PARTICULIER);
        when(userRepo.findById(u.getId())).thenReturn(Optional.of(u));

        adminService(suppression).supprimerCompte(u.getId(), UUID.randomUUID());

        verify(suppression).supprimerParAdministrateur(u);
    }
}
