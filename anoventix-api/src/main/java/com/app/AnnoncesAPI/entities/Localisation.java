package com.app.AnnoncesAPI.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

@Data
@Entity(name = "localisation")
public class Localisation {

    @Id
    private String id;
    private String region;
    private String prefecture;
    private String commune;
    private String quartier;
    private String typeCommune;

    /** Entrée « Autre quartier » d'une commune : jamais proposée dans les listes (DEC-22, RG-05-18). */
    private boolean technique;

}
