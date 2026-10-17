package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
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
}