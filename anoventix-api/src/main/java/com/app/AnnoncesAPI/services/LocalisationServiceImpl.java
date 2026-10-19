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
    private final AuditService audit;

    public LocalisationServiceImpl(LocalisationRepository localisationRepository,
                                   AnnonceMapper annonceMapper, AuditService audit) {
        this.localisationRepository = localisationRepository;
        this.annonceMapper = annonceMapper;
        this.audit = audit;
    }

    private static String libelle(Localisation l) {
        return l.getQuartier() + " (" + l.getCommune() + ", " + l.getPrefecture() + ")";
    }

    @Override
    public Page<LocalisationDTO> getAllLocalisations(Pageable pageable) {
        return localisationRepository.findByTechniqueFalse(pageable).map(annonceMapper::localisationToDTO);
    }

    @Override
    public Optional<LocalisationDTO> getLocalisationById(String id) {
        return localisationRepository.findById(id)
                .map(annonceMapper::localisationToDTO);
    }

    @Override
    public Page<LocalisationDTO> getLocalisationsByCommune(String communeName, Pageable pageable) {
        return localisationRepository.findByCommuneAndTechniqueFalse(communeName, pageable).map(annonceMapper::localisationToDTO);
    }

    @Override
    public Page<LocalisationDTO> getLocalisationsByPrefecture(String prefectureName, Pageable pageable) {
        return localisationRepository.findByPrefectureAndTechniqueFalse(prefectureName, pageable).map(annonceMapper::localisationToDTO);
    }

    @Override
    public Page<LocalisationDTO> getLocalisationsByRegion(String regionName, Pageable pageable) {
        return localisationRepository.findByRegionAndTechniqueFalse(regionName, pageable).map(annonceMapper::localisationToDTO);
    }

    @Override
    public java.util.List<String> getRegions() {
        return localisationRepository.findRegions();
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public LocalisationDTO create(LocalisationRequest request) {
        verifierCoordonnees(request);
        refuserDoublon(request, null);
        Localisation localisation = new Localisation();
        localisation.setId(UUID.randomUUID().toString());
        localisation.setRegion(request.getRegion());
        localisation.setPrefecture(request.getPrefecture());
        localisation.setCommune(request.getCommune());
        localisation.setQuartier(request.getQuartier());
        localisation.setTypeCommune(request.getTypeCommune());
        localisation.setLatitude(request.getLatitude());
        localisation.setLongitude(request.getLongitude());
        Localisation creee = localisationRepository.save(localisation);
        audit.enregistrer(com.app.AnnoncesAPI.enums.ActionAudit.LOCALISATION_CREEE, creee.getId(), libelle(creee));
        return annonceMapper.localisationToDTO(creee);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public LocalisationDTO update(String id, LocalisationRequest request) {
        Localisation localisation = localisationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Localisation non trouvée avec l'ID: " + id));
        verifierCoordonnees(request);
        refuserDoublon(request, id);
        localisation.setRegion(request.getRegion());
        localisation.setPrefecture(request.getPrefecture());
        localisation.setCommune(request.getCommune());
        localisation.setQuartier(request.getQuartier());
        localisation.setTypeCommune(request.getTypeCommune());
        localisation.setLatitude(request.getLatitude());
        localisation.setLongitude(request.getLongitude());
        Localisation modifiee = localisationRepository.save(localisation);
        audit.enregistrer(com.app.AnnoncesAPI.enums.ActionAudit.LOCALISATION_MODIFIEE, id, libelle(modifiee));
        return annonceMapper.localisationToDTO(modifiee);
    }

    /** Un quartier n'existe qu'une fois par commune, aux accents et à la casse près. */
    private void refuserDoublon(LocalisationRequest r, String idModifie) {
        localisationRepository.trouverQuartier(r.getRegion(), r.getPrefecture(), r.getCommune(), r.getQuartier())
                .filter(l -> !l.getId().equals(idModifie))
                .ifPresent(l -> {
                    throw new IllegalStateException("Le quartier « " + l.getQuartier() + " » existe déjà dans la commune "
                            + l.getCommune() + ".");
                });
    }

    private static void verifierCoordonnees(LocalisationRequest r) {
        if ((r.getLatitude() == null) != (r.getLongitude() == null)) {
            throw new IllegalArgumentException("Indiquez la latitude et la longitude, ou aucune des deux.");
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void delete(String id) {
        Localisation existante = localisationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Localisation non trouvée avec l'ID: " + id));
        try {
            localisationRepository.deleteById(id);
            // Dans la transaction : la contrainte des annonces rattachées se vérifie ici, pas au commit.
            localisationRepository.flush();
            audit.enregistrer(com.app.AnnoncesAPI.enums.ActionAudit.LOCALISATION_SUPPRIMEE, id, libelle(existante));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException(
                "Impossible de supprimer cette localisation : des annonces y sont encore rattachées.");
        }
    }

}
