package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.CodeSecours;

public interface CodeSecoursRepository extends JpaRepository<CodeSecours, UUID> {

    List<CodeSecours> findByUserIdAndUtiliseLeIsNull(UUID userId);

    /** Régénérer les codes annule les précédents. */
    @Modifying
    @Query("DELETE FROM CodeSecours c WHERE c.userId = :userId")
    int supprimerDe(@Param("userId") UUID userId);
}
