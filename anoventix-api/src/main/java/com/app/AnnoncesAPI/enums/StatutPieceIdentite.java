package com.app.AnnoncesAPI.enums;

/**
 * Statut de validation de la pièce d'identité d'un utilisateur.
 *
 * EN_ATTENTE  : Document uploadé, en attente de vérification par admin/modérateur
 * VALIDEE     : Document vérifié et approuvé — l'utilisateur peut publier des annonces
 * REJETEE     : Document refusé (flou, expiré, non conforme…)
 */
public enum StatutPieceIdentite {
    EN_ATTENTE,
    VALIDEE,
    REJETEE
}
