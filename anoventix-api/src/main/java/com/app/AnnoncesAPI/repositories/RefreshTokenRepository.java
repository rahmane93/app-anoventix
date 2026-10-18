package com.app.AnnoncesAPI.repositories;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.RefreshToken;

import jakarta.persistence.LockModeType;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /** Verrouille la ligne : deux rafraîchissements simultanés du même jeton se suivent. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RefreshToken t WHERE t.id = :id")
    Optional<RefreshToken> verrouiller(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE RefreshToken t SET t.revoqueLe = :maintenant WHERE t.familleId = :familleId AND t.revoqueLe IS NULL")
    int revoquerFamille(@Param("familleId") UUID familleId, @Param("maintenant") LocalDateTime maintenant);

    @Modifying
    @Query("UPDATE RefreshToken t SET t.revoqueLe = :maintenant WHERE t.userId = :userId AND t.revoqueLe IS NULL")
    int revoquerTousDe(@Param("userId") UUID userId, @Param("maintenant") LocalDateTime maintenant);

    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.expireLe < :limite")
    int supprimerExpiresAvant(@Param("limite") LocalDateTime limite);
}
