package com.app.AnnoncesAPI.payload.response;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageModerationResponse {
    private Long id;
    private Long conversationId;
    private Long annonceId;
    private String annonceReference;
    private String annonceTitre;
    private UUID senderId;
    private String senderUsername;
    private String content;
    private LocalDateTime createdAt;
    private Boolean signale;
    /** Nom de l'enum MotifSignalementMessage ; null si signalé avant V10 ou non signalé. */
    private String motifSignalement;
    private LocalDateTime dateSignalement;
    private UUID signaleParId;
    private String signaleParUsername;
    private Boolean supprime;
    private String supprimePar;
    private LocalDateTime dateSuppression;
}
