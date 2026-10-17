package com.app.AnnoncesAPI.enums;

/**
 * Statut de modération d'une annonce.
 * Une annonce est publiée immédiatement par le propriétaire.
 * Les modérateurs peuvent la masquer ou la rejeter.
 */
public enum StatutAnnonce {

    /** Visible publiquement — état par défaut à la création. */
    PUBLIEE,

    /** Masquée par un modérateur — temporairement invisible, récupérable. */
    MASQUEE,

    /** Rejetée définitivement par un modérateur après infraction. */
    REJETEE,

    /**
     * Désactivée (supprimée) par le propriétaire — invisible au public ET au
     * propriétaire. Visible uniquement par les modérateurs/admins, qui sont les
     * seuls à pouvoir la réactiver.
     */
    DESACTIVEE
}
