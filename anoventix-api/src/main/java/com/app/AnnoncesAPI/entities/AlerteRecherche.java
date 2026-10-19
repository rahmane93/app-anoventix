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
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Recherche enregistrée : une notification push signale les nouvelles annonces qui y répondent (DEC-16). */
@Entity
@Table(name = "alerte_recherche")
@Getter
@Setter
@NoArgsConstructor
public class AlerteRecherche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 80)
    private String nom;

    /** Critères au format JSON ({@code CriteresAlerte}). */
    @Column(nullable = false, columnDefinition = "text")
    private String criteres;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Column(name = "derniere_verification", nullable = false)
    private LocalDateTime derniereVerification = LocalDateTime.now();

    @Column(name = "derniere_notification")
    private LocalDateTime derniereNotification;

    @Column(name = "derniere_ouverture")
    private LocalDateTime derniereOuverture;
}
