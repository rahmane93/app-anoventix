package com.app.AnnoncesAPI.repositories;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.VerificationConnexion;

import jakarta.persistence.LockModeType;

public interface VerificationConnexionRepository extends JpaRepository<VerificationConnexion, UUID> {

    /** Verrouille la ligne : deux saisies simultanées du même défi se suivent (compte des essais exact). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM VerificationConnexion v WHERE v.id = :id")
    Optional<VerificationConnexion> verrouiller(@Param("id") UUID id);

    /** Codes envoyés à un compte depuis {@code depuis}, annulés ou non (limite d'envois). */
    long countByUserIdAndCreeLeAfter(UUID userId, LocalDateTime depuis);

    /** Un nouveau code annule les précédents encore actifs. */
    @Modifying
    @Query("UPDATE VerificationConnexion v SET v.annuleLe = :maintenant "
         + "WHERE v.userId = :userId AND v.utiliseLe IS NULL AND v.annuleLe IS NULL")
    int annulerActifs(@Param("userId") UUID userId, @Param("maintenant") LocalDateTime maintenant);

    @Modifying
    @Query("DELETE FROM VerificationConnexion v WHERE v.creeLe < :limite")
    int supprimerCreesAvant(@Param("limite") LocalDateTime limite);
}
