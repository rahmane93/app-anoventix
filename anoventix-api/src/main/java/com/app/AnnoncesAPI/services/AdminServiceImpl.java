package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.dto.AdminAnnonceDTO;
import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.UserDTO;
import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.Avertissement;
import com.app.AnnoncesAPI.entities.HistoriqueAnnonce;
import com.app.AnnoncesAPI.entities.Message;
import com.app.AnnoncesAPI.entities.Signalement;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.NiveauAvertissement;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutSignalement;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.exceptions.UnauthorizedActionException;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.payload.request.AvertissementRequest;
import com.app.AnnoncesAPI.payload.request.DecisionSignalementRequest;
import com.app.AnnoncesAPI.payload.request.TraiterSignalementRequest;
import com.app.AnnoncesAPI.payload.response.AdminStatsAvanceesResponse;
import com.app.AnnoncesAPI.payload.response.AdminStatsResponse;
import com.app.AnnoncesAPI.payload.response.AvertissementResponse;
import com.app.AnnoncesAPI.payload.response.MessageModerationResponse;
import com.app.AnnoncesAPI.payload.response.SignalementResponse;
import com.app.AnnoncesAPI.payload.response.StatParCategorie;
import com.app.AnnoncesAPI.payload.response.StatParPeriode;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.AvertissementRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.HistoriqueAnnonceRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.SignalementRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

@Service
public class AdminServiceImpl implements AdminService {

    private static final String MSG_SUPPRIME = "[Message supprimé par la modération]";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BienImmoRepository bienImmoRepository;
    private final EntrepriseRepository entrepriseRepository;
    private final SignalementRepository signalementRepository;
    private final AnnonceRepository annonceRepository;
    private final HistoriqueAnnonceRepository historiqueAnnonceRepository;
    private final AvertissementRepository avertissementRepository;
    private final MessageRepository messageRepository;
    private final NotificationService notificationService;
    private final AnnonceMapper annonceMapper;
    private final EmailNotificationService emailNotificationService;
    private final AnnonceExpirationService annonceExpirationService;
    private final CompteSuppressionService compteSuppressionService;
    private final AuditService audit;
    private final SessionService sessionService;
    private final ModerationAnnonceService moderation;
    private final com.app.AnnoncesAPI.repositories.DemandeQuartierRepository quartierDemandeRepository;

    public AdminServiceImpl(UserRepository userRepository,
                            RoleRepository roleRepository,
                            BienImmoRepository bienImmoRepository,
                            EntrepriseRepository entrepriseRepository,
                            SignalementRepository signalementRepository,
                            AnnonceRepository annonceRepository,
                            HistoriqueAnnonceRepository historiqueAnnonceRepository,
                            AvertissementRepository avertissementRepository,
                            MessageRepository messageRepository,
                            NotificationService notificationService,
                            AnnonceMapper annonceMapper,
                            EmailNotificationService emailNotificationService,
                            AnnonceExpirationService annonceExpirationService,
                            CompteSuppressionService compteSuppressionService,
                            AuditService audit,
                            SessionService sessionService,
                            ModerationAnnonceService moderation,
                            com.app.AnnoncesAPI.repositories.DemandeQuartierRepository quartierDemandeRepository) {
        this.quartierDemandeRepository = quartierDemandeRepository;
        this.sessionService = sessionService;
        this.moderation = moderation;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.bienImmoRepository = bienImmoRepository;
        this.entrepriseRepository = entrepriseRepository;
        this.signalementRepository = signalementRepository;
        this.annonceRepository = annonceRepository;
        this.historiqueAnnonceRepository = historiqueAnnonceRepository;
        this.avertissementRepository = avertissementRepository;
        this.messageRepository = messageRepository;
        this.notificationService = notificationService;
        this.annonceMapper = annonceMapper;
        this.emailNotificationService = emailNotificationService;
        this.annonceExpirationService = annonceExpirationService;
        this.compteSuppressionService = compteSuppressionService;
        this.audit = audit;
    }

    // ─── Stats ───────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        return AdminStatsResponse.builder()
                .totalUtilisateurs(userRepository.countByDateSuppressionDefinitiveIsNull())
                .totalAnnoncesActives(bienImmoRepository.countByVisiblePublicTrue())
                .totalSignalements(signalementRepository.countByAnnuleFalse())
                .totalEntreprises(entrepriseRepository.countNonSupprimees())
                .utilisateursEnAttenteActivation(
                        userRepository.countByStatut(StatutUtilisateur.EN_ATTENTE_ACTIVATION))
                .piecesIdentiteEnAttente(
                        userRepository.countByStatutPieceIdentite(StatutPieceIdentite.EN_ATTENTE))
                .annoncesMasquees(bienImmoRepository.countByStatutModeration(StatutAnnonce.MASQUEE))
                .annoncesRejetees(bienImmoRepository.countByStatutModeration(StatutAnnonce.REJETEE))
                .signalementsEnAttente(signalementRepository.countByStatut(StatutSignalement.EN_ATTENTE))
                .messagesSignalesEnAttente(messageRepository.countBySignaleTrueAndSupprimeFalse())
                .reexamensEnAttente(bienImmoRepository.countByReexamenDemandeTrue())
                .quartiersDemandes(quartierDemandeRepository.countByStatut(
                        com.app.AnnoncesAPI.enums.StatutDemandeQuartier.EN_ATTENTE))
                .entreprisesAVerifier(entrepriseRepository.countByStatutVerification(
                        com.app.AnnoncesAPI.enums.StatutVerificationEntreprise.EN_ATTENTE))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminStatsAvanceesResponse getStatsAvancees() {
        List<StatParPeriode> evolution = annonceRepository.countByMoisSur12Mois().stream()
                .map(row -> new StatParPeriode((String) row[0], ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<StatParCategorie> parRegion = annonceRepository.countByRegion().stream()
                .map(row -> new StatParCategorie(row[0] != null ? row[0].toString() : "Inconnue",
                        ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<StatParCategorie> parTypeBien = annonceRepository.countByTypeBien().stream()
                .map(row -> new StatParCategorie(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<StatParCategorie> parTypeAnnonce = annonceRepository.countByTypeAnnonce().stream()
                .map(row -> new StatParCategorie(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        return AdminStatsAvanceesResponse.builder()
                .evolutionAnnonces(evolution)
                .annonceParRegion(parRegion)
                .annonceParTypeBien(parTypeBien)
                .annonceParTypeAnnonce(parTypeAnnonce)
                .build();
    }

    // ─── Signalements ─────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<SignalementResponse> getSignalements(StatutSignalement statut, Pageable pageable) {
        if (statut != null) {
            return signalementRepository.findByStatutWithAnnonceAndReporter(statut, pageable)
                    .map(this::toSignalementResponse);
        }
        return signalementRepository.findAllWithAnnonceAndReporter(pageable)
                .map(this::toSignalementResponse);
    }

    @Override
    @Transactional
    public SignalementResponse traiterSignalement(Long id, TraiterSignalementRequest request, String adminUsername) {
        Signalement signalement = signalementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Signalement introuvable avec l'ID : " + id));

        if (signalement.getStatut() != StatutSignalement.EN_ATTENTE) {
            throw new IllegalArgumentException("Ce signalement a déjà été traité (statut : " + signalement.getStatut() + ").");
        }
        if (request.getStatut() == StatutSignalement.EN_ATTENTE) {
            throw new IllegalArgumentException("Le statut cible doit être TRAITE ou IGNORE.");
        }

        signalement.setStatut(request.getStatut());
        signalement.setTraitePar(adminUsername);
        signalement.setDateTraitement(LocalDateTime.now());
        signalement.setNoteAdmin(request.getNoteAdmin());

        SignalementResponse response = toSignalementResponse(signalementRepository.save(signalement));
        audit.enregistrer(ActionAudit.SIGNALEMENT_TRAITE, id,
                request.getStatut() + (request.getNoteAdmin() == null ? "" : " — " + request.getNoteAdmin()));
        return response;
    }

    @Override
    @Transactional
    public void supprimerSignalement(Long id) {
        if (!signalementRepository.existsById(id)) {
            throw new ResourceNotFoundException("Signalement introuvable avec l'ID : " + id);
        }
        signalementRepository.deleteById(id);
        audit.enregistrer(ActionAudit.SIGNALEMENT_SUPPRIME, id);
    }

    // ─── Modération annonces ──────────────────────────────────────────────

    @Override
    @Transactional
    public void masquerAnnonce(Long id, String raison, String adminUsername) {
        moderation.masquer(findAnnonce(id), normaliserMotif(raison), adminUsername);
    }

    @Override
    @Transactional
    public void rejeterAnnonce(Long id, String raison, String adminUsername) {
        moderation.rejeter(findAnnonce(id), normaliserMotif(raison), adminUsername);
    }

    @Override
    @Transactional
    public void publierAnnonce(Long id, String adminUsername) {
        moderation.remettreEnLigne(findAnnonce(id), adminUsername);
    }

    @Override
    @Transactional
    public SignalementResponse deciderSignalement(Long id, DecisionSignalementRequest request, String adminUsername) {
        Signalement signalement = signalementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Signalement introuvable avec l'ID : " + id));
        if (signalement.getStatut() != StatutSignalement.EN_ATTENTE) {
            throw new IllegalArgumentException("Ce signalement a déjà été traité (statut : " + signalement.getStatut() + ").");
        }
        Annonce annonce = signalement.getAnnonce();
        // Décision sur l'annonce et clôture des signalements dans la même transaction (ECART-26).
        switch (request.getDecision()) {
            case MASQUER -> moderation.masquer(annonce, normaliserMotif(request.getMotif()), adminUsername);
            case REJETER -> moderation.rejeter(annonce, normaliserMotif(request.getMotif()), adminUsername);
            case REMETTRE_EN_LIGNE -> moderation.remettreEnLigne(annonce, adminUsername);
            case CLASSER -> {
                signalement.setStatut(StatutSignalement.IGNORE);
                signalement.setTraitePar(adminUsername);
                signalement.setDateTraitement(LocalDateTime.now());
            }
        }
        if (request.getNoteAdmin() != null && !request.getNoteAdmin().isBlank()) {
            signalement.setNoteAdmin(request.getNoteAdmin());
        }
        Signalement saved = signalementRepository.save(signalement);
        audit.enregistrer(ActionAudit.SIGNALEMENT_TRAITE, id, request.getDecision().name());
        return toSignalementResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminAnnonceDTO> getReexamens(Pageable pageable) {
        return bienImmoRepository.findByReexamenDemandeTrueOrderByDateReexamenAsc(pageable)
                .map(annonceMapper::toAdminDTO);
    }

    @Override
    @Transactional
    public int masquerAnnoncesCompte(UUID userId, String raison, String adminUsername) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        if (owner.isAdministrateur()) {
            throw new UnauthorizedActionException("Les annonces d'un administrateur ne peuvent pas être masquées.");
        }
        String motif = normaliserMotif(raison);
        // Aucune annonce n'est modifiée : le drapeau du compte les retire des vues publiques.
        owner.setAnnoncesMasquees(true);
        owner.setMotifMasquageAnnonces(motif);
        owner.setDateMasquageAnnonces(LocalDateTime.now());
        userRepository.save(owner);
        audit.enregistrer(ActionAudit.COMPTE_ANNONCES_MASQUEES, userId, motif);

        emailNotificationService.notifier(owner, "Vos annonces ont été masquées",
                "Vos annonces ont été masquées par la modération",
                "Vos annonces ne sont plus visibles du public. La publication et la modification "
                        + "d'annonces sont suspendues.\nMotif communiqué par la modération : " + motif);
        return (int) bienImmoRepository.countByOwnerIdAndActifTrueAndStatutModeration(userId, StatutAnnonce.PUBLIEE);
    }

    @Override
    @Transactional
    public int afficherAnnoncesCompte(UUID userId, String adminUsername) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        if (!owner.isAnnoncesMasquees()) {
            return 0;
        }
        owner.setAnnoncesMasquees(false);
        owner.setMotifMasquageAnnonces(null);
        owner.setDateMasquageAnnonces(null);
        userRepository.save(owner);
        audit.enregistrer(ActionAudit.COMPTE_ANNONCES_REAFFICHEES, userId);

        emailNotificationService.notifier(owner, "Vos annonces sont de nouveau visibles",
                "Vos annonces sont de nouveau visibles",
                "La modération a levé le masquage de vos annonces : vous pouvez à nouveau publier et modifier.");
        return (int) bienImmoRepository.countByOwnerIdAndActifTrueAndStatutModeration(userId, StatutAnnonce.PUBLIEE);
    }

    /** Motif visible par le propriétaire : obligatoire, 500 caractères max. */
    private static String normaliserMotif(String raison) {
        String motif = raison == null ? "" : raison.trim();
        if (motif.isEmpty()) {
            throw new IllegalArgumentException("Le motif est obligatoire : il est communiqué au propriétaire de l'annonce.");
        }
        if (motif.length() > 500) {
            throw new IllegalArgumentException("Le motif ne peut pas dépasser 500 caractères.");
        }
        return motif;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminAnnonceDTO> getAllAnnonces(StatutAnnonce statut, Boolean cloturee, String q, Pageable pageable) {
        String cloture = cloturee == null ? "TOUTES" : cloturee ? "CLOTUREES" : "OUVERTES";
        String texte = q == null ? "" : q.trim();
        // statut ignoré quand tousStatuts=true : valeur quelconque non nulle.
        return bienImmoRepository.rechercherPourAdmin(
                        statut == null, statut != null ? statut : StatutAnnonce.PUBLIEE, cloture, texte, pageable)
                .map(annonceMapper::toAdminDTO);
    }

    // ─── Utilisateurs ────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<UserDTO> rechercherUtilisateurs(String search, StatutUtilisateur statut, Pageable pageable, UUID adminId) {
        // statut ignoré quand tousStatuts=true : valeur quelconque non nulle.
        return userRepository.searchUsersExcluding(
                        search, adminId, statut == null, statut != null ? statut : StatutUtilisateur.ACTIF, pageable)
                .map(this::toUserDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserDTO> getPiecesIdentiteEnAttente(Pageable pageable) {
        return userRepository.findByStatutPieceIdentiteOrderByDateEnvoiVerificationAsc(StatutPieceIdentite.EN_ATTENTE, pageable)
                .map(this::toUserDTO);
    }

    @Override
    @Transactional
    public void octroierRole(UUID userId, TypeRole role, UUID adminId) {
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Vous ne pouvez pas modifier votre propre rôle.");
        }
        if (role == TypeRole.ADMINISTRATEUR) {
            throw new IllegalArgumentException(
                "L'attribution du rôle ADMINISTRATEUR n'est pas autorisée via cette API.");
        }
        if (role == TypeRole.AGENT_PROFESSIONNEL) {
            // Un agent est forcément rattaché à une entreprise : il se crée via
            // POST /api/entreprises/{id}/agents, pas par simple changement de rôle.
            throw new IllegalArgumentException(
                "Le rôle AGENT_PROFESSIONNEL s'attribue en créant l'agent depuis son entreprise.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + userId));
        refuserSiAdministrateur(user);
        com.app.AnnoncesAPI.entities.Role roleEntity = roleRepository.findByName(role)
                .orElseThrow(() -> new ResourceNotFoundException("Rôle introuvable : " + role));
        if (roleEntity.equals(user.getRole())) {
            throw new IllegalArgumentException("L'utilisateur possède déjà le rôle " + role);
        }
        String ancienRole = user.getRole() == null ? null : user.getRole().getName().name();
        user.setRole(roleEntity);
        userRepository.save(user);
        // Sessions fermées : un compte promu modérateur passe à la double authentification dès sa
        // connexion suivante, un compte rétrogradé perd ses accès (RG-01-41).
        sessionService.fermerToutesLesSessions(userId);
        audit.enregistrer(ActionAudit.COMPTE_ROLE_MODIFIE, userId, ancienRole + " → " + role);
    }

    @Override
    @Transactional
    public void revoquerRole(UUID userId, TypeRole role, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + userId));
        // Couvre aussi l'auto-révocation d'un admin.
        refuserSiAdministrateur(user);
        if (role == TypeRole.PARTICULIER) {
            throw new IllegalArgumentException("PARTICULIER est le rôle de base : il ne peut pas être révoqué.");
        }
        com.app.AnnoncesAPI.entities.Role roleEntity = roleRepository.findByName(role)
                .orElseThrow(() -> new ResourceNotFoundException("Rôle introuvable : " + role));
        if (!roleEntity.equals(user.getRole())) {
            throw new IllegalArgumentException("L'utilisateur ne possède pas le rôle " + role);
        }
        // Retour au rôle de base plutôt qu'à null : un compte sans rôle n'a aucune autorité
        // et casse les écrans qui supposent un rôle.
        user.setRole(roleRepository.findByName(TypeRole.PARTICULIER)
                .orElseThrow(() -> new IllegalStateException("Rôle PARTICULIER introuvable en base.")));
        userRepository.save(user);
        sessionService.fermerToutesLesSessions(userId);
        audit.enregistrer(ActionAudit.COMPTE_ROLE_MODIFIE, userId, role + " → " + TypeRole.PARTICULIER);
    }

    @Override
    @Transactional
    public void supprimerCompte(UUID userId, UUID adminId) {
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Vous ne pouvez pas supprimer votre propre compte depuis l'administration.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + userId));
        refuserSiAdministrateur(user);
        if (CompteSuppressionService.MOTIF_ANONYMISE.equals(user.getMotifStatut())) {
            throw new IllegalArgumentException("Ce compte a déjà été supprimé.");
        }
        compteSuppressionService.supprimerParAdministrateur(user);
        audit.enregistrer(ActionAudit.COMPTE_SUPPRIME, userId);
    }

    // ─── Avertissements ───────────────────────────────────────────────────

    @Override
    @Transactional
    public AvertissementResponse emettreAvertissement(UUID userId, AvertissementRequest request, String adminUsername, UUID adminId) {
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Vous ne pouvez pas émettre un avertissement contre vous-même.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + userId));
        refuserSiAdministrateur(user);

        // Même règle que UserServiceImpl.updateStatut : au 3e avertissement le compte est
        // suspendu automatiquement, un modérateur ne doit donc pas pouvoir viser un compte
        // privilégié (sinon il suspendrait un administrateur).
        if (user.isAdministrateur() || user.isModerateur()) {
            User emetteur = userRepository.findById(adminId)
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + adminId));
            if (!emetteur.isAdministrateur()) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Seul un administrateur peut avertir un modérateur ou un administrateur.");
            }
        }

        // Seuls les avertissements en vigueur (6 mois, non levés) comptent ; le modérateur peut choisir le niveau.
        long count = avertissementRepository.countEnVigueur(userId);
        NiveauAvertissement niveau = request.getNiveau() != null ? request.getNiveau() : niveauSelonRang(count);

        boolean suspendu = niveau == NiveauAvertissement.GRAVE
                && user.getStatut() != StatutUtilisateur.SUSPENDU;

        if (suspendu) {
            user.setStatut(StatutUtilisateur.SUSPENDU);
            user.setMotifStatut(request.getNiveau() == NiveauAvertissement.GRAVE && count < 2
                    ? "Suspension suite à un avertissement grave : " + request.getMotif()
                    : "Suspension automatique suite à " + (count + 1) + " avertissements.");
            userRepository.save(user);
            sessionService.fermerToutesLesSessions(userId);
        }

        Avertissement avert = new Avertissement();
        avert.setUtilisateur(user);
        avert.setMotif(request.getMotif());
        avert.setEmitPar(adminUsername);
        avert.setNiveau(niveau);
        avert.setSuspenduAutomatiquement(suspendu);

        AvertissementResponse response = toAvertissementResponse(avertissementRepository.save(avert));
        audit.enregistrer(ActionAudit.COMPTE_AVERTI, userId, niveau + " — " + request.getMotif());
        if (suspendu) {
            audit.enregistrer(ActionAudit.COMPTE_SUSPENDU_AUTOMATIQUEMENT, userId, user.getMotifStatut());
        }
        notifierAvertissement(user, niveau, request.getMotif(), suspendu);
        return response;
    }

    private static NiveauAvertissement niveauSelonRang(long enVigueur) {
        if (enVigueur == 0) return NiveauAvertissement.LEGER;
        if (enVigueur == 1) return NiveauAvertissement.MODERE;
        return NiveauAvertissement.GRAVE;
    }

    /** Email au titulaire (module 11, « Avertissement reçu ») : motif, niveau, durée de validité, suspension éventuelle. */
    private void notifierAvertissement(User user, NiveauAvertissement niveau, String motif, boolean suspendu) {
        String libelle = switch (niveau) {
            case LEGER -> "léger";
            case MODERE -> "modéré";
            case GRAVE -> "grave";
        };
        String message = "La modération vous a adressé un avertissement " + libelle + ".\nMotif : " + motif
                + "\nIl reste pris en compte pendant " + Avertissement.VALIDITE_MOIS + " mois. "
                + "Au troisième avertissement sur cette période, le compte est suspendu.";
        if (suspendu) {
            message += "\nVotre compte est désormais suspendu : vous ne pouvez plus vous connecter. "
                    + "Pour contester cette décision, répondez à cet e-mail.";
        }
        emailNotificationService.notifier(user, suspendu ? "Avertissement et suspension de votre compte"
                : "Avertissement de la modération", "Vous avez reçu un avertissement", message);
    }

    @Override
    @Transactional
    public AvertissementResponse leverAvertissement(UUID userId, Long avertissementId, String motif, String adminUsername) {
        Avertissement a = avertissementRepository.findById(avertissementId)
                .filter(x -> x.getUtilisateur().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Avertissement introuvable."));
        if (a.getDateLevee() != null) {
            throw new IllegalArgumentException("Cet avertissement a déjà été levé.");
        }
        a.setDateLevee(LocalDateTime.now());
        a.setLevePar(adminUsername);
        a.setMotifLevee(motif.trim());
        // La suspension éventuelle n'est pas levée : c'est une décision distincte (statut du compte).
        audit.enregistrer(ActionAudit.AVERTISSEMENT_LEVE, userId, a.getNiveau() + " du " + a.getDate().toLocalDate()
                + " — " + a.getMotifLevee());
        return toAvertissementResponse(avertissementRepository.save(a));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvertissementResponse> getAvertissements(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Utilisateur introuvable : " + userId);
        }
        return avertissementRepository.findByUtilisateurId(userId).stream()
                .map(this::toAvertissementResponse)
                .collect(Collectors.toList());
    }

    // ─── Modération messages ──────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<MessageModerationResponse> getMessagesSignales(Pageable pageable) {
        return messageRepository.findSignalesWithDetails(pageable)
                .map(this::toMessageModerationResponse);
    }

    @Override
    @Transactional
    public MessageModerationResponse supprimerMessage(Long messageId, String adminUsername) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable avec l'ID : " + messageId));
        if (message.getSupprime()) {
            throw new IllegalArgumentException("Ce message a déjà été supprimé.");
        }
        message.setSupprime(true);
        message.setSupprimePar(adminUsername);
        message.setDateSuppression(LocalDateTime.now());
        MessageModerationResponse response = toMessageModerationResponse(messageRepository.save(message));
        audit.enregistrer(ActionAudit.MESSAGE_SUPPRIME, messageId);
        return response;
    }

    @Override
    @Transactional
    public MessageModerationResponse ignorerSignalementMessage(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable avec l'ID : " + messageId));
        if (!Boolean.TRUE.equals(message.getSignale())) {
            throw new IllegalArgumentException("Ce message n'est pas signalé.");
        }
        message.setSignale(false);
        MessageModerationResponse response = toMessageModerationResponse(messageRepository.save(message));
        audit.enregistrer(ActionAudit.MESSAGE_SIGNALEMENT_IGNORE, messageId);
        return response;
    }

    @Override
    // Pas readOnly : la lecture d'une conversation privée est elle-même journalisée (DEC-02).
    @Transactional
    public Page<MessageModerationResponse> getMessagesConversationAdmin(Long conversationId, Pageable pageable) {
        // DEC-02 : une conversation privée n'est lisible que si l'un de ses messages a été signalé.
        // Même réponse qu'une conversation inexistante : l'identifiant, séquentiel, ne se sonde pas.
        if (!messageRepository.existsByConversationIdAndDateSignalementIsNotNull(conversationId)) {
            throw new ResourceNotFoundException("Conversation introuvable.");
        }
        Page<MessageModerationResponse> messages = messageRepository.findByConversationIdAdmin(conversationId, pageable)
                .map(this::toMessageModerationResponse);
        audit.enregistrer(ActionAudit.CONVERSATION_CONSULTEE, conversationId,
                "Page " + pageable.getPageNumber());
        return messages;
    }

    // ─── Helpers privés ──────────────────────────────────────────────────

    /**
     * Aucun admin n'agit sur un autre admin via l'API (rôle, avertissement…) : un compte
     * admin compromis ne doit pas pouvoir neutraliser les autres. Se fait uniquement en base.
     */
    private static void refuserSiAdministrateur(User cible) {
        if (cible.isAdministrateur()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Cette action n'est pas autorisée sur un compte administrateur.");
        }
    }

    /** Informe le propriétaire d'une décision de modération (envoi après commit). */
    private void notifierProprietaire(Annonce annonce, String sujet, String titre, String motif) {
        StringBuilder message = new StringBuilder()
                .append("Annonce : « ").append(annonce.getTitre()).append(" » (réf. ")
                .append(annonce.getReferenceAnnonce()).append(").");
        if (motif != null && !motif.isBlank()) {
            message.append("\nMotif communiqué par la modération : ").append(motif);
        }
        emailNotificationService.notifier(annonce.getOwner(), sujet, titre, message.toString());
    }

    private Annonce findAnnonce(Long id) {
        return annonceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Annonce introuvable avec l'ID : " + id));
    }

    private void logHistorique(Annonce annonce, String champ, String ancienne, String nouvelle, String modifiePar) {
        HistoriqueAnnonce h = new HistoriqueAnnonce();
        h.setAnnonce(annonce);
        h.setChamp(champ);
        h.setAncienneValeur(ancienne);
        h.setNouvelleValeur(nouvelle);
        h.setModifiePar(modifiePar);
        historiqueAnnonceRepository.save(h);
    }

    private UserDTO toUserDTO(User u) {
        // URL d'API authentifiée — jamais le path filesystem
        String pieceIdentiteApiUrl = (u.getPieceIdentiteUrl() != null && !u.getPieceIdentiteUrl().isBlank())
                ? "/api/users/" + u.getId() + "/piece-identite"
                : null;
        return UserDTO.builder()
                .id(u.getId())
                .email(u.getEmail())
                .nom(u.getNom())
                .prenom(u.getPrenom())
                .telephone(u.getTelephone())
                .typePieceIdentite(u.getTypePieceIdentite())
                .numeroPieceIdentite(u.getNumeroPieceIdentite())
                .pieceIdentiteUrl(pieceIdentiteApiUrl)
                .statutPieceIdentite(u.getStatutPieceIdentite())
                .motifRejetPieceIdentite(u.getMotifRejetPieceIdentite())
                .selfieFourni(u.getSelfieUrl() != null && !u.getSelfieUrl().isBlank())
                .dateEnvoiVerification(u.getDateEnvoiVerification())
                .dateDecisionVerification(u.getDateDecisionVerification())
                .statut(u.getStatut())
                .motifStatut(u.getMotifStatut())
                .createdAt(u.getCreatedAt())
                .role(u.getRole() == null ? null : u.getRole().getName().name())
                .nbAvertissements(avertissementRepository.countEnVigueur(u.getId()))
                .annoncesMasquees(u.isAnnoncesMasquees())
                .motifMasquageAnnonces(u.getMotifMasquageAnnonces())
                .dateMasquageAnnonces(u.getDateMasquageAnnonces())
                .build();
    }

    private SignalementResponse toSignalementResponse(Signalement s) {
        return SignalementResponse.builder()
                .id(s.getId())
                .annonceId(s.getAnnonce() != null ? s.getAnnonce().getId() : null)
                .referenceAnnonce(s.getAnnonce() != null ? s.getAnnonce().getReferenceAnnonce() : null)
                .titreAnnonce(s.getAnnonce() != null ? s.getAnnonce().getTitre() : null)
                .reporterId(s.getReporter() != null ? s.getReporter().getId() : null)
                .reporterUsername(s.getReporter() != null ? s.getReporter().getEmail() : null)
                .motif(s.getMotif())
                .commentaire(s.getCommentaire())
                .date(s.getDate())
                .annule(s.getAnnule())
                .dateAnnulation(s.getDateAnnulation())
                .statut(s.getStatut())
                .traitePar(s.getTraitePar())
                .dateTraitement(s.getDateTraitement())
                .noteAdmin(s.getNoteAdmin())
                .annonceMasqueeAutomatiquement(s.getAnnonce() != null && s.getAnnonce().isMasquageAutomatique())
                .build();
    }

    private AvertissementResponse toAvertissementResponse(Avertissement a) {
        return AvertissementResponse.builder()
                .id(a.getId())
                .utilisateurId(a.getUtilisateur().getId())
                .motif(a.getMotif())
                .emitPar(a.getEmitPar())
                .niveau(a.getNiveau())
                .suspenduAutomatiquement(a.getSuspenduAutomatiquement())
                .date(a.getDate())
                .enVigueur(a.estEnVigueur(LocalDateTime.now()))
                .dateExpiration(a.getDate() != null ? a.getDate().plusMonths(Avertissement.VALIDITE_MOIS) : null)
                .dateLevee(a.getDateLevee())
                .levePar(a.getLevePar())
                .motifLevee(a.getMotifLevee())
                .build();
    }

    private MessageModerationResponse toMessageModerationResponse(Message m) {
        Annonce annonce = m.getConversation().getAnnonce();
        String content = Boolean.TRUE.equals(m.getSupprime()) ? MSG_SUPPRIME : m.getContent();
        return MessageModerationResponse.builder()
                .id(m.getId())
                .conversationId(m.getConversation().getId())
                .annonceId(annonce != null ? annonce.getId() : null)
                .annonceReference(annonce != null ? annonce.getReferenceAnnonce() : null)
                .annonceTitre(annonce != null ? annonce.getTitre() : null)
                .senderId(m.getSender().getId())
                .senderUsername(m.getSender().getEmail())
                .content(content)
                .createdAt(m.getCreatedAt())
                .signale(m.getSignale())
                .motifSignalement(m.getMotifSignalement() != null ? m.getMotifSignalement().name() : null)
                .dateSignalement(m.getDateSignalement())
                .signaleParId(m.getSignalePar() != null ? m.getSignalePar().getId() : null)
                .signaleParUsername(m.getSignalePar() != null ? m.getSignalePar().getEmail() : null)
                .supprime(m.getSupprime())
                .supprimePar(m.getSupprimePar())
                .dateSuppression(m.getDateSuppression())
                .build();
    }
}
