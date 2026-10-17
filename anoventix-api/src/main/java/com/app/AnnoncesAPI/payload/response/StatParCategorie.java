package com.app.AnnoncesAPI.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatParCategorie {
    private String categorie;
    private long count;
}
