package com.app.AnnoncesAPI.payload.response;

import com.app.AnnoncesAPI.enums.TypeLicence;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LicenceResponse {
    /** Mode licence activé par l'administrateur. Faux : publication libre, rien à afficher. */
    private boolean modeActif;
    /** Date à laquelle le mode licence s'applique ; nulle si le mode est coupé ou déjà en vigueur depuis longtemps. */
    private LocalDate dateEffet;
    /** Mode activé mais pas encore en vigueur : la publication reste libre jusqu'à la date d'effet (DEC-18). */
    private boolean enPreavis;
    /** ACTIVE, EN_ATTENTE (démarre à l'ouverture du mode licence), EXPIREE ou AUCUNE. */
    private String statut;
    private TypeLicence type;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    /** Email du titulaire (le PROFESSIONNEL pour un agent). */
    private String compteOwner;
    /** True si l'utilisateur connecté est un agent couvert par la licence de son PROFESSIONNEL. */
    private boolean partage;
    /** Annonces actives gratuites avant licence obligatoire. */
    private int annoncesGratuites;
    /** Annonces actives du compte (de l'entreprise pour un pro ou un agent). */
    private long annoncesActives;
    /**
     * Mode actif, plus d'annonces actives que le gratuit et aucune licence valide :
     * fonctions d'annonceur bloquées, l'app redirige vers « Ma licence ».
     */
    private boolean bloque;
    /** Prix annuel (GNF) de la licence correspondant au type de compte ; null si non renseigné. */
    private Long prix;
    /** Numéro à contacter pour acheter une licence ; null si non renseigné. */
    private String contactTelephone;
}
