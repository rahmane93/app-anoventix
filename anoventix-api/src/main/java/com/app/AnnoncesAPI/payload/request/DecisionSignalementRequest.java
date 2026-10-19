package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DecisionSignalementRequest {

    public enum Decision { MASQUER, REJETER, REMETTRE_EN_LIGNE, CLASSER }

    @NotNull(message = "La décision est obligatoire")
    private Decision decision;

    /** Obligatoire pour masquer ou rejeter : il est communiqué au propriétaire. */
    @Size(max = 500, message = "Le motif ne peut pas dépasser 500 caractères")
    private String motif;

    private String noteAdmin;
}
