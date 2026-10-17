package com.app.AnnoncesAPI.security;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Enregistre l'activité de l'utilisateur authentifié dans {@link PresenceTracker}.
 *
 * <p>Filtre exécuté APRÈS {@link AuthTokenFilter} : le {@link SecurityContextHolder} est
 * déjà peuplé. Une simple écriture en mémoire par requête, aucun accès base.
 */
@Component
public class PresenceFilter extends OncePerRequestFilter {

    private final PresenceTracker presenceTracker;

    public PresenceFilter(PresenceTracker presenceTracker) {
        this.presenceTracker = presenceTracker;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null
                && auth.isAuthenticated()
                && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            presenceTracker.touch(userDetails.getId());
        }
        filterChain.doFilter(request, response);
    }
}
