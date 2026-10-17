package com.app.AnnoncesAPI.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatParPeriode {
    /** Format "YYYY-MM" — ex: "2025-03". */
    private String periode;
    private long count;
}
