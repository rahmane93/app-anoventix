package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupRequest {

    @NotBlank(message = "L'email est obligatoire.")
    @Size(max = 100, message = "L'email ne peut pas dépasser 100 caractères.")
    @Email(message = "Format d'email invalide.")
    private String email;

    @NotBlank(message = "Le nom est obligatoire.")
    @Size(max = 50, message = "Le nom ne peut pas dépasser 50 caractères.")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire.")
    @Size(max = 50, message = "Le prénom ne peut pas dépasser 50 caractères.")
    private String prenom;

    // Optionnel : sert aussi d'identifiant de connexion.
    @Pattern(regexp = "^(\\+|00)[1-9]\\d{6,14}$",
             message = "Le téléphone doit être au format international (+22462457411 ou 0022462457411)")
    private String telephone;

    @Pattern(regexp = "(?i)PARTICULIER|PROFESSIONNEL", message = "Le rôle doit être PARTICULIER ou PROFESSIONNEL.")
    private String role;

    @NotBlank(message = "Le mot de passe est obligatoire.")
    private String password;

    /**
     * Acceptation des CGU. Les versions de l'application antérieures à l'enregistrement du
     * consentement n'envoient pas ce champ (leur formulaire imposait pourtant la case à cocher) :
     * absent = accepté, un refus explicite (false) bloque l'inscription.
     */
    private Boolean acceptCgu;
}
