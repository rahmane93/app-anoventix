package com.app.AnnoncesAPI.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Présence « en ligne » des utilisateurs, déduite de leur dernière requête authentifiée
 * (alimentée par {@link PresenceFilter}).
 *
 * <p>Implémentation in-memory, comme {@link VueCountTracker} et {@link TokenBlacklist} :
 * non distribuée et remise à zéro au redémarrage (chacun redevient « en ligne » à sa
 * prochaine requête). Une entrée par utilisateur actif : pas de purge nécessaire.
 */
@Component
public class PresenceTracker {

    /** Sans requête depuis cette durée, l'utilisateur est considéré hors ligne. */
    static final Duration ONLINE_WINDOW = Duration.ofMinutes(2);

    private final Map<UUID, Instant> lastSeen = new ConcurrentHashMap<>();

    public void touch(UUID userId) {
        if (userId != null) {
            lastSeen.put(userId, Instant.now());
        }
    }

    /** Dernière activité connue depuis le démarrage, ou {@code null}. */
    public Instant getLastSeen(UUID userId) {
        return userId == null ? null : lastSeen.get(userId);
    }

    public boolean isOnline(UUID userId) {
        Instant seen = getLastSeen(userId);
        return seen != null && seen.isAfter(Instant.now().minus(ONLINE_WINDOW));
    }
}
