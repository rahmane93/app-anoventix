package com.app.AnnoncesAPI.exceptions;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * Format unique des erreurs de l'API, qu'elles viennent d'un contrôleur
 * ({@link ApplicationExceptionHandler}) ou d'un filtre de sécurité.
 *
 * @param status    statut HTTP
 * @param code      code stable (voir {@link CodeErreur}) : c'est lui que les clients testent
 * @param message   texte en français, affichable tel quel à l'utilisateur
 * @param errors    erreurs par champ (validation), sinon null
 * @param path      chemin de la requête
 * @param timestamp instant de l'erreur
 */
public record ErreurApi(int status, CodeErreur code, String message, Map<String, String> errors,
                        String path, Instant timestamp) {

    public static ErreurApi of(CodeErreur code, String message, String path) {
        return new ErreurApi(code.status().value(), code, message, null, path, Instant.now());
    }

    public static ErreurApi validation(Map<String, String> errors, String path) {
        return new ErreurApi(CodeErreur.VALIDATION.status().value(), CodeErreur.VALIDATION,
                "Erreur de validation", errors, path, Instant.now());
    }

    public ResponseEntity<ErreurApi> reponse() {
        return ResponseEntity.status(status).body(this);
    }

    /** Pour les filtres, qui écrivent la réponse eux-mêmes (hors contrôleur). */
    public void ecrire(HttpServletResponse response, ObjectMapper mapper) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getOutputStream(), this);
    }
}
