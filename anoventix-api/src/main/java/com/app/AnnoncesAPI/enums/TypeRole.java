package com.app.AnnoncesAPI.enums;

/**
 * Énumération des rôles utilisateurs dans le système de gestion d'annonces
 * 
 * PARTICULIER : Particulier, gère uniquement ses propres annonces
 * PROFESSIONNEL : Entreprise, peut gérer une équipe d'agents
 * MODERATEUR : Valide, refuse, masque ou supprime des annonces
 * ADMINISTRATEUR : Accès complet à toutes les fonctionnalités
 */
public enum TypeRole {
    PARTICULIER,           // Particulier indépendant
    PROFESSIONNEL,         // Propriétaire d'entreprise
    AGENT_PROFESSIONNEL,   // Agent rattaché à une entreprise
    MODERATEUR,            // Gestion de la conformité
    ADMINISTRATEUR         // Accès complet
}
