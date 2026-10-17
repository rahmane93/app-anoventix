package com.app.AnnoncesAPI.controllers;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.app.AnnoncesAPI.payload.response.PageResponse;
import com.app.AnnoncesAPI.payload.response.PresenceResponse;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.UserDTO;
import com.app.AnnoncesAPI.payload.request.UpdateProfileRequest;
import com.app.AnnoncesAPI.payload.request.UpdateStatutRequest;
import com.app.AnnoncesAPI.payload.request.ValidationPieceIdentiteRequest;
import com.app.AnnoncesAPI.services.ExportDonneesService;
import com.app.AnnoncesAPI.services.PresenceService;
import com.app.AnnoncesAPI.services.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Utilisateurs", description = "Gestion du profil et des comptes")
public class UserController {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserService userService;
    private final ExportDonneesService exportDonneesService;
    private final PresenceService presenceService;

    public UserController(UserService userService, ExportDonneesService exportDonneesService,
                          PresenceService presenceService) {
        this.userService = userService;
        this.exportDonneesService = exportDonneesService;
        this.presenceService = presenceService;
    }

    // -------------------------------------------------------------------------
    // Mon profil (utilisateur connecté)
    // -------------------------------------------------------------------------

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir son propre profil")
    public ResponseEntity<UserDTO> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(userService.getMyProfile(authentication.getName()));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mettre à jour son profil",
               description = "Modifier nom, prénom, téléphone, type de compte, numéro et type de pièce d'identité.")
    public ResponseEntity<UserDTO> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(userService.updateProfile(authentication.getName(), request));
    }

    @PutMapping(value = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Uploader une photo de profil",
               description = "Envoyer le fichier image en multipart/form-data.")
    public ResponseEntity<UserDTO> uploadPhoto(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        return ResponseEntity.ok(userService.uploadProfilePhoto(authentication.getName(), file, "profil"));
    }

    @PostMapping(value = "/me/piece-identite", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Uploader sa pièce d'identité",
               description = "Envoi en multipart/form-data.\n"
                           + "Champs : file (obligatoire, image), typePieceIdentite (obligatoire), numeroPieceIdentite (obligatoire).\n"
                           + "Le statut passe automatiquement à EN_ATTENTE jusqu'à validation par un admin/modérateur.")
    public ResponseEntity<UserDTO> uploadPieceIdentite(
            @RequestParam("file") MultipartFile file,
            @RequestParam String typePieceIdentite,
            @RequestParam String numeroPieceIdentite,
            Authentication authentication) {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.uploadPieceIdentite(
                        authentication.getName(), file, typePieceIdentite, numeroPieceIdentite));
    }

    // -------------------------------------------------------------------------
    // Favoris
    // -------------------------------------------------------------------------

    @PostMapping("/me/favoris/{annonceId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Ajouter une annonce aux favoris")
    public ResponseEntity<UserDTO> addFavori(
            @PathVariable Long annonceId,
            Authentication authentication) {
        return ResponseEntity.ok(userService.addFavori(authentication.getName(), annonceId));
    }

    @DeleteMapping("/me/favoris/{annonceId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Retirer une annonce des favoris")
    public ResponseEntity<UserDTO> removeFavori(
            @PathVariable Long annonceId,
            Authentication authentication) {
        return ResponseEntity.ok(userService.removeFavori(authentication.getName(), annonceId));
    }

    @GetMapping("/me/favoris")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister mes annonces favorites",
               description = "Retourne la liste paginée des annonces ajoutées aux favoris.")
    public ResponseEntity<PageResponse<AnnonceDTO>> getFavoris(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        return ResponseEntity.ok(PageResponse.of(userService.getFavoris(
                authentication.getName(),
                PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "dateCreation")))));
    }

    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Supprimer son compte (RGPD)",
               description = "Désactive immédiatement le compte (statut INACTIF). Réactivable par l'utilisateur via "
                           + "POST /api/auth/reactivate pendant 30 jours, puis données personnelles anonymisées.")
    public ResponseEntity<Void> deleteMyAccount(Authentication authentication) {
        userService.deleteMyAccount(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/export")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Exporter mes données personnelles (RGPD)",
               description = "Profil, annonces, favoris, conversations, signalements, en JSON.")
    public ResponseEntity<Map<String, Object>> exportMyData(Authentication authentication) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mes-donnees-anoventix.json\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(exportDonneesService.exporter(authentication.getName()));
    }

    // -------------------------------------------------------------------------
    // Pièce d'identité — accès authentifié (P0.3)
    // -------------------------------------------------------------------------

    @GetMapping("/{userId}/piece-identite")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Servir la pièce d'identité d'un utilisateur",
               description = "Retourne le contenu binaire de la pièce d'identité.\n\n"
                           + "Autorisations : propriétaire OU ADMINISTRATEUR/MODERATEUR.\n"
                           + "Les pièces d'identité sont stockées dans /uploads/private/** "
                           + "et ne sont accessibles que via cet endpoint.")
    public ResponseEntity<Resource> getPieceIdentite(
            @PathVariable UUID userId,
            Authentication authentication) {
        Resource resource = userService.servirPieceIdentite(userId, authentication);
        String filename = resource.getFilename() != null ? resource.getFilename() : "piece-identite";
        String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        if (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) {
            contentType = MediaType.IMAGE_JPEG_VALUE;
        } else if (filename.toLowerCase().endsWith(".png")) {
            contentType = MediaType.IMAGE_PNG_VALUE;
        } else if (filename.toLowerCase().endsWith(".gif")) {
            contentType = MediaType.IMAGE_GIF_VALUE;
        } else if (filename.toLowerCase().endsWith(".webp")) {
            contentType = "image/webp";
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    // -------------------------------------------------------------------------
    // Administration (ADMIN / MODERATEUR)
    // -------------------------------------------------------------------------

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRATEUR') or hasRole('MODERATEUR')")
    @Operation(summary = "Lister tous les comptes (paginé)")
    public ResponseEntity<PageResponse<UserDTO>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // Paginé : la liste complète chargeait tous les comptes (et 2 requêtes par compte).
        return ResponseEntity.ok(PageResponse.of(userService.getAllUsers(
                PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "createdAt")))));
    }

    @GetMapping("/{id}/presence")
    @Operation(summary = "Statut en ligne d'un utilisateur",
               description = "ONLINE si une requête authentifiée date de moins de 2 minutes. "
                           + "Réservé à l'utilisateur lui-même, à la modération et à ses interlocuteurs en messagerie.")
    public ResponseEntity<PresenceResponse> getPresence(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(presenceService.getPresence(id, authentication));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR') or hasRole('MODERATEUR')")
    @Operation(summary = "Obtenir un compte par ID")
    public ResponseEntity<UserDTO> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}/piece-identite/statut")
    @PreAuthorize("hasRole('ADMINISTRATEUR') or hasRole('MODERATEUR')")
    @Operation(summary = "Valider ou rejeter une pièce d'identité",
               description = "Statut : VALIDEE ou REJETEE. Un motif est obligatoire en cas de rejet. Un MODÉRATEUR ne peut pas agir sur un autre MODÉRATEUR (réservé à l'ADMINISTRATEUR).")
    public ResponseEntity<UserDTO> validerPieceIdentite(
            @PathVariable UUID id,
            @Valid @RequestBody ValidationPieceIdentiteRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(userService.validerPieceIdentite(id, request, authentication));
    }

    @PutMapping("/{id}/statut")
    @PreAuthorize("hasRole('ADMINISTRATEUR') or hasRole('MODERATEUR')")
    @Operation(summary = "Changer le statut d'un compte utilisateur",
               description = "Statuts disponibles : ACTIF, SUSPENDU, INACTIF. Un MODÉRATEUR ne peut pas modifier le statut d'un autre MODÉRATEUR (réservé à l'ADMINISTRATEUR).")
    public ResponseEntity<UserDTO> updateStatut(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatutRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(userService.updateStatut(id, request, authentication));
    }
}
