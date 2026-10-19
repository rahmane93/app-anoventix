package com.app.AnnoncesAPI.services;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.HistoriqueAnnonceDTO;
import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.payload.response.AnnonceStatsResponse;

/**
 * Interface définissant les opérations de gestion des biens immobiliers
 * (anciennement Habitation + Terrain).
 */
public interface BienImmoService extends AnnonceService {

    /** Ajouter des médias à un bien immobilier. */
    AnnonceDTO addMedias(List<MultipartFile> files, Long bienImmoId, Authentication authentication);

    /** Active ou désactive une annonce (ADMIN/MOD uniquement). */
    void toggleActif(Long id, Authentication authentication);

    /** Retourne les statistiques de vues. Réservé au propriétaire, parent PROFESSIONNEL, ou ADMIN/MOD. */
    AnnonceStatsResponse getAnnonceStats(Long id, Authentication authentication);

    /** Signale une annonce (tout utilisateur authentifié). */
    void signalerAnnonce(Long id, com.app.AnnoncesAPI.enums.MotifSignalement motif, String commentaire, Authentication authentication);
    void retirerSignalement(Long annonceId, Authentication authentication);

    /** Demande à la modération de réexaminer une annonce masquée, après correction (DEC-09). */
    void demanderReexamen(Long id, String message, Authentication authentication);

    /** Retourne la liste paginée des signalements posés par l'utilisateur connecté. */
    Page<com.app.AnnoncesAPI.payload.response.SignalementResponse> getMesSignalements(Authentication authentication, Pageable pageable);

    /** Retourne les annonces similaires (même type, même commune, prix ±30%). Public. */
    List<AnnonceDTO> findSimilaires(Long id, int max);

    /** Rechercher des biens par surface minimale (m²). */
    Page<AnnonceDTO> findBySurface(Double minSurface, Pageable pageable);

    /**
     * Recherche en langage naturel via PostgreSQL Full-Text Search.
     * Les résultats sont triés par pertinence décroissante.
     */
    Page<AnnonceDTO> naturalLanguageSearch(String query, Pageable pageable);

    /** Recherche multi-critères : texte, référence, types, prix, localisation, composition, surface. */
    Page<AnnonceDTO> filterAnnonces(
            String reference,
            TypeAnnonce typeAnnonce,
            TypeBien typeBien,
            TypeUsage typeUsage,
            BigDecimal prixMin,
            BigDecimal prixMax,
            String region,
            String prefecture,
            String commune,
            String quartier,
            String q,
            Integer nbPiecesMin,
            Integer nbChambresMin,
            Double surfaceMin,
            Double surfaceMax,
            Pageable pageable);

    /** Retourne l'historique des modifications d'une annonce (ADMIN/MOD ou propriétaire). */
    List<HistoriqueAnnonceDTO> getHistoriqueAnnonce(Long id, Authentication authentication);

    /**
     * Recherche géospatiale des annonces actives dans un rayon donné (km).
     * Utilise la formule Haversine sur les champs latitude/longitude.
     */
    Page<AnnonceDTO> findNearby(double lat, double lng, double rayonKm, TypeAnnonce typeAnnonce, TypeBien typeBien,
                                BigDecimal prixMin, BigDecimal prixMax, Pageable pageable);

    /**
     * Communes ayant le plus d'annonces publiées, toutes régions confondues.
     *
     * @param limit nombre maximum de zones renvoyées
     */
    List<com.app.AnnoncesAPI.dto.ZoneActiveDTO> findZonesActives(int limit);

    /** Clôture une annonce avec un motif (VENDU/LOUE/RETIRE). Propriétaire uniquement. */
    void cloturerAnnonce(Long id, MotifCloture motif, Authentication authentication);

    /** Réactive une annonce clôturée par son propriétaire. */
    void reactiver(Long id, Authentication authentication);
}
