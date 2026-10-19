package com.app.AnnoncesAPI.repositories;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
    Optional<User> findByTelephone(String telephone);
    Optional<User> findByActivationCode(String activationCode);
    Optional<User> findByEmailAndActivationCode(String email, String activationCode);
    Optional<User> findByEmailAndResetPasswordToken(String email, String resetPasswordToken);
    boolean existsByTelephone(String telephone);
    boolean existsByTelephoneAndIdNot(String telephone, java.util.UUID id);
    java.util.List<User> findByEntrepriseId(UUID entrepriseId);

    /** Comptes dont la suppression a été demandée avant {@code limite} (délai de grâce écoulé). */
    java.util.List<User> findByDateSuppressionDemandeeBefore(java.time.LocalDateTime limite);

    long countByStatut(StatutUtilisateur statut);

    // Comptes supprimés définitivement (anonymisés) : exclus des listes et des compteurs.
    long countByDateSuppressionDefinitiveIsNull();
    Page<User> findByDateSuppressionDefinitiveIsNull(Pageable pageable);
    long countByEntrepriseIdAndStatut(UUID entrepriseId, StatutUtilisateur statut);
    /** Appareils de notification et alertes de recherche d'un compte (anonymisation). */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "WITH a AS (DELETE FROM appareil_push WHERE user_id = :id) DELETE FROM alerte_recherche WHERE user_id = :id",
           nativeQuery = true)
    void supprimerNotificationsEtAlertes(@org.springframework.data.repository.query.Param("id") java.util.UUID id);

    /** Connexion ou session rafraîchie : dernière activité, et relance « compte inactif » annulée. */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE account SET derniere_connexion = NOW(), date_relance_inactivite = NULL WHERE id = :id",
           nativeQuery = true)
    void noterActivite(@org.springframework.data.repository.query.Param("id") java.util.UUID id);

    long countByStatutPieceIdentite(StatutPieceIdentite statutPieceIdentite);
    Page<User> findByStatutPieceIdentite(StatutPieceIdentite statutPieceIdentite, Pageable pageable);

    /** File de vérification : dossiers les plus anciens d'abord, ceux d'avant le selfie (sans date) en tête (RG-02-40). */
    @Query("SELECT u FROM User u WHERE u.statutPieceIdentite = :statut "
         + "ORDER BY CASE WHEN u.dateEnvoiVerification IS NULL THEN 0 ELSE 1 END, u.dateEnvoiVerification ASC")
    Page<User> findByStatutPieceIdentiteOrderByDateEnvoiVerificationAsc(
            @org.springframework.data.repository.query.Param("statut") StatutPieceIdentite statut, Pageable pageable);
    boolean existsByRoleName(com.app.AnnoncesAPI.enums.TypeRole name);

    @Query("SELECT u FROM User u WHERE u.dateSuppressionDefinitive IS NULL AND (" +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.nom) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.prenom) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.telephone) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchUsers(@org.springframework.data.repository.query.Param("search") String search, Pageable pageable);

    /** tousStatuts=true ignore statut (paramètre jamais null, cf. BienImmoRepository.rechercherPourAdmin). */
    @Query("SELECT u FROM User u WHERE u.id <> :excludeId AND u.dateSuppressionDefinitive IS NULL " +
           "AND (:tousStatuts = true OR u.statut = :statut) AND (" +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.nom) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.prenom) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.telephone) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchUsersExcluding(
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("excludeId") UUID excludeId,
            @org.springframework.data.repository.query.Param("tousStatuts") boolean tousStatuts,
            @org.springframework.data.repository.query.Param("statut") com.app.AnnoncesAPI.enums.StatutUtilisateur statut,
            Pageable pageable);
}


