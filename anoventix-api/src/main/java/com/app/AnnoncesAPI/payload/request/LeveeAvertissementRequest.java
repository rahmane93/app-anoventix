package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LeveeAvertissementRequest {

    @NotBlank(message = "Le motif de la levée est obligatoire")
    @Size(max = 200, message = "Le motif ne peut pas dépasser 200 caractères")
    private String motif;
}
