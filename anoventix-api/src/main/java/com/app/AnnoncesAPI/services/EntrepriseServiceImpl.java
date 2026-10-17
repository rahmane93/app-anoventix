package com.app.AnnoncesAPI.services;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.app.AnnoncesAPI.Utilities.Identifiants;
import com.app.AnnoncesAPI.Utilities.Utility;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.dto.AgentDTO;
import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.EntrepriseDTO;
import com.app.AnnoncesAPI.dto.MediaDTO;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Role;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.exceptions.UnauthorizedActionException;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.mappers.EntrepriseMapper;
import com.app.AnnoncesAPI.payload.request.AgentRequest;
import com.app.AnnoncesAPI.payload.request.EntrepriseRequest;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.media.MediaService;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

/**
 * Implémentation du service de gestion des entreprises
 */
@Service
@Transactional
public class EntrepriseServiceImpl implements EntrepriseService {
    
    private static final Logger logger = LoggerFactory.getLogger(EntrepriseServiceImpl.class);

    /** Motif posé par suspendreAgent : distingue une suspension par l'entreprise d'une sanction plateforme. */
    static final String MOTIF_SUSPENSION_ENTREPRISE = "Suspendu par l'entreprise";
    
    private final EntrepriseRepository entrepriseRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BienImmoRepository bienImmoRepository;
    private final EntrepriseMapper entrepriseMapper;
    private final AnnonceMapper annonceMapper;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final MediaService mediaService;
    private final QuotaEntrepriseService quotaService;

    public EntrepriseServiceImpl(
            EntrepriseRepository entrepriseRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            BienImmoRepository bienImmoRepository,
            EntrepriseMapper entrepriseMapper,
            AnnonceMapper annonceMapper,
            PasswordEncoder passwordEncoder,
            NotificationService notificationService,
            MediaService mediaService,
            QuotaEntrepriseService quotaService) {
        this.entrepriseRepository = entrepriseRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.bienImmoRepository = bienImmoRepository;
        this.entrepriseMapper = entrepriseMapper;
        this.annonceMapper = annonceMapper;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
        this.mediaService = mediaService;
        this.quotaService = quotaService;
    }
    
    @Override
    public EntrepriseDTO createEntreprise(EntrepriseRequest request, Authentication authentication) {
        logger.info("Tentative de création d'entreprise: {}", request.getNom());
        
        User user = getCurrentUser(authentication);
        
        // Vérifier que l'utilisateur est un Annonceur Professionnel
        if (!user.isAnnonceurProfessionnel()) {
            throw new UnauthorizedActionException("Seuls les Annonceurs Professionnels peuvent créer une entreprise");
        }
        
        // Vérifier que l'utilisateur n'a pas déjà une entreprise
        if (entrepriseRepository.findByAnnonceurProfessionnel(user).isPresent()) {
            throw new IllegalArgumentException("Vous avez déjà une entreprise enregistrée");
        }
        
        // Vérifier que le numéro RCCM n'existe pas déjà
        if (request.getNumeroRCCM() != null && entrepriseRepository.existsByNumeroRCCM(request.getNumeroRCCM())) {
            throw new IllegalArgumentException("Ce numéro RCCM est déjà enregistré dans le système");
        }

        // Même forme que les téléphones des comptes (+224…) : sans quoi « 00224… » et
        // « +224… » passeraient tous deux le contrôle d'unicité (ECART-44).
        request.setTelephone(Identifiants.normaliserTelephone(request.getTelephone()));

        // Vérifier que le téléphone n'est pas déjà utilisé par une autre entreprise
        if (request.getTelephone() != null && entrepriseRepository.existsByTelephone(request.getTelephone())) {
            throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé par une autre entreprise");
        }
        
        Entreprise entreprise = entrepriseMapper.toEntity(request);
        entreprise.setAnnonceurProfessionnel(user);
        entreprise.setActive(true);
        
        Entreprise savedEntreprise = entrepriseRepository.save(entreprise);
        logger.info("Entreprise créée avec succès: {} (ID: {})", savedEntreprise.getNom(), savedEntreprise.getId());
        
        // Lier l'entreprise à l'utilisateur
        user.setEntreprise(savedEntreprise);
        userRepository.save(user);
        
        return quotaService.toDTO(savedEntreprise);
    }
    
    @Override
    public EntrepriseDTO updateEntreprise(UUID id, EntrepriseRequest request, Authentication authentication) {
        logger.info("Tentative de mise à jour de l'entreprise ID: {}", id);
        
        User user = getCurrentUser(authentication);
        
        Entreprise entreprise = entrepriseRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + id));
        
        // Vérifier que l'utilisateur est le propriétaire
        if (!entreprise.getAnnonceurProfessionnel().getId().equals(user.getId())) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à modifier cette entreprise");
        }
        
        // Vérifier le numéro RCCM si modifié
        if (request.getNumeroRCCM() != null && !request.getNumeroRCCM().equals(entreprise.getNumeroRCCM())
                && entrepriseRepository.existsByNumeroRCCM(request.getNumeroRCCM())) {
            throw new IllegalArgumentException("Ce numéro RCCM est déjà enregistré dans le système");
        }

        // Vérifier le téléphone si modifié (normalisé comme à la création, ECART-44)
        request.setTelephone(Identifiants.normaliserTelephone(request.getTelephone()));
        if (request.getTelephone() != null && !request.getTelephone().equals(entreprise.getTelephone())
                && entrepriseRepository.existsByTelephoneAndIdNot(request.getTelephone(), id)) {
            throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé par une autre entreprise");
        }
        
        entrepriseMapper.updateEntityFromRequest(request, entreprise);
        Entreprise updated = entrepriseRepository.save(entreprise);
        
        logger.info("Entreprise mise à jour avec succès: {}", updated.getNom());
        
        return quotaService.toDTO(updated);
    }

    @Override
    public EntrepriseDTO uploadPhoto(UUID id, MultipartFile file, Authentication authentication) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier image requis");
        }

        User user = getCurrentUser(authentication);

        Entreprise entreprise = entrepriseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + id));

        if (entreprise.getAnnonceurProfessionnel() == null
                || !entreprise.getAnnonceurProfessionnel().getId().equals(user.getId())) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à modifier cette entreprise");
        }

        List<MediaDTO> saved = mediaService.saveMediaDTOs(List.of(file), "entreprise-" + entreprise.getId());
        if (saved == null || saved.isEmpty()) {
            throw new RuntimeException("Erreur lors de la sauvegarde de la photo.");
        }

        String anciennePhoto = entreprise.getPhotoProfil();
        entreprise.setPhotoProfil(saved.get(0).getUrl());
        Entreprise updated = entrepriseRepository.save(entreprise);
        // Même schéma que la photo de profil utilisateur : l'ancienne image n'était jamais supprimée.
        if (anciennePhoto != null && !anciennePhoto.isBlank()) {
            mediaService.deleteMediaFromDisk(anciennePhoto);
        }
        return quotaService.toDTO(updated);
    }
    
    @Override
    @Transactional(readOnly = true)
    public EntrepriseDTO getEntrepriseById(UUID id) {
        logger.info("Récupération de l'entreprise ID: {}", id);
        
        Entreprise entreprise = entrepriseRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + id));
        
        return quotaService.toDTO(entreprise);
    }
    
    @Override
    @Transactional(readOnly = true)
    public EntrepriseDTO getEntrepriseByUser(UUID userId) {
        logger.info("Récupération de l'entreprise de l'utilisateur ID: {}", userId);
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + userId));
        
        Entreprise entreprise = entrepriseRepository.findByAnnonceurProfessionnel(user)
            .orElseThrow(() -> new ResourceNotFoundException("Aucune entreprise trouvée pour cet utilisateur"));
        
        return quotaService.toDTO(entreprise);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<EntrepriseDTO> getAllEntreprises(Pageable pageable) {
        return entrepriseRepository.findNonSupprimees(pageable).map(quotaService::toDTO);
    }
    
    @Override
    public AgentDTO createAgentForEntreprise(UUID entrepriseId, AgentRequest request, Authentication authentication) {
        logger.info("Création d'un agent pour l'entreprise {}: {}", entrepriseId, request.getEmail());
        
        User owner = getCurrentUser(authentication);
        
        // 1️⃣ Vérifier l'entreprise
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        
        // 2️⃣ Vérifier que l'utilisateur est le propriétaire
        if (!entreprise.getAnnonceurProfessionnel().getId().equals(owner.getId())) {
            throw new UnauthorizedActionException("Seul le propriétaire de l'entreprise peut créer des agents");
        }
        
        // 3️⃣ Vérifier le quota d'agents
        if (!quotaService.peutAjouterAgent(entreprise)) {
            throw new IllegalArgumentException("Quota d'agents atteint (" + quotaService.quotaAgents(entreprise) + " maximum)");
        }
        
        // Vérifier que l'email n'existe pas déjà
        // Mêmes formes normalisées que l'inscription, sinon doublons (casse, 00/+).
        request.setEmail(Identifiants.normaliserEmail(request.getEmail()));
        request.setTelephone(Identifiants.normaliserTelephone(request.getTelephone()));
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Cet email est déjà enregistré");
        }

        // Vérifier que le téléphone n'est pas déjà utilisé par un autre agent
        if (request.getTelephone() != null && userRepository.existsByTelephone(request.getTelephone())) {
            throw new IllegalArgumentException("Ce numéro de téléphone est déjà utilisé par un autre agent");
        }
        
        // Les agents reçoivent le rôle AGENT_PROFESSIONNEL (distinct du PROFESSIONNEL propriétaire)
        Role agentRole = roleRepository.findByName(TypeRole.AGENT_PROFESSIONNEL)
            .orElseThrow(() -> new RuntimeException("Erreur: Le rôle AGENT_PROFESSIONNEL n'existe pas"));
        
        // 4️⃣ Créer l'agent avec mot de passe temporaire
        
        // Ignorer le mot de passe fourni dans la requête et générer un mot de passe temporaire
        String temporaryPassword = generateTemporaryPassword();
        
        logger.debug("🔑 Mot de passe temporaire généré pour: {}", request.getEmail());
        
        User agent = new User();
        agent.setEmail(request.getEmail());
        agent.setPassword(passwordEncoder.encode(temporaryPassword)); // Utiliser le mot de passe temporaire
        agent.setNom(request.getNom());
        agent.setPrenom(request.getPrenom());
        agent.setTelephone(request.getTelephone());
        agent.setStatut(StatutUtilisateur.EN_ATTENTE_ACTIVATION); // Compte désactivé jusqu'au changement de mot de passe
        
        // Marquer que l'agent doit changer son mot de passe
        agent.setMustChangePassword(true);
        
        agent.setEntreprise(entreprise);
        agent.setParentUser(owner); // Le PROFESSIONNEL qui l'a créé
        agent.setRole(agentRole);
        
        User savedAgent = userRepository.save(agent);
        
        // 5️⃣ Envoyer l'email avec le mot de passe temporaire
        String parentNomComplet = (owner.getPrenom() != null ? owner.getPrenom() + " " : "") + owner.getNom();
        String mailBody = buildTemporaryPasswordEmailBody(
            savedAgent.getPrenom(),
            savedAgent.getNom(),
            savedAgent.getEmail(),
            temporaryPassword,
            entreprise.getNom(),
            parentNomComplet.isBlank() ? owner.getEmail() : parentNomComplet
        );
        // Contenu sensible (mot de passe temporaire) : effacé de la file dès l'envoi.
        notificationService.envoyer(savedAgent.getEmail(), "Vos accès agent AnoventiX", mailBody, true);
        
        logger.info("✅ Agent {} créé avec succès et rattaché à l'entreprise {} (Propriétaire: {}). Email avec mot de passe temporaire envoyé.",
                    savedAgent.getEmail(), entreprise.getNom(), owner.getEmail());
        
        // 6️⃣ Construire le DTO de réponse
        return AgentDTO.builder()
                .id(savedAgent.getId())
                .email(savedAgent.getEmail())
                .nom(savedAgent.getNom())
                .prenom(savedAgent.getPrenom())
                .telephone(savedAgent.getTelephone())
                .statut(savedAgent.getStatut())
                .mustChangePassword(savedAgent.getMustChangePassword())
                .entrepriseId(entreprise.getId())
                .entrepriseNom(entreprise.getNom())
                .parentUserId(owner.getId())
                .dateCreation(java.time.LocalDateTime.now())
                .build();
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<AgentDTO> getAgentsByEntreprise(UUID entrepriseId, Authentication authentication) {
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        // Emails et téléphones des agents : réservés aux membres de l'entreprise et à la modération.
        User caller = getCurrentUser(authentication);
        boolean membre = caller.getEntreprise() != null && caller.getEntreprise().getId().equals(entrepriseId);
        if (!membre && !isAdminOrModerateur(caller)) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à consulter les agents de cette entreprise");
        }
        return userRepository.findByEntrepriseId(entrepriseId).stream()
                .filter(agent -> !agent.isAnnonceurProfessionnel())
                .filter(agent -> agent.getStatut() != StatutUtilisateur.INACTIF)
                .map(agent -> AgentDTO.builder()
                        .id(agent.getId())
                        .email(agent.getEmail())
                        .nom(agent.getNom())
                        .prenom(agent.getPrenom())
                        .telephone(agent.getTelephone())
                        .statut(agent.getStatut())
                        .mustChangePassword(agent.getMustChangePassword())
                        .entrepriseId(entrepriseId)
                        .entrepriseNom(entreprise.getNom())
                        .parentUserId(agent.getParentUser() != null ? agent.getParentUser().getId() : null)
                        .dateCreation(agent.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public void removeAgentFromEntreprise(UUID entrepriseId, UUID agentId, Authentication authentication) {
        logger.info("Retrait de l'agent {} de l'entreprise {}", agentId, entrepriseId);
        
        User owner = getCurrentUser(authentication);
        
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        
        if (!entreprise.getAnnonceurProfessionnel().getId().equals(owner.getId())) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à gérer cette entreprise");
        }
        
        User agent = userRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent non trouvé avec l'ID: " + agentId));
        
        if (agent.getEntreprise() == null || !agent.getEntreprise().getId().equals(entrepriseId)) {
            throw new IllegalArgumentException("Cet agent n'est pas rattaché à cette entreprise");
        }

        // Empêcher la suppression d'un PROFESSIONNEL
        if (agent.isAnnonceurProfessionnel()) {
            throw new UnauthorizedActionException("Impossible de retirer un Annonceur Professionnel de l'entreprise");
        }
        
        // Transférer toutes les annonces actives de l'agent vers le caller (propriétaire de l'entreprise)
        List<com.app.AnnoncesAPI.entities.BienImmo> annonces = bienImmoRepository.findActiveByOwnerId(agent.getId());
        for (com.app.AnnoncesAPI.entities.BienImmo annonce : annonces) {
            annonce.setOwner(owner);
        }
        if (!annonces.isEmpty()) {
            bienImmoRepository.saveAll(annonces);
            logger.info("{} annonce(s) transférée(s) de {} vers {}", annonces.size(), agent.getEmail(), owner.getEmail());
        }

        agent.setStatut(StatutUtilisateur.INACTIF);
        userRepository.save(agent);

        logger.info("Agent {} retiré et désactivé (entreprise: {})", agent.getEmail(), entreprise.getNom());
    }

    // ── Helpers pour suspendre/activer ────────────────────────────────────────

    private void checkAgentManagementAuthorization(Entreprise entreprise, User agent, User caller) {
        boolean isOwner = entreprise.getAnnonceurProfessionnel() != null
                && entreprise.getAnnonceurProfessionnel().getId().equals(caller.getId());
        boolean isCreator = agent.getParentUser() != null
                && agent.getParentUser().getId().equals(caller.getId());
        // ADMIN/MOD autorisés, cohérent avec le @PreAuthorize des endpoints suspendre/activer.
        if (!isOwner && !isCreator && !isAdminOrModerateur(caller)) {
            throw new UnauthorizedActionException(
                    "Vous n'êtes pas autorisé à gérer cet agent : vous devez être le propriétaire de l'entreprise ou le créateur de l'agent");
        }
    }

    private static boolean isAdminOrModerateur(User user) {
        return user.isAdministrateur() || user.isModerateur();
    }

    private AgentDTO toAgentDTO(User agent, Entreprise entreprise) {
        return AgentDTO.builder()
                .id(agent.getId())
                .email(agent.getEmail())
                .nom(agent.getNom())
                .prenom(agent.getPrenom())
                .telephone(agent.getTelephone())
                .statut(agent.getStatut())
                .mustChangePassword(agent.getMustChangePassword())
                .entrepriseId(entreprise.getId())
                .entrepriseNom(entreprise.getNom())
                .parentUserId(agent.getParentUser() != null ? agent.getParentUser().getId() : null)
                .dateCreation(agent.getCreatedAt())
                .build();
    }

    @Override
    public AgentDTO suspendreAgent(UUID entrepriseId, UUID agentId, Authentication authentication) {
        User caller = getCurrentUser(authentication);
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent non trouvé avec l'ID: " + agentId));
        if (agent.getEntreprise() == null || !agent.getEntreprise().getId().equals(entrepriseId)) {
            throw new IllegalArgumentException("Cet agent n'est pas rattaché à cette entreprise");
        }
        if (agent.isAnnonceurProfessionnel()) {
            throw new UnauthorizedActionException("Impossible de suspendre un Annonceur Professionnel");
        }
        checkAgentManagementAuthorization(entreprise, agent, caller);
        // On ne suspend qu'un agent en activité : écraser une sanction de la plateforme
        // (SUSPENDU / INACTIF posés par la modération) permettrait ensuite de la lever.
        if (agent.getStatut() != StatutUtilisateur.ACTIF
                && agent.getStatut() != StatutUtilisateur.EN_ATTENTE_ACTIVATION) {
            throw new IllegalStateException("Cet agent n'est pas actif : il ne peut pas être suspendu.");
        }
        agent.setStatut(StatutUtilisateur.SUSPENDU);
        agent.setMotifStatut(MOTIF_SUSPENSION_ENTREPRISE);
        userRepository.save(agent);
        logger.info("Agent {} suspendu (entreprise: {})", agent.getEmail(), entreprise.getNom());
        return toAgentDTO(agent, entreprise);
    }

    @Override
    public AgentDTO activerAgent(UUID entrepriseId, UUID agentId, Authentication authentication) {
        User caller = getCurrentUser(authentication);
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent non trouvé avec l'ID: " + agentId));
        if (agent.getEntreprise() == null || !agent.getEntreprise().getId().equals(entrepriseId)) {
            throw new IllegalArgumentException("Cet agent n'est pas rattaché à cette entreprise");
        }
        checkAgentManagementAuthorization(entreprise, agent, caller);
        // L'entreprise ne peut lever que ses propres suspensions. Une suspension par la
        // modération, ou un agent retiré (INACTIF), ne se lève que par un ADMIN/MOD.
        boolean suspenduParEntreprise = agent.getStatut() == StatutUtilisateur.SUSPENDU
                && MOTIF_SUSPENSION_ENTREPRISE.equals(agent.getMotifStatut());
        if (!suspenduParEntreprise && !isAdminOrModerateur(caller)) {
            throw new UnauthorizedActionException(
                    "Cet agent n'a pas été suspendu par votre entreprise : contactez l'administrateur.");
        }
        // Un agent retiré (INACTIF) ne compte plus dans le quota : il y reprend une place.
        if (agent.getStatut() == StatutUtilisateur.INACTIF && !quotaService.peutAjouterAgent(entreprise)) {
            throw new IllegalArgumentException("Quota d'agents atteint (" + quotaService.quotaAgents(entreprise) + " maximum)");
        }
        // Un agent qui n'a pas encore changé son mot de passe temporaire reste en attente.
        agent.setStatut(Boolean.TRUE.equals(agent.getMustChangePassword())
                ? StatutUtilisateur.EN_ATTENTE_ACTIVATION
                : StatutUtilisateur.ACTIF);
        agent.setMotifStatut(null);
        userRepository.save(agent);
        logger.info("Agent {} réactivé (entreprise: {})", agent.getEmail(), entreprise.getNom());
        return toAgentDTO(agent, entreprise);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canCreateAnnonce(UUID entrepriseId) {
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        
        return quotaService.peutCreerAnnonce(entreprise, quotaService.annoncesActives(entreprise));
    }
    
    @Override
    @Transactional(readOnly = true)
    public boolean canAddAgent(UUID entrepriseId) {
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        
        return quotaService.peutAjouterAgent(entreprise);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<AnnonceDTO> getAnnoncesByEntreprise(UUID entrepriseId, Pageable pageable, Authentication authentication) {
        if (!entrepriseRepository.existsById(entrepriseId)) {
            throw new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId);
        }
        // Vue interne (y compris annonces masquées) : membres de l'entreprise et modération.
        // Le public passe par le profil d'entreprise, filtré sur la visibilité publique.
        User caller = getCurrentUser(authentication);
        boolean membre = caller.getEntreprise() != null && caller.getEntreprise().getId().equals(entrepriseId);
        if (!membre && !isAdminOrModerateur(caller)) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à consulter les annonces internes de cette entreprise");
        }
        return bienImmoRepository
                .findByOwnerEntrepriseIdAndActifTrue(entrepriseId, pageable)
                .map(annonceMapper::bienImmoEntityToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public com.app.AnnoncesAPI.dto.EntrepriseProfilDTO getEntrepriseProfil(UUID entrepriseId, Pageable pageable) {
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        EntrepriseDTO entrepriseDTO = quotaService.toDTO(entreprise);
        // Endpoint public : uniquement les annonces visibles du public.
        Page<AnnonceDTO> annonces = bienImmoRepository
                .findByOwnerEntrepriseIdAndVisiblePublicTrue(entrepriseId, pageable)
                .map(annonceMapper::bienImmoEntityToDTO);
        return com.app.AnnoncesAPI.dto.EntrepriseProfilDTO.of(entrepriseDTO, annonces);
    }

    @Override
    public void disableEntreprise(UUID id, Authentication authentication) {
        logger.info("Désactivation de l'entreprise ID: {}", id);
        
        User user = getCurrentUser(authentication);
        
        Entreprise entreprise = entrepriseRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + id));
        
        // L'admin peut désactiver n'importe quelle entreprise, le propriétaire uniquement la sienne
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATEUR"));
        if (!isAdmin && !entreprise.getAnnonceurProfessionnel().getId().equals(user.getId())) {
            throw new UnauthorizedActionException("Vous n'êtes pas autorisé à désactiver cette entreprise");
        }
        
        entreprise.setActive(false);
        entrepriseRepository.save(entreprise);
        
        logger.info("Entreprise désactivée: {}", entreprise.getNom());
    }

    @Override
    public EntrepriseDTO enableEntreprise(UUID id) {
        logger.info("Réactivation de l'entreprise ID: {}", id);

        Entreprise entreprise = entrepriseRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + id));

        if (!Boolean.TRUE.equals(entreprise.getActive())) {
            entreprise.setActive(true);
            entreprise = entrepriseRepository.save(entreprise);
            logger.info("Entreprise réactivée: {}", entreprise.getNom());
        }
        return quotaService.toDTO(entreprise);
    }
    
    /**
     * Récupère l'utilisateur courant depuis l'authentification
     */
    private User getCurrentUser(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
    }
    
    /**
     * Génère un mot de passe temporaire sécurisé
     */
    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder password = new StringBuilder();
        
        // Assurer au moins une majuscule, une minuscule, un chiffre et un caractère spécial
        password.append("ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(random.nextInt(26)));
        password.append("abcdefghijklmnopqrstuvwxyz".charAt(random.nextInt(26)));
        password.append("0123456789".charAt(random.nextInt(10)));
        password.append("!@#$%".charAt(random.nextInt(5)));
        
        // Compléter jusqu'à 12 caractères
        for (int i = 0; i < 8; i++) {
            password.append(chars.charAt(random.nextInt(chars.length())));
        }
        
        // Mélanger les caractères
        char[] passwordArray = password.toString().toCharArray();
        for (int i = passwordArray.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = passwordArray[i];
            passwordArray[i] = passwordArray[j];
            passwordArray[j] = temp;
        }
        
        return new String(passwordArray);
    }
    
    /**
     * Construit le corps HTML de l'email avec le mot de passe temporaire
     */
    private String buildTemporaryPasswordEmailBody(String prenom, String nom, String email,
                                                   String temporaryPassword, String entrepriseName,
                                                   String parentNomComplet) {
        // HashMap (et non Map.of) car Map.of lève une NPE si une valeur est null.
        Map<String, String> vars = new HashMap<>();
        vars.put("prenom", prenom != null ? prenom : "");
        vars.put("nom", nom != null ? nom : "");
        vars.put("email", email != null ? email : "");
        vars.put("temporaryPassword", temporaryPassword != null ? temporaryPassword : "");
        vars.put("entrepriseName", entrepriseName != null ? entrepriseName : "");
        vars.put("parentNomComplet", parentNomComplet != null ? parentNomComplet : "");
        return Utility.renderEmail("templates/email-temporary-password.html", vars,
                "Vos identifiants pour rejoindre " + (entrepriseName != null ? entrepriseName : "votre entreprise") + " sur AnoventiX.",
                "Vous n'êtes pas à l'origine de cette demande ? Contactez l'administrateur de votre entreprise.");
    }
}
