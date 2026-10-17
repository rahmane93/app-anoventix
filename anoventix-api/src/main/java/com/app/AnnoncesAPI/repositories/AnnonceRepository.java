package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.Annonce;

public interface AnnonceRepository extends JpaRepository<Annonce, Long>, JpaSpecificationExecutor<Annonce> {

    @Query("SELECT DISTINCT a FROM Annonce a LEFT JOIN FETCH a.medias")
    Page<Annonce> findByActifTrue(Pageable pageable);

    Optional<Annonce> findByIdAndActifTrue(Long id);
    
    Page<Annonce> findByLocalisationId(String quartierId, Pageable pageable);

    // Trouver une annonce via la liste des localisations
    // Cette méthode permet de trouver des annonces qui sont associées à une ou plusieurs localisations
    //@Query("SELECT a FROM Annonce a JOIN a.localisations l WHERE l.id IN :localisationList AND a.actif = true")
    //Page<Annonce> findByLocalisationsId(@Param("localisationList") List<String> localisationList, Pageable pageable);
    
    Page<Annonce> findByOwnerId(UUID ownerId, Pageable pageable);

    /** Toutes les annonces d'un propriétaire, quel que soit leur état (suppression de compte). */
    List<Annonce> findAllByOwnerId(UUID ownerId);

    /** Retire les annonces d'un propriétaire des favoris de tous les utilisateurs. */
    @Modifying
    @Query(value = "DELETE FROM account_favoris WHERE annonce_id IN (SELECT id FROM annonce WHERE owner_id = :ownerId)",
           nativeQuery = true)
    int retirerDesFavorisParProprietaire(@Param("ownerId") UUID ownerId);

     // Trouver une annoncer via la reference
    Optional<Annonce> findByReferenceAnnonce(String refAnnonce);

    /** Incrémente atomiquement le compteur de vues d'une annonce active. */
    @Modifying
    @Query("UPDATE Annonce a SET a.vueCount = a.vueCount + 1 WHERE a.id = :id AND a.actif = true")
    void incrementVueCount(@Param("id") Long id);

    /** Désactive toutes les annonces actives d'un utilisateur (soft delete). */
    @Modifying
    @Query("UPDATE Annonce a SET a.actif = false WHERE a.owner.id = :ownerId AND a.actif = true")
    int deactivateByOwnerId(@Param("ownerId") UUID ownerId);

    /** Retourne uniquement le vueCount d'une annonce. */
    @Query("SELECT a.vueCount FROM Annonce a WHERE a.id = :id")
    Optional<Long> findVueCountById(@Param("id") Long id);

    /** Nombre d'annonces actives par type de bien. Retourne [TypeBien, count]. */
    @Query("SELECT a.typeBien, COUNT(a) FROM Annonce a WHERE a.actif = true GROUP BY a.typeBien ORDER BY COUNT(a) DESC")
    java.util.List<Object[]> countByTypeBien();

    /** Nombre d'annonces actives par type d'annonce. Retourne [TypeAnnonce, count]. */
    @Query("SELECT a.typeAnnonce, COUNT(a) FROM Annonce a WHERE a.actif = true GROUP BY a.typeAnnonce ORDER BY COUNT(a) DESC")
    java.util.List<Object[]> countByTypeAnnonce();

    /** Nombre d'annonces actives par région. Retourne [region, count]. */
    @Query("SELECT a.localisation.region, COUNT(a) FROM Annonce a WHERE a.actif = true GROUP BY a.localisation.region ORDER BY COUNT(a) DESC")
    java.util.List<Object[]> countByRegion();

    /** Évolution mensuelle des créations d'annonces sur les 12 derniers mois. Retourne [periode 'YYYY-MM', count]. */
    @Query(value = """
            SELECT TO_CHAR(DATE_TRUNC('month', date_creation), 'YYYY-MM') AS periode,
                   COUNT(*) AS count
            FROM annonce
            WHERE date_creation >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', date_creation)
            ORDER BY DATE_TRUNC('month', date_creation) ASC
            """, nativeQuery = true)
    java.util.List<Object[]> countByMoisSur12Mois();

    /**
     * Recherche textuelle dans titre, description et type_bien.
     * Utilise JPQL (pas de requête native) pour éviter les problèmes de
     * discriminateur clazz_ avec l'héritage JOINED.
     */
    @Query("""
            SELECT a FROM BienImmo a
            WHERE a.actif = true
              AND (
                LOWER(a.titre)       LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(a.description) LIKE LOWER(CONCAT('%', :query, '%'))
              )
            ORDER BY a.dateCreation DESC
            """)
    Page<Annonce> naturalLanguageSearch(@Param("query") String query, Pageable pageable);
}