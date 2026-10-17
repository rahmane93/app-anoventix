package com.app.AnnoncesAPI.security;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Verrouillage par compte (et non par IP) contre le brute-force :
 * après {@link #MAX_FAILURES} échecs dans une fenêtre de {@link #WINDOW}, la clé
 * est bloquée jusqu'à la fin de la fenêtre.
 *
 * <p>Clés utilisées : {@code login:<identifiant>} (signin / reactivate) et
 * {@code reset:<email>} (code de réinitialisation à 8 chiffres).
 *
 * <p>Les clés inconnues (email inexistant) sont comptées comme les autres pour ne
 * pas révéler l'existence d'un compte. Implémentation in-memory non distribuée,
 * comme {@link TokenBlacklist}.
 */
@Component
public class LoginAttemptTracker {

    public static final int MAX_FAILURES = 5;
    public static final Duration WINDOW = Duration.ofMinutes(15);
    /** Renvois du lien d'activation autorisés par adresse et par fenêtre. */
    public static final int MAX_RENVOIS = 3;

    private record Attempts(int failures, long windowStartMs) {}

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    public static String loginKey(String identifier) {
        return "login:" + normalize(identifier);
    }

    public static String resetKey(String email) {
        return "reset:" + normalize(email);
    }

    public static String resendKey(String email) {
        return "resend:" + normalize(email);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    public boolean isBlocked(String key) {
        return isBlocked(key, MAX_FAILURES);
    }

    public boolean isBlocked(String key, int maxAttempts) {
        Attempts a = attempts.get(key);
        return a != null && !isExpired(a, System.currentTimeMillis()) && a.failures() >= maxAttempts;
    }

    public void recordFailure(String key) {
        long now = System.currentTimeMillis();
        attempts.compute(key, (k, a) -> (a == null || isExpired(a, now))
                ? new Attempts(1, now)
                : new Attempts(a.failures() + 1, a.windowStartMs()));
    }

    public void reset(String key) {
        attempts.remove(key);
    }

    private static boolean isExpired(Attempts a, long now) {
        return now - a.windowStartMs() > WINDOW.toMillis();
    }

    /** Supprime les fenêtres expirées pour éviter les fuites mémoire. */
    @Scheduled(fixedDelay = 600_000)
    public void purgeExpired() {
        long now = System.currentTimeMillis();
        attempts.entrySet().removeIf(e -> isExpired(e.getValue(), now));
    }
}
