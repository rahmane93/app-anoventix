package com.app.AnnoncesAPI.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Classe pour les médias associés
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaDTO {
    private Long id;
    private String url;
    private String typeMime; // IMAGE, VIDEO, etc.
    private int ordre;
}
