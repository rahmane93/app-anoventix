package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateStatutRequest {

    @NotNull(message = "Le statut est obligatoire")
    private StatutUtilisateur statut;

    @Size(max = 500, message = "Le motif ne peut pas dépasser 500 caractères")
    private String motif;
}
