package com.app.AnnoncesAPI.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.StatutAnnonce;

public interface BienImmoRepository extends JpaRepository<BienImmo, Long>, JpaSpecificationExecutor<BienImmo> {

    Page<BienImmo> findByActifTrue(Pageable pageable);

    Optional<BienImmo> findByIdAndActifTrue(Long id);

    Optional<BienImmo> findByPublicId(String publicId);

    /** Toutes les annonces, actives ou non : la base impose l'unicité sur toutes (ECART-08). */
    boolean existsByReferenceAnnonce(String referenceAnnonce);

    // Requêtes publiques : elles filtrent toutes sur visiblePublic, seule
    // traduction SQL de la règle de visibilité (SFG §8, migration V15).

    /**
     * Communes classées par nombre d'annonces visibles publiquement, les plus
     * actives d'abord. La taille de page limite le nombre de zones renvoyées.
     */
    @Query("SELECT new com.app.AnnoncesAPI.dto.ZoneActiveDTO(l.region, l.prefecture, l.commune, COUNT(b)) "
         + "FROM BienImmo b JOIN b.localisation l "
         + "WHERE b.visiblePublic = true AND l.commune IS NOT NULL "
         + "GROUP BY l.region, l.prefecture, l.commune "
         + "ORDER BY COUNT(b) DESC, l.commune ASC")
    List<com.app.AnnoncesAPI.dto.ZoneActiveDTO> findZonesActives(Pageable pageable);

    /** Annonces visibles d'un quartier. */
    @Query("SELECT b FROM BienImmo b WHERE b.localisation.id = :localisationId AND b.visiblePublic = true")
    Page<BienImmo> findByLocalisationId(@Param("localisationId") String localisationId, Pageable pageable);

    /** Vue propriétaire : toutes ses annonces non supprimées (actif=true), quel que soit le statut. */
    Page<BienImmo> findByOwnerIdAndActifTrue(UUID ownerId, Pageable pageable);

    /**
     * Vue « Mes annonces » : TOUTES les annonces du propriétaire, y compris masquées
     * (actif=false) et clôturées (motifCloture != null), pour qu'il puisse les
     * réafficher / réactiver. Triées par date de création décroissante via Pageable.
     */
    Page<BienImmo> findByOwnerId(UUID ownerId, Pageable pageable);

    /**
     * Vue « Mes annonces » filtrée : exclut les annonces désactivées/supprimées par le
     * propriétaire (statut DESACTIVEE), invisibles pour lui ; conserve actives,
     * clôturées, masquées et rejetées. Utiliser avec {@code StatutAnnonce.DESACTIVEE}.
     */
    Page<BienImmo> findByOwnerIdAndStatutModerationNot(UUID ownerId, StatutAnnonce statut, Pageable pageable);

    /** Transfert : liste complète des annonces actives d'un propriétaire (sans pagination). */
    @Query("SELECT b FROM BienImmo b WHERE b.owner.id = :ownerId AND b.actif = true")
    List<BienImmo> findActiveByOwnerId(@Param("ownerId") UUID ownerId);

    /** Annonces visibles dont la surface >= minSurface. */
    @Query("SELECT b FROM BienImmo b WHERE b.surfaceTotal >= :minSurface AND b.visiblePublic = true")
    Page<BienImmo> findBySurfaceTotalGreaterThanEqualAndActifTrue(@Param("minSurface") Double minSurface, Pageable pageable);

    /** Recherche par mot-clé simple (LIKE) — annonces visibles uniquement. */
    @Query("SELECT b FROM BienImmo b WHERE b.visiblePublic = true AND " +
           "(LOWER(b.titre) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(b.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<BienImmo> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Recherche plein texte PostgreSQL sur les annonces visibles — retourne les IDs triés
     * par pertinence (pas les entités, à cause du mapping clazz_ de l'héritage JOINED).
     * Le texte indexé couvre le titre, la description, le type de bien et la localisation
     * (quartier, commune, préfecture, région) ; accents ignorés des deux côtés (ECART-57).
     */
    @Query(value = """
            SELECT a.id FROM annonce a
            INNER JOIN bien_immo b ON b.annonce_id = a.id
            LEFT JOIN localisation l ON l.id = a.localisation_id
            CROSS JOIN LATERAL (SELECT to_tsvector('french', unaccent(
                coalesce(a.titre, '') || ' ' ||
                coalesce(a.description, '') || ' ' ||
                coalesce(a.type_bien, '') || ' ' ||
                coalesce(l.quartier, '') || ' ' ||
                coalesce(l.commune, '') || ' ' ||
                coalesce(l.prefecture, '') || ' ' ||
                coalesce(l.region, '')
            )) AS doc) t
            WHERE a.visible_public
              AND t.doc @@ plainto_tsquery('french', unaccent(:query))
            ORDER BY ts_rank(t.doc, plainto_tsquery('french', unaccent(:query))) DESC
            """, nativeQuery = true)
    List<Long> findIdsByFullTextSearch(@Param("query") String query);

    /** Compte les biens actifs. */
    long countByActifTrue();

    /** Compte les annonces par statut de modération. */
    long countByStatutModeration(StatutAnnonce statut);

    /**
     * Recherche admin : statut de modération, clôture et texte (titre, référence,
     * email / nom / prénom du propriétaire). Paramètres jamais null (PostgreSQL
     * ne sait pas typer un paramètre null dans « :p IS NULL ») :
     * tousStatuts=true ignore statut ; cloture = TOUTES | CLOTUREES | OUVERTES ;
     * q vide = pas de filtre texte.
     */
    @Query("""
            SELECT b FROM BienImmo b LEFT JOIN b.owner o
            WHERE (:tousStatuts = true OR b.statutModeration = :statut)
              AND (:cloture = 'TOUTES'
                   OR (:cloture = 'CLOTUREES' AND b.motifCloture IS NOT NULL)
                   OR (:cloture = 'OUVERTES' AND b.motifCloture IS NULL))
              AND (:q = ''
                   OR LOWER(b.titre) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(b.referenceAnnonce) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(o.email) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(o.nom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(o.prenom) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<BienImmo> rechercherPourAdmin(
            @Param("tousStatuts") boolean tousStatuts,
            @Param("statut") StatutAnnonce statut,
            @Param("cloture") String cloture,
            @Param("q") String q,
            Pageable pageable);

    /** Annonces similaires visibles : même typeBien, même commune, prix dans l'intervalle, sans l'annonce courante. */
    @Query("""
            SELECT b FROM BienImmo b
            WHERE b.visiblePublic = true
              AND b.id <> :id
              AND b.typeBien = :typeBien
              AND b.localisation.commune = :commune
              AND b.prix BETWEEN :prixMin AND :prixMax
            ORDER BY b.dateCreation DESC
            """)
    List<BienImmo> findSimilaires(
            @Param("id") Long id,
            @Param("typeBien") com.app.AnnoncesAPI.enums.TypeBien typeBien,
            @Param("commune") String commune,
            @Param("prixMin") java.math.BigDecimal prixMin,
            @Param("prixMax") java.math.BigDecimal prixMax,
            Pageable pageable);

    /**
     * Compte les annonces actives appartenant aux membres d'une entreprise pour la vérification du quota.
     */
    @Query("SELECT COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.entreprise.id = :entrepriseId")
    long countActiveAnnoncesByEntreprise(@Param("entrepriseId") UUID entrepriseId);

    /** Compte les annonces actives d'un utilisateur (annonces gratuites avant licence). */
    long countByOwnerIdAndActifTrue(UUID ownerId);

    // --- Stats tableau de bord PRO ---

    @Query("SELECT COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.id = :ownerId AND b.statutModeration = :statut")
    long countByOwnerIdAndActifTrueAndStatutModeration(@Param("ownerId") UUID ownerId, @Param("statut") StatutAnnonce statut);

    long countByOwnerIdAndStatutModeration(UUID ownerId, StatutAnnonce statut);

    @Query("SELECT COUNT(b) FROM BienImmo b WHERE b.owner.id = :ownerId AND b.motifCloture = :motif AND b.dateCloture >= :from")
    long countCloturesByOwnerAndMotifSince(@Param("ownerId") UUID ownerId, @Param("motif") MotifCloture motif, @Param("from") LocalDateTime from);

    @Query("SELECT SUM(b.vueCount) FROM BienImmo b WHERE b.actif = true AND b.owner.id = :ownerId")
    Long sumVueCountByOwnerId(@Param("ownerId") UUID ownerId);

    @Query("SELECT b FROM BienImmo b WHERE b.actif = true AND b.owner.id = :ownerId ORDER BY b.vueCount DESC")
    List<BienImmo> findTopByVueCountForOwner(@Param("ownerId") UUID ownerId, Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM account_favoris af INNER JOIN annonce a ON a.id = af.annonce_id WHERE a.owner_id = :ownerId AND a.actif = true", nativeQuery = true)
    long countTotalFavorisByOwnerId(@Param("ownerId") UUID ownerId);

    @Query("SELECT b.typeAnnonce, COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.id = :ownerId GROUP BY b.typeAnnonce")
    List<Object[]> countByTypeAnnonceForOwner(@Param("ownerId") UUID ownerId);

    @Query("SELECT b.owner.id, COUNT(b), SUM(b.vueCount) FROM BienImmo b WHERE b.actif = true AND b.owner.entreprise.id = :entrepriseId GROUP BY b.owner.id")
    List<Object[]> findAgentStatsByEntreprise(@Param("entrepriseId") UUID entrepriseId);

    /**
     * Récupère (avec pagination) toutes les annonces actives publiées par les agents d'une entreprise.
     */
    Page<BienImmo> findByOwnerEntrepriseIdAndActifTrue(UUID entrepriseId, Pageable pageable);

    /** Expiration : annonces en ligne, pas encore relancées, qui expirent dans l'intervalle. */
    List<BienImmo> findByActifTrueAndStatutModerationAndRelanceExpirationEnvoyeeFalseAndDateExpirationBetween(
            StatutAnnonce statut, LocalDateTime debut, LocalDateTime fin);

    /** Expiration : annonces encore actives dont la date de validité est dépassée. */
    List<BienImmo> findByActifTrueAndDateExpirationBefore(LocalDateTime limite);

    /** Vue publique des annonces d'une entreprise : annonces visibles de ses membres. */
    Page<BienImmo> findByOwnerEntrepriseIdAndVisiblePublicTrue(UUID entrepriseId, Pageable pageable);

    /** Toutes les annonces publiquement visibles, triées selon le {@code Pageable}. */
    Page<BienImmo> findByVisiblePublicTrue(Pageable pageable);

    /**
     * Recherche géospatiale par rayon (Haversine) — retourne les IDs triés par distance.
     * Utilise les colonnes {@code latitude}/{@code longitude} de la table {@code annonce}.
     */
    @Query(value = """
            SELECT a.id FROM annonce a
            INNER JOIN bien_immo b ON b.annonce_id = a.id
            WHERE a.visible_public
              AND a.latitude  IS NOT NULL
              AND a.longitude IS NOT NULL
              AND (6371 * acos(LEAST(1.0,
                    cos(radians(:lat))
                    * cos(radians(CAST(a.latitude  AS double precision)))
                    * cos(radians(CAST(a.longitude AS double precision)) - radians(:lng))
                    + sin(radians(:lat))
                    * sin(radians(CAST(a.latitude  AS double precision)))
                  ))) <= :rayonKm
            ORDER BY (6371 * acos(LEAST(1.0,
                    cos(radians(:lat))
                    * cos(radians(CAST(a.latitude  AS double precision)))
                    * cos(radians(CAST(a.longitude AS double precision)) - radians(:lng))
                    + sin(radians(:lat))
                    * sin(radians(CAST(a.latitude  AS double precision)))
                  ))) ASC
            """, nativeQuery = true)
    List<Long> findIdsByProximite(@Param("lat") double lat,
                                  @Param("lng") double lng,
                                  @Param("rayonKm") double rayonKm);
}
