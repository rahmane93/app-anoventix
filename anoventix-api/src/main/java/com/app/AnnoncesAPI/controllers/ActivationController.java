package com.app.AnnoncesAPI.controllers;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.AnnoncesAPI.Utilities.Utility;
import com.app.AnnoncesAPI.services.AuthService;

@RestController
@RequestMapping("/activate")
public class ActivationController {

    private final AuthService authService;

    public ActivationController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping(produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> activateAccount(@RequestParam String token) {
        try {
            authService.activateAccount(token);
            return ResponseEntity.ok(
                Utility.renderPage("templates/page-activation-success.html", Map.of(), "Compte activé")
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                Utility.renderPage("templates/page-activation-error.html", Map.of("message", e.getMessage()),
                        "Activation impossible")
            );
        }
    }
}
