package com.app.AnnoncesAPI.payload.request;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Demande d'un nouveau code de double authentification, pour une connexion en cours. */
@Data
public class RenvoiCodeRequest {

    @NotNull(message = "L'identifiant de vérification est obligatoire.")
    private UUID verificationId;
}
