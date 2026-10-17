package com.app.AnnoncesAPI.dto;

import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO pour la réponse d'un agent professionnel
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentDTO {
    
    private UUID id;
    private String email;
    private String prenom;
    private String nom;
    private String telephone;
    private StatutUtilisateur statut;
    private Boolean mustChangePassword;
    
    // Informations sur l'entreprise
    private UUID entrepriseId;
    private String entrepriseNom;
    
    // Informations sur le professionnel parent
    private UUID parentUserId;
    
    private LocalDateTime dateCreation;
}
