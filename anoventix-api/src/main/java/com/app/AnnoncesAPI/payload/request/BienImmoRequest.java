package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.TypeUsage;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * Requête unifiée pour créer ou mettre à jour un bien immobilier.
 * Les champs sont optionnels au niveau HTTP ; le service valide
 * la cohérence selon la valeur de {@code typeBien} hérité de {@link AnnonceRequest}.
 */
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Data
public class BienImmoRequest extends AnnonceRequest {

    /**
     * Nom du quartier saisi quand il n'est pas dans la liste (DEC-22) : requis si l'annonce est rattachée à
     * l'entrée « Autre quartier » de la commune, ignoré sinon.
     */
    @jakarta.validation.constraints.Size(max = 100, message = "Le nom du quartier ne peut pas dépasser 100 caractères")
    private String quartierSaisi;


   /** Surface totale en m². */
    private Double surfaceTotal;

    /** Usage du bien (HABITATION, COMMERCIAL…) : obligatoire, colonne NOT NULL. */
    @NotNull(message = "L'usage du bien est obligatoire")
    private TypeUsage typeUsage;

    /** Nombre de pièces (biens bâtis uniquement, ignoré pour TERRAIN / DOMAINE). */
    @Min(value = 1, message = "Le nombre de pièces doit être au moins 1")
    @Max(value = 100, message = "Le nombre de pièces ne peut pas dépasser 100")
    private Integer nbPieces;

    /** Nombre de chambres (biens bâtis uniquement). */
    @Min(value = 0, message = "Le nombre de chambres ne peut pas être négatif")
    @Max(value = 50, message = "Le nombre de chambres ne peut pas dépasser 50")
    private Integer nbChambres;

    /** Nombre de salles de bain (biens bâtis uniquement). */
    @Min(value = 0, message = "Le nombre de salles de bain ne peut pas être négatif")
    @Max(value = 50, message = "Le nombre de salles de bain ne peut pas dépasser 50")
    private Integer nbSallesBain;
}
