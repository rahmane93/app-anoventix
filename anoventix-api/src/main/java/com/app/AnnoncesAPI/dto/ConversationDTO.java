package com.app.AnnoncesAPI.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDTO {
    private Long id;
    private Long annonceId;
    private String annonceReference;
    private String annonceTitre;
    private Boolean annonceActive;
    private UUID otherParticipantId;
    private String otherParticipantUsername;
    private String otherParticipantNomComplet;
    private String otherParticipantPhotoProfil;
    private UUID createdById;
    private String lastMessagePreview;
    private Long unreadCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastMessageAt;
    /** État pour l'utilisateur connecté : ACTIVE, ARCHIVEE (SUPPRIMEE n'est jamais renvoyée). */
    private com.app.AnnoncesAPI.enums.EtatConversation etat;
    /** L'utilisateur connecté a bloqué son interlocuteur. */
    private Boolean bloqueParMoi;
    /** Écrire est possible ; sinon `ecritureImpossibleMotif` dit pourquoi. */
    private Boolean ecriturePossible;
    private String ecritureImpossibleMotif;
}
