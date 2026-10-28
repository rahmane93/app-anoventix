package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateConversationRequest {

    @NotNull(message = "L'identifiant de l'annonce est obligatoire")
    private Long annonceId;

    /** Premier message, envoyé avec l'ouverture de la conversation (facultatif). */
    @Size(max = 4000, message = "Le message ne peut pas dépasser 4000 caractères")
    private String message;
}
