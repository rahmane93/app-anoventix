package com.app.AnnoncesAPI.entities;

import java.time.LocalDateTime;
import java.util.UUID;

import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.ActionAudit.CibleAudit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Entrée du journal d'audit (migration V16). Immuable : créée par
 * {@code AuditService}, jamais modifiée.
 */
@Entity
@Table(name = "audit_event")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private LocalDateTime date;

    /** Null pour une action du système (tâche planifiée, règle automatique). */
    @Column(updatable = false)
    private UUID acteurId;

    @Column(nullable = false, updatable = false, length = 100)
    private String acteurLibelle;

    @Column(updatable = false, length = 30)
    private String acteurRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 50)
    private ActionAudit action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private CibleAudit cibleType;

    @Column(nullable = false, updatable = false, length = 64)
    private String cibleId;

    @Column(updatable = false, length = 1000)
    private String motif;

    @Column(updatable = false, length = 45)
    private String adresseIp;

    public AuditEvent(UUID acteurId, String acteurLibelle, String acteurRole,
                      ActionAudit action, String cibleId, String motif, String adresseIp) {
        this.date = LocalDateTime.now();
        this.acteurId = acteurId;
        this.acteurLibelle = acteurLibelle;
        this.acteurRole = acteurRole;
        this.action = action;
        this.cibleType = action.getCible();
        this.cibleId = cibleId;
        this.motif = motif;
        this.adresseIp = adresseIp;
    }
}
