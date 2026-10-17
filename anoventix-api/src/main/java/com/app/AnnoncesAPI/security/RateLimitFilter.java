package com.app.AnnoncesAPI.security;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.app.AnnoncesAPI.exceptions.CodeErreur;
import com.app.AnnoncesAPI.exceptions.ErreurApi;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * Rate limiting par IP sur tous les endpoints d'authentification.
 * - /signin, /signup, /logout : 10 req/min
 * - /forgot-password, /reset-password, /refresh, /reactivate : 5 req/15min (endpoints sensibles)
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> STANDARD_PATHS = Set.of(
            "/api/auth/signin", "/api/auth/signup", "/api/auth/logout"
    );

    private static final Set<String> SENSITIVE_PATHS = Set.of(
            "/api/auth/forgot-password", "/api/auth/reset-password",
            "/api/auth/refresh", "/api/auth/reactivate", "/api/auth/resend-activation",
            "/activate"
    );

    private static final int STANDARD_CAPACITY = 10;
    private static final int SENSITIVE_CAPACITY = 5;

    /** Buckets standard : 10 req/min */
    private final Map<String, Bucket> standardBuckets = new ConcurrentHashMap<>();

    /** Buckets sensibles : 5 req/15min */
    private final Map<String, Bucket> sensitiveBuckets = new ConcurrentHashMap<>();

    private final AdresseClient adresseClient;
    private final ObjectMapper mapper;

    public RateLimitFilter(AdresseClient adresseClient, ObjectMapper mapper) {
        this.adresseClient = adresseClient;
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !STANDARD_PATHS.contains(path) && !SENSITIVE_PATHS.contains(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String ip = adresseClient.de(request);
        String path = request.getServletPath();

        Bucket bucket = SENSITIVE_PATHS.contains(path)
                ? sensitiveBuckets.computeIfAbsent(ip, k -> newSensitiveBucket())
                : standardBuckets.computeIfAbsent(ip, k -> newStandardBucket());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            ErreurApi.of(CodeErreur.TROP_DE_REQUETES, "Trop de requêtes. Veuillez réessayer plus tard.", path)
                    .ecrire(response, mapper);
        }
    }

    /**
     * Supprime les buckets entièrement rechargés : ils sont équivalents à un bucket
     * neuf, et sans purge les maps grossissent indéfiniment (une entrée par IP vue).
     */
    @Scheduled(fixedDelay = 600_000)
    public void purgeIdleBuckets() {
        standardBuckets.values().removeIf(b -> b.getAvailableTokens() >= STANDARD_CAPACITY);
        sensitiveBuckets.values().removeIf(b -> b.getAvailableTokens() >= SENSITIVE_CAPACITY);
    }

    private Bucket newStandardBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(STANDARD_CAPACITY, Refill.greedy(STANDARD_CAPACITY, Duration.ofMinutes(1))))
                .build();
    }

    private Bucket newSensitiveBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(SENSITIVE_CAPACITY, Refill.greedy(SENSITIVE_CAPACITY, Duration.ofMinutes(15))))
                .build();
    }
}
