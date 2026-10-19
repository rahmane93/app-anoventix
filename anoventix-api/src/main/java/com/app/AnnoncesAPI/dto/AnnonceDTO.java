package com.app.AnnoncesAPI.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnnonceDTO {
    private Long id;
    /** Identifiant public non devinable : l'URL de l'annonce est /annonce/{slug}-{publicId}. */
    private String publicId;
    /** Partie lisible de l'URL, dérivée du titre (sans incidence sur la résolution). */
    private String slug;
    private String referenceAnnonce;
    private String titre;
    private String description;
    private BigDecimal prix;
    private BigDecimal prixRevise;
    private LocalisationDTO localisation;
    private String complementAdresse;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private TypeAnnonce typeAnnonce;
    private TypeBien typeBien;
    private BigDecimal fraisHonoraire;
    /** Location / bail : caution et avance en mois de loyer ; nuls si non demandées ou pour une vente. */
    private Integer cautionMois;
    private Integer avanceMois;
    private String documentsDisponibles;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    private Boolean actif;
    private StatutAnnonce statutModeration;
    private MotifCloture motifCloture;
    private LocalDateTime dateCloture;
    /** Motif de masquage / rejet par la modération (null si en ligne). */
    private String motifModeration;
    /** Masquage décidé par le système après plusieurs signalements (DEC-11). */
    private boolean masquageAutomatique;
    private LocalDateTime dateMasquage;
    /** Réexamen demandé par le propriétaire et pas encore tranché (DEC-09). */
    private boolean reexamenDemande;
    private LocalDateTime dateReexamen;
    private String messageReexamen;
    /** Demandes de réexamen déjà faites sur cette annonce (3 au plus). */
    private int nbReexamens;
    /** Fin de validité : l'annonce sera clôturée (EXPIREE) à cette date si elle n'est pas prolongée. */
    private LocalDateTime dateExpiration;
    /** Annonces du propriétaire masquées par l'administrateur (vues propriétaire / admin ; jamais vraie en public). */
    private boolean proprietaireMasque;
    private UUID userId;
    private int nbFavoris;
    private long vueCount;
    private AnnonceurDTO annonceur;
    private List<MediaDTO> medias;
}