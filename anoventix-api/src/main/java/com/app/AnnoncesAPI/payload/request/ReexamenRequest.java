package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReexamenRequest {

    @Size(max = 500, message = "Le message ne peut pas dépasser 500 caractères")
    private String message;
}
