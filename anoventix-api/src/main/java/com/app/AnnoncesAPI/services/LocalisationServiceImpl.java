package com.app.AnnoncesAPI.services;

import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.app.AnnoncesAPI.dto.LocalisationDTO;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.payload.request.LocalisationRequest;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;

@Service
public class LocalisationServiceImpl implements LocalisationService {

    private final LocalisationRepository localisationRepository;
    private final AnnonceMapper annonceMapper;

    public LocalisationServiceImpl(LocalisationRepository localisationRepository,
                                   AnnonceMapper annonceMapper) {
        this.localisationRepository = localisationRepository;
        this.annonceMapper = annonceMapper;
    }

    @Override
    public Page<LocalisationDTO> getAllLocalisations(Pageable pageable) {
        return localisationRepository.findAll(pageable).map(annonceMapper::localisationToDTO);
    }

    @Override
    public Optional<LocalisationDTO> getLocalisationById(String id) {
        return localisationRepository.findById(id)
                .map(annonceMapper::localisationToDTO);
    }

    @Override
    public Page<LocalisationDTO> getLocalisationsByCommune(String communeName, Pageable pageable) {
        return localisationRepository.findByCommune(communeName, pageable).map(annonceMapper::localisationToDTO);
    }

    @Override
    public Page<LocalisationDTO> getLocalisationsByPrefecture(String prefectureName, Pageable pageable) {
        return localisationRepository.findByPrefecture(prefectureName, pageable).map(annonceMapper::localisationToDTO);
    }

    @Override
    public Page<LocalisationDTO> getLocalisationsByRegion(String regionName, Pageable pageable) {
        return localisationRepository.findByRegion(regionName, pageable).map(annonceMapper::localisationToDTO);
    }

    @Override
    public LocalisationDTO create(LocalisationRequest request) {
        Localisation localisation = new Localisation();
        localisation.setId(UUID.randomUUID().toString());
        localisation.setRegion(request.getRegion());
        localisation.setPrefecture(request.getPrefecture());
        localisation.setCommune(request.getCommune());
        localisation.setQuartier(request.getQuartier());
        localisation.setTypeCommune(request.getTypeCommune());
        return annonceMapper.localisationToDTO(localisationRepository.save(localisation));
    }

    @Override
    public LocalisationDTO update(String id, LocalisationRequest request) {
        Localisation localisation = localisationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Localisation non trouvée avec l'ID: " + id));
        localisation.setRegion(request.getRegion());
        localisation.setPrefecture(request.getPrefecture());
        localisation.setCommune(request.getCommune());
        localisation.setQuartier(request.getQuartier());
        localisation.setTypeCommune(request.getTypeCommune());
        return annonceMapper.localisationToDTO(localisationRepository.save(localisation));
    }

    @Override
    public void delete(String id) {
        if (!localisationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Localisation non trouvée avec l'ID: " + id);
        }
        try {
            localisationRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException(
                "Impossible de supprimer cette localisation : des annonces y sont encore rattachées.");
        }
    }

}
