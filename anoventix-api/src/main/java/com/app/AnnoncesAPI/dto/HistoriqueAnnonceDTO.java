package com.app.AnnoncesAPI.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoriqueAnnonceDTO {
    private Long id;
    private Long annonceId;
    private String champ;
    private String ancienneValeur;
    private String nouvelleValeur;
    private String modifiePar;
    private LocalDateTime dateModification;
}
