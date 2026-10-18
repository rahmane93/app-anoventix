package com.app.AnnoncesAPI.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    public static final String CLAIM_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";
    public static final String CLAIM_FAMILLE = "fam";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration_ms}")
    private int jwtExpirationMs;

    @Value("${jwt.refresh_expiration_ms}")
    private long refreshExpirationMs;

    @Autowired
    private TokenBlacklist tokenBlacklist;

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateJwtToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        return buildAccessToken(userPrincipal.getUsername());
    }

    /**
     * Jeton de rafraîchissement d'une session. {@code jti} l'identifie dans la table
     * refresh_token (usage unique, rotation) et {@code famille} regroupe les jetons successifs
     * d'une même session d'appareil (révocation en bloc si un jeton est rejoué).
     */
    public String generateRefreshToken(String username, UUID jti, UUID famille, Instant expiration) {
        return Jwts.builder()
                .id(jti.toString())
                .subject(username)
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .claim(CLAIM_FAMILLE, famille.toString())
                .issuedAt(new Date())
                .expiration(Date.from(expiration))
                .signWith(signingKey())
                .compact();
    }

    /** Durée de vie standard d'un jeton de rafraîchissement (7 jours par défaut). */
    public Duration dureeRefresh() {
        return Duration.ofMillis(refreshExpirationMs);
    }

    public String buildAccessToken(String username) {
        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(signingKey())
                .compact();
    }

    public long getExpirationMs(String token) {
        return parseClaims(token).getExpiration().getTime();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Vérifie signature, expiration et révocation du token.
     * Retourne ses claims, ou {@link Optional#empty()} si le token est inutilisable.
     */
    public Optional<Claims> parseValidClaims(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        if (tokenBlacklist.isRevoked(token)) {
            logger.warn("Tentative d'utilisation d'un token revoque");
            return Optional.empty();
        }
        try {
            return Optional.of(parseClaims(token));
        } catch (ExpiredJwtException e) {
            logger.debug("Token JWT expiré: {}", e.getMessage());
        } catch (JwtException | IllegalArgumentException e) {
            // JwtException couvre signature invalide, token malformé ou non supporté.
            logger.warn("Token JWT invalide: {}", e.getMessage());
        }
        return Optional.empty();
    }

    public static boolean isOfType(Claims claims, String type) {
        return type.equals(claims.get(CLAIM_TYPE));
    }

    /**
     * Vrai si le token a été émis avant le dernier changement de mot de passe
     * (il doit alors être rejeté). {@code iat} est à la seconde près : on compare
     * à la seconde tronquée pour ne pas rejeter un token émis juste après le changement.
     */
    public static boolean isIssuedBefore(Claims claims, Long passwordChangedAt) {
        if (passwordChangedAt == null) return false;
        Date issuedAt = claims.getIssuedAt();
        if (issuedAt == null) return true;
        return issuedAt.getTime() < (passwordChangedAt / 1000) * 1000;
    }
}
