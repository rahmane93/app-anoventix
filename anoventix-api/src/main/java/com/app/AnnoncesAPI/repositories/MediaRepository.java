package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.app.AnnoncesAPI.entities.Media;

@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {
    // Trouver tous les médias d'une annonce
    List<Media> findByAnnonceId(Long annonceId);

    // Supprimer tous les médias d'une annonce
    void deleteByAnnonceId(Long annonceId);

    // Trouver un média par son ID et l'ID de l'annonce
    Optional<Media> findByIdAndAnnonceId(Long id, Long annonceId);

    /**
     * Photos des annonces clôturées ou supprimées avant {@code limite} (purge de conservation,
     * DEC-26), par lots.
     */
    @Query("""
            SELECT m FROM Media m JOIN m.annonce a
            WHERE (a.motifCloture IS NOT NULL AND a.dateCloture < :limite)
               OR (a.statutModeration = com.app.AnnoncesAPI.enums.StatutAnnonce.DESACTIVEE AND a.dateModification < :limite)
            ORDER BY m.id
            """)
    List<Media> findPhotosDAnnoncesTerminees(@Param("limite") java.time.LocalDateTime limite, Pageable pageable);
}