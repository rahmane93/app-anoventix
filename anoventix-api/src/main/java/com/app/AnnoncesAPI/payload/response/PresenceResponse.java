package com.app.AnnoncesAPI.payload.response;

import java.time.Instant;
import java.util.UUID;

/**
 * Présence d'un utilisateur : ONLINE s'il a fait une requête dans les 2 dernières minutes.
 * {@code lastSeenAt} est null si aucune activité depuis le démarrage de l'API.
 */
public record PresenceResponse(UUID userId, String status, Instant lastSeenAt) {
}
