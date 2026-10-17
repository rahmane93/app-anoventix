package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ModeLicenceRequest {

    @NotNull(message = "L'état du mode licence est obligatoire.")
    private Boolean actif;
}
