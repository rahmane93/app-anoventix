package com.app.AnnoncesAPI.repositories;

import java.time.LocalDateTime;
import java.util.Collection;
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

    /** Toutes les annonces, actives ou non : la base impose l'unicité sur toutes. */
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

    /** Retrait d'un agent : toutes ses annonces, en ligne ou non (DEC-34). */
    List<BienImmo> findAllByOwnerId(UUID ownerId);

    /** Nombre maximal d'identifiants renvoyés pour combiner le texte aux autres filtres (borne la mémoire). */
    int PLEIN_TEXTE_MAX_COMBINE = 2000;

    /** Les meilleurs résultats du texte (au plus {@link #PLEIN_TEXTE_MAX_COMBINE}), pour les combiner aux filtres. */
    @Query(value = """
            SELECT a.id FROM annonce a
            INNER JOIN bien_immo b ON b.annonce_id = a.id
            WHERE a.visible_public
              AND a.recherche_doc @@ plainto_tsquery('french', unaccent(:query))
            ORDER BY ts_rank(a.recherche_doc, plainto_tsquery('french', unaccent(:query))) DESC, a.id DESC
            LIMIT 2000
            """, nativeQuery = true)
    List<Long> findIdsByFullTextSearch(@Param("query") String query);

    /** Compte les biens actifs. */
    long countByActifTrue();

    /** Annonces visibles du public : la définition unique de « annonce active » pour les statistiques. */
    long countByVisiblePublicTrue();

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

    /**
     * Annonces similaires visibles : même typeBien, même commune (de la même préfecture : plusieurs communes portent
     * le même nom), prix dans l'intervalle, sans l'annonce courante.
     */
    @Query("""
            SELECT b FROM BienImmo b
            WHERE b.visiblePublic = true
              AND b.id <> :id
              AND b.typeBien = :typeBien
              AND b.localisation.prefecture = :prefecture
              AND b.localisation.commune = :commune
              AND b.prix BETWEEN :prixMin AND :prixMax
            ORDER BY b.dateCreation DESC
            """)
    List<BienImmo> findSimilaires(
            @Param("id") Long id,
            @Param("typeBien") com.app.AnnoncesAPI.enums.TypeBien typeBien,
            @Param("prefecture") String prefecture,
            @Param("commune") String commune,
            @Param("prixMin") java.math.BigDecimal prixMin,
            @Param("prixMax") java.math.BigDecimal prixMax,
            Pageable pageable);

    /**
     * Compte les annonces actives appartenant aux membres d'une entreprise pour la vérification du quota.
     */
    @Query("SELECT COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.entreprise.id = :entrepriseId")
    long countActiveAnnoncesByEntreprise(@Param("entrepriseId") UUID entrepriseId);

    /** Comptes sans entreprise au-delà du seuil d'annonces actives gratuites : {id, nombre} (préavis du mode licence). */
    @Query("SELECT b.owner.id, COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.entreprise IS NULL "
         + "GROUP BY b.owner.id HAVING COUNT(b) > :seuil")
    java.util.List<Object[]> proprietairesAuDela(@Param("seuil") long seuil);

    /** Entreprises au-delà du seuil (annonces partagées entre le professionnel et ses agents) : {id, nombre}. */
    @Query("SELECT b.owner.entreprise.id, COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.entreprise IS NOT NULL "
         + "GROUP BY b.owner.entreprise.id HAVING COUNT(b) > :seuil")
    java.util.List<Object[]> entreprisesAuDela(@Param("seuil") long seuil);

    /** Compte les annonces actives d'un utilisateur (annonces gratuites avant licence). */
    long countByOwnerIdAndActifTrue(UUID ownerId);

    // --- Stats tableau de bord PRO ---

    @Query("SELECT COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.id = :ownerId AND b.statutModeration = :statut")
    long countByOwnerIdAndActifTrueAndStatutModeration(@Param("ownerId") UUID ownerId, @Param("statut") StatutAnnonce statut);

    long countByOwnerIdAndStatutModeration(UUID ownerId, StatutAnnonce statut);

    // Périmètre du tableau de bord : le compte seul, ou le professionnel et ses agents.

    @Query("SELECT COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.id IN :owners AND b.statutModeration = :statut")
    long countEnLigneForOwners(@Param("owners") Collection<UUID> owners, @Param("statut") StatutAnnonce statut);

    @Query("SELECT COUNT(b) FROM BienImmo b WHERE b.owner.id IN :owners AND b.statutModeration = :statut")
    long countByStatutForOwners(@Param("owners") Collection<UUID> owners, @Param("statut") StatutAnnonce statut);

    @Query("SELECT COUNT(b) FROM BienImmo b WHERE b.owner.id IN :owners AND b.motifCloture = :motif AND b.dateCloture >= :from")
    long countCloturesForOwnersSince(@Param("owners") Collection<UUID> owners, @Param("motif") MotifCloture motif, @Param("from") LocalDateTime from);

    @Query("SELECT SUM(b.vueCount) FROM BienImmo b WHERE b.actif = true AND b.owner.id IN :owners")
    Long sumVueCountForOwners(@Param("owners") Collection<UUID> owners);

    @Query("SELECT b FROM BienImmo b WHERE b.actif = true AND b.owner.id IN :owners ORDER BY b.vueCount DESC")
    List<BienImmo> findTopByVueCountForOwners(@Param("owners") Collection<UUID> owners, Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM account_favoris af INNER JOIN annonce a ON a.id = af.annonce_id WHERE a.owner_id IN (:owners) AND a.actif = true", nativeQuery = true)
    long countTotalFavorisForOwners(@Param("owners") Collection<UUID> owners);

    @Query("SELECT b.typeAnnonce, COUNT(b) FROM BienImmo b WHERE b.actif = true AND b.owner.id IN :owners GROUP BY b.typeAnnonce")
    List<Object[]> countByTypeAnnonceForOwners(@Param("owners") Collection<UUID> owners);

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

    long countByReexamenDemandeTrue();

    /** File des réexamens de la modération (DEC-09) : plus anciennes demandes d'abord. */
    Page<BienImmo> findByReexamenDemandeTrueOrderByDateReexamenAsc(Pageable pageable);

    /**
     * Recherche géospatiale par rayon (Haversine) : identifiants triés par distance, une page à la fois, avec les
     * filtres facultatifs de la recherche (type d'annonce, type de bien, prix). Paramètres nuls = pas de filtre.
     */
    @Query(value = """
            SELECT x.id FROM (
              SELECT a.id,
                     (6371 * acos(LEAST(1.0,
                        cos(radians(:lat))
                        * cos(radians(CAST(a.latitude  AS double precision)))
                        * cos(radians(CAST(a.longitude AS double precision)) - radians(:lng))
                        + sin(radians(:lat))
                        * sin(radians(CAST(a.latitude  AS double precision)))))) AS distance
              FROM annonce a
              INNER JOIN bien_immo b ON b.annonce_id = a.id
              WHERE a.visible_public AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
                AND (CAST(:typeAnnonce AS varchar) IS NULL OR a.type_annonce = CAST(:typeAnnonce AS varchar))
                AND (CAST(:typeBien AS varchar) IS NULL OR a.type_bien = CAST(:typeBien AS varchar))
                AND (CAST(:prixMin AS numeric) IS NULL OR a.prix >= CAST(:prixMin AS numeric))
                AND (CAST(:prixMax AS numeric) IS NULL OR a.prix <= CAST(:prixMax AS numeric))
            ) x
            WHERE x.distance <= :rayonKm
            ORDER BY x.distance ASC, x.id
            LIMIT :limite OFFSET :decalage
            """, nativeQuery = true)
    List<Long> findIdsByProximitePage(@Param("lat") double lat, @Param("lng") double lng,
                                      @Param("rayonKm") double rayonKm,
                                      @Param("typeAnnonce") String typeAnnonce, @Param("typeBien") String typeBien,
                                      @Param("prixMin") java.math.BigDecimal prixMin,
                                      @Param("prixMax") java.math.BigDecimal prixMax,
                                      @Param("limite") int limite, @Param("decalage") long decalage);

    @Query(value = """
            SELECT COUNT(*) FROM (
              SELECT (6371 * acos(LEAST(1.0,
                        cos(radians(:lat))
                        * cos(radians(CAST(a.latitude  AS double precision)))
                        * cos(radians(CAST(a.longitude AS double precision)) - radians(:lng))
                        + sin(radians(:lat))
                        * sin(radians(CAST(a.latitude  AS double precision)))))) AS distance
              FROM annonce a
              INNER JOIN bien_immo b ON b.annonce_id = a.id
              WHERE a.visible_public AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
                AND (CAST(:typeAnnonce AS varchar) IS NULL OR a.type_annonce = CAST(:typeAnnonce AS varchar))
                AND (CAST(:typeBien AS varchar) IS NULL OR a.type_bien = CAST(:typeBien AS varchar))
                AND (CAST(:prixMin AS numeric) IS NULL OR a.prix >= CAST(:prixMin AS numeric))
                AND (CAST(:prixMax AS numeric) IS NULL OR a.prix <= CAST(:prixMax AS numeric))
            ) x
            WHERE x.distance <= :rayonKm
            """, nativeQuery = true)
    long countByProximite(@Param("lat") double lat, @Param("lng") double lng, @Param("rayonKm") double rayonKm,
                          @Param("typeAnnonce") String typeAnnonce, @Param("typeBien") String typeBien,
                          @Param("prixMin") java.math.BigDecimal prixMin,
                          @Param("prixMax") java.math.BigDecimal prixMax);
}
