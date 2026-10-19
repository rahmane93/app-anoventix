package com.app.AnnoncesAPI.payload.request;

import lombok.Data;

@Data
public class RefreshTokenRequest {
    /**
     * Application : jeton de rafraîchissement. Site web : absent, le jeton voyage dans un cookie
     * HttpOnly (voir SessionCookie) ; sert seulement à migrer un ancien jeton du stockage du navigateur.
     */
    private String refreshToken;
}
