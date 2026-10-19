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
    /** Annonces masquées dont le propriétaire attend un réexamen (DEC-09). */
    private long reexamensEnAttente;
    /** Entreprises dont le justificatif RCCM attend une décision (DEC-04). */
    private long entreprisesAVerifier;
    /** Demandes d'ajout de quartier en attente (DEC-22). */
    private long quartiersDemandes;
}
