package com.app.AnnoncesAPI.security;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;
import com.app.AnnoncesAPI.services.profiles.UserDetailsServiceImpl;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class AuthTokenFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = parseJwt(request);
            // Ne traiter le JWT que s'il est présent
            // Les endpoints publics (/api/auth/**) n'ont pas besoin de JWT
            Claims claims = jwt != null ? jwtUtils.parseValidClaims(jwt).orElse(null) : null;

            // Seul un access token authentifie une requête : un refresh token (7 jours)
            // ne doit servir qu'à POST /api/auth/refresh.
            if (claims != null && JwtUtils.isOfType(claims, JwtUtils.TYPE_ACCESS)) {
                UserDetailsImpl userDetails =
                        (UserDetailsImpl) userDetailsService.loadUserByUsername(claims.getSubject());

                if (!userDetails.isEnabled()) {
                    // Compte suspendu / désactivé depuis l'émission du token.
                    logger.warn("Token refuse : compte {} non actif", userDetails.getId());
                } else if (JwtUtils.isIssuedBefore(claims, userDetails.getPasswordChangedAt())) {
                    logger.warn("Token refuse : emis avant le dernier changement de mot de passe ({})",
                            userDetails.getId());
                } else {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception e) {
            logger.warn("Cannot set user authentication: {}", e.getMessage());
            // Ne pas bloquer la requête, laisser Spring Security gérer avec permitAll()
        }

        // Toujours continuer la chaîne de filtres
        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
