package com.app.AnnoncesAPI.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.HistoriqueAnnonce;

public interface HistoriqueAnnonceRepository extends JpaRepository<HistoriqueAnnonce, Long> {

    @Query("SELECT h FROM HistoriqueAnnonce h WHERE h.annonce.id = :annonceId ORDER BY h.dateModification DESC")
    List<HistoriqueAnnonce> findByAnnonceId(@Param("annonceId") Long annonceId);
}
