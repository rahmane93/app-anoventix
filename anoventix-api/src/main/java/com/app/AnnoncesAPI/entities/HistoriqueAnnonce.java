package com.app.AnnoncesAPI.entities;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Trace immuable d'une modification d'annonce.
 * Un enregistrement par champ modifié lors d'une mise à jour.
 */
@Entity
@Table(name = "historique_annonce")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoriqueAnnonce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    /** Nom du champ modifié (ex: "prix", "titre", "statutModeration"). */
    @Column(nullable = false, length = 60)
    private String champ;

    @Column(length = 1000)
    private String ancienneValeur;

    @Column(length = 1000)
    private String nouvelleValeur;

    /** Auteur de la modification (username). */
    @Column(nullable = false, length = 100)
    private String modifiePar;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dateModification;

    @PrePersist
    protected void onCreate() {
        dateModification = LocalDateTime.now();
    }
}
