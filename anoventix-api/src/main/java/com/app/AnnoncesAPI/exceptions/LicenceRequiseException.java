package com.app.AnnoncesAPI.exceptions;

/**
 * Action d'annonceur refusée faute de licence valide au-delà des annonces gratuites.
 * Renvoyée en 402 : l'application redirige alors vers l'écran « Ma licence ».
 */
public class LicenceRequiseException extends IllegalStateException {

    private static final long serialVersionUID = 1L;

    public LicenceRequiseException(String message) {
        super(message);
    }
}
