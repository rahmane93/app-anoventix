package com.app.AnnoncesAPI.entities;

import com.app.AnnoncesAPI.enums.TypeUsage;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Entité unique regroupant les anciens types Habitation et Terrain.
 * Le champ {@code typeBien} (hérité de {@link Annonce}) détermine le type exact du bien
 * (APPARTEMENT, MAISON, VILLA, TERRAIN, DOMAINE, MAGASIN, BUREAU, ENTREPOT, AUTRE).
 */
@Entity
@Table(name = "bien_immo")
@PrimaryKeyJoinColumn(name = "annonce_id")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class BienImmo extends Annonce {

    /** Surface totale en m². Facultative. */
    @Column
    private Double surfaceTotal;

    /** Usage du bien (HABITATION, COMMERCIAL…), obligatoire pour tous les types ; valeurs autorisées selon le type de bien (SFG §7.2). */
    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private TypeUsage typeUsage;

    /**
     * Composition du bien bâti. Toujours null pour un bien non bâti
     * (TERRAIN, DOMAINE : vendu ou loué en l'état), cf. {@link com.app.AnnoncesAPI.enums.TypeBien#estBati()}.
     */
    @Column
    private Integer nbPieces;

    @Column
    private Integer nbChambres;

    @Column
    private Integer nbSallesBain;
}
