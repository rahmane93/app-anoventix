package com.app.AnnoncesAPI.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Quotas d'un compte professionnel. En réglage d'une entreprise, une valeur nulle
 * signifie « valeur globale » ; en réglage global, les deux valeurs sont requises.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuotasDTO {

    @Min(value = 0, message = "Le quota d'agents ne peut pas être négatif")
    @Max(value = 1000, message = "Le quota d'agents ne peut pas dépasser 1000")
    private Integer quotaAgents;

    @Min(value = 0, message = "Le quota d'annonces ne peut pas être négatif")
    @Max(value = 100000, message = "Le quota d'annonces ne peut pas dépasser 100000")
    private Integer quotaAnnonces;
}
