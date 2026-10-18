package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Un agent invité choisit son mot de passe depuis le lien reçu par email (ECART-47). */
@Data
public class AcceptInvitationRequest {

    @NotBlank(message = "Le lien d'invitation est invalide.")
    private String token;

    /** Règle commune des mots de passe : voir {@code MotDePasse}. */
    @NotBlank(message = "Le mot de passe est obligatoire.")
    private String password;
}
