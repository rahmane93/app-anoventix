package com.app.AnnoncesAPI.services;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.app.AnnoncesAPI.dto.LocalisationDTO;
import com.app.AnnoncesAPI.payload.request.LocalisationRequest;

public interface LocalisationService {

    Page<LocalisationDTO> getAllLocalisations(Pageable pageable);

    Optional<LocalisationDTO> getLocalisationById(String id);

    Page<LocalisationDTO> getLocalisationsByCommune(String communeName, Pageable pageable);

    Page<LocalisationDTO> getLocalisationsByPrefecture(String prefectureName, Pageable pageable);

    Page<LocalisationDTO> getLocalisationsByRegion(String regionName, Pageable pageable);

    LocalisationDTO create(LocalisationRequest request);

    LocalisationDTO update(String id, LocalisationRequest request);

    void delete(String id);
}
