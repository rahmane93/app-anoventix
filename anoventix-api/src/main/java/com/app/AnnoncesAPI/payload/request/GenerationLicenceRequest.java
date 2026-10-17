package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.TypeLicence;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GenerationLicenceRequest {

    @NotNull(message = "Le type de licence est obligatoire.")
    private TypeLicence type;
}
