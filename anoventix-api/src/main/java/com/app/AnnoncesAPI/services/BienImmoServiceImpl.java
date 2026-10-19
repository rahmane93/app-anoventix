package com.app.AnnoncesAPI.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.Utilities.Utility;
import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.BienImmoDTO;
import com.app.AnnoncesAPI.dto.HistoriqueAnnonceDTO;
import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.HistoriqueAnnonce;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.entities.Signalement;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.exceptions.UnauthorizedActionException;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.payload.request.AnnonceRequest;
import com.app.AnnoncesAPI.payload.request.BienImmoRequest;
import com.app.AnnoncesAPI.payload.response.SignalementResponse;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.HistoriqueAnnonceRepository;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.SignalementRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.security.VueCountTracker;
import com.app.AnnoncesAPI.services.media.MediaService;
import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;

import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.repositories.BienImmoSpecification;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

@Service
public class BienImmoServiceImpl implements BienImmoService {

    private final BienImmoRepository bienImmoRepository;
    private final AnnonceRepository annonceRepository;
    private final AnnonceMapper annonceMapper;
    private final UserRepository userRepository;
    private final LocalisationRepository localisationRepository;
    private final MediaService mediaService;
    private final SignalementRepository signalementRepository;
    private final HistoriqueAnnonceRepository historiqueAnnonceRepository;
    private final VueCountTracker vueCountTracker;
    private final AnnonceExpirationService annonceExpirationService;
    private final LicenceService licenceService;
    private final QuotaEntrepriseService quotaService;
    private final MediaRepository mediaRepository;
    private final ModerationAnnonceService moderation;
    private final QuartierDemandeService quartierDemandeService;

    public BienImmoServiceImpl(BienImmoRepository bienImmoRepository,
                               AnnonceRepository annonceRepository,
                               AnnonceMapper annonceMapper,
                               UserRepository userRepository,
                               LocalisationRepository localisationRepository,
                               MediaService mediaService,
                               SignalementRepository signalementRepository,
                               HistoriqueAnnonceRepository historiqueAnnonceRepository,
                               VueCountTracker vueCountTracker,
                               AnnonceExpirationService annonceExpirationService,
                               LicenceService licenceService,
                               QuotaEntrepriseService quotaService,
                               MediaRepository mediaRepository,
                               ModerationAnnonceService moderation,
                               QuartierDemandeService quartierDemandeService) {
        this.quartierDemandeService = quartierDemandeService;
        this.mediaRepository = mediaRepository;
        this.moderation = moderation;
        this.bienImmoRepository = bienImmoRepository;
        this.annonceRepository = annonceRepository;
        this.annonceMapper = annonceMapper;
        this.userRepository = userRepository;
        this.localisationRepository = localisationRepository;
        this.mediaService = mediaService;
        this.signalementRepository = signalementRepository;
        this.historiqueAnnonceRepository = historiqueAnnonceRepository;
        this.vueCountTracker = vueCountTracker;
        this.annonceExpirationService = annonceExpirationService;
        this.licenceService = licenceService;
        this.quotaService = quotaService;
    }

    @Override
    @Transactional
    public BienImmoDTO createAnnonce(AnnonceRequest annonceRequest, Authentication authentication) {
        if (!(annonceRequest instanceof BienImmoRequest)) {
            throw new IllegalArgumentException("BienImmoService ne peut traiter que des BienImmoRequest");
        }
        BienImmoRequest request = (BienImmoRequest) annonceRequest;
        MediaService.verifierAuMoinsUnePhoto(request.getMedias());

        User user = getCurrentUser(authentication);

        // Vérification : la pièce d'identité doit être validée
        if (user.getStatutPieceIdentite() == null ||
                user.getStatutPieceIdentite() != com.app.AnnoncesAPI.enums.StatutPieceIdentite.VALIDEE) {
            throw new IllegalStateException(
                "Votre pièce d'identité doit être validée avant de pouvoir publier une annonce.");
        }

        // Vérification : un professionnel doit avoir une entreprise avant de publier
        boolean isProfessionnel = user.isAnnonceurProfessionnel();
        if (isProfessionnel && user.getEntreprise() == null) {
            throw new IllegalStateException(
                "Vous devez créer votre entreprise avant de pouvoir publier une annonce.");
        }

        MasquageCompte.verifierAnnoncesNonMasquees(user);
        verifierQuotaEntreprise(user);
        licenceService.verifierPublication(user);

        Localisation localisation = localisationRepository.findById(request.getLocalisationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Localisation introuvable avec l'ID : " + request.getLocalisationId()));

        BienImmo bienImmo = annonceMapper.bienImmoRequestToEntity(request);
        bienImmo.setDocumentsDisponibles(com.app.AnnoncesAPI.enums.DocumentDisponible.normaliser(bienImmo.getDocumentsDisponibles()));
        validerHierarchie(bienImmo.getTypeAnnonce(), bienImmo.getTypeBien(), bienImmo.getTypeUsage());
        normaliserComposition(bienImmo);
        if (bienImmo.getFraisHonoraire() == null) {
            bienImmo.setFraisHonoraire(java.math.BigDecimal.ZERO);
        }
        bienImmo.setLocalisation(localisation);
        bienImmo.setOwner(user);
        bienImmo.setActif(true);
        annonceExpirationService.prolonger(bienImmo);

        String reference = Utility.generateUniqueReference(
                bienImmo.getTypeAnnonce().getPrefix(), 4, ref -> !bienImmoRepository.existsByReferenceAnnonce(ref));
        bienImmo.setReferenceAnnonce(reference);

        List<Media> medias = mediaService.createMediaEntities(request.getMedias(), bienImmo);
        bienImmo.setMedias(medias);

        BienImmo saved = bienImmoRepository.save(bienImmo);
        // Quartier absent de la liste : l'annonce est sur la commune, le nom saisi devient une demande d'ajout (DEC-22).
        if (localisation.isTechnique()) {
            quartierDemandeService.enregistrerDemande(saved, request.getQuartierSaisi(), user);
        }

        return annonceMapper.bienImmoEntityToDTO(saved);
    }

    @Override
    @Transactional
    public BienImmoDTO updateAnnonce(Long id, AnnonceRequest annonceRequest, Authentication authentication) {
        if (!(annonceRequest instanceof BienImmoRequest)) {
            throw new IllegalArgumentException("BienImmoService ne peut traiter que des BienImmoRequest");
        }
        BienImmoRequest request = (BienImmoRequest) annonceRequest;

        // Modifiable : en ligne, ou masquée par la modération (DEC-09) — pas rejetée, clôturée ni supprimée.
        BienImmo existing = bienImmoRepository.findById(id)
                .filter(a -> Boolean.TRUE.equals(a.getActif()) || a.getStatutModeration() == StatutAnnonce.MASQUEE)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable avec l'ID : " + id));

        User user = getCurrentUser(authentication);
        if (!isOwnerOrModerator(user, existing)
                || (existing.getStatutModeration() == StatutAnnonce.MASQUEE && !estProprietaireOuParent(user, existing))) {
            throw new AccessDeniedException("Vous n'êtes pas autorisé à modifier ce bien immobilier.");
        }
        MasquageCompte.verifierAnnoncesNonMasquees(user);
        licenceService.verifierNonBloque(user);

        Localisation localisation = localisationRepository.findById(request.getLocalisationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Localisation introuvable avec l'ID : " + request.getLocalisationId()));

        // Capture des anciennes valeurs pour l'historique
        String ancienTitre = existing.getTitre();
        String ancienPrix = existing.getPrix() != null ? existing.getPrix().toPlainString() : null;
        String ancienneDescription = existing.getDescription();

        annonceMapper.updateBienImmoFromRequest(request, existing);
        existing.setDocumentsDisponibles(com.app.AnnoncesAPI.enums.DocumentDisponible.normaliser(existing.getDocumentsDisponibles()));
        if (existing.getFraisHonoraire() == null) {
            existing.setFraisHonoraire(BigDecimal.ZERO);
        }
        validerHierarchie(existing.getTypeAnnonce(), existing.getTypeBien(), existing.getTypeUsage());
        normaliserComposition(existing);
        existing.setLocalisation(localisation);

        BienImmo updated = bienImmoRepository.save(existing);
        if (localisation.isTechnique()) {
            quartierDemandeService.enregistrerDemande(updated, request.getQuartierSaisi(), user);
        }

        // Enregistrement de l'historique des champs modifiés
        String modifiePar = user.getEmail();
        enregistrerChangement(updated, "titre", ancienTitre, updated.getTitre(), modifiePar);
        enregistrerChangement(updated, "prix", ancienPrix,
                updated.getPrix() != null ? updated.getPrix().toPlainString() : null, modifiePar);
        enregistrerChangement(updated, "description", ancienneDescription, updated.getDescription(), modifiePar);

        return annonceMapper.bienImmoEntityToDTO(updated);
    }

    @Override
    @Transactional
    public void deleteAnnonce(Long id, Authentication authentication) {
        // findById (et non findByIdAndActifTrue) : la suppression doit être possible
        // depuis tout état (publiée, masquée, clôturée).
        BienImmo existing = bienImmoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable avec l'ID : " + id));

        User user = getCurrentUser(authentication);
        if (!isOwnerOrModerator(user, existing)) {
            throw new AccessDeniedException("Vous n'êtes pas autorisé à supprimer ce bien immobilier.");
        }

        // Suppression propriétaire = désactivation : invisible au public et au
        // propriétaire, ne reste visible/réactivable que pour les mod/admins.
        existing.setStatutModeration(com.app.AnnoncesAPI.enums.StatutAnnonce.DESACTIVEE);
        existing.setActif(false);
        existing.setMotifCloture(null);
        existing.setDateCloture(null);
        bienImmoRepository.save(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AnnonceDTO> getAllAnnonces(Pageable pageable) {
        return bienImmoRepository.findByVisiblePublicTrue(pageable)
                .map(annonceMapper::bienImmoEntityToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AnnonceDTO> getAnnonceById(Long id, Authentication authentication) {
        return bienImmoRepository.findById(id)
                .filter(annonce -> estVisiblePour(annonce, authentication))
                .map(annonceMapper::bienImmoEntityToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AnnonceDTO> getAnnonceByPublicId(String publicId, Authentication authentication) {
        return bienImmoRepository.findByPublicId(publicId)
                .filter(annonce -> estVisiblePour(annonce, authentication))
                .map(annonceMapper::bienImmoEntityToDTO);
    }

    private boolean estVisiblePour(BienImmo annonce, Authentication authentication) {
        User user = isRealUser(authentication) ? getCurrentUser(authentication) : null;

        // Admin/Mod → tout sans filtre
        if (user != null && isAdminOrMod(user)) {
            return true;
        }

        // Propriétaire → toutes ses annonces, tout statut (y compris clôturées et
        // masquées, donc actif=false), SAUF celles qu'il a lui-même supprimées.
        if (user != null && annonce.getOwner().getId().equals(user.getId())) {
            return annonce.getStatutModeration() != StatutAnnonce.DESACTIVEE;
        }

        // Public → actif, publiée, compte non masqué
        return annonce.estVisiblePubliquement();
    }

    private boolean isRealUser(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken);
    }

    private boolean isAdminOrMod(User user) {
        return user.isAdministrateur() || user.isModerateur();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AnnonceDTO> findAnnoncesByUser(Authentication authentication, Pageable pageable) {
        User user = getCurrentUser(authentication);
        // Annonces du propriétaire y compris masquées/rejetées (modération) et clôturées,
        // MAIS hors désactivées/supprimées par lui-même (DESACTIVEE) — visibles seulement
        // des mod/admins.
        return bienImmoRepository.findByOwnerIdAndStatutModerationNot(
                user.getId(), com.app.AnnoncesAPI.enums.StatutAnnonce.DESACTIVEE, pageable)
                .map(annonceMapper::bienImmoEntityToDTO);
    }

    @Override
    @Transactional
    public AnnonceDTO addMedias(List<MultipartFile> files, Long bienImmoId, Authentication authentication) {
        return mediaService.addMedias(files, bienImmoId, authentication);
    }


    @Override
    @Transactional(readOnly = true)
    public Page<AnnonceDTO> filterAnnonces(
            String reference,
            TypeAnnonce typeAnnonce,
            TypeBien typeBien,
            TypeUsage typeUsage,
            BigDecimal prixMin,
            BigDecimal prixMax,
            String region,
            String prefecture,
            String commune,
            String quartier,
            String q,
            Integer nbPiecesMin,
            Integer nbChambresMin,
            Double surfaceMin,
            Double surfaceMax,
            Pageable pageable) {
        // Recherche texte combinable avec les filtres : on restreint aux IDs
        // renvoyés par la recherche plein texte (liste vide → aucun résultat).
        List<Long> idsTexte = (q == null || q.isBlank())
            ? null
            : bienImmoRepository.findIdsByFullTextSearch(q.trim());
        return bienImmoRepository
            .findAll(BienImmoSpecification.buildFilter(
                reference, typeAnnonce, typeBien, typeUsage,
                prixMin, prixMax, region, prefecture, commune, quartier,
                idsTexte, nbPiecesMin, nbChambresMin, surfaceMin, surfaceMax), pageable)
            .map(annonceMapper::bienImmoEntityToDTO);
    }

    @Override
    @Transactional
    public void incrementVueCount(Long id, String viewerKey) {
        if (vueCountTracker.tryRecordView(id, viewerKey)) {
            annonceRepository.incrementVueCount(id);
        }
    }

    @Override
    @Transactional
    public void toggleActif(Long id, Authentication authentication) {
        User user = getCurrentUser(authentication);
        BienImmo bienImmo = bienImmoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable : " + id));
        // Le propriétaire (ou le PROFESSIONNEL parent pour une annonce d'agent) ainsi
        // que les ADMIN/MOD peuvent masquer/afficher l'annonce.
        if (!isOwnerParentOrModerator(user, bienImmo)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Vous n'êtes pas autorisé à modifier la visibilité de cette annonce.");
        }
        // Ne pas permettre la réactivation d'une annonce rejetée via toggleActif
        if (!bienImmo.getActif()
                && com.app.AnnoncesAPI.enums.StatutAnnonce.REJETEE.equals(bienImmo.getStatutModeration())) {
            throw new IllegalStateException(
                    "Une annonce rejetée ne peut pas être réactivée. Utilisez l'endpoint de publication.");
        }
        // Idem pour une annonce masquée par la modération : sinon le propriétaire la repasse
        // en actif=true (statut toujours MASQUEE) et elle réapparaît sur le profil public
        // de l'entreprise et dans les stats. Seule la modération peut la republier.
        if (!bienImmo.getActif()
                && StatutAnnonce.MASQUEE.equals(bienImmo.getStatutModeration())
                && !isAdminOrMod(user)) {
            throw new IllegalStateException(
                    "Cette annonce a été masquée par la modération et ne peut pas être réactivée par son propriétaire.");
        }
        // Masquer ≠ supprimer : masquer ne touche qu'à « actif » (statut inchangé, l'annonce
        // reste dans « Mes annonces ») ; une annonce supprimée (DESACTIVEE) est définitive
        // pour son propriétaire, seule la modération peut la restaurer.
        boolean reactivation = !bienImmo.getActif();
        if (reactivation) {
            if (StatutAnnonce.DESACTIVEE.equals(bienImmo.getStatutModeration())) {
                if (!isAdminOrMod(user)) {
                    throw new IllegalStateException(
                            "Cette annonce a été supprimée : elle ne peut plus être remise en ligne.");
                }
                bienImmo.setStatutModeration(StatutAnnonce.PUBLIEE);
            }
            if (!isAdminOrMod(user)) {
                verifierQuotaEntreprise(bienImmo.getOwner());
                MasquageCompte.verifierAnnoncesNonMasquees(bienImmo.getOwner());
                licenceService.verifierPublication(bienImmo.getOwner());
            }
            // Réafficher une annonce clôturée lève la clôture (sinon le client la dérive
            // encore comme CLOTUREE tant que motifCloture est renseigné).
            if (bienImmo.getMotifCloture() != null) {
                bienImmo.setMotifCloture(null);
                bienImmo.setDateCloture(null);
            }
            prolongerValidite(bienImmo);
        }
        bienImmo.setActif(!bienImmo.getActif());
        bienImmoRepository.save(bienImmo);
    }

    @Override
    @Transactional
    public void signalerAnnonce(Long id, com.app.AnnoncesAPI.enums.MotifSignalement motif, String commentaire, Authentication authentication) {
        BienImmo bienImmo = bienImmoRepository.findById(id)
                .filter(BienImmo::estVisiblePubliquement)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable : " + id));
        User reporter = getCurrentUser(authentication);
        if (bienImmo.getOwner().getId().equals(reporter.getId())) {
            throw new IllegalArgumentException("Vous ne pouvez pas signaler votre propre annonce.");
        }
        // La base impose UN signalement par (annonce, utilisateur) (uq_signalement_annonce_reporter).
        // S'il existe déjà : actif → refus ; retiré par l'utilisateur → on le rouvre
        // (une nouvelle ligne violerait la contrainte → erreur 500).
        Signalement signalement = signalementRepository.findByAnnonceIdAndReporterId(id, reporter.getId())
                .orElse(null);
        if (signalement != null && !Boolean.TRUE.equals(signalement.getAnnule())) {
            throw new IllegalStateException("Vous avez déjà signalé cette annonce.");
        }
        if (signalement == null) {
            signalement = new Signalement();
            signalement.setAnnonce(bienImmo);
            signalement.setReporter(reporter);
        } else {
            signalement.setAnnule(false);
            signalement.setDateAnnulation(null);
            signalement.setStatut(com.app.AnnoncesAPI.enums.StatutSignalement.EN_ATTENTE);
            signalement.setTraitePar(null);
            signalement.setDateTraitement(null);
            signalement.setNoteAdmin(null);
        }
        signalement.setMotif(motif.getLibelle());
        signalement.setCodeMotif(motif.name());
        signalement.setCommentaire(commentaire);
        signalementRepository.save(signalement);
        // DEC-11 : trois signalements « arnaque / fraude » masquent l'annonce en attendant la modération.
        if (motif == com.app.AnnoncesAPI.enums.MotifSignalement.ARNAQUE_FRAUDE) {
            moderation.evaluerSignalements(bienImmo);
        }
    }

    @Override
    @Transactional
    public void demanderReexamen(Long id, String message, Authentication authentication) {
        BienImmo bienImmo = bienImmoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable : " + id));
        User user = getCurrentUser(authentication);
        if (!estProprietaireOuParent(user, bienImmo)) {
            throw new AccessDeniedException("Seul le propriétaire peut demander le réexamen de son annonce.");
        }
        MasquageCompte.verifierAnnoncesNonMasquees(bienImmo.getOwner());
        moderation.demanderReexamen(bienImmo, message, user);
    }

    @Override
    @Transactional
    public void retirerSignalement(Long annonceId, Authentication authentication) {
        User reporter = getCurrentUser(authentication);
        Signalement signalement = signalementRepository
                .findByAnnonceIdAndReporterEmailAndAnnuleFalse(
                        annonceId, reporter.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Aucun signalement actif trouvé pour cette annonce."));
        signalement.setAnnule(true);
        signalement.setDateAnnulation(java.time.LocalDateTime.now());
        signalementRepository.save(signalement);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SignalementResponse> getMesSignalements(Authentication authentication, Pageable pageable) {
        User user = getCurrentUser(authentication);
        return signalementRepository.findByReporterEmail(user.getEmail(), pageable)
                .map(s -> SignalementResponse.builder()
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
                        // Vue du signaleur : ni l'identité du modérateur ni sa note interne.
                        .traitePar(null)
                        .dateTraitement(s.getDateTraitement())
                        .noteAdmin(null)
                        .build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnnonceDTO> findSimilaires(Long id, int max) {
        BienImmo bien = bienImmoRepository.findById(id)
                .filter(BienImmo::estVisiblePubliquement)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable : " + id));
        BigDecimal prix = bien.getPrix();
        BigDecimal prixMin = prix.multiply(BigDecimal.valueOf(0.70)).setScale(0, java.math.RoundingMode.FLOOR);
        BigDecimal prixMax = prix.multiply(BigDecimal.valueOf(1.30)).setScale(0, java.math.RoundingMode.CEILING);
        String commune = bien.getLocalisation().getCommune();
        Pageable limit = PageRequest.of(0, Math.min(max, 20));
        return bienImmoRepository
                .findSimilaires(id, bien.getTypeBien(), bien.getLocalisation().getPrefecture(), commune, prixMin, prixMax, limit)
                .stream()
                .map(annonceMapper::bienImmoEntityToDTO)
                .collect(Collectors.toList());
    }

    private void validerHierarchie(TypeAnnonce typeAnnonce, TypeBien typeBien, TypeUsage typeUsage) {
        if (typeAnnonce != null && typeBien != null && !typeAnnonce.accepte(typeBien)) {
            throw new IllegalArgumentException(
                "Le type de bien '" + typeBien + "' n'est pas compatible avec le type d'annonce '" + typeAnnonce + "'.");
        }
        if (typeBien != null && typeUsage != null && !typeBien.accepte(typeUsage)) {
            throw new IllegalArgumentException(
                "L'usage '" + typeUsage + "' n'est pas compatible avec le type de bien '" + typeBien + "'.");
        }
    }

    /**
     * Pièces / chambres / salles de bain : sans objet pour un bien non bâti
     * (terrain ou domaine vendu/loué en l'état) → remis à null. Pour un bien bâti,
     * on rejette les valeurs incohérentes (la mise à jour n'est pas annotée @Valid).
     */
    /** Caution et avance n'ont de sens que pour une location ou un bail (DEC-23, RG-03-34). */
    private void normaliserCautionAvance(BienImmo bien) {
        if (bien.getTypeAnnonce() == com.app.AnnoncesAPI.enums.TypeAnnonce.VENTE) {
            bien.setCautionMois(null);
            bien.setAvanceMois(null);
        }
    }

    private void normaliserComposition(BienImmo bien) {
        normaliserCautionAvance(bien);
        if (bien.getTypeBien() != null && !bien.getTypeBien().estBati()) {
            bien.setNbPieces(null);
            bien.setNbChambres(null);
            bien.setNbSallesBain(null);
            return;
        }
        verifierBorne("pièces", bien.getNbPieces(), 1, 100);
        verifierBorne("chambres", bien.getNbChambres(), 0, 50);
        verifierBorne("salles de bain", bien.getNbSallesBain(), 0, 50);
        if (bien.getNbPieces() != null && bien.getNbChambres() != null
                && bien.getNbChambres() > bien.getNbPieces()) {
            throw new IllegalArgumentException(
                "Le nombre de chambres ne peut pas dépasser le nombre de pièces.");
        }
    }

    private static void verifierBorne(String libelle, Integer valeur, int min, int max) {
        if (valeur != null && (valeur < min || valeur > max)) {
            throw new IllegalArgumentException(
                "Le nombre de " + libelle + " doit être compris entre " + min + " et " + max + ".");
        }
    }

    /**
     * Pro et agents : l'entreprise doit être active et sous son quota d'annonces actives.
     * Appliqué à la création ET à toute remise en ligne (sinon on contourne le quota en
     * clôturant puis réactivant).
     */
    private void verifierQuotaEntreprise(User owner) {
        var entreprise = owner.getEntreprise();
        if (entreprise == null) return;
        if (!Boolean.TRUE.equals(entreprise.getActive())) {
            throw new IllegalStateException(
                "Votre entreprise est désactivée : la publication d'annonces est suspendue.");
        }
        if (!quotaService.peutCreerAnnonce(entreprise, quotaService.annoncesActives(entreprise))) {
            throw new IllegalStateException(
                "Quota d'annonces actives atteint (" + quotaService.quotaAnnonces(entreprise) + " maximum).");
        }
    }

    private void prolongerValidite(BienImmo bienImmo) {
        annonceExpirationService.prolonger(bienImmo);
    }

    private boolean isAuthorizedToViewStats(User user, BienImmo bienImmo) {
        return isOwnerParentOrModerator(user, bienImmo);
    }

    /**
     * Autorise le propriétaire de l'annonce, le PROFESSIONNEL parent (cas d'une
     * annonce publiée par un agent), ainsi que les ADMINISTRATEUR / MODERATEUR.
     */
    private boolean isOwnerParentOrModerator(User user, BienImmo bienImmo) {
        if (bienImmo.getOwner().getId().equals(user.getId())) return true;
        User owner = bienImmo.getOwner();
        if (owner.getEntreprise() != null
                && owner.getEntreprise().getAnnonceurProfessionnel() != null
                && owner.getEntreprise().getAnnonceurProfessionnel().getId().equals(user.getId())) {
            return true;
        }
        return user.isAdministrateur() || user.isModerateur();
    }

    private boolean isOwnerOrModerator(User user, BienImmo bienImmo) {
        return isOwnerParentOrModerator(user, bienImmo);
    }

    /** Le propriétaire, ou le professionnel dont l'agent est propriétaire (DEC-27). */
    private boolean estProprietaireOuParent(User user, BienImmo bienImmo) {
        if (bienImmo.getOwner().getId().equals(user.getId())) {
            return true;
        }
        User owner = bienImmo.getOwner();
        return owner.getEntreprise() != null
                && owner.getEntreprise().getAnnonceurProfessionnel() != null
                && owner.getEntreprise().getAnnonceurProfessionnel().getId().equals(user.getId());
    }

    private User getCurrentUser(Authentication authentication) {
        UUID userId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
    }

    // ─── Historique ───────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<HistoriqueAnnonceDTO> getHistoriqueAnnonce(Long id, Authentication authentication) {
        BienImmo bienImmo = bienImmoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable : " + id));
        User user = getCurrentUser(authentication);
        if (!isOwnerOrModerator(user, bienImmo)) {
            throw new AccessDeniedException("Accès refusé : historique réservé au propriétaire ou à un ADMIN/MOD.");
        }
        return historiqueAnnonceRepository.findByAnnonceId(id).stream()
                .map(h -> new HistoriqueAnnonceDTO(
                        h.getId(), h.getAnnonce().getId(),
                        h.getChamp(), h.getAncienneValeur(), h.getNouvelleValeur(),
                        h.getModifiePar(), h.getDateModification()))
                .collect(Collectors.toList());
    }

    /** Sauvegarde une entrée d'historique uniquement si la valeur a changé. */
    private void enregistrerChangement(BienImmo annonce, String champ,
                                       String ancienne, String nouvelle, String modifiePar) {
        if (ancienne == null && nouvelle == null) return;
        if (ancienne != null && ancienne.equals(nouvelle)) return;
        HistoriqueAnnonce h = new HistoriqueAnnonce();
        h.setAnnonce(annonce);
        h.setChamp(champ);
        h.setAncienneValeur(ancienne);
        h.setNouvelleValeur(nouvelle);
        h.setModifiePar(modifiePar);
        historiqueAnnonceRepository.save(h);
    }

    // ─── Géospatiale ──────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<com.app.AnnoncesAPI.dto.ZoneActiveDTO> findZonesActives(int limit) {
        return bienImmoRepository.findZonesActives(PageRequest.of(0, limit));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AnnonceDTO> findNearby(double lat, double lng, double rayonKm, TypeAnnonce typeAnnonce, TypeBien typeBien,
                                       BigDecimal prixMin, BigDecimal prixMax, Pageable pageable) {
        // Filtres et pagination côté SQL (ECART-33, ECART-46) : un filtre appliqué à la page déjà chargée perdait des résultats.
        String ta = typeAnnonce == null ? null : typeAnnonce.name();
        String tb = typeBien == null ? null : typeBien.name();
        List<Long> pageIds = bienImmoRepository.findIdsByProximitePage(lat, lng, rayonKm, ta, tb, prixMin, prixMax,
                pageable.getPageSize(), pageable.getOffset());
        long total = pageIds.isEmpty() && pageable.getOffset() == 0
                ? 0 : bienImmoRepository.countByProximite(lat, lng, rayonKm, ta, tb, prixMin, prixMax);
        return new PageImpl<>(chargerDansLOrdre(pageIds), pageable, total);
    }

    /**
     * {@code findAllById} ne garantit aucun ordre : on restitue celui des IDs, calculé par
     * la requête native (pertinence full-text, distance), sinon le tri est perdu.
     */
    private List<AnnonceDTO> chargerDansLOrdre(List<Long> ids) {
        java.util.Map<Long, BienImmo> parId = bienImmoRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(BienImmo::getId, b -> b));
        return ids.stream()
                .map(parId::get)
                .filter(java.util.Objects::nonNull)
                .map(annonceMapper::bienImmoEntityToDTO)
                .collect(Collectors.toList());
    }

    // ─── Clôture ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void cloturerAnnonce(Long id, MotifCloture motif, Authentication authentication) {
        User user = getCurrentUser(authentication);
        BienImmo bienImmo = bienImmoRepository.findByIdAndActifTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable : " + id));
        if (!estProprietaireOuParent(user, bienImmo)) {
            throw new AccessDeniedException("Seul le propriétaire (ou son entreprise) peut clôturer l'annonce.");
        }
        bienImmo.setActif(false);
        bienImmo.setMotifCloture(motif);
        bienImmo.setDateCloture(LocalDateTime.now());
        bienImmoRepository.save(bienImmo);
    }

    @Override
    @Transactional
    public void reactiver(Long id, Authentication authentication) {
        User user = getCurrentUser(authentication);
        BienImmo bienImmo = bienImmoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable : " + id));
        if (!estProprietaireOuParent(user, bienImmo)) {
            throw new AccessDeniedException("Seul le propriétaire (ou son entreprise) peut réactiver l'annonce.");
        }
        if (bienImmo.getMotifCloture() == null) {
            throw new IllegalStateException("Cette annonce n'a pas été clôturée par son propriétaire et ne peut pas être réactivée via cet endpoint.");
        }
        // Une annonce clôturée puis masquée / rejetée par la modération ne se remet pas
        // en ligne par cet endpoint (elle passerait actif=true en restant MASQUEE).
        if (bienImmo.getStatutModeration() != StatutAnnonce.PUBLIEE) {
            throw new IllegalStateException(
                    "Cette annonce a été retirée par la modération et ne peut pas être réactivée.");
        }
        // Les photos d'une annonce clôturée depuis plus de 12 mois sont supprimées (DEC-26) : elle ne
        // repasse pas en ligne sans photo.
        if (mediaRepository.findByAnnonceId(bienImmo.getId()).isEmpty()) {
            throw new IllegalStateException(
                    "Cette annonce n'a plus de photos (supprimées 12 mois après sa clôture) : publiez une nouvelle annonce.");
        }
        verifierQuotaEntreprise(bienImmo.getOwner());
        MasquageCompte.verifierAnnoncesNonMasquees(bienImmo.getOwner());
        licenceService.verifierPublication(bienImmo.getOwner());
        // Réactiver une annonce clôturée (y compris expirée) = prolongation gratuite.
        prolongerValidite(bienImmo);
        bienImmo.setActif(true);
        bienImmo.setMotifCloture(null);
        bienImmo.setDateCloture(null);
        bienImmoRepository.save(bienImmo);
    }
}
