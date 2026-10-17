package com.app.AnnoncesAPI.payload.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoriqueAnnonceResponse {
    private Long id;
    private String champ;
    private String ancienneValeur;
    private String nouvelleValeur;
    private String modifiePar;
    private LocalDateTime dateModification;
}
