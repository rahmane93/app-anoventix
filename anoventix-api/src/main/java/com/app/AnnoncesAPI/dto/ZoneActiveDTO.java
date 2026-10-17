package com.app.AnnoncesAPI.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Commune ayant des annonces publiées, avec leur nombre : alimente le
 * sélecteur de zones de l'écran Explorer (zones les plus actives d'abord).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ZoneActiveDTO {
    private String region;
    private String prefecture;
    private String commune;
    private Long nbAnnonces;
}
