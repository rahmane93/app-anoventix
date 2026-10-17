package com.app.AnnoncesAPI.enums;

/**
 * Actions inscrites au journal d'audit, avec le type de cible qu'elles visent.
 * Ajouter une valeur pour chaque nouvelle action du staff ou du système.
 */
public enum ActionAudit {

    ANNONCE_MASQUEE(CibleAudit.ANNONCE),
    ANNONCE_REJETEE(CibleAudit.ANNONCE),
    ANNONCE_REMISE_EN_LIGNE(CibleAudit.ANNONCE),

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
    PIECE_IDENTITE_CONSULTEE(CibleAudit.COMPTE);

    private final CibleAudit cible;

    ActionAudit(CibleAudit cible) {
        this.cible = cible;
    }

    public CibleAudit getCible() {
        return cible;
    }

    public enum CibleAudit {
        ANNONCE, SIGNALEMENT, MESSAGE, CONVERSATION, COMPTE
    }
}
