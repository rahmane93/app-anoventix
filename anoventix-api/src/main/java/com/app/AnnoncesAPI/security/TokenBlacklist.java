package com.app.AnnoncesAPI.security;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Blacklist en mémoire des access tokens révoqués.
 * Chaque entrée expire automatiquement après son TTL (fixé à l'ajout).
 * Un scheduled job nettoie les entrées expirées toutes les 10 minutes.
 */
@Component
public class TokenBlacklist {

    /** token → timestamp d'expiration (ms epoch) */
    private final Map<String, Long> revoked = new ConcurrentHashMap<>();

    public void revoke(String token, long expiresAtMs) {
        revoked.put(token, expiresAtMs);
    }

    public boolean isRevoked(String token) {
        Long exp = revoked.get(token);
        if (exp == null) return false;
        if (System.currentTimeMillis() > exp) {
            revoked.remove(token);
            return false;
        }
        return true;
    }

    /** Supprime les entrées expirées pour éviter les fuites mémoire. */
    @Scheduled(fixedDelay = 600_000)
    public void purgeExpired() {
        long now = System.currentTimeMillis();
        revoked.entrySet().removeIf(e -> e.getValue() < now);
    }
}
