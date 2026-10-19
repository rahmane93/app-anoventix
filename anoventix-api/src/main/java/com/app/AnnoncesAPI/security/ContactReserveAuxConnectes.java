package com.app.AnnoncesAPI.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

/**
 * Sérialiseur des coordonnées de contact (téléphone, email) d'un annonceur ou d'une agence
 * (DEC-14, ECART-31) : la valeur n'est écrite que pour un utilisateur connecté, un visiteur
 * reçoit {@code null}.
 *
 * Appliqué sur le champ du DTO plutôt qu'aux endpoints un par un : aucune réponse publique,
 * existante ou future, ne peut le laisser fuiter par oubli. Les pages de partage (HTML) ne
 * contiennent jamais ces valeurs.
 */
public class ContactReserveAuxConnectes extends ValueSerializer<String> {

    @Override
    public void serialize(String valeur, JsonGenerator generateur, SerializationContext contexte) {
        if (estConnecte()) {
            generateur.writeString(valeur);
        } else {
            generateur.writeNull();
        }
    }

    /** Un compte authentifié (et non le jeton « anonyme » que Spring Security attribue aux visiteurs). */
    static boolean estConnecte() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetailsImpl;
    }
}
