package com.app.AnnoncesAPI.security;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Déduplication des vues d'annonces.
 *
 * <p>Une même clé {@code annonceId:viewerKey} ne compte qu'une seule vue
 * pendant la fenêtre TTL (24h par défaut).
 *
 * <p>Pour les utilisateurs authentifiés, viewerKey = "u:{userId}".
 * Pour les utilisateurs anonymes, viewerKey = "ip:{remoteAddr}".
 *
 * <p>Implémentation in-memory volontairement simple — comme {@link TokenBlacklist},
 * elle est non distribuée. Acceptable car la conséquence d'une "double-comptée"
 * sur deux instances est de surcompter au plus N fois (N = nb d'instances),
 * sans impact sur l'intégrité.
 */
@Component
public class VueCountTracker {

    private static final long TTL_MS = Duration.ofHours(24).toMillis();

    /** {annonceId:viewerKey} → timestamp d'expiration (ms epoch) */
    private final Map<String, Long> seen = new ConcurrentHashMap<>();

    /**
     * Tente d'enregistrer une nouvelle vue. Retourne {@code true} si la vue
     * doit être comptée (1re vue dans la fenêtre TTL pour ce viewer),
     * {@code false} si la vue a déjà été comptée récemment.
     */
    public boolean tryRecordView(Long annonceId, String viewerKey) {
        if (annonceId == null || viewerKey == null || viewerKey.isBlank()) {
            return false;
        }
        String key = annonceId + ":" + viewerKey;
        long now = System.currentTimeMillis();
        Long existing = seen.get(key);
        if (existing != null && existing > now) {
            return false;
        }
        seen.put(key, now + TTL_MS);
        return true;
    }

    /** Supprime les entrées expirées pour éviter les fuites mémoire. */
    @Scheduled(fixedDelay = 600_000)
    public void purgeExpired() {
        long now = System.currentTimeMillis();
        seen.entrySet().removeIf(e -> e.getValue() < now);
    }
}
