package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.app.AnnoncesAPI.entities.AlerteRecherche;

public interface AlerteRechercheRepository extends JpaRepository<AlerteRecherche, Long> {

    List<AlerteRecherche> findByUserIdOrderByDateCreationDesc(UUID userId);

    Optional<AlerteRecherche> findByIdAndUserId(Long id, UUID userId);

    long countByUserId(UUID userId);

    List<AlerteRecherche> findByActiveTrue();
}
