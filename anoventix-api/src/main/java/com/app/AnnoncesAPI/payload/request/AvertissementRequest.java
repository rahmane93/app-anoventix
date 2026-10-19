package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AvertissementRequest {

    @NotBlank(message = "Le motif est obligatoire")
    @Size(max = 200, message = "Le motif ne peut pas dépasser 200 caractères")
    private String motif;

    /**
     * Niveau choisi par le modérateur (facultatif). Sans choix, il suit le rang parmi les avertissements en vigueur :
     * 1er LÉGER, 2e MODÉRÉ, 3e GRAVE. GRAVE suspend le compte (fraude avérée, par exemple).
     */
    private com.app.AnnoncesAPI.enums.NiveauAvertissement niveau;
}
