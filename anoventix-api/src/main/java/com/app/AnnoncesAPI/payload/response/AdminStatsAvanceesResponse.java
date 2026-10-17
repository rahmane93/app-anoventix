package com.app.AnnoncesAPI.payload.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsAvanceesResponse {

    /** Nombre d'annonces créées par mois sur les 12 derniers mois. */
    private List<StatParPeriode> evolutionAnnonces;

    /** Nombre d'annonces actives par région. */
    private List<StatParCategorie> annonceParRegion;

    /** Nombre d'annonces actives par type de bien. */
    private List<StatParCategorie> annonceParTypeBien;

    /** Nombre d'annonces actives par type d'annonce (VENTE / LOCATION / BAIL). */
    private List<StatParCategorie> annonceParTypeAnnonce;
}
