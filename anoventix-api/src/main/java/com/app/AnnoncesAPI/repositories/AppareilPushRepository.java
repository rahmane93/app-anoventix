package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.AppareilPush;

public interface AppareilPushRepository extends JpaRepository<AppareilPush, Long> {

    Optional<AppareilPush> findByJeton(String jeton);

    List<AppareilPush> findByUserId(UUID userId);

    @Modifying
    @Query("DELETE FROM AppareilPush a WHERE a.jeton = :jeton AND a.user.id = :userId")
    int supprimerDuCompte(@Param("jeton") String jeton, @Param("userId") UUID userId);

    @Modifying
    @Query("DELETE FROM AppareilPush a WHERE a.jeton IN :jetons")
    int supprimerJetons(@Param("jetons") List<String> jetons);

    @Modifying
    @Query("DELETE FROM AppareilPush a WHERE a.user.id = :userId")
    int supprimerTousDuCompte(@Param("userId") UUID userId);
}
