package com.app.AnnoncesAPI.entities;

import com.app.AnnoncesAPI.enums.StatutSignalement;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "signalements",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_signalement_annonce_reporter",
        columnNames = {"annonce_id", "reporter_id"}
    ),
    indexes = {
        @Index(name = "idx_signalement_reporter", columnList = "reporter_id"),
        @Index(name = "idx_signalement_annonce",  columnList = "annonce_id"),
        @Index(name = "idx_signalement_statut",   columnList = "statut")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Signalement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(nullable = false, length = 100)
    private String motif;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(nullable = false, updatable = false)
    private LocalDateTime date;

    @Column(nullable = false)
    private Boolean annule = false;

    @Column
    private LocalDateTime dateAnnulation;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutSignalement statut = StatutSignalement.EN_ATTENTE;

    @Column(name = "traite_par")
    private String traitePar;

    @Column(name = "date_traitement")
    private LocalDateTime dateTraitement;

    @Column(name = "note_admin", columnDefinition = "TEXT")
    private String noteAdmin;

    @PrePersist
    protected void onCreate() {
        date = LocalDateTime.now();
    }
}
