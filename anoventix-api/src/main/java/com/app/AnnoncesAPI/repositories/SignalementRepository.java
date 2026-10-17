package com.app.AnnoncesAPI.repositories;

import com.app.AnnoncesAPI.entities.Signalement;
import com.app.AnnoncesAPI.enums.StatutSignalement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SignalementRepository extends JpaRepository<Signalement, Long> {

    /**
     * Tous les signalements avec annonce et reporter chargés (JOIN FETCH).
     * Évite les LazyInitializationException lors du mapping en dehors de la session JPA.
     */
    @Query(value = "SELECT s FROM Signalement s JOIN FETCH s.annonce JOIN FETCH s.reporter ORDER BY s.date DESC",
           countQuery = "SELECT COUNT(s) FROM Signalement s")
    Page<Signalement> findAllWithAnnonceAndReporter(Pageable pageable);

    /** Signalement actif d'un utilisateur sur une annonce (pour le retrait). */
    Optional<Signalement> findByAnnonceIdAndReporterEmailAndAnnuleFalse(Long annonceId, String email);

    /** Unique en base (uq_signalement_annonce_reporter), qu'il soit actif ou retiré. */
    Optional<Signalement> findByAnnonceIdAndReporterId(Long annonceId, java.util.UUID reporterId);

    /** Signalements d'un reporter avec annonce chargée (JOIN FETCH), triés par date DESC. */
    @Query(value = "SELECT s FROM Signalement s JOIN FETCH s.annonce WHERE s.reporter.email = :email ORDER BY s.date DESC",
           countQuery = "SELECT COUNT(s) FROM Signalement s WHERE s.reporter.email = :email")
    Page<Signalement> findByReporterEmail(@org.springframework.data.repository.query.Param("email") String email, Pageable pageable);

    /** Signalements filtrés par statut avec annonce et reporter chargés. */
    @Query(value = "SELECT s FROM Signalement s JOIN FETCH s.annonce JOIN FETCH s.reporter WHERE s.statut = :statut ORDER BY s.date DESC",
           countQuery = "SELECT COUNT(s) FROM Signalement s WHERE s.statut = :statut")
    Page<Signalement> findByStatutWithAnnonceAndReporter(
            @org.springframework.data.repository.query.Param("statut") StatutSignalement statut, Pageable pageable);

    /** Nombre de signalements actifs (non annulés). */
    long countByAnnuleFalse();

    /** Nombre de signalements par statut. */
    long countByStatut(StatutSignalement statut);
}
