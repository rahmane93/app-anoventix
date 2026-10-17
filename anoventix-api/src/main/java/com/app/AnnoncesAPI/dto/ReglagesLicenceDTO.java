package com.app.AnnoncesAPI.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Réglages de vente des licences, modifiables par l'administrateur. Null = non renseigné. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReglagesLicenceDTO {

    /** Prix annuel en GNF d'une licence particulier. */
    @PositiveOrZero(message = "Le prix doit être positif.")
    private Long prixParticulier;

    /** Prix annuel en GNF d'une licence professionnel. */
    @PositiveOrZero(message = "Le prix doit être positif.")
    private Long prixProfessionnel;

    /** Numéro (appel / WhatsApp) à contacter pour acheter une licence. */
    @Pattern(regexp = "^\\+?[0-9 ]{8,20}$", message = "Numéro de téléphone invalide.")
    private String contactTelephone;
}
