package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.StatutSignalement;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TraiterSignalementRequest {

    @NotNull(message = "Le statut est obligatoire (TRAITE ou IGNORE)")
    private StatutSignalement statut;

    private String noteAdmin;
}
