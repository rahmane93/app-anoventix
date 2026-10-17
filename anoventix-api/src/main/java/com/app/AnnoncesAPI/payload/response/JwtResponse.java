package com.app.AnnoncesAPI.payload.response;

import java.util.List;
import java.util.UUID;

import lombok.Data;

@Data
public class JwtResponse {
    private UUID id;
    private String email;
    private String token;
    private String refreshToken;
    private String type = "Bearer";
    private List<String> role;
    private boolean mustChangePassword;

    public JwtResponse(UUID id, String email, String accessToken, String refreshToken,
                       List<String> roles, boolean mustChangePassword) {
        this.id = id;
        this.email = email;
        this.token = accessToken;
        this.refreshToken = refreshToken;
        this.role = roles;
        this.mustChangePassword = mustChangePassword;
    }
}
