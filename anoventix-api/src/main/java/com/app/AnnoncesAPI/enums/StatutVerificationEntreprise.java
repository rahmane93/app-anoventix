package com.app.AnnoncesAPI.enums;

/** Vérification d'une entreprise par la modération, sur justificatif RCCM (DEC-04). */
public enum StatutVerificationEntreprise {
    /** État à la création : l'entreprise publie normalement, sans badge. */
    NON_VERIFIEE,
    /** Justificatif envoyé, en attente de la décision de la modération. */
    EN_ATTENTE,
    /** Justificatif contrôlé : badge « Agence vérifiée », nom et RCCM figés. */
    VERIFIEE,
    /** Refusée avec un motif ; le propriétaire peut renvoyer un justificatif. */
    REJETEE
}
