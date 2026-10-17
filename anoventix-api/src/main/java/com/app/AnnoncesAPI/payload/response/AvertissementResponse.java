package com.app.AnnoncesAPI.payload.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.app.AnnoncesAPI.enums.NiveauAvertissement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvertissementResponse {
    private Long id;
    private UUID utilisateurId;
    private String motif;
    private String emitPar;
    private NiveauAvertissement niveau;
    private Boolean suspenduAutomatiquement;
    private LocalDateTime date;
}
