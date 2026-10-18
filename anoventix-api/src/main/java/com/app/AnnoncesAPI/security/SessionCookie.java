package com.app.AnnoncesAPI.security;

import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Jeton de rafraîchissement du site web, confié à un cookie (ECART-54).
 *
 * Dans le {@code localStorage}, le jeton de 7 jours est lisible par tout script de la page : une
 * faille XSS suffit à voler une session. Le cookie est {@code HttpOnly} (illisible par les scripts),
 * {@code Secure}, {@code SameSite=Strict} et limité à {@code /api/auth}.
 *
 * Le client web l'active en envoyant l'en-tête {@code X-Client: web} ; l'application Android
 * continue de recevoir et d'envoyer le jeton dans le corps des échanges.
 * L'en-tête personnalisé sert aussi de garde contre le CSRF : un formulaire d'un autre site ne
 * peut pas l'ajouter, et SameSite=Strict empêche déjà l'envoi du cookie depuis un autre site.
 */
@Component
public class SessionCookie {

    public static final String NOM = "refresh_token";
    public static final String EN_TETE_CLIENT = "X-Client";
    public static final String CLIENT_WEB = "web";
    private static final String CHEMIN = "/api/auth";

    private final boolean secure;
    private final JwtUtils jwtUtils;

    public SessionCookie(@Value("${app.security.cookie-secure:true}") boolean secure, JwtUtils jwtUtils) {
        this.secure = secure;
        this.jwtUtils = jwtUtils;
    }

    public boolean estClientWeb(HttpServletRequest request) {
        return CLIENT_WEB.equalsIgnoreCase(request.getHeader(EN_TETE_CLIENT));
    }

    public Optional<String> lire(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(c -> NOM.equals(c.getName()))
                .map(Cookie::getValue)
                .filter(v -> !v.isBlank())
                .findFirst();
    }

    public void poser(HttpServletResponse response, String refreshToken) {
        long secondes = Math.max(0, (jwtUtils.getExpirationMs(refreshToken) - System.currentTimeMillis()) / 1000);
        ajouter(response, ResponseCookie.from(NOM, refreshToken).maxAge(Duration.ofSeconds(secondes)));
    }

    public void effacer(HttpServletResponse response) {
        ajouter(response, ResponseCookie.from(NOM, "").maxAge(Duration.ZERO));
    }

    private void ajouter(HttpServletResponse response, ResponseCookie.ResponseCookieBuilder cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE,
                cookie.httpOnly(true).secure(secure).sameSite("Strict").path(CHEMIN).build().toString());
    }
}
