package com.app.AnnoncesAPI.controllers;

import com.app.AnnoncesAPI.dto.AgentDTO;
import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.EntrepriseDTO;
import com.app.AnnoncesAPI.payload.request.AgentRequest;
import com.app.AnnoncesAPI.payload.request.EntrepriseRequest;
import com.app.AnnoncesAPI.services.EntrepriseService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

import com.app.AnnoncesAPI.payload.response.PageResponse;

/**
 * Controller REST pour la gestion des entreprises
 */
@RestController
@RequestMapping("/api/entreprises")
@Tag(name = "Entreprises", description = "Gestion des entreprises et de leurs agents")
public class EntrepriseController {

    private static final int MAX_PAGE_SIZE = 50;
    private static final java.util.Set<String> SORTABLE_FIELDS =
            java.util.Set.of("dateCreation", "prix", "titre");

    private final EntrepriseService entrepriseService;

    public EntrepriseController(EntrepriseService entrepriseService) {
        this.entrepriseService = entrepriseService;
    }
    
    /**
     * Crée une nouvelle entreprise (Annonceur Professionnel uniquement)
     */
    @PostMapping
    @PreAuthorize("hasRole('PROFESSIONNEL')")
    @Operation(summary = "Créer une entreprise", 
               description = "Permet à un Annonceur Professionnel de créer son entreprise")
    public ResponseEntity<EntrepriseDTO> createEntreprise(
            @Valid @RequestBody EntrepriseRequest request,
            Authentication authentication) {
        EntrepriseDTO entreprise = entrepriseService.createEntreprise(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(entreprise);
    }
    
    /**
     * Met à jour une entreprise existante
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PROFESSIONNEL')")
    @Operation(summary = "Mettre à jour une entreprise",
               description = "Permet au propriétaire de modifier les informations de son entreprise")
    public ResponseEntity<EntrepriseDTO> updateEntreprise(
            @PathVariable UUID id,
            @Valid @RequestBody EntrepriseRequest request,
            Authentication authentication) {
        EntrepriseDTO entreprise = entrepriseService.updateEntreprise(id, request, authentication);
        return ResponseEntity.ok(entreprise);
    }

    /**
     * Upload une photo de profil pour l'entreprise
     */
    @PutMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PROFESSIONNEL')")
    @Operation(summary = "Uploader la photo de profil de l'entreprise",
            description = "Envoyer le fichier image en multipart/form-data. Seul le propriétaire peut modifier la photo.")
    public ResponseEntity<EntrepriseDTO> uploadPhoto(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        return ResponseEntity.ok(entrepriseService.uploadPhoto(id, file, authentication));
    }
    
    /**
     * Récupère une entreprise par son ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'AGENT_PROFESSIONNEL', 'MODERATEUR', 'ADMINISTRATEUR')")
    @Operation(summary = "Récupérer une entreprise par ID",
               description = "Affiche les détails d'une entreprise")
    public ResponseEntity<EntrepriseDTO> getEntrepriseById(@PathVariable UUID id) {
        EntrepriseDTO entreprise = entrepriseService.getEntrepriseById(id);
        return ResponseEntity.ok(entreprise);
    }
    
    /**
     * Récupère l'entreprise d'un utilisateur
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'AGENT_PROFESSIONNEL', 'MODERATEUR', 'ADMINISTRATEUR')")
    @Operation(summary = "Récupérer l'entreprise d'un utilisateur",
               description = "Trouve l'entreprise associée à un utilisateur")
    public ResponseEntity<EntrepriseDTO> getEntrepriseByUser(@PathVariable UUID userId) {
        EntrepriseDTO entreprise = entrepriseService.getEntrepriseByUser(userId);
        return ResponseEntity.ok(entreprise);
    }
    
    /**
     * Récupère toutes les entreprises (actives et inactives)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('MODERATEUR', 'ADMINISTRATEUR')")
    @Operation(summary = "Lister toutes les entreprises",
               description = "Réservé aux modérateurs et administrateurs ; renvoie les entreprises actives et inactives")
    public ResponseEntity<PageResponse<EntrepriseDTO>> getAllEntreprises(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("nom"));
        return ResponseEntity.ok(PageResponse.of(entrepriseService.getAllEntreprises(pageable)));
    }
    
    /**
     * Récupère la liste des agents d'une entreprise
     */
    @GetMapping("/{entrepriseId}/agents")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'AGENT_PROFESSIONNEL', 'MODERATEUR', 'ADMINISTRATEUR')")
    @Operation(summary = "Lister les agents d'une entreprise",
               description = "Retourne tous les agents rattachés à l'entreprise")
    public ResponseEntity<List<AgentDTO>> getAgentsByEntreprise(@PathVariable UUID entrepriseId,
                                                                Authentication authentication) {
        return ResponseEntity.ok(entrepriseService.getAgentsByEntreprise(entrepriseId, authentication));
    }

    /**
     * Crée un nouvel agent pour l'entreprise
     * Un agent doit être créé par le PROFESSIONNEL propriétaire de l'entreprise
     */
    @PostMapping("/{entrepriseId}/agents")
    @PreAuthorize("hasRole('PROFESSIONNEL')")
    @Operation(summary = "Créer un agent pour l'entreprise",
               description = "Crée un nouvel utilisateur rattaché à l'entreprise. Seul le propriétaire de l'entreprise peut créer des agents.")
    public ResponseEntity<AgentDTO> createAgent(
            @PathVariable UUID entrepriseId,
            @Valid @RequestBody AgentRequest request,
            Authentication authentication) {
        AgentDTO agent = entrepriseService.createAgentForEntreprise(entrepriseId, request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(agent);
    }
    
    /**
     * Retire un agent d'une entreprise
     */
    @DeleteMapping("/{entrepriseId}/agents/{agentId}")
    @PreAuthorize("hasRole('PROFESSIONNEL')")
    @Operation(summary = "Retirer un agent de l'entreprise",
               description = "Permet au propriétaire de retirer un agent de son entreprise")
    public ResponseEntity<Void> removeAgent(
            @PathVariable UUID entrepriseId,
            @PathVariable UUID agentId,
            Authentication authentication) {
        entrepriseService.removeAgentFromEntreprise(entrepriseId, agentId, authentication);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Récupère les annonces actives d'une entreprise (via ses agents)
     */
    @GetMapping("/{entrepriseId}/annonces")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'AGENT_PROFESSIONNEL', 'MODERATEUR', 'ADMINISTRATEUR')")
    @Operation(summary = "Lister les annonces d'une entreprise",
               description = "Retourne toutes les annonces actives publiées par les agents de l'entreprise, avec pagination. "
                           + "Réservé aux membres de l'entreprise et à la modération (le public utilise /{id}/profil).")
    public ResponseEntity<PageResponse<AnnonceDTO>> getAnnoncesByEntreprise(
            @PathVariable UUID entrepriseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateCreation") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            Authentication authentication) {

        size = Math.min(size, MAX_PAGE_SIZE);
        String safeSort = SORTABLE_FIELDS.contains(sort) ? sort : "dateCreation";
        Sort.Direction sortDir = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDir, safeSort));
        return ResponseEntity.ok(PageResponse.of(entrepriseService.getAnnoncesByEntreprise(entrepriseId, pageable, authentication)));
    }

    /**
     * Profil public d'une entreprise : détails + annonces publiées paginées
     */
    @GetMapping("/{id}/profil")
    @Operation(summary = "Profil d'une entreprise",
               description = "Retourne les détails de l'entreprise et la liste paginée de ses annonces publiées")
    public ResponseEntity<com.app.AnnoncesAPI.dto.EntrepriseProfilDTO> getEntrepriseProfil(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateCreation") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        size = Math.min(size, MAX_PAGE_SIZE);
        String safeSort = SORTABLE_FIELDS.contains(sort) ? sort : "dateCreation";
        Sort.Direction sortDir = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDir, safeSort));
        return ResponseEntity.ok(entrepriseService.getEntrepriseProfil(id, pageable));
    }

    /**
     * Suspend un agent de l'entreprise
     */
    @PutMapping("/{entrepriseId}/agents/{agentId}/suspendre")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'MODERATEUR', 'ADMINISTRATEUR')")
    @Operation(summary = "Suspendre un agent",
               description = "L'annonceurProfessionnel de l'entreprise ou le créateur de l'agent peuvent suspendre un agent")
    public ResponseEntity<AgentDTO> suspendreAgent(
            @PathVariable UUID entrepriseId,
            @PathVariable UUID agentId,
            Authentication authentication) {
        return ResponseEntity.ok(entrepriseService.suspendreAgent(entrepriseId, agentId, authentication));
    }

    /**
     * Réactive un agent de l'entreprise
     */
    @PutMapping("/{entrepriseId}/agents/{agentId}/activer")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'MODERATEUR', 'ADMINISTRATEUR')")
    @Operation(summary = "Réactiver un agent",
               description = "L'annonceurProfessionnel de l'entreprise ou le créateur de l'agent peuvent réactiver un agent")
    public ResponseEntity<AgentDTO> activerAgent(
            @PathVariable UUID entrepriseId,
            @PathVariable UUID agentId,
            Authentication authentication) {
        return ResponseEntity.ok(entrepriseService.activerAgent(entrepriseId, agentId, authentication));
    }

    /**
     * Vérifie si une entreprise peut créer une annonce
     */
    @GetMapping("/{entrepriseId}/can-create-annonce")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'AGENT_PROFESSIONNEL')")
    @Operation(summary = "Vérifier le quota d'annonces",
               description = "Vérifie si l'entreprise peut créer une nouvelle annonce")
    public ResponseEntity<Boolean> canCreateAnnonce(@PathVariable UUID entrepriseId) {
        boolean can = entrepriseService.canCreateAnnonce(entrepriseId);
        return ResponseEntity.ok(can);
    }
    
    /**
     * Vérifie si une entreprise peut ajouter un agent
     */
    @GetMapping("/{entrepriseId}/can-add-agent")
    @PreAuthorize("hasRole('PROFESSIONNEL')")
    @Operation(summary = "Vérifier le quota d'agents",
               description = "Vérifie si l'entreprise peut ajouter un nouvel agent")
    public ResponseEntity<Boolean> canAddAgent(@PathVariable UUID entrepriseId) {
        boolean can = entrepriseService.canAddAgent(entrepriseId);
        return ResponseEntity.ok(can);
    }
    
    /**
     * Désactive une entreprise
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'ADMINISTRATEUR')")
    @Operation(summary = "Désactiver une entreprise",
               description = "Permet au propriétaire ou à un admin de désactiver une entreprise")
    public ResponseEntity<Void> disableEntreprise(
            @PathVariable UUID id,
            Authentication authentication) {
        entrepriseService.disableEntreprise(id, authentication);
        return ResponseEntity.noContent().build();
    }

    /**
     * Réactive une entreprise désactivée
     */
    @PutMapping("/{id}/reactiver")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Réactiver une entreprise",
               description = "Permet à un administrateur de réactiver une entreprise désactivée")
    public ResponseEntity<EntrepriseDTO> enableEntreprise(@PathVariable UUID id) {
        return ResponseEntity.ok(entrepriseService.enableEntreprise(id));
    }
}
