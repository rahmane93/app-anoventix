package com.app.AnnoncesAPI.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.app.AnnoncesAPI.entities.Localisation;

@Repository
public interface LocalisationRepository extends JpaRepository<Localisation, String> {

    // Les entrées techniques « Autre quartier » sont exclues des listes publiques et de l'administration.
    Page<Localisation> findByTechniqueFalse(Pageable pageable);

    Page<Localisation> findByCommuneAndTechniqueFalse(String communeName, Pageable pageable);

    Page<Localisation> findByPrefectureAndTechniqueFalse(String prefectureName, Pageable pageable);

    Page<Localisation> findByRegionAndTechniqueFalse(String regionName, Pageable pageable);

    java.util.Optional<Localisation> findFirstByRegionAndPrefectureAndCommuneAndTechniqueTrue(
            String region, String prefecture, String commune);

    java.util.Optional<Localisation> findFirstByRegionAndPrefectureAndCommuneAndTechniqueFalse(
            String region, String prefecture, String commune);

    java.util.List<Localisation> findByRegionAndPrefectureAndCommuneAndTechniqueFalse(
            String region, String prefecture, String commune);
}
