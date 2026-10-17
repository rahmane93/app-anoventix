package com.app.AnnoncesAPI.dto;

import com.app.AnnoncesAPI.enums.TypeUsage;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO unifié représentant un bien immobilier (anciennement Habitation ou Terrain).
 * Les champs spécifiques à chaque sous-type sont null si non applicables.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BienImmoDTO extends AnnonceDTO {

    // Commun
    private Double surfaceTotal;

    // Spécifique TERRAIN
    private TypeUsage typeUsage;

    // Spécifique biens bâtis (null pour TERRAIN / DOMAINE)
    private Integer nbPieces;
    private Integer nbChambres;
    private Integer nbSallesBain;
}
