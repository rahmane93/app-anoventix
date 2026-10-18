package com.app.AnnoncesAPI.payload.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Réponse de {@code POST /api/auth/refresh}. Pour le site web, le nouveau jeton de rafraîchissement
 * voyage dans un cookie HttpOnly et {@code refreshToken} est absent du corps (voir SessionCookie).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RefreshResponse(String token, String refreshToken, String type) {

    public RefreshResponse(String token, String refreshToken) {
        this(token, refreshToken, "Bearer");
    }

    /** Même réponse sans le jeton de rafraîchissement (confié au cookie). */
    public RefreshResponse sansRefreshToken() {
        return new RefreshResponse(token, null, type);
    }
}
