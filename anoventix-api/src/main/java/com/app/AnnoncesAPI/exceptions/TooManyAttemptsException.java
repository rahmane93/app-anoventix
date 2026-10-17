package com.app.AnnoncesAPI.exceptions;

/**
 * Levée quand un compte est temporairement verrouillé après trop d'échecs
 * (connexion, code de réinitialisation). Traduite en HTTP 429.
 */
public class TooManyAttemptsException extends RuntimeException {

    public TooManyAttemptsException(String message) {
        super(message);
    }
}
