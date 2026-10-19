package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.app.AnnoncesAPI.entities.DemandeQuartier;
import com.app.AnnoncesAPI.enums.StatutDemandeQuartier;

public interface DemandeQuartierRepository extends JpaRepository<DemandeQuartier, Long> {

    Optional<DemandeQuartier> findByAnnonceIdAndStatut(Long annonceId, StatutDemandeQuartier statut);

    Page<DemandeQuartier> findByStatutOrderByDateDemandeAsc(StatutDemandeQuartier statut, Pageable pageable);

    List<DemandeQuartier> findByLocalisationIdAndStatut(String localisationId, StatutDemandeQuartier statut);

    long countByStatut(StatutDemandeQuartier statut);
}
