package com.app.AnnoncesAPI.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Annonce vue par la modération : le DTO public, plus l'identité du propriétaire.
 * L'email n'apparaît jamais dans les réponses publiques.
 */
@Getter
@Setter
@NoArgsConstructor
public class AdminAnnonceDTO extends BienImmoDTO {

    /** Identifiant du compte propriétaire (même valeur que {@code userId}). */
    private java.util.UUID proprietaireId;
    private String proprietaireEmail;
    /** Prénom et nom du propriétaire. */
    private String proprietaireNom;
}
