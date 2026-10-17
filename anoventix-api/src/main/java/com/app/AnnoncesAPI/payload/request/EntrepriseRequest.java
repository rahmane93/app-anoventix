package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request pour créer ou modifier une entreprise.
 * Tous les champs sont obligatoires (même règle que l'app mobile).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntrepriseRequest {
    
    @NotBlank(message = "Le nom de l'entreprise est obligatoire")
    @Size(max = 100, message = "Le nom ne peut pas dépasser 100 caractères")
    private String nom;
    
    @NotBlank(message = "La description est obligatoire")
    @Size(max = 200, message = "La description ne peut pas dépasser 200 caractères")
    private String description;
    
    @NotBlank(message = "Le numéro RCCM est obligatoire")
    @Size(max = 50, message = "Le numéro RCCM ne peut pas dépasser 50 caractères")
    private String numeroRCCM;
    
    @NotBlank(message = "L'adresse est obligatoire")
    @Size(max = 100, message = "L'adresse ne peut pas dépasser 100 caractères")
    private String adresse;
    
    
    @NotBlank(message = "Le téléphone est obligatoire")
    @Pattern(regexp = "^(\\+|00)[1-9]\\d{6,14}$", message = "Le téléphone doit être au format international (+22462457411 ou 0022462457411)")
    private String telephone;
    
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format d'email invalide")
    @Size(max = 100, message = "L'email ne peut pas dépasser 100 caractères")
    private String email;
}
