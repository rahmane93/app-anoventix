package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ActivationLicenceRequest {

    @NotBlank(message = "La clé de licence est obligatoire.")
    private String cle;
}
