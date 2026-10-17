package com.app.AnnoncesAPI.exceptions;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Traduit les exceptions en réponses {@link ErreurApi} : un statut HTTP, un code stable
 * et un message en français affichable tel quel.
 */
@ControllerAdvice(basePackages = "com.app.AnnoncesAPI")
public class ApplicationExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(ApplicationExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErreurApi> resourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return erreur(CodeErreur.RESSOURCE_INTROUVABLE, ex.getMessage(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErreurApi> accessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return erreur(CodeErreur.ACCES_REFUSE,
                "Accès refusé. Vous n'avez pas les permissions nécessaires.", request);
    }

    /**
     * Sans ce handler, l'annotation @ResponseStatus(FORBIDDEN) de l'exception est ignorée :
     * le handler générique {@code Exception.class} l'intercepte et renvoie un 500.
     */
    @ExceptionHandler(UnauthorizedActionException.class)
    public ResponseEntity<ErreurApi> unauthorizedAction(UnauthorizedActionException ex, HttpServletRequest request) {
        return erreur(CodeErreur.ACCES_REFUSE, ex.getMessage(), request);
    }

    /** Prioritaire sur IllegalStateException (422, classe parente) : code dédié pour la redirection côté app. */
    @ExceptionHandler(LicenceRequiseException.class)
    public ResponseEntity<ErreurApi> licenceRequise(LicenceRequiseException ex, HttpServletRequest request) {
        return erreur(CodeErreur.LICENCE_REQUISE, ex.getMessage(), request);
    }

    @ExceptionHandler(TooManyAttemptsException.class)
    public ResponseEntity<ErreurApi> tooManyAttempts(TooManyAttemptsException ex, HttpServletRequest request) {
        return erreur(CodeErreur.TROP_DE_REQUETES, ex.getMessage(), request);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErreurApi> optimisticLock(ObjectOptimisticLockingFailureException ex, HttpServletRequest request) {
        return erreur(CodeErreur.CONFLIT,
                "La ressource a été modifiée entre-temps. Veuillez réessayer.", request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErreurApi> maxUploadSize(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        return erreur(CodeErreur.FICHIER_TROP_VOLUMINEUX, "Fichier trop volumineux.", request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErreurApi> messageNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        return erreur(CodeErreur.REQUETE_INVALIDE, "Corps de requête invalide ou mal formé.", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErreurApi> illegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        return erreur(CodeErreur.REQUETE_INVALIDE, ex.getMessage(), request);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ErreurApi> disabled(DisabledException ex, HttpServletRequest request) {
        return erreur(CodeErreur.COMPTE_INACTIF, ex.getMessage(), request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErreurApi> badCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return erreur(CodeErreur.IDENTIFIANTS_INVALIDES, ex.getMessage(), request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErreurApi> illegalState(IllegalStateException ex, HttpServletRequest request) {
        return erreur(CodeErreur.REGLE_METIER, ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErreurApi> typeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return erreur(CodeErreur.REQUETE_INVALIDE,
                String.format("Paramètre '%s' invalide : la valeur '%s' n'est pas du type attendu.",
                        ex.getName(), ex.getValue()),
                request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErreurApi> missingParameter(MissingServletRequestParameterException ex, HttpServletRequest request) {
        return erreur(CodeErreur.REQUETE_INVALIDE, "Paramètre requis manquant : " + ex.getParameterName(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErreurApi> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String champ = error instanceof FieldError fieldError ? fieldError.getField() : error.getObjectName();
            errors.put(champ, error.getDefaultMessage() != null ? error.getDefaultMessage() : "Erreur de validation");
        });
        return ErreurApi.validation(errors, request.getRequestURI()).reponse();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErreurApi> unhandled(Exception ex, HttpServletRequest request) {
        logger.error("Unhandled exception", ex);
        return erreur(CodeErreur.ERREUR_INTERNE,
                "Une erreur interne est survenue. Veuillez réessayer plus tard.", request);
    }

    private static ResponseEntity<ErreurApi> erreur(CodeErreur code, String message, HttpServletRequest request) {
        return ErreurApi.of(code, message, request.getRequestURI()).reponse();
    }
}
