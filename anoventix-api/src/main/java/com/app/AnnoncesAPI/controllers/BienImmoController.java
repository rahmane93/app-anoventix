package com.app.AnnoncesAPI.controllers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import com.app.AnnoncesAPI.payload.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.HistoriqueAnnonceDTO;
import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.payload.request.BienImmoRequest;
import com.app.AnnoncesAPI.payload.request.MediaRequest;
import com.app.AnnoncesAPI.payload.request.SignalementRequest;
import com.app.AnnoncesAPI.payload.response.SignalementResponse;
import com.app.AnnoncesAPI.security.AdresseClient;
import com.app.AnnoncesAPI.services.BienImmoService;
import com.app.AnnoncesAPI.services.media.MediaService;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

/**
 * Controller REST unifié pour la gestion des biens immobiliers
 * (anciennement Habitation et Terrain).
 * Route de base : /api/biens-immo
 */
@RestController
@RequestMapping("/api/biens-immo")
@Tag(name = "Biens Immobiliers", description = "Gestion des annonces immobilières (habitations et terrains)")
public class BienImmoController {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;
    private static final Set<String> SORTABLE_FIELDS =
            Set.of("dateCreation", "prix", "vueCount", "nbFavoris");

    private final BienImmoService bienImmoService;
    private final MediaService mediaService;
    private final AdresseClient adresseClient;

    public BienImmoController(BienImmoService bienImmoService, MediaService mediaService,
                              AdresseClient adresseClient) {
        this.bienImmoService = bienImmoService;
        this.mediaService = mediaService;
        this.adresseClient = adresseClient;
    }

    private String safeSort(String sort, String fallback) {
        return SORTABLE_FIELDS.contains(sort) ? sort : fallback;
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Créer une annonce immobilière",
               description = "Crée un bien de type HABITATION, TERRAIN ou LOCAL_COMMERCIAL selon typeBien.")
    public ResponseEntity<AnnonceDTO> createBienImmo(
            @ModelAttribute @Valid BienImmoRequest request,
            Authentication authentication) {
        AnnonceDTO created = bienImmoService.createAnnonce(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour une annonce immobilière")
    public ResponseEntity<AnnonceDTO> updateBienImmo(
            @PathVariable Long id,
            @Valid @RequestBody BienImmoRequest request,
            Authentication authentication) {
        AnnonceDTO updated = bienImmoService.updateAnnonce(id, request, authentication);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une annonce immobilière (soft delete)")
    public ResponseEntity<Void> deleteBienImmo(
            @PathVariable Long id,
            Authentication authentication) {
        bienImmoService.deleteAnnonce(id, authentication);
        return ResponseEntity.noContent().build();
    }

    // ─── Lectures ─────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Lister tous les biens immobiliers actifs avec pagination")
    public ResponseEntity<PageResponse<AnnonceDTO>> getAllBiens(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = "dateCreation") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        size = Math.min(size, MAX_PAGE_SIZE);
        Sort.Direction sortDir = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDir, safeSort(sort, "dateCreation")));
        return ResponseEntity.ok(PageResponse.of(bienImmoService.getAllAnnonces(pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un bien immobilier par son ID",
               description = "Public : annonces actives et publiées. Propriétaire : ses annonces actives (tout statut). Admin/Mod : tout.\n\n"
                           + "Le compteur de vues est dédupliqué : une même clé viewer (utilisateur authentifié ou IP) "
                           + "ne compte qu'une seule vue par fenêtre de 24h.")
    public ResponseEntity<AnnonceDTO> getBienById(
            @PathVariable Long id,
            Authentication authentication,
            HttpServletRequest request) {
        AnnonceDTO annonce = bienImmoService.getAnnonceById(id, authentication)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable avec l'ID : " + id));
        return ResponseEntity.ok(compterVue(annonce, authentication, request));
    }

    @GetMapping("/public/p/{publicId}")
    @Operation(summary = "Récupérer un bien immobilier par son identifiant public",
               description = "Identifiant utilisé dans les URLs partagées (/annonce/{slug}-{publicId}). "
                           + "Même règle de visibilité et même comptage des vues que GET /{id}.")
    public ResponseEntity<AnnonceDTO> getBienByPublicId(
            @PathVariable String publicId,
            Authentication authentication,
            HttpServletRequest request) {
        AnnonceDTO annonce = bienImmoService.getAnnonceByPublicId(publicId, authentication)
                .orElseThrow(() -> new ResourceNotFoundException("Bien immobilier introuvable"));
        return ResponseEntity.ok(compterVue(annonce, authentication, request));
    }

    // Compté seulement une fois l'accès validé (pas de vue sur une annonce invisible)
    // et jamais pour le propriétaire consultant sa propre annonce.
    private AnnonceDTO compterVue(AnnonceDTO annonce, Authentication authentication, HttpServletRequest request) {
        boolean proprietaire = authentication != null
                && authentication.getPrincipal() instanceof UserDetailsImpl userDetails
                && userDetails.getId().equals(annonce.getUserId());
        if (!proprietaire) {
            bienImmoService.incrementVueCount(annonce.getId(), computeViewerKey(authentication, request));
        }
        return annonce;
    }

    /**
     * Calcule une clé stable identifiant le viewer d'une annonce :
     * <ul>
     *   <li>"u:{userId}" si l'utilisateur est authentifié</li>
     *   <li>"ip:{remoteAddr}" sinon (avec support X-Forwarded-For si configuré)</li>
     * </ul>
     */
    private String computeViewerKey(Authentication authentication, HttpServletRequest request) {
        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return "u:" + userDetails.getId();
        }
        String ip = adresseClient.de(request);
        return "ip:" + (ip != null ? ip : "unknown");
    }

    @PutMapping("/{id}/toggle-actif")
    @Operation(summary = "Activer ou désactiver une annonce",
               description = "Masque/affiche une annonce. Accessible au propriétaire (ou au "
                       + "PROFESSIONNEL parent pour une annonce d'agent) ainsi qu'aux ADMINISTRATEUR et MODERATEUR.")
    public ResponseEntity<Void> toggleActif(
            @PathVariable Long id,
            Authentication authentication) {
        bienImmoService.toggleActif(id, authentication);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/signaler")
    @Operation(summary = "Signaler une annonce",
               description = "Tout utilisateur authentifié peut signaler une annonce inappropriée.")
    public ResponseEntity<Void> signalerAnnonce(
            @PathVariable Long id,
            @Valid @RequestBody SignalementRequest request,
            Authentication authentication) {
        bienImmoService.signalerAnnonce(id, request.getMotif(), request.getCommentaire(), authentication);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/{id}/reexamen")
    @Operation(summary = "Demander le réexamen d'une annonce masquée",
               description = "Le propriétaire (ou son entreprise) demande à la modération de réexaminer une annonce masquée "
                       + "après l'avoir corrigée. Message facultatif (500 caractères). Une seule demande en cours, "
                       + "trois demandes au plus par annonce.")
    public ResponseEntity<Void> demanderReexamen(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) com.app.AnnoncesAPI.payload.request.ReexamenRequest request,
            Authentication authentication) {
        bienImmoService.demanderReexamen(id, request == null ? null : request.getMessage(), authentication);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{id}/signaler")
    @Operation(summary = "Retirer son signalement",
               description = "L'utilisateur connecté annule son propre signalement actif sur cette annonce (soft delete).")
    public ResponseEntity<Void> retirerSignalement(
            @PathVariable Long id,
            Authentication authentication) {
        bienImmoService.retirerSignalement(id, authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/signalements")
    @Operation(summary = "Mes signalements",
               description = "Retourne la liste paginée de tous les signalements posés par l'utilisateur connecté.")
    public ResponseEntity<PageResponse<SignalementResponse>> getMesSignalements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        size = Math.min(size, MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(PageResponse.of(bienImmoService.getMesSignalements(authentication, pageable)));
    }

    @GetMapping("/{id}/similaires")
    @Operation(summary = "Annonces similaires",
               description = "Retourne jusqu'à `max` annonces actives du même type, même commune et dans un écart de prix de ±30%. Public.")
    public ResponseEntity<List<AnnonceDTO>> getSimilaires(
            @PathVariable Long id,
            @RequestParam(defaultValue = "6") int max) {
        // max borné côté service (≤ 20) ; une valeur ≤ 0 faisait échouer PageRequest (500).
        return ResponseEntity.ok(bienImmoService.findSimilaires(id, Math.max(1, max)));
    }

    @GetMapping("/user")
    @Operation(summary = "Lister les biens immobiliers de l'utilisateur connecté")
    public ResponseEntity<PageResponse<AnnonceDTO>> getBiensByUser(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        size = Math.min(size, MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dateCreation"));
        return ResponseEntity.ok(PageResponse.of(bienImmoService.findAnnoncesByUser(authentication, pageable)));
    }

    @GetMapping("/filter")
    @Operation(summary = "Recherche multi-critères",
               description = "Tous les paramètres sont optionnels et cumulables.\n\n" +
                           "- `reference` : référence exacte de l'annonce\n" +
                           "- `typeAnnonce` : VENTE | LOCATION | BAIL\n" +
                           "- `typeBien` : APPARTEMENT | MAISON | VILLA | TERRAIN | DOMAINE | MAGASIN | BUREAU | ENTREPOT | AUTRE\n" +
                           "- `typeUsage` : AGRICOLE | HABITATION | COMMERCIAL | LOISIR | PROFESSIONNEL | AUTRE\n" +
                           "- `prixMin` / `prixMax` : intervalle de prix\n" +
                           "- `region`, `prefecture`, `commune`, `quartier` : localisation\n" +
                           "- `q` : recherche texte (combinable avec les autres critères)\n" +
                           "- `nbPiecesMin` / `nbChambresMin` : composition minimale (biens bâtis)\n" +
                           "- `surfaceMin` / `surfaceMax` : surface en m²")
    public ResponseEntity<PageResponse<AnnonceDTO>> filterBiens(
            @RequestParam(required = false) String reference,
            @RequestParam(required = false) TypeAnnonce typeAnnonce,
            @RequestParam(required = false) TypeBien typeBien,
            @RequestParam(required = false) TypeUsage typeUsage,
            @RequestParam(required = false) BigDecimal prixMin,
            @RequestParam(required = false) BigDecimal prixMax,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String prefecture,
            @RequestParam(required = false) String commune,
            @RequestParam(required = false) String quartier,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer nbPiecesMin,
            @RequestParam(required = false) Integer nbChambresMin,
            @RequestParam(required = false) Double surfaceMin,
            @RequestParam(required = false) Double surfaceMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateCreation") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        size = Math.min(size, MAX_PAGE_SIZE);
        Sort.Direction sortDir = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDir, safeSort(sort, "dateCreation")));
        Page<AnnonceDTO> result = bienImmoService.filterAnnonces(
            reference, typeAnnonce, typeBien, typeUsage,
            prixMin, prixMax, region, prefecture, commune, quartier,
            q, nbPiecesMin, nbChambresMin, surfaceMin, surfaceMax, pageable);
        return ResponseEntity.ok(PageResponse.of(result));
    }

    // ─── Historique ───────────────────────────────────────────────────────────

    @GetMapping("/{id}/historique")
    @Operation(summary = "Historique des modifications",
               description = "Retourne toutes les modifications enregistrées sur une annonce. "
                           + "Réservé au propriétaire, ADMIN ou MODÉRATEUR.")
    public ResponseEntity<List<HistoriqueAnnonceDTO>> getHistorique(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(bienImmoService.getHistoriqueAnnonce(id, authentication));
    }

    // ─── Géospatiale ──────────────────────────────────────────────────────────

    @GetMapping("/nearby")
    @Operation(summary = "Annonces à proximité (Haversine)",
               description = "Recherche les annonces actives dans un rayon donné (km) autour d'un point GPS, "
                           + "avec les filtres facultatifs typeAnnonce, typeBien, prixMin et prixMax appliqués avant la pagination.")
    public ResponseEntity<PageResponse<AnnonceDTO>> nearby(
            @RequestParam @DecimalMin("-90.0") @DecimalMax("90.0") double lat,
            @RequestParam @DecimalMin("-180.0") @DecimalMax("180.0") double lng,
            @RequestParam(defaultValue = "5") double rayon,
            @RequestParam(required = false) TypeAnnonce typeAnnonce,
            @RequestParam(required = false) TypeBien typeBien,
            @RequestParam(required = false) BigDecimal prixMin,
            @RequestParam(required = false) BigDecimal prixMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size) {
        size = Math.min(size, MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(PageResponse.of(
                bienImmoService.findNearby(lat, lng, rayon, typeAnnonce, typeBien, prixMin, prixMax, pageable)));
    }

    // ─── Zones actives ────────────────────────────────────────────────────────

    @GetMapping("/zones-actives")
    @Operation(summary = "Zones les plus actives",
               description = "Communes ayant le plus d'annonces publiées, toutes régions confondues, "
                           + "les plus actives d'abord. Public : alimente le sélecteur de zones d'Explorer.")
    public ResponseEntity<List<com.app.AnnoncesAPI.dto.ZoneActiveDTO>> zonesActives(
            @RequestParam(defaultValue = "8") int limit) {
        int borne = Math.max(1, Math.min(limit, 20));
        return ResponseEntity.ok(bienImmoService.findZonesActives(borne));
    }

    // ─── Clôture ──────────────────────────────────────────────────────────────

    @PutMapping("/{id}/cloturer")
    @Operation(summary = "Clôturer une annonce",
               description = "Indique qu'un bien est vendu, loué, ou retiré par son propriétaire. Réservé au propriétaire.")
    public ResponseEntity<Void> cloturerAnnonce(
            @PathVariable Long id,
            @RequestParam MotifCloture motif,
            Authentication authentication) {
        bienImmoService.cloturerAnnonce(id, motif, authentication);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/reactiver")
    @Operation(summary = "Réactiver une annonce clôturée",
               description = "Remet en ligne une annonce clôturée par son propriétaire. Non applicable aux annonces rejetées par la modération.")
    public ResponseEntity<Void> reactiver(
            @PathVariable Long id,
            Authentication authentication) {
        bienImmoService.reactiver(id, authentication);
        return ResponseEntity.noContent().build();
    }

    // ─── Médias ───────────────────────────────────────────────────────────────

    @PutMapping(value = "/{id}/medias", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Ajouter des médias à un bien immobilier",
               description = "Envoie un ou plusieurs fichiers images en multipart/form-data (champ 'medias'). "
                           + "Seul le propriétaire de l'annonce ou un ADMIN/MODERATEUR peut effectuer cette opération.")
    public ResponseEntity<AnnonceDTO> addMedias(
            @PathVariable Long id,
            @ModelAttribute @Valid MediaRequest mediaRequest,
            Authentication authentication) {
        return ResponseEntity.ok(mediaService.addMedias(mediaRequest.getMedias(), id, authentication));
    }

    @PutMapping(value = "/{id}/medias/ordre", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Réordonner les photos d'un bien immobilier",
               description = "Reçoit tous les identifiants des photos de l'annonce dans le nouvel ordre ; la première devient "
                           + "la photo principale. Propriétaire de l'annonce ou ADMIN/MODERATEUR.")
    public ResponseEntity<AnnonceDTO> reordonnerMedias(
            @PathVariable Long id,
            @RequestBody @Valid com.app.AnnoncesAPI.payload.request.OrdreMediasRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(mediaService.reordonnerMedias(id, request.getMediaIds(), authentication));
    }

    @DeleteMapping("/{id}/medias/{mediaId}")
    @Operation(summary = "Supprimer un média d'un bien immobilier",
               description = "Supprime le média (image) identifié par mediaId de l'annonce. "
                           + "Seul le propriétaire de l'annonce ou un ADMIN/MODERATEUR peut effectuer cette opération.")
    public ResponseEntity<AnnonceDTO> deleteMedia(
            @PathVariable Long id,
            @PathVariable Long mediaId,
            Authentication authentication) {
        return ResponseEntity.ok(mediaService.deleteMediaById(mediaId, id, authentication));
    }

}
