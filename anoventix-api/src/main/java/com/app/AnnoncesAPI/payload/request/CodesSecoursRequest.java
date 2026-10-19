package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Régénération des codes de secours : le mot de passe est redemandé (une session volée n'en crée pas). */
@Data
public class CodesSecoursRequest {

    @NotBlank(message = "Le mot de passe est obligatoire.")
    private String password;
}
