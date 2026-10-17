package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.MotifSignalement;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignalementRequest {

    @NotNull(message = "Le motif est obligatoire")
    private MotifSignalement motif;

    @Size(max = 500, message = "Le commentaire ne peut pas dépasser 500 caractères.")
    private String commentaire;
}
