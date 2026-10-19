package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.MediaDTO;
import com.app.AnnoncesAPI.dto.UserDTO;
import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.payload.request.UpdateProfileRequest;
import com.app.AnnoncesAPI.payload.request.UpdateStatutRequest;
import com.app.AnnoncesAPI.payload.request.ValidationPieceIdentiteRequest;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.AvertissementRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.media.MediaService;
import com.app.AnnoncesAPI.Utilities.Identifiants;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

/**
 * Implémentation du service de gestion des utilisateurs
 */
@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final MediaService mediaService;
    private final AnnonceRepository annonceRepository;
    private final AnnonceMapper annonceMapper;
    private final AvertissementRepository avertissementRepository;
    private final CompteSuppressionService compteSuppressionService;
    private final EmailNotificationService emailNotificationService;
    private final AuditService audit;
    private final SessionService sessionService;

    public UserServiceImpl(UserRepository userRepository,
                           MediaService mediaService,
                           AnnonceRepository annonceRepository,
                           AnnonceMapper annonceMapper,
                           AvertissementRepository avertissementRepository,
                           CompteSuppressionService compteSuppressionService,
                           EmailNotificationService emailNotificationService,
                           AuditService audit,
                           SessionService sessionService) {
        this.sessionService = sessionService;
        this.emailNotificationService = emailNotificationService;
        this.audit = audit;
        this.userRepository = userRepository;
        this.mediaService = mediaService;
        this.annonceRepository = annonceRepository;
        this.annonceMapper = annonceMapper;
        this.avertissementRepository = avertissementRepository;
        this.compteSuppressionService = compteSuppressionService;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserDTO> getAllUsers(Pageable pageable) {
        return userRepository.findByDateSuppressionDefinitiveIsNull(pageable).map(this::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + id));
        return toDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getMyProfile(String username) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));
        return toDTO(user);
    }

    @Override
    @Transactional
    public UserDTO updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));

        boolean pieceValidee = user.getStatutPieceIdentite() == StatutPieceIdentite.VALIDEE;
        if (request.getNom() != null || request.getPrenom() != null) {
            if (pieceValidee) {
                throw new IllegalArgumentException(
                        "Le nom et le prénom ne peuvent pas être modifiés une fois la pièce d'identité validée.");
            }
            if (request.getNom() != null) user.setNom(request.getNom());
            if (request.getPrenom() != null) user.setPrenom(request.getPrenom());
        }
        if (request.getTelephone() != null) {
            // Le téléphone sert d'identifiant de connexion : une seule forme (+224…, sans espaces).
            String telephone = Identifiants.normaliserTelephone(request.getTelephone());
            if (telephone != null && userRepository.existsByTelephoneAndIdNot(telephone, user.getId())) {
                throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé par un autre utilisateur");
            }
            user.setTelephone(telephone);
        }
        // Comme le nom : la pièce validée ne doit plus pouvoir être changée par le titulaire
        // (on tolère le renvoi de la même valeur par un formulaire complet).
        boolean changementPiece =
                (request.getTypePieceIdentite() != null
                        && request.getTypePieceIdentite() != user.getTypePieceIdentite())
                || (request.getNumeroPieceIdentite() != null
                        && !request.getNumeroPieceIdentite().equals(user.getNumeroPieceIdentite()));
        if (changementPiece && pieceValidee) {
            throw new IllegalArgumentException(
                    "Le type et le numéro de pièce d'identité ne peuvent pas être modifiés une fois la pièce validée.");
        }
        if (request.getTypePieceIdentite() != null) user.setTypePieceIdentite(request.getTypePieceIdentite());
        if (request.getNumeroPieceIdentite() != null) user.setNumeroPieceIdentite(request.getNumeroPieceIdentite());

        return toDTO(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserDTO uploadProfilePhoto(String username, MultipartFile file, String type) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));

        String oldUrl = user.getPhotoProfil();

        List<MediaDTO> saved = mediaService.saveMediaDTOs(List.of(file), user.getId().toString());
        if (saved == null || saved.isEmpty()) {
            throw new RuntimeException("Erreur lors de la sauvegarde de l'image.");
        }
        String url = saved.get(0).getUrl();

        user.setPhotoProfil(url);
        userRepository.save(user);

        if (oldUrl != null && !oldUrl.isBlank()) {
            mediaService.deleteMediaFromDisk(oldUrl);
        }

        return toDTO(user);
    }

    @Override
    @Transactional
    public UserDTO uploadPieceIdentite(String username, MultipartFile file, MultipartFile selfie,
                                       String typePieceIdentiteStr, String numeroPieceIdentite) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));

        // Un dossier validé est figé : ni la pièce ni le selfie ne se remplacent (RG-02-34).
        if (user.getStatutPieceIdentite() == StatutPieceIdentite.VALIDEE) {
            throw new IllegalStateException("Votre dossier de vérification a déjà été validé et ne peut pas être modifié.");
        }
        // La pièce et le selfie partent ensemble (RG-02-28).
        if (file == null || file.isEmpty() || selfie == null || selfie.isEmpty()) {
            throw new IllegalArgumentException("La photo de la pièce et le selfie sont obligatoires.");
        }
        com.app.AnnoncesAPI.enums.TypePieceIdentite type = parserTypePiece(typePieceIdentiteStr);

        // 1. Sauvegarder les nouveaux fichiers — si ça échoue, rien n'est perdu
        String pieceChemin = mediaService.savePieceIdentite(file, user.getId());
        String selfieChemin;
        try {
            selfieChemin = mediaService.saveSelfie(selfie, user.getId());
        } catch (RuntimeException e) {
            mediaService.deletePieceIdentite(pieceChemin);
            throw e;
        }

        // 2. Mettre à jour la base
        String anciennePiece = user.getPieceIdentiteUrl();
        String ancienSelfie = user.getSelfieUrl();
        user.setPieceIdentiteUrl(pieceChemin);
        user.setSelfieUrl(selfieChemin);
        user.setStatutPieceIdentite(StatutPieceIdentite.EN_ATTENTE);
        user.setMotifRejetPieceIdentite(null);
        user.setDateEnvoiVerification(LocalDateTime.now());
        user.setDateDecisionVerification(null);
        user.setDecisionVerificationPar(null);
        if (type != null) {
            user.setTypePieceIdentite(type);
        }
        if (numeroPieceIdentite != null && !numeroPieceIdentite.isBlank()) {
            user.setNumeroPieceIdentite(numeroPieceIdentite);
        }
        UserDTO result = toDTO(userRepository.save(user));

        // 3. Supprimer les anciens fichiers seulement après que la base est à jour
        //    Si la suppression échoue, la base est correcte — fuite disque mineure, pas de perte de données
        mediaService.deletePieceIdentite(anciennePiece);
        mediaService.deletePieceIdentite(ancienSelfie);
        return result;
    }

    @Override
    @Transactional
    public UserDTO uploadSelfie(String username, MultipartFile selfie) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));
        if (user.getStatutPieceIdentite() != StatutPieceIdentite.EN_ATTENTE
                || user.getPieceIdentiteUrl() == null || user.getSelfieUrl() != null) {
            throw new IllegalStateException(
                    "Le selfie seul n'est accepté que pour un dossier en attente auquel il manque le selfie.");
        }
        if (selfie == null || selfie.isEmpty()) {
            throw new IllegalArgumentException("Le selfie est obligatoire.");
        }
        user.setSelfieUrl(mediaService.saveSelfie(selfie, user.getId()));
        user.setDateEnvoiVerification(LocalDateTime.now());
        return toDTO(userRepository.save(user));
    }

    private static com.app.AnnoncesAPI.enums.TypePieceIdentite parserTypePiece(String valeur) {
        if (valeur == null || valeur.isBlank()) {
            return null;
        }
        try {
            return com.app.AnnoncesAPI.enums.TypePieceIdentite.valueOf(valeur.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Type de pièce d'identité inconnu : " + valeur
                    + " (CARTE_IDENTITE, PASSEPORT, PERMIS_DE_CONDUIRE ou AUTRE).");
        }
    }

    @Override
    // Pas readOnly : la consultation par la modération est journalisée.
    @Transactional
    public Resource servirPieceIdentite(UUID userId, Authentication authentication) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID : " + userId));

        if (target.getPieceIdentiteUrl() == null || target.getPieceIdentiteUrl().isBlank()) {
            throw new ResourceNotFoundException("Aucune pièce d'identité enregistrée pour cet utilisateur.");
        }

        if (!isOwnerOrAdminMod(authentication, userId)) {
            throw new AccessDeniedException(
                    "Accès refusé : seul le propriétaire ou un ADMIN/MOD peut consulter cette pièce d'identité.");
        }

        Resource piece = mediaService.loadPieceIdentite(target.getPieceIdentiteUrl());
        if (!(authentication.getPrincipal() instanceof UserDetailsImpl lecteur && userId.equals(lecteur.getId()))) {
            audit.enregistrer(ActionAudit.PIECE_IDENTITE_CONSULTEE, userId);
        }
        return piece;
    }

    @Override
    @Transactional
    public Resource servirSelfie(UUID userId, Authentication authentication) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID : " + userId));
        if (target.getSelfieUrl() == null || target.getSelfieUrl().isBlank()) {
            throw new ResourceNotFoundException("Aucun selfie enregistré pour cet utilisateur.");
        }
        if (!isOwnerOrAdminMod(authentication, userId)) {
            throw new AccessDeniedException(
                    "Accès refusé : seul le propriétaire ou un ADMIN/MOD peut consulter ce selfie.");
        }
        Resource selfie = mediaService.loadPieceIdentite(target.getSelfieUrl());
        if (!(authentication.getPrincipal() instanceof UserDetailsImpl lecteur && userId.equals(lecteur.getId()))) {
            audit.enregistrer(ActionAudit.PIECE_IDENTITE_CONSULTEE, userId, "selfie");
        }
        return selfie;
    }

    /**
     * Vrai si l'authentification correspond au propriétaire de la ressource
     * OU à un ADMINISTRATEUR/MODERATEUR.
     */
    private boolean isOwnerOrAdminMod(Authentication authentication, UUID targetUserId) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl userDetails)) return false;
        if (targetUserId.equals(userDetails.getId())) return true;
        return authentication.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .anyMatch(a -> a.equals("ROLE_" + TypeRole.ADMINISTRATEUR.name())
                            || a.equals("ROLE_" + TypeRole.MODERATEUR.name()));
    }

    @Override
    @Transactional
    public UserDTO validerPieceIdentite(UUID userId, ValidationPieceIdentiteRequest request,
                                        Authentication authentication) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));

        if (isAdministrateurRole(target)) {
            throw new AccessDeniedException("La pièce d'identité d'un administrateur ne peut pas être traitée via l'API.");
        }
        if (isModerateurRole(target) && !isAdministrateurAuth(authentication)) {
            throw new AccessDeniedException("Un modérateur ne peut pas agir sur un autre modérateur.");
        }
        if (request.getStatut() == StatutPieceIdentite.EN_ATTENTE) {
            throw new IllegalArgumentException("Le statut cible doit être VALIDEE ou REJETEE.");
        }
        if (request.getStatut() == StatutPieceIdentite.REJETEE
                && (request.getMotifRejet() == null || request.getMotifRejet().isBlank())) {
            throw new IllegalArgumentException("Un motif de rejet est obligatoire.");
        }

        // La modération ne valide qu'un dossier complet (RG-02-29).
        if (request.getStatut() == StatutPieceIdentite.VALIDEE
                && (target.getSelfieUrl() == null || target.getSelfieUrl().isBlank())) {
            throw new IllegalStateException("Le selfie de vérification est manquant.");
        }

        target.setStatutPieceIdentite(request.getStatut());
        target.setDateDecisionVerification(LocalDateTime.now());
        target.setDecisionVerificationPar(authentication.getName());
        target.setMotifRejetPieceIdentite(
                request.getStatut() == StatutPieceIdentite.REJETEE ? request.getMotifRejet() : null);
        User saved = userRepository.save(target);
        if (request.getStatut() == StatutPieceIdentite.VALIDEE) {
            audit.enregistrer(ActionAudit.PIECE_IDENTITE_VALIDEE, userId);
        } else {
            audit.enregistrer(ActionAudit.PIECE_IDENTITE_REJETEE, userId, request.getMotifRejet());
        }

        if (request.getStatut() == StatutPieceIdentite.VALIDEE) {
            emailNotificationService.notifier(saved,
                    "Votre pièce d'identité a été validée",
                    "Pièce d'identité validée",
                    "Votre pièce d'identité a été vérifiée : vous pouvez maintenant publier des annonces.");
        } else {
            emailNotificationService.notifier(saved,
                    "Votre pièce d'identité a été refusée",
                    "Pièce d'identité refusée",
                    "Motif : " + request.getMotifRejet()
                            + "\nVous pouvez envoyer une nouvelle pièce depuis votre profil.");
        }
        return toDTO(saved);
    }

    @Override
    @Transactional
    public UserDTO addFavori(String username, Long annonceId) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));
        Annonce annonce = annonceRepository.findById(annonceId)
                .filter(Annonce::estVisiblePubliquement)
                .orElseThrow(() -> new ResourceNotFoundException("Annonce introuvable avec l'ID : " + annonceId));
        user.getFavoris().add(annonce);
        return toDTO(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserDTO removeFavori(String username, Long annonceId) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));
        user.getFavoris().removeIf(a -> a.getId().equals(annonceId));
        return toDTO(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AnnonceDTO> getFavoris(String username, Pageable pageable) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));
        // Favoris masqués, clôturés ou supprimés depuis : conservés mais non affichés.
        List<Annonce> favoris = user.getFavoris().stream()
                .filter(Annonce::estVisiblePubliquement)
                .collect(Collectors.toCollection(ArrayList::new));
        int total = favoris.size();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), total);
        List<AnnonceDTO> dtos = start >= total ? List.of() : favoris.subList(start, end)
                .stream()
                .map(annonceMapper::toDTO)
                .collect(Collectors.toList());
        return new PageImpl<>(dtos, pageable, total);
    }

    @Override
    @Transactional
    public UserDTO updateStatut(UUID userId, UpdateStatutRequest request, Authentication authentication) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));

        // Aucun admin ne modifie le statut d'un autre admin via l'API (un compte admin
        // compromis ne doit pas pouvoir neutraliser les autres) : uniquement en base.
        if (isAdministrateurRole(target)) {
            throw new AccessDeniedException("Le statut d'un administrateur ne peut pas être modifié via l'API.");
        }
        boolean targetIsPrivileged = isModerateurRole(target);
        if (targetIsPrivileged && !isAdministrateurAuth(authentication)) {
            throw new AccessDeniedException("Seul un administrateur peut modifier le statut d'un modérateur ou d'un administrateur.");
        }
        StatutUtilisateur ancienStatut = target.getStatut();
        target.setStatut(request.getStatut());
        target.setMotifStatut(request.getMotif());
        // Toute décision admin annule une suppression RGPD en cours : sinon le job
        // d'anonymisation effacerait un compte que l'admin vient de réactiver.
        target.setDateSuppressionDemandee(null);
        UserDTO dto = toDTO(userRepository.save(target));
        if (request.getStatut() != StatutUtilisateur.ACTIF) {
            // Suspendu ou désactivé : ses appareils sont déconnectés et ne reviennent pas à la levée.
            sessionService.fermerToutesLesSessions(userId);
        }
        audit.enregistrer(ActionAudit.COMPTE_STATUT_MODIFIE, userId,
                ancienStatut + " → " + request.getStatut()
                        + (request.getMotif() == null ? "" : " — " + request.getMotif()));
        return dto;
    }

    private boolean isModerateurRole(User user) {
        return user.getRole() != null && user.getRole().getName() == TypeRole.MODERATEUR;
    }

    private boolean isAdministrateurRole(User user) {
        return user.getRole() != null && user.getRole().getName() == TypeRole.ADMINISTRATEUR;
    }

    private boolean isAdministrateurAuth(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATEUR"));
    }

    @Override
    @Transactional
    public void deleteMyAccount(String username) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));
        // Un compte de modération ne s'auto-supprime pas : la plateforme perdrait
        // sa capacité de modération (voire son dernier administrateur).
        if (user.isAdministrateur() || user.isModerateur()) {
            throw new AccessDeniedException("Un compte administrateur ou modérateur ne peut pas être supprimé par son titulaire.");
        }
        compteSuppressionService.demanderSuppression(user);
    }

    private UserDTO toDTO(User user) {
        // pieceIdentiteUrl exposé sous forme d'URL d'API authentifiée — jamais le path filesystem.
        // Le client doit appeler GET /api/users/{id}/piece-identite avec son JWT.
        String pieceIdentiteApiUrl = (user.getPieceIdentiteUrl() != null && !user.getPieceIdentiteUrl().isBlank())
                ? "/api/users/" + user.getId() + "/piece-identite"
                : null;
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .telephone(user.getTelephone())
                .photoProfil(user.getPhotoProfil())
                .typePieceIdentite(user.getTypePieceIdentite())
                .numeroPieceIdentite(user.getNumeroPieceIdentite())
                .pieceIdentiteUrl(pieceIdentiteApiUrl)
                .statutPieceIdentite(user.getStatutPieceIdentite())
                .motifRejetPieceIdentite(user.getMotifRejetPieceIdentite())
                .selfieFourni(user.getSelfieUrl() != null && !user.getSelfieUrl().isBlank())
                .notifMessages(user.isNotifMessages())
                .notifAlertes(user.isNotifAlertes())
                .dateEnvoiVerification(user.getDateEnvoiVerification())
                .dateDecisionVerification(user.getDateDecisionVerification())
                .createdAt(user.getCreatedAt())
                .statut(user.getStatut())
                .motifStatut(user.getMotifStatut())
                .nbAvertissements(avertissementRepository.countByUtilisateurId(user.getId()))
                .annoncesMasquees(user.isAnnoncesMasquees())
                .motifMasquageAnnonces(user.getMotifMasquageAnnonces())
                .dateMasquageAnnonces(user.getDateMasquageAnnonces())
                .role(user.getRole() != null ? user.getRole().getName().name() : null)
                .entrepriseId(user.getEntreprise() != null ? user.getEntreprise().getId() : null)
                .entrepriseNom(user.getEntreprise() != null ? user.getEntreprise().getNom() : null)
                .parentUserId(user.getParentUser() != null ? user.getParentUser().getId() : null)
                .favorisIds(user.getFavoris().stream()
                        .map(Annonce::getId)
                        .collect(Collectors.toSet()))
                .build();
    }
}
