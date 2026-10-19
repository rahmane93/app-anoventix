package com.app.AnnoncesAPI.dto;

import java.util.UUID;

import com.app.AnnoncesAPI.security.ContactReserveAuxConnectes;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.annotation.JsonSerialize;

/**
 * Ce que le public voit d'une agence (page publique, DEC-14). Ni RCCM, ni email du propriétaire,
 * ni quotas, ni annonces restantes : ces informations de gestion restent dans {@link EntrepriseDTO},
 * réservé aux membres de l'entreprise et à la modération.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntreprisePubliqueDTO {

    private UUID id;
    private String nom;
    private String description;
    private String adresse;
    private String photoProfil;
    private Integer nombreAgents;

    /** Badge « Agence vérifiée » (DEC-04). */
    private boolean verifiee;

    /** Contacts de l'agence : réservés aux utilisateurs connectés, comme celui des annonceurs (DEC-14). */
    @JsonSerialize(using = ContactReserveAuxConnectes.class)
    private String telephone;

    @JsonSerialize(using = ContactReserveAuxConnectes.class)
    private String email;

    public static EntreprisePubliqueDTO de(EntrepriseDTO e) {
        return new EntreprisePubliqueDTO(e.getId(), e.getNom(), e.getDescription(), e.getAdresse(),
                e.getPhotoProfil(), e.getNombreAgents(),
                e.getStatutVerification() == com.app.AnnoncesAPI.enums.StatutVerificationEntreprise.VERIFIEE,
                e.getTelephone(), e.getEmail());
    }
}
