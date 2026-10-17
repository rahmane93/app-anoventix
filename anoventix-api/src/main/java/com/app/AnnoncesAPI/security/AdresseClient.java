package com.app.AnnoncesAPI.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Adresse IP du client d'une requête.
 *
 * X-Forwarded-For n'est lu que si {@code app.security.trust-xff} est vrai, c'est-à-dire
 * derrière un reverse-proxy de confiance (nginx) qui ÉCRASE cet en-tête avec l'IP réelle
 * ($remote_addr) — et non qui l'y ajoute ($proxy_add_x_forwarded_for), sinon la première
 * valeur reste usurpable. Sinon, l'adresse de la connexion TCP.
 */
@Component
public class AdresseClient {

    private final boolean trustXff;

    public AdresseClient(@Value("${app.security.trust-xff:false}") boolean trustXff) {
        this.trustXff = trustXff;
    }

    public String de(HttpServletRequest request) {
        if (trustXff) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
