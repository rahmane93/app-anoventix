package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {

    @NotBlank(message = "Le contenu du message est obligatoire")
    @Size(max = 4000, message = "Le message ne peut pas dépasser 4000 caractères")
    private String content;
}
