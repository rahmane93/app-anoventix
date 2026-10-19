package com.app.AnnoncesAPI.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO pour l'entité Entreprise
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntrepriseDTO {
    private UUID id;
    private String nom;
    private String description;
    private String numeroRCCM;
    private String adresse;
    private String telephone;
    private String email;
    private String photoProfil;
    private Integer quotaAnnonces;
    private Integer quotaAgents;
    private Boolean active;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;

    // Vérification de l'entreprise (DEC-04)
    private com.app.AnnoncesAPI.enums.StatutVerificationEntreprise statutVerification;
    private String motifRejetVerification;
    private LocalDateTime dateEnvoiVerification;
    private LocalDateTime dateDecisionVerification;
    /** Le justificatif RCCM est enregistré (le fichier n'est servi qu'au propriétaire et à la modération). */
    private Boolean justificatifFourni;
    
    // Informations sur le propriétaire
    private UUID annonceurProfessionnelId;
    private String annonceurProfessionnelEmail;
    
    // Statistiques
    private Integer nombreAgents;
    private Integer annoncesRestantes;
    private Integer agentsRestants;

    /** Vrai si l'entreprise a sa propre valeur au lieu de la valeur globale. */
    private Boolean quotaAgentsPersonnalise;
    private Boolean quotaAnnoncesPersonnalise;
}
