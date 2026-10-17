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
