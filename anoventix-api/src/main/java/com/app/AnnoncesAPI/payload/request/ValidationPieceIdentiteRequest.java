package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Requête de validation ou de rejet d'une pièce d'identité par admin/modérateur
 */
@Data
public class ValidationPieceIdentiteRequest {

    @NotNull(message = "Le statut est obligatoire (VALIDEE ou REJETEE)")
    private StatutPieceIdentite statut;

    /** Obligatoire si statut = REJETEE */
    @Size(max = 255, message = "Le motif de rejet ne peut pas dépasser 255 caractères")
    private String motifRejet;
}
