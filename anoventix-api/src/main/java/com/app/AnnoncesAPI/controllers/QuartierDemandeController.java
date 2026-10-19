package com.app.AnnoncesAPI.controllers;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.AnnoncesAPI.dto.LocalisationDTO;
import com.app.AnnoncesAPI.enums.StatutDemandeQuartier;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.payload.response.PageResponse;
import com.app.AnnoncesAPI.services.QuartierDemandeService;
import com.app.AnnoncesAPI.services.QuartierDemandeService.DemandeDetail;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;

/** Quartier manquant (DEC-22) : entrée « Autre quartier » pour l'annonceur, file « Quartiers demandés » pour l'administrateur. */
@RestController
@Tag(name = "Quartiers demandés", description = "Demandes d'ajout d'un quartier absent de la liste")
public class QuartierDemandeController {

    public record AjoutQuartier(@Size(max = 100) String nom) {}

    public record RattachementQuartier(String localisationId) {}

    public record RefusQuartier(@Size(max = 255) String motif) {}

    private final QuartierDemandeService service;
    private final AnnonceMapper mapper;

    public QuartierDemandeController(QuartierDemandeService service, AnnonceMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping("/api/localisations/autre-quartier")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Entrée « Autre quartier » d'une commune",
               description = "À utiliser comme localisationId quand le quartier de l'annonceur n'est pas dans la liste, avec "
                           + "quartierSaisi dans la requête de l'annonce. Créée à la première utilisation.")
    public LocalisationDTO autreQuartier(@RequestParam String region, @RequestParam String prefecture,
                                         @RequestParam String commune) {
        return mapper.localisationToDTO(service.autreQuartier(region, prefecture, commune));
    }

    @GetMapping("/api/admin/quartiers-demandes")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] File des quartiers demandés",
               description = "Des plus anciennes aux plus récentes, avec les quartiers existants proches par le nom.")
    public PageResponse<DemandeDetail> lister(@RequestParam(defaultValue = "EN_ATTENTE") StatutDemandeQuartier statut,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(service.lister(statut, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50))));
    }

    @PutMapping("/api/admin/quartiers-demandes/{id}/ajouter")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Ajouter le quartier demandé",
               description = "Crée le quartier (nom éventuellement corrigé) et y rattache aussitôt l'annonce et les demandes identiques de la commune.")
    public DemandeDetail ajouter(@PathVariable Long id, @RequestBody(required = false) AjoutQuartier requete,
                                 @AuthenticationPrincipal UserDetailsImpl admin) {
        return service.ajouter(id, requete == null ? null : requete.nom(), admin.getUsername());
    }

    @PutMapping("/api/admin/quartiers-demandes/{id}/rattacher")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Rattacher à un quartier existant", description = "Variante d'orthographe d'un quartier de la même commune.")
    public DemandeDetail rattacher(@PathVariable Long id, @RequestBody RattachementQuartier requete,
                                   @AuthenticationPrincipal UserDetailsImpl admin) {
        return service.rattacher(id, requete.localisationId(), admin.getUsername());
    }

    @PutMapping("/api/admin/quartiers-demandes/{id}/refuser")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Refuser la demande", description = "Motif obligatoire ; l'annonce reste rattachée à la commune.")
    public DemandeDetail refuser(@PathVariable Long id, @RequestBody RefusQuartier requete,
                                 @AuthenticationPrincipal UserDetailsImpl admin) {
        return service.refuser(id, requete.motif(), admin.getUsername());
    }
}
