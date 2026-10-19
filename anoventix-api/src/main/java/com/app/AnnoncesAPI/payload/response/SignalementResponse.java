package com.app.AnnoncesAPI.payload.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.app.AnnoncesAPI.enums.StatutSignalement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalementResponse {
    private Long id;
    private Long annonceId;
    private String referenceAnnonce;
    private String titreAnnonce;
    private UUID reporterId;
    private String reporterUsername;
    private String motif;
    private String commentaire;
    private LocalDateTime date;
    private Boolean annule;
    private LocalDateTime dateAnnulation;
    private StatutSignalement statut;
    private String traitePar;
    private LocalDateTime dateTraitement;
    private String noteAdmin;
    /** L'annonce a été masquée automatiquement (DEC-11) et attend une décision. */
    private Boolean annonceMasqueeAutomatiquement;
}
