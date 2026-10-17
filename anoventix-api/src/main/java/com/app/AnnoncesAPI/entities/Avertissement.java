package com.app.AnnoncesAPI.entities;

import java.time.LocalDateTime;

import com.app.AnnoncesAPI.enums.NiveauAvertissement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "avertissements", indexes = {
    @Index(name = "idx_avertissement_utilisateur", columnList = "utilisateur_id"),
    @Index(name = "idx_avertissement_date",        columnList = "date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Avertissement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private User utilisateur;

    @Column(nullable = false, length = 200)
    private String motif;

    @Column(nullable = false, length = 100)
    private String emitPar;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NiveauAvertissement niveau;

    /** Vrai si cet avertissement a déclenché une suspension automatique. */
    @Column(nullable = false)
    private Boolean suspenduAutomatiquement = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime date;

    @PrePersist
    protected void onCreate() {
        date = LocalDateTime.now();
    }
}
