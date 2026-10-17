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
public class MessageDTO {
    private Long id;
    private Long conversationId;
    private UUID senderId;
    private String senderUsername;
    private String senderNomComplet;
    private String senderPhotoProfil;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
    private Boolean mine;
    private Boolean supprime;
    private Boolean signale;
}
