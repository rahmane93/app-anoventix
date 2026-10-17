package com.app.AnnoncesAPI.security;

import java.io.IOException;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.app.AnnoncesAPI.exceptions.CodeErreur;
import com.app.AnnoncesAPI.exceptions.ErreurApi;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * Force les utilisateurs marqués {@code mustChangePassword=true} (typiquement les agents
 * provisionnés avec un mot de passe temporaire) à changer leur mot de passe avant toute
 * action sensible (P1.2).
 *
 * <p>Filtre exécuté APRÈS {@link AuthTokenFilter} : le {@link SecurityContextHolder} est
 * déjà peuplé.
 *
 * <p>Bypass autorisé pour :
 * <ul>
 *   <li>{@code POST /api/auth/change-password} — l'action attendue</li>
 *   <li>{@code POST /api/auth/logout} — quitter</li>
 *   <li>{@code POST /api/auth/refresh} — refresh du JWT</li>
 *   <li>{@code GET /api/users/me} — consulter son profil pour voir le flag</li>
 *   <li>{@code /actuator/**} — health checks</li>
 * </ul>
 *
 * <p>Tout autre endpoint répond {@code 423 Locked} avec un body JSON explicite.
 */
@Component
public class MustChangePasswordFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(MustChangePasswordFilter.class);

    private final ObjectMapper mapper;

    public MustChangePasswordFilter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** Chemins autorisés quelle que soit la méthode HTTP. */
    private static final Set<String> BYPASS_PATHS = Set.of(
            "/api/auth/change-password",
            "/api/auth/logout",
            "/api/auth/refresh"
    );

    /** Chemins autorisés uniquement en GET. */
    private static final Set<String> BYPASS_GET_PATHS = Set.of(
            "/api/users/me"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();
        String method = request.getMethod();

        // Bypass des chemins autorisés
        if (BYPASS_PATHS.contains(path)
                || (path != null && path.startsWith("/actuator"))
                || ("GET".equalsIgnoreCase(method) && BYPASS_GET_PATHS.contains(path))) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null
                && auth.isAuthenticated()
                && auth.getPrincipal() instanceof UserDetailsImpl userDetails
                && userDetails.isMustChangePassword()) {
            logger.warn("Acces refuse a {} {} pour {} : mustChangePassword=true",
                    method, path, userDetails.getUsername());
            ErreurApi.of(CodeErreur.MOT_DE_PASSE_A_CHANGER,
                    "Vous devez changer votre mot de passe avant d'accéder à cette ressource. "
                            + "Appelez POST /api/auth/change-password.",
                    path)
                    .ecrire(response, mapper);
            return;
        }

        filterChain.doFilter(request, response);
    }
}
