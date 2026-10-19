package com.app.AnnoncesAPI.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocalisationDTO {
    private String id;
    private String region;
    private String prefecture;
    private String commune;
    private String quartier;
    private String typeCommune;
    /** Entrée « Autre quartier » : le quartier est masqué, l'annonce s'affiche avec sa commune seule. */
    private boolean technique;
}
