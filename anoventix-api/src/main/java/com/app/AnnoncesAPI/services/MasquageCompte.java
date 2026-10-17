package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.exceptions.UnauthorizedActionException;

/**
 * Compte dont les annonces sont masquées par l'administrateur : publier et modifier sont
 * suspendus (clôturer, masquer, supprimer restent permis). Admin et modérateur non concernés.
 */
public final class MasquageCompte {

    private MasquageCompte() {}

    public static void verifierAnnoncesNonMasquees(User user) {
        if (user.isAnnoncesMasquees() && !user.isAdministrateur() && !user.isModerateur()) {
            String motif = user.getMotifMasquageAnnonces();
            throw new UnauthorizedActionException("Vos annonces sont masquées par la modération"
                    + (motif != null && !motif.isBlank() ? " (motif : " + motif + ")" : "")
                    + ". Publication et modification sont suspendues.");
        }
    }
}
