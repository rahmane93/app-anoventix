package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    /** Email ou numéro de téléphone */
    @NotBlank(message = "L'identifiant est obligatoire.")
    private String identifier;

    @NotBlank(message = "Le mot de passe est obligatoire.")
    private String password;
}

