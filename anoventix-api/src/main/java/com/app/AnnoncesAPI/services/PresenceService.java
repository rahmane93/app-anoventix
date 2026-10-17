package com.app.AnnoncesAPI.services;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.exceptions.UnauthorizedActionException;
import com.app.AnnoncesAPI.payload.response.PresenceResponse;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.security.PresenceTracker;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

/**
 * Statut en ligne affiché dans la messagerie.
 *
 * <p>Réservé à l'utilisateur lui-même, à la modération et aux personnes qui ont une
 * conversation avec lui : on ne laisse pas n'importe quel compte suivre les connexions
 * d'un autre.
 */
@Service
public class PresenceService {

    private final PresenceTracker presenceTracker;
    private final ConversationRepository conversationRepository;

    public PresenceService(PresenceTracker presenceTracker, ConversationRepository conversationRepository) {
        this.presenceTracker = presenceTracker;
        this.conversationRepository = conversationRepository;
    }

    @Transactional(readOnly = true)
    public PresenceResponse getPresence(UUID userId, Authentication authentication) {
        UUID callerId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
        boolean staff = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMINISTRATEUR".equals(a.getAuthority())
                        || "ROLE_MODERATEUR".equals(a.getAuthority()));
        if (!callerId.equals(userId) && !staff
                && !conversationRepository.existsBetweenUsers(callerId, userId)) {
            throw new UnauthorizedActionException("Vous n'avez pas de conversation avec cet utilisateur");
        }
        boolean online = presenceTracker.isOnline(userId);
        return new PresenceResponse(userId, online ? "ONLINE" : "OFFLINE", presenceTracker.getLastSeen(userId));
    }
}
