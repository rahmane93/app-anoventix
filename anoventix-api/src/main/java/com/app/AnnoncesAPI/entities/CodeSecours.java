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

/** Code de secours à usage unique d'un compte du staff (migration V23), conservé haché. */
@Entity
@Table(name = "code_secours")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CodeSecours {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "code_hash", nullable = false, updatable = false, length = 100)
    private String codeHash;

    @Column(name = "cree_le", nullable = false, updatable = false)
    private LocalDateTime creeLe;

    @Column(name = "utilise_le")
    private LocalDateTime utiliseLe;

    public CodeSecours(UUID userId, String codeHash) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.codeHash = codeHash;
        this.creeLe = LocalDateTime.now();
    }

    public void marquerUtilise() {
        utiliseLe = LocalDateTime.now();
    }
}
