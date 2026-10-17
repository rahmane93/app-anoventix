package com.app.AnnoncesAPI.entities;

import java.time.Duration;
import java.time.LocalDateTime;

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
 * Email inscrit dans la file d'envoi (migration V17). Son cycle de vie est porté
 * par l'entité : EN_ATTENTE → ENVOYE, ou EN_ATTENTE → (nouvel essai)* → ABANDONNE.
 */
@Entity
@Table(name = "email_sortant")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmailSortant {

    public enum Statut { EN_ATTENTE, ENVOYE, ABANDONNE }

    /** Délai avant chaque nouvel essai ; au-delà du dernier, l'email est abandonné. */
    private static final Duration[] DELAIS_NOUVEL_ESSAI = {
            Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(15),
            Duration.ofHours(1), Duration.ofHours(6) };

    public static final int NOMBRE_NOUVEAUX_ESSAIS = DELAIS_NOUVEL_ESSAI.length;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100, updatable = false)
    private String destinataire;

    @Column(nullable = false, length = 200, updatable = false)
    private String sujet;

    @Column(columnDefinition = "text")
    private String corpsHtml;

    @Column(nullable = false, updatable = false)
    private boolean contenuSensible;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Statut statut;

    @Column(nullable = false)
    private int tentatives;

    @Column(nullable = false)
    private LocalDateTime prochainEssai;

    @Column(length = 500)
    private String derniereErreur;

    @Column(nullable = false, updatable = false)
    private LocalDateTime creeLe;

    private LocalDateTime envoyeLe;

    public EmailSortant(String destinataire, String sujet, String corpsHtml, boolean contenuSensible) {
        this.destinataire = destinataire;
        this.sujet = sujet;
        this.corpsHtml = corpsHtml;
        this.contenuSensible = contenuSensible;
        this.statut = Statut.EN_ATTENTE;
        this.creeLe = LocalDateTime.now();
        this.prochainEssai = this.creeLe;
    }

    public void marquerEnvoye() {
        statut = Statut.ENVOYE;
        envoyeLe = LocalDateTime.now();
        tentatives++;
        derniereErreur = null;
        effacerSiSensible();
    }

    /** @return vrai si l'email est abandonné après cet échec. */
    public boolean marquerEchec(String erreur) {
        tentatives++;
        derniereErreur = erreur == null ? null : erreur.substring(0, Math.min(erreur.length(), 500));
        if (tentatives > NOMBRE_NOUVEAUX_ESSAIS) {
            statut = Statut.ABANDONNE;
            effacerSiSensible();
            return true;
        }
        prochainEssai = LocalDateTime.now().plus(DELAIS_NOUVEL_ESSAI[tentatives - 1]);
        return false;
    }

    private void effacerSiSensible() {
        if (contenuSensible) {
            corpsHtml = null;
        }
    }
}
