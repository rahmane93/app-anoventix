package com.app.AnnoncesAPI.controllers;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.AnnoncesAPI.dto.EntrepriseDTO;
import com.app.AnnoncesAPI.dto.QuotasDTO;
import com.app.AnnoncesAPI.services.QuotaEntrepriseService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Quotas des comptes professionnels (agents, annonces actives). */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Quotas", description = "Quotas des comptes professionnels : valeur globale et exceptions par entreprise")
public class QuotaController {

    private final QuotaEntrepriseService quotaService;

    @GetMapping("/quotas")
    @PreAuthorize("hasRole('ADMINISTRATEUR') or hasRole('MODERATEUR')")
    @Operation(summary = "Quotas globaux des comptes pro")
    public ResponseEntity<QuotasDTO> getQuotas() {
        return ResponseEntity.ok(quotaService.getDefauts());
    }

    @PutMapping("/quotas")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Modifier les quotas globaux",
               description = "S'applique à toutes les entreprises sans exception. Les deux valeurs sont requises.")
    public ResponseEntity<QuotasDTO> setQuotas(@Valid @RequestBody QuotasDTO quotas) {
        if (quotas.getQuotaAgents() == null || quotas.getQuotaAnnonces() == null) {
            throw new IllegalArgumentException("Les deux quotas globaux sont requis.");
        }
        return ResponseEntity.ok(quotaService.setDefauts(quotas));
    }

    @PutMapping("/entreprises/{entrepriseId}/quotas")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Quotas propres à une entreprise",
               description = "Une valeur nulle ramène le quota à la valeur globale.")
    public ResponseEntity<EntrepriseDTO> setQuotasEntreprise(
            @PathVariable UUID entrepriseId,
            @Valid @RequestBody QuotasDTO quotas) {
        return ResponseEntity.ok(quotaService.setQuotasEntreprise(entrepriseId, quotas));
    }
}
