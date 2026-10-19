package com.app.AnnoncesAPI.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.app.AnnoncesAPI.entities.BlocageUtilisateur;

public interface BlocageUtilisateurRepository extends JpaRepository<BlocageUtilisateur, Long> {

    boolean existsByBloqueurIdAndBloqueId(UUID bloqueurId, UUID bloqueId);

    void deleteByBloqueurIdAndBloqueId(UUID bloqueurId, UUID bloqueId);

    List<BlocageUtilisateur> findByBloqueurIdOrderByDateBlocageDesc(UUID bloqueurId);

    /** Vrai si l'un des deux a bloqué l'autre. */
    @Query("SELECT COUNT(b) > 0 FROM BlocageUtilisateur b WHERE (b.bloqueur.id = :a AND b.bloque.id = :b) "
         + "OR (b.bloqueur.id = :b AND b.bloque.id = :a)")
    boolean existeEntre(@Param("a") UUID a, @Param("b") UUID b);
}
