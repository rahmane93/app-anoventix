package com.app.AnnoncesAPI.repositories;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.EmailSortant;

public interface EmailSortantRepository extends JpaRepository<EmailSortant, Long> {

    /**
     * Prochain email à envoyer, verrouillé jusqu'à la fin de la transaction.
     * SKIP LOCKED : deux instances de l'API (ou deux passages qui se chevauchent)
     * ne prennent jamais le même email.
     */
    @Query(value = """
            SELECT * FROM email_sortant
            WHERE statut = 'EN_ATTENTE' AND prochain_essai <= :maintenant
            ORDER BY prochain_essai, id
            LIMIT 1
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    Optional<EmailSortant> verrouillerProchainAEnvoyer(@Param("maintenant") LocalDateTime maintenant);

    long countByStatut(EmailSortant.Statut statut);

    @Modifying
    @Query("DELETE FROM EmailSortant e WHERE e.statut <> com.app.AnnoncesAPI.entities.EmailSortant.Statut.EN_ATTENTE AND e.creeLe < :limite")
    int supprimerTraitesAvant(@Param("limite") LocalDateTime limite);
}
