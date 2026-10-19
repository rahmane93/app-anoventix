package com.app.AnnoncesAPI.payload.response;

import com.app.AnnoncesAPI.enums.TypeLicence;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Clé de licence vue par l'administrateur. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LicenceAdminResponse {
    private Long id;
    private String cle;
    private TypeLicence type;
    /** LIBRE (jamais activée), EN_ATTENTE (activée, démarre à l'ouverture du mode), ACTIVE ou EXPIREE. */
    private String statut;
    private String ownerEmail;
    /** Acheteur désigné à la vente ; nul pour une clé au porteur d'avant la mise en service (RG-08-26). */
    private String acheteurEmail;
    private Long montant;
    private com.app.AnnoncesAPI.enums.MoyenPaiement moyenPaiement;
    private String referencePaiement;
    private String generePar;
    private LocalDateTime dateVente;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private LocalDateTime createdAt;
}
