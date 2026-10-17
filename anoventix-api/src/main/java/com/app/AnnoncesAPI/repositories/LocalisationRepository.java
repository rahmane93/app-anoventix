package com.app.AnnoncesAPI.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.app.AnnoncesAPI.entities.Localisation;

@Repository
public interface LocalisationRepository extends JpaRepository<Localisation, String> {

    Page<Localisation> findByCommune(String communeName, Pageable pageable);

    Page<Localisation> findByPrefecture(String prefectureName, Pageable pageable);

    Page<Localisation> findByRegion(String regionName, Pageable pageable);
}
