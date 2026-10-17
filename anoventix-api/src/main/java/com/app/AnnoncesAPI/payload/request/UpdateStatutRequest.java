package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStatutRequest {

    @NotNull(message = "Le statut est obligatoire")
    private StatutUtilisateur statut;

    private String motif;
}
