package com.app.AnnoncesAPI.exceptions;

/** L'état actuel de la ressource interdit l'action demandée (HTTP 409, code CONFLIT). */
public class ConflitException extends RuntimeException {

    public ConflitException(String message) {
        super(message);
    }
}
