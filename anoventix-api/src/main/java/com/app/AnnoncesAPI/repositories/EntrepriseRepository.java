package com.app.AnnoncesAPI.repositories;

import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository pour la gestion des entreprises
 */
@Repository
public interface EntrepriseRepository extends JpaRepository<Entreprise, UUID> {
    
    /**
     * Trouve une entreprise par son numéro RCCM
     */
    Optional<Entreprise> findByNumeroRCCM(String numeroRCCM);
    
    /**
     * Trouve une entreprise par son annonceur professionnel
     */
    Optional<Entreprise> findByAnnonceurProfessionnel(User user);

    /** Entreprises hors celles dont le compte propriétaire a été supprimé définitivement. */
    @Query("SELECT e FROM Entreprise e LEFT JOIN e.annonceurProfessionnel p "
         + "WHERE p IS NULL OR p.dateSuppressionDefinitive IS NULL")
    List<Entreprise> findNonSupprimees();

    @Query(value = "SELECT e FROM Entreprise e LEFT JOIN e.annonceurProfessionnel p "
                 + "WHERE p IS NULL OR p.dateSuppressionDefinitive IS NULL",
           countQuery = "SELECT COUNT(e) FROM Entreprise e LEFT JOIN e.annonceurProfessionnel p "
                      + "WHERE p IS NULL OR p.dateSuppressionDefinitive IS NULL")
    Page<Entreprise> findNonSupprimees(Pageable pageable);

    @Query("SELECT COUNT(e) FROM Entreprise e LEFT JOIN e.annonceurProfessionnel p "
         + "WHERE p IS NULL OR p.dateSuppressionDefinitive IS NULL")
    long countNonSupprimees();
    
    /**
     * Vérifie si un numéro RCCM existe déjà
     */
    boolean existsByNumeroRCCM(String numeroRCCM);

    long countByStatutVerification(com.app.AnnoncesAPI.enums.StatutVerificationEntreprise statut);

    /** Le RCCM n'est réservé que par une entreprise vérifiée (RG-07-28). */
    boolean existsByNumeroRCCMAndStatutVerificationAndIdNot(
            String numeroRCCM, com.app.AnnoncesAPI.enums.StatutVerificationEntreprise statut, UUID id);

    boolean existsByNumeroRCCMAndStatutVerification(
            String numeroRCCM, com.app.AnnoncesAPI.enums.StatutVerificationEntreprise statut);

    /** File de vérification, des plus anciennes demandes aux plus récentes. */
    Page<Entreprise> findByStatutVerificationOrderByDateEnvoiVerificationAsc(
            com.app.AnnoncesAPI.enums.StatutVerificationEntreprise statut, Pageable pageable);

    /**
     * Vérifie si un numéro de téléphone est déjà utilisé par une entreprise
     */
    boolean existsByTelephone(String telephone);

    /**
     * Vérifie si un numéro de téléphone est déjà utilisé par une autre entreprise (hors ID)
     */
    boolean existsByTelephoneAndIdNot(String telephone, UUID id);
}
