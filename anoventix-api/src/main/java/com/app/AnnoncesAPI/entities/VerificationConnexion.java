package com.app.AnnoncesAPI.entities;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Défi de double authentification d'une connexion du staff (migration V23). Le code envoyé par
 * email n'est conservé que haché.
 */
@Entity
@Table(name = "verification_connexion")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VerificationConnexion {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "code_hash", nullable = false, updatable = false, length = 100)
    private String codeHash;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private LocalDateTime creeLe;

    @Column(name = "expire_le", nullable = false, updatable = false)
    private LocalDateTime expireLe;

    @Column(nullable = false)
    private int tentatives;

    @Column(name = "utilise_le")
    private LocalDateTime utiliseLe;

    @Column(name = "annule_le")
    private LocalDateTime annuleLe;

    public VerificationConnexion(UUID id, UUID userId, String codeHash, LocalDateTime expireLe) {
        this.id = id;
        this.userId = userId;
        this.codeHash = codeHash;
        this.creeLe = LocalDateTime.now();
        this.expireLe = expireLe;
    }

    /** Un défi n'est utilisable qu'une fois, avant son expiration, tant qu'il n'est ni annulé ni épuisé. */
    public boolean estUtilisable() {
        return utiliseLe == null && annuleLe == null && expireLe.isAfter(LocalDateTime.now());
    }

    public void marquerUtilise() {
        utiliseLe = LocalDateTime.now();
    }

    /** @return vrai si ce mauvais essai épuise le défi, qui est alors annulé. */
    public boolean enregistrerEchec(int tentativesMax) {
        tentatives++;
        if (tentatives >= tentativesMax) {
            annuleLe = LocalDateTime.now();
            return true;
        }
        return false;
    }
}
