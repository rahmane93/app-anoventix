package com.app.AnnoncesAPI.enums;

/**
 * Actions inscrites au journal d'audit, avec le type de cible qu'elles visent.
 * Ajouter une valeur pour chaque nouvelle action du staff ou du système.
 */
public enum ActionAudit {

    ANNONCE_MASQUEE(CibleAudit.ANNONCE),
    ANNONCE_REJETEE(CibleAudit.ANNONCE),
    ANNONCE_REMISE_EN_LIGNE(CibleAudit.ANNONCE),
    ANNONCE_MASQUEE_AUTOMATIQUEMENT(CibleAudit.ANNONCE),
    ANNONCE_REEXAMEN_DEMANDE(CibleAudit.ANNONCE),
    ANNONCE_MASQUAGE_MAINTENU(CibleAudit.ANNONCE),

    SIGNALEMENT_TRAITE(CibleAudit.SIGNALEMENT),
    SIGNALEMENT_SUPPRIME(CibleAudit.SIGNALEMENT),

    MESSAGE_SUPPRIME(CibleAudit.MESSAGE),
    MESSAGE_SIGNALEMENT_IGNORE(CibleAudit.MESSAGE),
    CONVERSATION_CONSULTEE(CibleAudit.CONVERSATION),

    COMPTE_STATUT_MODIFIE(CibleAudit.COMPTE),
    COMPTE_AVERTI(CibleAudit.COMPTE),
    COMPTE_SUSPENDU_AUTOMATIQUEMENT(CibleAudit.COMPTE),
    COMPTE_ROLE_MODIFIE(CibleAudit.COMPTE),
    COMPTE_SUPPRIME(CibleAudit.COMPTE),
    COMPTE_ANNONCES_MASQUEES(CibleAudit.COMPTE),
    COMPTE_ANNONCES_REAFFICHEES(CibleAudit.COMPTE),
    PIECE_IDENTITE_VALIDEE(CibleAudit.COMPTE),
    PIECE_IDENTITE_REJETEE(CibleAudit.COMPTE),
    PIECE_IDENTITE_CONSULTEE(CibleAudit.COMPTE),

    QUARTIER_AJOUTE(CibleAudit.LOCALISATION),
    QUARTIER_RATTACHE(CibleAudit.LOCALISATION),
    QUARTIER_REFUSE(CibleAudit.LOCALISATION),

    LICENCE_VENDUE(CibleAudit.LICENCE),
    LICENCE_ACHETEUR_AFFECTE(CibleAudit.LICENCE),

    ENTREPRISE_VERIFIEE(CibleAudit.ENTREPRISE),
    ENTREPRISE_VERIFICATION_REFUSEE(CibleAudit.ENTREPRISE),
    ENTREPRISE_JUSTIFICATIF_CONSULTE(CibleAudit.ENTREPRISE);

    private final CibleAudit cible;

    ActionAudit(CibleAudit cible) {
        this.cible = cible;
    }

    public CibleAudit getCible() {
        return cible;
    }

    public enum CibleAudit {
        ANNONCE, SIGNALEMENT, MESSAGE, CONVERSATION, COMPTE, ENTREPRISE, LICENCE, LOCALISATION
    }
}
