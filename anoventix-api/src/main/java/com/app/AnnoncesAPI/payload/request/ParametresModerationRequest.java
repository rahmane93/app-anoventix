package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ParametresModerationRequest {

    @NotNull(message = "Le seuil est obligatoire")
    @Min(value = 0, message = "Le seuil doit être positif (0 désactive le masquage automatique)")
    @Max(value = 50, message = "Le seuil ne peut pas dépasser 50")
    private Integer seuilMasquageAuto;
}
