package com.app.AnnoncesAPI.entities;

import java.time.LocalDateTime;

import com.app.AnnoncesAPI.enums.StatutDemandeQuartier;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Demande d'ajout d'un quartier absent de la liste, saisie par l'annonceur (DEC-22, RG-05-17). */
@Entity
@Table(name = "demande_quartier")
@Getter
@Setter
@NoArgsConstructor
public class DemandeQuartier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nom saisi par l'annonceur. */
    @Column(nullable = false, length = 100)
    private String nom;

    /** Entrée technique « Autre quartier » de la commune concernée. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "localisation_id", nullable = false)
    private Localisation localisation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annonce_id", nullable = false)
    private Annonce annonce;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "demandeur_id", nullable = false)
    private User demandeur;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutDemandeQuartier statut = StatutDemandeQuartier.EN_ATTENTE;

    @Column(name = "motif_refus", length = 255)
    private String motifRefus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "localisation_finale")
    private Localisation localisationFinale;

    @Column(name = "date_demande", nullable = false)
    private LocalDateTime dateDemande = LocalDateTime.now();

    @Column(name = "date_decision")
    private LocalDateTime dateDecision;

    @Column(name = "decide_par", length = 100)
    private String decidePar;
}
