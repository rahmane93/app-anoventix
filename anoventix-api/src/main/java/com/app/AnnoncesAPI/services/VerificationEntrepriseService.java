package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.dto.EntrepriseDTO;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutVerificationEntreprise;
import com.app.AnnoncesAPI.exceptions.ConflitException;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.payload.request.DecisionVerificationEntrepriseRequest;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.media.MediaService;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

/**
 * Vérification des entreprises (DEC-04, RG-07-23 à RG-07-28) : le propriétaire envoie l'extrait RCCM, la
 * modération le contrôle puis vérifie ou refuse. Seule une entreprise vérifiée porte le badge « Agence
 * vérifiée » et réserve son RCCM.
 */
@Service
public class VerificationEntrepriseService {

    private final EntrepriseRepository entrepriseRepository;
    private final UserRepository userRepository;
    private final MediaService mediaService;
    private final QuotaEntrepriseService quotaService;
    private final EmailNotificationService emailNotificationService;
    private final AuditService audit;

    public VerificationEntrepriseService(EntrepriseRepository entrepriseRepository, UserRepository userRepository,
                                         MediaService mediaService, QuotaEntrepriseService quotaService,
                                         EmailNotificationService emailNotificationService, AuditService audit) {
        this.entrepriseRepository = entrepriseRepository;
        this.userRepository = userRepository;
        this.mediaService = mediaService;
        this.quotaService = quotaService;
        this.emailNotificationService = emailNotificationService;
        this.audit = audit;
    }

    @Transactional
    public EntrepriseDTO envoyerJustificatif(UUID entrepriseId, MultipartFile justificatif, Authentication authentication) {
        Entreprise entreprise = trouver(entrepriseId);
        User courant = utilisateur(authentication);
        if (entreprise.getAnnonceurProfessionnel() == null
                || !entreprise.getAnnonceurProfessionnel().getId().equals(courant.getId())) {
            throw new AccessDeniedException("Seul le propriétaire peut demander la vérification de l'entreprise.");
        }
        if (entreprise.getStatutVerification() == StatutVerificationEntreprise.VERIFIEE) {
            throw new IllegalStateException("Votre agence est déjà vérifiée.");
        }
        // L'identité du propriétaire d'abord : c'est avec elle que la modération recoupe le gérant (RG-07-24).
        if (courant.getStatutPieceIdentite() != StatutPieceIdentite.VALIDEE) {
            throw new IllegalStateException(
                    "Votre identité doit être vérifiée avant de demander la vérification de votre agence.");
        }
        if (entreprise.getNumeroRCCM() == null || entreprise.getNumeroRCCM().isBlank()) {
            throw new IllegalArgumentException("Renseignez le numéro RCCM de votre agence avant de la faire vérifier.");
        }
        if (entrepriseRepository.existsByNumeroRCCMAndStatutVerificationAndIdNot(
                entreprise.getNumeroRCCM(), StatutVerificationEntreprise.VERIFIEE, entreprise.getId())) {
            throw new ConflitException(
                    "Ce numéro RCCM est déjà réservé par une agence vérifiée : corrigez-le avant de renvoyer une demande.");
        }
        String chemin = mediaService.saveJustificatifEntreprise(justificatif, entreprise.getId());
        String ancien = entreprise.getJustificatifRccmUrl();
        entreprise.setJustificatifRccmUrl(chemin);
        entreprise.setStatutVerification(StatutVerificationEntreprise.EN_ATTENTE);
        entreprise.setDateEnvoiVerification(LocalDateTime.now());
        entreprise.setDateDecisionVerification(null);
        entreprise.setDecisionVerificationPar(null);
        entreprise.setMotifRejetVerification(null);
        EntrepriseDTO dto = quotaService.toDTO(entrepriseRepository.save(entreprise));
        mediaService.deletePieceIdentite(ancien);
        return dto;
    }

    @Transactional
    public Resource servirJustificatif(UUID entrepriseId, Authentication authentication) {
        Entreprise entreprise = trouver(entrepriseId);
        UserDetailsImpl appelant = (UserDetailsImpl) authentication.getPrincipal();
        boolean proprietaire = entreprise.getAnnonceurProfessionnel() != null
                && entreprise.getAnnonceurProfessionnel().getId().equals(appelant.getId());
        boolean moderation = authentication.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMINISTRATEUR") || a.getAuthority().equals("ROLE_MODERATEUR"));
        if (!proprietaire && !moderation) {
            throw new AccessDeniedException("Accès refusé : justificatif réservé au propriétaire et à la modération.");
        }
        if (entreprise.getJustificatifRccmUrl() == null || entreprise.getJustificatifRccmUrl().isBlank()) {
            throw new ResourceNotFoundException("Aucun justificatif enregistré pour cette entreprise.");
        }
        Resource fichier = mediaService.loadPieceIdentite(entreprise.getJustificatifRccmUrl());
        if (!proprietaire) {
            audit.enregistrer(ActionAudit.ENTREPRISE_JUSTIFICATIF_CONSULTE, entrepriseId);
        }
        return fichier;
    }

    @Transactional(readOnly = true)
    public Page<EntrepriseDTO> aVerifier(Pageable pageable) {
        return entrepriseRepository
                .findByStatutVerificationOrderByDateEnvoiVerificationAsc(StatutVerificationEntreprise.EN_ATTENTE, pageable)
                .map(quotaService::toDTO);
    }

    @Transactional
    public EntrepriseDTO decider(UUID entrepriseId, DecisionVerificationEntrepriseRequest requete,
                                 Authentication authentication) {
        Entreprise entreprise = trouver(entrepriseId);
        StatutVerificationEntreprise statut = requete.getStatut();
        if (statut != StatutVerificationEntreprise.VERIFIEE && statut != StatutVerificationEntreprise.REJETEE) {
            throw new IllegalArgumentException("Le statut cible doit être VERIFIEE ou REJETEE.");
        }
        if (entreprise.getStatutVerification() != StatutVerificationEntreprise.EN_ATTENTE) {
            throw new IllegalStateException("Cette entreprise n'a pas de demande de vérification en attente.");
        }
        String motif = requete.getMotif() == null ? null : requete.getMotif().trim();
        if (statut == StatutVerificationEntreprise.REJETEE && (motif == null || motif.isEmpty())) {
            throw new IllegalArgumentException("Un motif de refus est obligatoire.");
        }
        if (statut == StatutVerificationEntreprise.VERIFIEE
                && entrepriseRepository.existsByNumeroRCCMAndStatutVerificationAndIdNot(
                        entreprise.getNumeroRCCM(), StatutVerificationEntreprise.VERIFIEE, entreprise.getId())) {
            throw new ConflitException("Ce numéro RCCM est déjà réservé par une agence vérifiée.");
        }
        entreprise.setStatutVerification(statut);
        entreprise.setDateDecisionVerification(LocalDateTime.now());
        entreprise.setDecisionVerificationPar(authentication.getName());
        entreprise.setMotifRejetVerification(statut == StatutVerificationEntreprise.REJETEE ? motif : null);
        EntrepriseDTO dto = quotaService.toDTO(entrepriseRepository.save(entreprise));

        User proprietaire = entreprise.getAnnonceurProfessionnel();
        if (statut == StatutVerificationEntreprise.VERIFIEE) {
            audit.enregistrer(ActionAudit.ENTREPRISE_VERIFIEE, entrepriseId);
            if (proprietaire != null) {
                emailNotificationService.notifier(proprietaire, "Votre agence est vérifiée", "Agence vérifiée",
                        "L'agence « " + entreprise.getNom() + " » est vérifiée : le badge « Agence vérifiée » est "
                                + "désormais affiché sur sa page et sur ses annonces. Son nom et son numéro RCCM "
                                + "ne peuvent plus être modifiés sans passer par le support.");
            }
        } else {
            audit.enregistrer(ActionAudit.ENTREPRISE_VERIFICATION_REFUSEE, entrepriseId, motif);
            if (proprietaire != null) {
                emailNotificationService.notifier(proprietaire, "La vérification de votre agence a été refusée",
                        "Vérification refusée",
                        "La vérification de l'agence « " + entreprise.getNom() + " » a été refusée.\nMotif : " + motif
                                + "\nVous pouvez renvoyer un justificatif depuis la fiche de votre agence.");
            }
        }
        return dto;
    }

    private Entreprise trouver(UUID id) {
        return entrepriseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + id));
    }

    private User utilisateur(Authentication authentication) {
        UUID id = ((UserDetailsImpl) authentication.getPrincipal()).getId();
        return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
    }
}
