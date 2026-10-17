package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.payload.response.ProStatsResponse;
import org.springframework.security.core.Authentication;

public interface ProStatsService {
    ProStatsResponse getStats(Authentication authentication);
}
