package com.app.AnnoncesAPI.enums;

/** État d'une conversation pour l'un de ses participants (ECART-29). */
public enum EtatConversation {
    ACTIVE,
    /** Rangée à part : un nouveau message la ramène dans la boîte. */
    ARCHIVEE,
    /** Masquée pour ce participant seulement ; l'autre la garde, la modération la relit si un message est signalé. */
    SUPPRIMEE
}
