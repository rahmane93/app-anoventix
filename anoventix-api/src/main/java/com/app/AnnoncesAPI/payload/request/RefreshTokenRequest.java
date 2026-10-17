package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenRequest {
    @NotBlank(message = "Le refreshToken est requis.")
    private String refreshToken;
}
