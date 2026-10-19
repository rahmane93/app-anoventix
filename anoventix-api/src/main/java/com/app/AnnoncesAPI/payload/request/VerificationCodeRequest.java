package com.app.AnnoncesAPI.payload.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Saisie du code de la double authentification : code reçu par email (6 chiffres) ou code de secours. */
@Data
public class VerificationCodeRequest {

    @NotNull(message = "L'identifiant de vérification est obligatoire.")
    private UUID verificationId;

    @NotBlank(message = "Le code est obligatoire.")
    @Size(max = 20, message = "Le code est trop long.")
    private String code;
}
