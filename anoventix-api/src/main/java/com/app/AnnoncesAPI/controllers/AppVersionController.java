package com.app.AnnoncesAPI.controllers;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Version minimale de l'app mobile (RG-12-21) : l'app la lit au démarrage et invite à mettre à jour. */
@RestController
@RequestMapping("/api/app")
@Tag(name = "Application mobile")
public class AppVersionController {

    private final String versionMinimale;
    private final String urlMiseAJour;

    public AppVersionController(@Value("${app.mobile.version-minimale:1.0.0}") String versionMinimale,
                                @Value("${app.mobile.url-mise-a-jour:}") String urlMiseAJour) {
        this.versionMinimale = versionMinimale;
        this.urlMiseAJour = urlMiseAJour;
    }

    @GetMapping("/version")
    @Operation(summary = "Version minimale de l'app",
               description = "Public. versionMinimale (x.y.z) : une app plus ancienne doit être mise à jour depuis urlMiseAJour.")
    public ResponseEntity<Map<String, String>> version() {
        return ResponseEntity.ok(Map.of("versionMinimale", versionMinimale, "urlMiseAJour", urlMiseAJour));
    }
}
