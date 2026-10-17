package com.app.AnnoncesAPI.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnnonceStatsResponse {
    private Long annonceId;
    private String referenceAnnonce;
    private long vueCount;
}
