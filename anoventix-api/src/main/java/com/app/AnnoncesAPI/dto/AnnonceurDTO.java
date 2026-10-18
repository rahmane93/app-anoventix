package com.app.AnnoncesAPI.dto;

import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.security.ContactReserveAuxConnectes;
import tools.jackson.databind.annotation.JsonSerialize;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnonceurDTO {
    private String nom;
    private String prenom;
    /** Réservé aux utilisateurs connectés (DEC-14) : null pour un visiteur. */
    @JsonSerialize(using = ContactReserveAuxConnectes.class)
    private String telephone;
    private String photoProfil;
    private TypeRole role;
    private UUID entrepriseId;
}
