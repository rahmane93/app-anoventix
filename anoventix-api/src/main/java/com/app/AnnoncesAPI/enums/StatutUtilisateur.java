package com.app.AnnoncesAPI.enums;

/**
 * Énumération des statuts possibles pour un utilisateur
 * 
 * ACTIF : Utilisateur actif et peut se connecter
 * DESACTIVE : Utilisateur désactivé (par admin ou annonceur pro)
 * SUSPENDU : Utilisateur temporairement suspendu
 * EN_ATTENTE_ACTIVATION : Compte créé mais email non vérifié
 */
public enum StatutUtilisateur {
    EN_ATTENTE_ACTIVATION,       // Email non vérifié
    ACTIF,                      // Utilisateur actif
    INACTIF,                  // Désactivé
    SUSPENDU                    // Suspendu temporairement
}
