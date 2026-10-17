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
    /** LIBRE (jamais activée), ACTIVE ou EXPIREE. */
    private String statut;
    private String ownerEmail;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private LocalDateTime createdAt;
}
