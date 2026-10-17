package com.app.AnnoncesAPI.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsResponse {
    private long totalUtilisateurs;
    private long totalAnnoncesActives;
    private long totalSignalements;
    private long totalEntreprises;
    private long utilisateursEnAttenteActivation;
    private long piecesIdentiteEnAttente;
    private long annoncesMasquees;
    private long annoncesRejetees;
    private long signalementsEnAttente;
    private long messagesSignalesEnAttente;
}
