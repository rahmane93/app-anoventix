package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.MoyenPaiement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Vente d'une clé de licence : acheteur désigné, montant et paiement (DEC-17, RG-08-24). */
@Data
public class VenteLicenceRequest {

    /** Email ou téléphone du compte acheteur ; le type de licence découle de son rôle. */
    @NotBlank(message = "L'acheteur est obligatoire (email ou téléphone).")
    @Size(max = 100)
    private String acheteur;

    @NotNull(message = "Le montant est obligatoire.")
    @Positive(message = "Le montant doit être positif.")
    private Long montant;

    @NotNull(message = "Le moyen de paiement est obligatoire.")
    private MoyenPaiement moyenPaiement;

    /** Obligatoire sauf pour un paiement en espèces. */
    @Size(max = 100, message = "La référence de paiement ne peut pas dépasser 100 caractères.")
    private String referencePaiement;
}
