package com.app.AnnoncesAPI.enums;

/**
 * Énumération des statuts possibles pour un utilisateur
 * 
 * EN_ATTENTE_ACTIVATION : compte créé, lien d'activation non utilisé (ou agent dont
 *                         le mot de passe temporaire n'a pas encore été changé)
 * ACTIF    : peut se connecter
 * INACTIF  : suppression demandée par le titulaire (délai de grâce, puis anonymisation),
 *            désactivation par la modération, ou agent retiré par son entreprise
 * SUSPENDU : suspendu par la modération (ou au 3e avertissement)
 */
public enum StatutUtilisateur {
    EN_ATTENTE_ACTIVATION,       // Email non vérifié
    ACTIF,                      // Utilisateur actif
    INACTIF,                  // Désactivé
    SUSPENDU                    // Suspendu temporairement
}
