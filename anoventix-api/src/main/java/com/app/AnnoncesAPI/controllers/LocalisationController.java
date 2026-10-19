package com.app.AnnoncesAPI.controllers;

import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.AnnoncesAPI.dto.LocalisationDTO;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.payload.request.LocalisationRequest;
import com.app.AnnoncesAPI.payload.response.MessageResponse;
import com.app.AnnoncesAPI.payload.response.PageResponse;
import com.app.AnnoncesAPI.services.LocalisationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/localisations")
@Tag(name = "Localisations", description = "Référentiel géographique (régions, préfectures, communes, quartiers)")
public class LocalisationController {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> SORTABLE_FIELDS =
            Set.of("region", "prefecture", "commune", "quartier", "typeCommune");
    private static final String DEFAULT_SORT = "region";

    private final LocalisationService localisationService;

    public LocalisationController(LocalisationService localisationService) {
        this.localisationService = localisationService;
    }

    private String safeSort(String sort) {
        return SORTABLE_FIELDS.contains(sort) ? sort : DEFAULT_SORT;
    }

    private Pageable buildPageable(int page, int size, String sort, String direction) {
        int safeSize = Math.min(size, MAX_PAGE_SIZE);
        Sort.Direction sortDir = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(page, safeSize, Sort.by(sortDir, safeSort(sort)));
    }

    @Operation(summary = "Lister toutes les localisations (paginé)")
    @GetMapping
    public ResponseEntity<PageResponse<LocalisationDTO>> getAllLocalisations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = DEFAULT_SORT) String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        return ResponseEntity.ok(PageResponse.of(localisationService.getAllLocalisations(pageable)));
    }

    @Operation(summary = "Régions du référentiel",
               description = "Liste triée des régions : l'app la charge au lieu de l'écrire en dur (ECART-59).")
    @GetMapping("/regions")
    public ResponseEntity<java.util.List<String>> getRegions() {
        return ResponseEntity.ok(localisationService.getRegions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LocalisationDTO> getLocalisationById(@PathVariable String id) {
        return localisationService.getLocalisationById(id)
               .map(ResponseEntity::ok)
               .orElseThrow(() -> new ResourceNotFoundException("localisation non trouvée avec l'ID: " + id));
    }

    @Operation(summary = "Lister les localisations d'une commune (paginé)")
    @GetMapping("/commune/{communeName}")
    public ResponseEntity<PageResponse<LocalisationDTO>> getLocalisationsByCommune(
            @PathVariable String communeName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = "quartier") String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        return ResponseEntity.ok(PageResponse.of(localisationService.getLocalisationsByCommune(communeName, pageable)));
    }

    @Operation(summary = "Lister les localisations d'une préfecture (paginé)")
    @GetMapping("/prefecture/{prefectureName}")
    public ResponseEntity<PageResponse<LocalisationDTO>> getLocalisationsByPrefecture(
            @PathVariable String prefectureName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = "commune") String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        return ResponseEntity.ok(PageResponse.of(localisationService.getLocalisationsByPrefecture(prefectureName, pageable)));
    }

    @Operation(summary = "Lister les localisations d'une région (paginé)")
    @GetMapping("/region/{regionName}")
    public ResponseEntity<PageResponse<LocalisationDTO>> getLocalisationsByRegion(
            @PathVariable String regionName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = "prefecture") String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        return ResponseEntity.ok(PageResponse.of(localisationService.getLocalisationsByRegion(regionName, pageable)));
    }

    // ── Endpoints réservés à l'administrateur ────────────────────────────────

    @Operation(summary = "Ajouter une localisation")
    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<LocalisationDTO> create(@Valid @RequestBody LocalisationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(localisationService.create(request));
    }

    @Operation(summary = "Modifier une localisation")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<LocalisationDTO> update(@PathVariable String id,
                                                  @Valid @RequestBody LocalisationRequest request) {
        return ResponseEntity.ok(localisationService.update(id, request));
    }

    @Operation(summary = "Supprimer une localisation")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<MessageResponse> delete(@PathVariable String id) {
        localisationService.delete(id);
        return ResponseEntity.ok(new MessageResponse("Localisation supprimée avec succès."));
    }
}
