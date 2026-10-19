package com.app.AnnoncesAPI.dto;

import java.time.LocalDate;

import com.app.AnnoncesAPI.payload.response.PageResponse;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Profil public minimal d'un compte (DEC-21, RG-02-38) : prénom, initiale du nom, photo, « membre depuis »,
 * identité vérifiée et annonces visibles. Jamais de téléphone, d'email ni de statut.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfilPublicDTO {
    private String prenom;
    /** Première lettre du nom, suivie d'un point (« D. »). */
    private String initialeNom;
    private String photoProfil;
    /** Premier jour du mois d'inscription : l'app affiche « Membre depuis mars 2026 ». */
    private LocalDate membreDepuis;
    private boolean identiteVerifiee;
    /** Professionnel ou agent : l'app mène à la page de l'agence (RG-02-39). */
    private java.util.UUID entrepriseId;
    private PageResponse<AnnonceDTO> annonces;
}
