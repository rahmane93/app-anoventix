package com.app.AnnoncesAPI.repositories;

import com.app.AnnoncesAPI.entities.Licence;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface LicenceRepository extends JpaRepository<Licence, Long> {

    Optional<Licence> findByCle(String cle);

    /** Toutes les licences d'un titulaire (export RGPD). */
    java.util.List<Licence> findByOwnerIdOrderByDateFinDesc(UUID ownerId);

    /** Licence du titulaire qui expire le plus tard (la « courante »). */
    Optional<Licence> findFirstByOwnerIdOrderByDateFinDesc(UUID ownerId);

    /**
     * Liste admin. {@code statut} : TOUTES, LIBRE, ACTIVE ou EXPIREE ; {@code q} (majuscules,
     * vide = pas de filtre) cherche dans la clé et l'email du titulaire.
     */
    @Query("""
            SELECT l FROM Licence l LEFT JOIN l.owner o
            WHERE (:q = '' OR UPPER(l.cle) LIKE CONCAT('%', :q, '%') OR UPPER(o.email) LIKE CONCAT('%', :q, '%'))
              AND (:statut = 'TOUTES'
                   OR (:statut = 'LIBRE' AND l.owner IS NULL)
                   OR (:statut = 'ACTIVE' AND l.owner IS NOT NULL AND l.dateFin >= :aujourdhui)
                   OR (:statut = 'EXPIREE' AND l.owner IS NOT NULL AND l.dateFin < :aujourdhui))
            """)
    Page<Licence> rechercher(@Param("statut") String statut,
                             @Param("q") String q,
                             @Param("aujourdhui") LocalDate aujourdhui,
                             Pageable pageable);
}
