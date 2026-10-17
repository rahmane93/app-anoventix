package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import com.app.AnnoncesAPI.enums.TypePieceIdentite;

/**
 * Requête de mise à jour du profil utilisateur (données texte uniquement).
 * Les photos se gèrent via PUT /api/users/me/photo (multipart).
 * Le document d'identité se gère via POST /api/users/me/piece-identite (multipart).
 */
@Data
public class UpdateProfileRequest {

    @Size(max = 50, message = "Le nom ne peut pas dépasser 50 caractères")
    private String nom;

    @Size(max = 50, message = "Le prénom ne peut pas dépasser 50 caractères")
    private String prenom;

    @Pattern(regexp = "^(\\+|00)[1-9]\\d{6,14}$",
             message = "Le téléphone doit être au format international (+22462457411 ou 0022462457411)")
    private String telephone;

    private TypePieceIdentite typePieceIdentite;

    @Size(max = 50, message = "Le numéro de pièce ne peut pas dépasser 50 caractères")
    private String numeroPieceIdentite;
}
