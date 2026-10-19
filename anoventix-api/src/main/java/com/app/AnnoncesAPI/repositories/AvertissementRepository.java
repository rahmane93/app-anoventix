package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.app.AnnoncesAPI.entities.Avertissement;

@Repository
public interface AvertissementRepository extends JpaRepository<Avertissement, Long> {

    @Query("SELECT a FROM Avertissement a JOIN FETCH a.utilisateur WHERE a.utilisateur.id = :userId ORDER BY a.date DESC")
    List<Avertissement> findByUtilisateurId(@Param("userId") UUID userId);

    long countByUtilisateurId(UUID userId);

    /** Avertissements qui comptent encore : non levés et émis après {@code depuis} (ECART-24). */
    long countByUtilisateurIdAndDateLeveeIsNullAndDateAfter(UUID userId, java.time.LocalDateTime depuis);

    /** Nombre d'avertissements en vigueur d'un compte (ni levés, ni expirés). */
    default long countEnVigueur(UUID userId) {
        return countByUtilisateurIdAndDateLeveeIsNullAndDateAfter(userId,
                java.time.LocalDateTime.now().minusMonths(Avertissement.VALIDITE_MOIS));
    }
}
