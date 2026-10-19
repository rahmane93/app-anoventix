package com.app.AnnoncesAPI.services.media;

import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.MediaDTO;
import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.LicenceService;
import com.app.AnnoncesAPI.services.MasquageCompte;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import net.coobird.thumbnailator.Thumbnails;

@Service
public class MediaService {

    private static final Logger logger = LoggerFactory.getLogger(MediaService.class);

    /** Nombre maximum de médias par annonce (aligné sur la limite de l'app mobile). */
    public static final int MAX_MEDIAS_PAR_ANNONCE = 10;

    /**
     * Nombre maximum de pixels d'une image source (50 Mpx ≈ capteur photo 50 MP).
     * Au-delà, le décodage complet en mémoire (≈ 4 octets/pixel) expose à un OutOfMemory
     * via une « image bombe » : quelques Mo compressés pour des centaines de Mpx.
     */
    static final long MAX_PIXELS = 50_000_000L;
    static final int SELFIE_PETIT_COTE_MIN = 720;

    private final AnnonceRepository annonceRepository;
    private final UserRepository userRepository;
    private final AnnonceMapper annonceMapper;
    private final MediaRepository mediaRepository;
    private final LicenceService licenceService;

    // Chemin configurable via application.yml
    @Value("${upload.dir}")
    private String uploadDir;

    public MediaService(
            AnnonceRepository annonceRepository,
            UserRepository userRepository,
            AnnonceMapper annonceMapper,
            MediaRepository mediaRepository,
            LicenceService licenceService) {
        this.annonceRepository = annonceRepository;
        this.userRepository = userRepository;
        this.annonceMapper = annonceMapper;
        this.mediaRepository = mediaRepository;
        this.licenceService = licenceService;
    }

    /**
     * Sauvegarde une liste de fichiers médias publics sur le disque dans {@code /uploads/public/{folderName}/}.
     * <ul>
     *   <li>Pour les photos de profil : passer le <b>username</b> de l'utilisateur.</li>
     *   <li>Pour les médias d'une annonce : passer la <b>référence de l'annonce</b> (ex: BI-20260326-001).</li>
     * </ul>
     * Retourne la liste des MediaDTO correspondants (URL, type MIME, ordre).
     * Seuls les fichiers de type image sont acceptés.
     */
    public List<MediaDTO> saveMediaDTOs(List<MultipartFile> files, String folderName) {
        List<MediaDTO> mediasDto = new ArrayList<>();
        String publicFolder = "public/" + folderName;
        Path targetDir = Paths.get(uploadDir, publicFolder);
        try {
            Files.createDirectories(targetDir);
        } catch (IOException e) {
            throw new RuntimeException("Impossible de créer le dossier : " + targetDir, e);
        }

        // Tout valider AVANT d'écrire quoi que ce soit : un fichier refusé en milieu de
        // liste laissait les précédents orphelins sur le disque.
        for (MultipartFile file : files) {
            if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
                throw new IllegalArgumentException("Seuls les fichiers images sont autorisés.");
            }
            verifierDimensions(file);
        }

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);

            String uniqueName = UUID.randomUUID() + ".jpg";
            Path filePath = targetDir.resolve(uniqueName);

            try {
                Thumbnails.of(file.getInputStream())
                        .width(1920)
                        .outputFormat("jpg")
                        .outputQuality(0.80)
                        .toFile(filePath.toFile());
                // Miniature et version moyenne : les listes et les cartes ne chargent plus la photo en 1920 px.
                VariantesPhoto.generer(filePath);

                MediaDTO mediaDto = new MediaDTO();
                mediaDto.setVariantes(true);
                mediaDto.setUrl("/uploads/" + publicFolder + "/" + uniqueName);
                mediaDto.setTypeMime("image/jpeg");
                mediaDto.setOrdre(i + 1);
                mediasDto.add(mediaDto);

            } catch (IOException e) {
                deleteAnnonceMediasFromDisk(mediasDto);
                throw new RuntimeException("Erreur de sauvegarde du fichier : " + uniqueName, e);
            }
        }
        supprimerSiTransactionAnnulee(mediasDto.stream().map(MediaDTO::getUrl).toList());

        return mediasDto;
    }

    /**
     * Si l'appelant est dans une transaction qui finit annulée (licence requise, quota…),
     * les fichiers déjà écrits sont supprimés : sans cela ils restent orphelins sur le disque.
     */
    public void supprimerSiTransactionAnnulee(List<String> urls) {
        if (urls.isEmpty() || !TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    urls.forEach(url -> {
                        try {
                            deleteMediaFromDisk(url);
                        } catch (RuntimeException e) {
                            logger.warn("Fichier orphelin non supprimé {} : {}", url, e.getMessage());
                        }
                    });
                }
            }
        });
    }

    /**
     * Supprime physiquement un fichier média du disque à partir de son URL relative.
     */
    public void deleteMediaFromDisk(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) return;
        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        String relative = mediaUrl.startsWith("/uploads/") ? mediaUrl.substring("/uploads/".length()) : mediaUrl;
        Path filePath = uploadRoot.resolve(relative).normalize();
        if (!filePath.startsWith(uploadRoot)) {
            logger.warn("Tentative de suppression hors du répertoire d'upload : {}", mediaUrl);
            return;
        }
        try {
            Files.deleteIfExists(filePath);
            VariantesPhoto.supprimer(filePath);
            logger.debug("Fichier supprimé : {}", filePath);
        } catch (IOException e) {
            throw new RuntimeException("Erreur de suppression du fichier : " + mediaUrl, e);
        }
    }

    /**
     * Supprime physiquement tous les fichiers médias d'une annonce à partir d'une liste de MediaDTO.
     */
    public void deleteAnnonceMediasFromDisk(List<MediaDTO> medias) {
        for (MediaDTO media : medias) {
            deleteMediaFromDisk(media.getUrl());
        }
    }

    /**
     * Supprime tous les médias d'une annonce (physiquement et en base),
     * après vérification des droits (propriétaire ou modérateur/admin).
     * Vide également la liste des médias de l'annonce.
     */
    @Transactional
    public void deleteMediasByAnnonceId(Long annonceId, Authentication authentication) {
        Annonce annonce = annonceRepository.findById(annonceId)
                .orElseThrow(() -> new ResourceNotFoundException("Annonce non trouvée avec l'ID: " + annonceId));

        User user = getCurrentUser(authentication);
        if (!isOwnerOrModerator(user, annonce)) {
            throw new AccessDeniedException("Vous n'êtes pas autorisé à supprimer les médias de cette annonce");
        }

        // Suppression physique
        deleteAnnonceMediasFromDisk(annonce.getMedias().stream()
                .map(annonceMapper::mediaToDTO)
                .collect(Collectors.toList()));
        // Suppression en base
        mediaRepository.deleteByAnnonceId(annonceId);

        // Mise à jour de la liste des médias de l'annonce
        annonce.getMedias().clear();
        annonceRepository.save(annonce);
    }

    /**
     * Ajoute une ou plusieurs images à une annonce après vérification des droits.
     * Retourne l'annonce mise à jour sous forme de DTO.
     */
    @Transactional
    public AnnonceDTO addMedias(List<MultipartFile> files, Long annonceId, Authentication authentication) {
        Annonce annonce = annonceRepository.findById(annonceId)
                .orElseThrow(() -> new ResourceNotFoundException("Annonce non trouvée avec l'ID: " + annonceId));

        User user = getCurrentUser(authentication);
        if (!isOwnerOrModerator(user, annonce)) {
            throw new AccessDeniedException("Vous n'êtes pas autorisé à ajouter des médias à cette annonce");
        }
        verifierAnnonceNonRejetee(annonce);
        MasquageCompte.verifierAnnoncesNonMasquees(user);
        licenceService.verifierNonBloque(user);
        int existants = annonce.getMedias() != null ? annonce.getMedias().size() : 0;
        verifierNombreMedias(existants + (files != null ? files.size() : 0));

        List<MediaDTO> mediasDto = saveMediaDTOs(files, annonce.getReferenceAnnonce());
        if (mediasDto == null || mediasDto.isEmpty()) {
            throw new ResourceNotFoundException("Erreur lors de la sauvegarde des médias");
        }

        List<Media> newMedias = mediasDto.stream()
                .map(annonceMapper::mediaToEntity) // Remplace par mediaMapper::toEntity si tu as un MediaMapper
                .peek(media -> media.setAnnonce(annonce))
                .collect(Collectors.toList());

        Set<String> existingUrls = annonce.getMedias().stream()
                .map(Media::getUrl)
                .collect(Collectors.toSet());

        // Les nouvelles photos se placent après les existantes (l'ordre renvoyé par saveMediaDTOs part de 1).
        int dernier = annonce.getMedias().stream().map(Media::getOrdre).filter(java.util.Objects::nonNull)
                .max(Integer::compare).orElse(0);
        for (Media media : newMedias) {
            if (!existingUrls.contains(media.getUrl())) {
                media.setOrdre(++dernier);
                annonce.getMedias().add(media);
            }
        }

        Annonce saved = annonceRepository.save(annonce);
        return annonceMapper.toDTO(saved);
    }

    /**
     * Supprime un média précis d'une annonce (physiquement et en base),
     * après vérification des droits (propriétaire ou modérateur/admin).
     * Met à jour la liste des médias de l'annonce.
     */
    @Transactional
    public AnnonceDTO deleteMediaById(Long id, Long annonceId, Authentication authentication) {
        Media media = mediaRepository.findByIdAndAnnonceId(id, annonceId)
            .orElseThrow(() -> new ResourceNotFoundException("Media non trouvé avec l'ID: " + id + " pour l'annonce: " + annonceId));

        Annonce annonce = annonceRepository.findById(annonceId)
            .orElseThrow(() -> new ResourceNotFoundException("Annonce non trouvée avec l'ID: " + annonceId));

        User user = getCurrentUser(authentication);
        if (!isOwnerOrModerator(user, annonce)) {
            throw new AccessDeniedException("Vous n'êtes pas autorisé à supprimer ce média");
        }
        verifierAnnonceNonRejetee(annonce);
        MasquageCompte.verifierAnnoncesNonMasquees(user);
        if (annonce.getMedias() != null && annonce.getMedias().size() <= 1) {
            throw new IllegalArgumentException(
                    "Une annonce doit garder au moins une photo. Ajoutez-en une autre avant de supprimer celle-ci.");
        }

        deleteMediaFromDisk(media.getUrl());
        mediaRepository.delete(media);

        // Mise à jour de la liste des médias de l'annonce
        annonce.getMedias().removeIf(m -> m.getId().equals(id));
        numeroter(annonce.getMedias());
        annonceRepository.save(annonce);

        return annonceMapper.toDTO(annonce);
    }

    /**
     * Réordonne les photos d'une annonce : la liste doit contenir exactement tous ses identifiants,
     * la première devient la photo principale (vignette, aperçu de partage).
     */
    @Transactional
    public AnnonceDTO reordonnerMedias(Long annonceId, List<Long> mediaIds, Authentication authentication) {
        Annonce annonce = annonceRepository.findById(annonceId)
                .orElseThrow(() -> new ResourceNotFoundException("Annonce non trouvée avec l'ID: " + annonceId));
        User user = getCurrentUser(authentication);
        if (!isOwnerOrModerator(user, annonce)) {
            throw new AccessDeniedException("Vous n'êtes pas autorisé à modifier les photos de cette annonce");
        }
        verifierAnnonceNonRejetee(annonce);
        MasquageCompte.verifierAnnoncesNonMasquees(user);

        List<Media> medias = annonce.getMedias();
        java.util.Map<Long, Media> parId = medias.stream()
                .collect(Collectors.toMap(Media::getId, m -> m));
        if (mediaIds.size() != medias.size() || !parId.keySet().equals(new java.util.HashSet<>(mediaIds))) {
            throw new IllegalArgumentException("L'ordre doit contenir toutes les photos de l'annonce, une seule fois chacune.");
        }
        List<Media> ordonnees = mediaIds.stream().map(parId::get).collect(Collectors.toList());
        numeroter(ordonnees);
        medias.clear();
        medias.addAll(ordonnees);
        return annonceMapper.toDTO(annonceRepository.save(annonce));
    }

    /** Ordre 1..n dans l'ordre de la liste. */
    private static void numeroter(List<Media> medias) {
        for (int i = 0; i < medias.size(); i++) {
            medias.get(i).setOrdre(i + 1);
        }
    }

    /**
     * Une annonce sans photo n'est quasiment jamais consultée : la création en
     * exige au moins une (les suivantes peuvent être ajoutées ensuite).
     */
    public static void verifierAuMoinsUnePhoto(List<MultipartFile> files) {
        boolean aUnePhoto = files != null && files.stream().anyMatch(f -> f != null && !f.isEmpty());
        if (!aUnePhoto) {
            throw new IllegalArgumentException("Ajoutez au moins une photo à votre annonce.");
        }
    }

    private static void verifierNombreMedias(int total) {
        if (total > MAX_MEDIAS_PAR_ANNONCE) {
            throw new IllegalArgumentException(
                    "Une annonce ne peut pas contenir plus de " + MAX_MEDIAS_PAR_ANNONCE + " photos.");
        }
    }

    /**
     * Lit les dimensions dans l'en-tête de l'image, SANS la décoder, et rejette les
     * images illisibles ou trop grandes avant que Thumbnailator ne les charge en mémoire.
     */
    void verifierDimensions(MultipartFile file) {
        verifierDimensions(file, 0);
    }

    /** Même contrôle, avec en plus un petit côté minimal (le selfie de vérification en exige 720 px). */
    void verifierDimensions(MultipartFile file, int petitCoteMin) {
        try (InputStream raw = file.getInputStream();
             ImageInputStream in = ImageIO.createImageInputStream(raw)) {
            Iterator<ImageReader> readers = in != null ? ImageIO.getImageReaders(in) : null;
            if (readers == null || !readers.hasNext()) {
                throw new IllegalArgumentException("Format d'image non supporté.");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (petitCoteMin > 0 && Math.min(reader.getWidth(0), reader.getHeight(0)) < petitCoteMin) {
                    throw new IllegalArgumentException("Image trop petite (" + reader.getWidth(0) + "x"
                            + reader.getHeight(0) + ") : au moins " + petitCoteMin + " pixels sur le petit côté.");
                }
                if (pixels > MAX_PIXELS) {
                    throw new IllegalArgumentException(
                            "Image trop grande (" + reader.getWidth(0) + "x" + reader.getHeight(0)
                            + "). Maximum : " + (MAX_PIXELS / 1_000_000) + " millions de pixels.");
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Image illisible ou corrompue.");
        }
    }

    /** Une annonce rejetée (DEC-10) n'est plus modifiable, photos comprises. */
    private void verifierAnnonceNonRejetee(Annonce annonce) {
        if (annonce.getStatutModeration() == com.app.AnnoncesAPI.enums.StatutAnnonce.REJETEE) {
            throw new com.app.AnnoncesAPI.exceptions.ConflitException("Une annonce rejetée n'est plus modifiable.");
        }
    }

    /**
     * Vérifie si l'utilisateur est le propriétaire de l'annonce ou possède un rôle de modérateur/admin.
     */
    private boolean isOwnerOrModerator(User user, Annonce annonce) {
        if (annonce.getOwner().getId().equals(user.getId())) {
            return true;
        }
        // Le professionnel a tous les droits sur les annonces de ses agents (DEC-27).
        User owner = annonce.getOwner();
        if (owner.getEntreprise() != null
                && owner.getEntreprise().getAnnonceurProfessionnel() != null
                && owner.getEntreprise().getAnnonceurProfessionnel().getId().equals(user.getId())) {
            return true;
        }
        return user.isAdministrateur() || user.isModerateur();
    }

    /**
     * Récupère l'utilisateur courant à partir de l'objet Authentication.
     */
    private User getCurrentUser(Authentication authentication) {
        UUID userId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
    }

    /**
     * Crée les entités Media à partir des fichiers uploadés, en stockant
     * les fichiers dans un dossier portant la <b>référence de l'annonce</b>.
     */
    public List<Media> createMediaEntities(List<MultipartFile> files, Annonce annonce) {
        if (files == null || files.isEmpty()) {
            return List.of();
        }
        verifierNombreMedias(files.size());
        List<MediaDTO> mediasDto = this.saveMediaDTOs(files, annonce.getReferenceAnnonce());
        if (mediasDto == null) {
            return List.of();
        }
        return mediasDto.stream()
                .map(annonceMapper::mediaToEntity)
                .peek(media -> media.setAnnonce(annonce))
                .collect(Collectors.toList());
    }

    // =========================================================================
    //  Pièces d'identité — stockage privé (P0.3)
    //
    //  Le préfixe "private/" est :
    //   - bloqué par SecurityConfig (denyAll sur /uploads/private/**)
    //   - filtré par FileController (rejet explicite)
    //  Les pièces ne sont accessibles que via l'endpoint authentifié
    //  GET /api/users/{userId}/piece-identite avec contrôle de droits
    //  (propriétaire OU ADMIN/MOD).
    // =========================================================================

    /**
     * Préfixe du dossier privé des pièces d'identité, relatif à {@code uploadRoot} (= uploadDir).
     * Ne pas inclure "uploads/" ici : uploadRoot est déjà le répertoire uploads.
     */
    public static final String PIECE_IDENTITE_PREFIX = "private/piece-identite/";

    /**
     * Sauvegarde une pièce d'identité dans {@code {uploadRoot}/private/piece-identite/{userId}/}.
     * Retourne le chemin relatif à {@code uploadRoot} (ex: {@code "private/piece-identite/<uuid>/<uuid>.jpg"}).
     * Ce chemin ne doit jamais être servi directement par {@link com.app.AnnoncesAPI.controllers.FileController}.
     */
    public String savePieceIdentite(MultipartFile file, UUID userId) {
        return saveFichierPrive(file, userId, 0);
    }

    /** Dossier privé des justificatifs d'entreprise, relatif à {@code uploadRoot}. */
    public static final String JUSTIFICATIF_ENTREPRISE_PREFIX = "private/entreprise/";
    static final long JUSTIFICATIF_TAILLE_MAX = 10L * 1024 * 1024;

    /**
     * Extrait RCCM d'une entreprise (DEC-04, RG-07-24) : image uniquement (réencodée en JPEG), 10 Mo au
     * plus, dans {@code private/entreprise/<id>/}. Retourne le chemin relatif à {@code uploadRoot}.
     */
    public String saveJustificatifEntreprise(MultipartFile file, UUID entrepriseId) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le justificatif est obligatoire.");
        }
        if (file.getSize() > JUSTIFICATIF_TAILLE_MAX) {
            throw new IllegalArgumentException("Le justificatif ne peut pas dépasser 10 Mo.");
        }
        String type = file.getContentType() == null ? "" : file.getContentType();
        if (!type.startsWith("image/")) {
            throw new IllegalArgumentException("Le justificatif doit être une photo ou une image (pas de PDF).");
        }
        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path dossier = uploadRoot.resolve(JUSTIFICATIF_ENTREPRISE_PREFIX + entrepriseId).normalize();
        if (!dossier.startsWith(uploadRoot)) {
            throw new IllegalStateException("Chemin cible hors du répertoire d'upload.");
        }
        verifierDimensions(file);
        try {
            Files.createDirectories(dossier);
            String nom = UUID.randomUUID() + ".jpg";
            Thumbnails.of(file.getInputStream()).width(1920).outputFormat("jpg").outputQuality(0.85)
                    .toFile(dossier.resolve(nom).toFile());
            return JUSTIFICATIF_ENTREPRISE_PREFIX + entrepriseId + "/" + nom;
        } catch (IOException e) {
            throw new RuntimeException("Erreur de sauvegarde du justificatif.", e);
        }
    }

    /** Selfie de vérification (EVO-01) : 720 px au moins sur le petit côté, mêmes protections que la pièce. */
    public String saveSelfie(MultipartFile file, UUID userId) {
        return saveFichierPrive(file, userId, SELFIE_PETIT_COTE_MIN);
    }

    private String saveFichierPrive(MultipartFile file, UUID userId, int petitCoteMin) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier manquant.");
        }
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("Seuls les fichiers images sont autorisés.");
        }
        verifierDimensions(file, petitCoteMin);

        String relativeFolder = "private/piece-identite/" + userId;
        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path targetDir = uploadRoot.resolve(relativeFolder).normalize();

        // Defense en profondeur : le dossier cible doit rester sous uploadDir
        if (!targetDir.startsWith(uploadRoot)) {
            throw new IllegalStateException("Chemin cible hors du répertoire d'upload.");
        }

        try {
            Files.createDirectories(targetDir);
        } catch (IOException e) {
            throw new RuntimeException("Impossible de créer le dossier privé : " + targetDir, e);
        }

        String uniqueName = UUID.randomUUID() + ".jpg";
        Path filePath = targetDir.resolve(uniqueName);

        try {
            Thumbnails.of(file.getInputStream())
                    .width(1920)
                    .outputFormat("jpg")
                    .outputQuality(0.85)
                    .toFile(filePath.toFile());
        } catch (IOException e) {
            throw new RuntimeException("Erreur de sauvegarde de la pièce d'identité.", e);
        }

        return PIECE_IDENTITE_PREFIX + userId + "/" + uniqueName;
    }

    /**
     * Supprime une pièce d'identité du disque. Idempotent.
     * Accepte un chemin relatif à {@code uploadRoot} ({@code "private/piece-identite/..."})
     * ou une ancienne URL au format {@code "/uploads/<username>/<file>"} (legacy).
     */
    public void deletePieceIdentite(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) return;

        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        // Normaliser : retirer un éventuel préfixe /uploads/
        String normalized = storedPath.startsWith("/uploads/")
                ? storedPath.substring("/uploads/".length())
                : storedPath;
        Path filePath = uploadRoot.resolve(normalized).normalize();

        if (!filePath.startsWith(uploadRoot)) {
            logger.warn("Tentative de suppression hors du répertoire d'upload : {}", storedPath);
            return;
        }
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            logger.warn("Erreur de suppression de la pièce d'identité {} : {}", storedPath, e.getMessage());
        }
    }

    /**
     * Charge une pièce d'identité depuis le disque pour la servir via un endpoint authentifié.
     *
     * @param storedPath chemin tel qu'enregistré dans {@code User.pieceIdentiteUrl}
     *                   (relatif à uploadRoot : {@code "private/piece-identite/{userId}/{file}"}
     *                    ou ancien format {@code "/uploads/<username>/..."} pour les pièces legacy).
     */
    public Resource loadPieceIdentite(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            throw new ResourceNotFoundException("Aucune pièce d'identité enregistrée.");
        }

        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        String normalized = storedPath.startsWith("/uploads/")
                ? storedPath.substring("/uploads/".length())
                : storedPath;
        Path filePath = uploadRoot.resolve(normalized).normalize();

        // Defense en profondeur : le fichier résolu doit rester sous uploadDir
        if (!filePath.startsWith(uploadRoot)) {
            throw new SecurityException("Chemin de fichier invalide.");
        }

        Resource resource;
        try {
            resource = new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            throw new RuntimeException("URL invalide pour la pièce d'identité.", e);
        }
        if (!resource.exists() || !resource.isReadable()) {
            throw new ResourceNotFoundException("Pièce d'identité introuvable sur le disque.");
        }
        return resource;
    }
}