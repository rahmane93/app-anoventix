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
    /** Point de référence du quartier, pour centrer la carte ; null si non renseigné. */
    private java.math.BigDecimal latitude;
    private java.math.BigDecimal longitude;
}
