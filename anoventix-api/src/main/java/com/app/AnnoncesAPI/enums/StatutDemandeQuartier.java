package com.app.AnnoncesAPI.enums;

/** Décision sur une demande d'ajout de quartier (DEC-22). */
public enum StatutDemandeQuartier {
    EN_ATTENTE,
    /** Le quartier a été créé : l'annonce y est rattachée. */
    AJOUTEE,
    /** Variante d'orthographe : l'annonce est rattachée à un quartier existant. */
    RATTACHEE,
    /** Refusée avec un motif : l'annonce reste rattachée à la commune. */
    REFUSEE
}
