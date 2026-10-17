package com.app.AnnoncesAPI.exceptions;

import org.springframework.http.HttpStatus;

/**
 * Code stable d'une erreur de l'API, à destination des clients : l'app décide de son
 * comportement sur le code (et le statut HTTP), jamais sur le texte du message.
 * Ajouter une valeur est sans risque ; renommer ou supprimer en est un.
 */
public enum CodeErreur {

    VALIDATION(HttpStatus.BAD_REQUEST),
    REQUETE_INVALIDE(HttpStatus.BAD_REQUEST),
    NON_AUTHENTIFIE(HttpStatus.UNAUTHORIZED),
    IDENTIFIANTS_INVALIDES(HttpStatus.UNAUTHORIZED),
    LICENCE_REQUISE(HttpStatus.PAYMENT_REQUIRED),
    ACCES_REFUSE(HttpStatus.FORBIDDEN),
    COMPTE_INACTIF(HttpStatus.FORBIDDEN),
    RESSOURCE_INTROUVABLE(HttpStatus.NOT_FOUND),
    CONFLIT(HttpStatus.CONFLICT),
    FICHIER_TROP_VOLUMINEUX(HttpStatus.CONTENT_TOO_LARGE),
    REGLE_METIER(HttpStatus.UNPROCESSABLE_CONTENT),
    MOT_DE_PASSE_A_CHANGER(HttpStatus.LOCKED),
    TROP_DE_REQUETES(HttpStatus.TOO_MANY_REQUESTS),
    ERREUR_INTERNE(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    CodeErreur(HttpStatus status) {
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
