package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.StatutVerificationEntreprise;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DecisionVerificationEntrepriseRequest {

    @NotNull(message = "Le statut est obligatoire (VERIFIEE ou REJETEE)")
    private StatutVerificationEntreprise statut;

    /** Obligatoire en cas de rejet : il est communiqué au propriétaire. */
    @Size(max = 255, message = "Le motif ne peut pas dépasser 255 caractères")
    private String motif;
}
