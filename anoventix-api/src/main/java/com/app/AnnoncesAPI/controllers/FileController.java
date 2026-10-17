package com.app.AnnoncesAPI.controllers;

import java.io.IOException;
import java.net.URLConnection;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Sert les fichiers publics du dossier {@code uploads/public/}.
 *
 * <p><b>Sécurité (P2.5)</b> : le chemin résolu est explicitement comparé à la racine
 * d'upload pour bloquer les attaques de type path traversal (ex: {@code ../etc/passwd}).
 *
 * <p><b>P0.3</b> : tout chemin commençant par {@code private/} est rejeté.
 * Les pièces d'identité y sont stockées et accessibles uniquement via l'endpoint
 * authentifié {@code GET /api/users/{userId}/piece-identite}.
 *
 * <p><b>P0.4</b> : les fichiers publics (photos, médias) dans {@code /uploads/public/**}
 * sont accessibles à tous.
 */
@RestController
@RequestMapping("/uploads")
public class FileController {

    private static final String PUBLIC_PREFIX = "public";

    @Value("${upload.dir:./uploads/}")
    private String uploadDir;

    @GetMapping("/public/**")
    public ResponseEntity<Resource> serveFile(HttpServletRequest request) throws IOException {

        // Extraire le chemin relatif après /uploads/public/
        String requestUri = request.getRequestURI();
        String prefix = "/uploads/public/";
        if (!requestUri.startsWith(prefix)) {
            return ResponseEntity.notFound().build();
        }
        String relativePath = requestUri.substring(prefix.length());

        // Bloquer chemins vides, traversal et séquences suspectes
        if (relativePath.isBlank()
                || relativePath.contains("..")
                || relativePath.contains("\\")) {
            return ResponseEntity.notFound().build();
        }

        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path publicRoot = uploadRoot.resolve(PUBLIC_PREFIX);
        Path filePath   = publicRoot.resolve(relativePath).normalize();

        // Defense en profondeur : rester sous public/
        if (!filePath.startsWith(publicRoot)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        String filename    = filePath.getFileName().toString();
        String contentType = URLConnection.guessContentTypeFromName(filename);
        if (contentType == null) {
            contentType = Files.probeContentType(filePath);
        }
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
}
