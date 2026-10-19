package com.app.AnnoncesAPI.services;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.payload.request.AnnonceRequest;


public interface AnnonceService {
    
    /**
     * Crée une nouvelle annonce
     */
    AnnonceDTO createAnnonce(AnnonceRequest annonceRequest, Authentication authentication);
    
    /**
     * Met à jour une annonce existante
     */
    AnnonceDTO updateAnnonce(Long id, AnnonceRequest annonceRequest, Authentication authentication);
    
    /**
     * Désactive une annonce (soft delete)
     */
    void deleteAnnonce(Long id, Authentication authentication);

     /**
     * Récupère toutes les annonces actives avec pagination
     */
    Page<AnnonceDTO> getAllAnnonces(Pageable pageable);
    
    /**
     * Récupère une annonce par son ID.
     * Public : actif=true ET statut=PUBLIEE.
     * Propriétaire : actif=true, tout statut.
     * Admin/Mod : tout sans filtre.
     */
    Optional<AnnonceDTO> getAnnonceById(Long id, Authentication authentication);

    /** Même règle de visibilité que {@link #getAnnonceById}, à partir de l'identifiant public. */
    Optional<AnnonceDTO> getAnnonceByPublicId(String publicId, Authentication authentication);
    
    
    
    /**
     * Récupère les annonces d'un utilisateur
     */
    Page<AnnonceDTO> findAnnoncesByUser(Authentication authentication, Pageable pageable);

    /**
     * Incrémente le compteur de vues d'une annonce, avec déduplication par viewer.
     *
     * @param id l'ID de l'annonce
     * @param viewerKey clé identifiant le viewer (ex: "u:{userId}" pour authentifié,
     *                  "ip:{remoteAddr}" pour anonyme). Une même clé ne compte qu'une
     *                  vue dans une fenêtre de 24h.
     */
    void incrementVueCount(Long id, String viewerKey);

}