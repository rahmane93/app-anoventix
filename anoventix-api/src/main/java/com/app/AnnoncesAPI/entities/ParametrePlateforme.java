package com.app.AnnoncesAPI.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Réglage de la plateforme modifiable par l'administrateur (clé / valeur). */
@Entity
@Table(name = "parametre_plateforme")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParametrePlateforme {

    @Id
    @Column(length = 100)
    private String cle;

    @Column(nullable = false)
    private String valeur;
}
