package com.app.AnnoncesAPI.security;

import java.io.IOException;
import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
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
 * Limitation de débit par adresse IP sur les endpoints d'authentification.
 *
 * Les opérateurs mobiles guinéens partagent une même IP publique entre de nombreux abonnés
 * (CGNAT) : une limite serrée par IP déconnecte des utilisateurs sans rapport (ECART-05).
 * Les seuils sont donc des garde-fous contre l'inondation, pas contre l'essai de mots de
 * passe : celui-ci est limité par compte (LoginAttemptTracker : verrouillage après 5 échecs).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    /** Catégories de routes, chacune avec sa capacité par fenêtre. */
    private enum Palier {
        /** Connexion, inscription, déconnexion : 30 requêtes par minute. */
        CONNEXION(30, Duration.ofMinutes(1)),
        /** Envoi d'emails et de codes (abus et coût) : 5 requêtes par 15 minutes. */
        SENSIBLE(5, Duration.ofMinutes(15)),
        /**
         * Renouvellement de session : un utilisateur actif le fait environ 4 fois par heure, et un
         * jeton volé ne se devine pas (signature). 120 par minute laisse passer tout un quartier
         * derrière la même IP et bloque seulement une inondation.
         */
        SESSION(120, Duration.ofMinutes(1));

        final int capacite;
        final Duration fenetre;

        Palier(int capacite, Duration fenetre) {
            this.capacite = capacite;
            this.fenetre = fenetre;
        }

        Bucket nouveauBucket() {
            return Bucket.builder()
                    .addLimit(Bandwidth.classic(capacite, Refill.greedy(capacite, fenetre)))
                    .build();
        }
    }

    private static final Map<String, Palier> PALIER_PAR_ROUTE = Map.ofEntries(
            Map.entry("/api/auth/signin", Palier.CONNEXION),
            Map.entry("/api/auth/signup", Palier.CONNEXION),
            Map.entry("/api/auth/logout", Palier.CONNEXION),
            Map.entry("/api/auth/refresh", Palier.SESSION),
            Map.entry("/api/auth/verification-code", Palier.CONNEXION),
            Map.entry("/api/auth/verification-code/renvoyer", Palier.CONNEXION),
            Map.entry("/api/auth/forgot-password", Palier.SENSIBLE),
            Map.entry("/api/auth/reset-password", Palier.SENSIBLE),
            Map.entry("/api/auth/reactivate", Palier.SENSIBLE),
            Map.entry("/api/auth/resend-activation", Palier.SENSIBLE),
            Map.entry("/api/auth/accept-invitation", Palier.SENSIBLE),
            Map.entry("/activate", Palier.SENSIBLE));

    /** Un bucket par palier et par IP. */
    private final Map<Palier, Map<String, Bucket>> buckets = new EnumMap<>(Palier.class);

    private final AdresseClient adresseClient;
    private final ObjectMapper mapper;

    public RateLimitFilter(AdresseClient adresseClient, ObjectMapper mapper) {
        this.adresseClient = adresseClient;
        this.mapper = mapper;
        for (Palier palier : Palier.values()) {
            buckets.put(palier, new ConcurrentHashMap<>());
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !PALIER_PAR_ROUTE.containsKey(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();
        Palier palier = PALIER_PAR_ROUTE.get(path);
        Bucket bucket = buckets.get(palier).computeIfAbsent(adresseClient.de(request), ip -> palier.nouveauBucket());

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
        buckets.forEach((palier, parIp) ->
                parIp.values().removeIf(b -> b.getAvailableTokens() >= palier.capacite));
    }
}
