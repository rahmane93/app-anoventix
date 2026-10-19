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
 * Jeton de rafraîchissement émis (migration V22). L'identifiant est le claim « jti » du JWT.
 * Un jeton sert une seule fois : au rafraîchissement il est marqué utilisé et remplacé par un
 * autre de la même famille.
 */
@Entity
@Table(name = "refresh_token")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {

    @Id
    private UUID id;

    @Column(name = "famille_id", nullable = false, updatable = false)
    private UUID familleId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private LocalDateTime creeLe;

    @Column(name = "expire_le", nullable = false, updatable = false)
    private LocalDateTime expireLe;

    @Column(name = "utilise_le")
    private LocalDateTime utiliseLe;

    @Column(name = "revoque_le")
    private LocalDateTime revoqueLe;

    public RefreshToken(UUID id, UUID familleId, UUID userId, LocalDateTime expireLe) {
        this.id = id;
        this.familleId = familleId;
        this.userId = userId;
        this.creeLe = LocalDateTime.now();
        this.expireLe = expireLe;
    }

    public boolean estExpire() {
        return expireLe.isBefore(LocalDateTime.now());
    }

    public boolean estRevoque() {
        return revoqueLe != null;
    }

    public void marquerUtilise() {
        if (utiliseLe == null) {
            utiliseLe = LocalDateTime.now();
        }
    }
}
