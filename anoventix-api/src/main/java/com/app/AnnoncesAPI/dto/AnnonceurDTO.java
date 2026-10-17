package com.app.AnnoncesAPI.dto;

import com.app.AnnoncesAPI.enums.TypeRole;
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
    private String telephone;
    private String photoProfil;
    private TypeRole role;
    private UUID entrepriseId;
}
