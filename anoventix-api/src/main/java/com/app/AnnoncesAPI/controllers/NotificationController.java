package com.app.AnnoncesAPI.controllers;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.AnnoncesAPI.entities.AlerteRecherche;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.AlerteRechercheService;
import com.app.AnnoncesAPI.services.AlerteRechercheService.Criteres;
import com.app.AnnoncesAPI.services.PushService;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Notifications push (DEC-13) et alertes de recherche (DEC-16). */
@RestController
@RequestMapping("/api")
@PreAuthorize("isAuthenticated()")
@Tag(name = "Notifications", description = "Appareils pour les notifications push, interrupteurs du profil, alertes de recherche")
public class NotificationController {

    public record EnregistrementAppareil(@NotBlank @Size(max = 200) String jeton, @Size(max = 20) String plateforme) {}

    public record Interrupteurs(boolean messages, boolean alertes) {}

    public record AlerteRequest(@Size(max = 80) String nom, Criteres criteres) {}

    public record AlerteUpdate(@Size(max = 80) String nom, Boolean active) {}

    public record AlerteResponse(Long id, String nom, boolean active, Criteres criteres, LocalDateTime dateCreation,
                                 LocalDateTime derniereNotification, LocalDateTime derniereOuverture) {}

    private final PushService push;
    private final AlerteRechercheService alertes;
    private final UserRepository utilisateurs;

    public NotificationController(PushService push, AlerteRechercheService alertes, UserRepository utilisateurs) {
        this.push = push;
        this.alertes = alertes;
        this.utilisateurs = utilisateurs;
    }

    // ── Appareils ──────────────────────────────────────────────────────────

    @PostMapping("/push/appareils")
    @Operation(summary = "Enregistrer l'appareil pour les notifications push",
               description = "Jeton Expo de l'appareil, enregistré à la connexion. Rattaché au compte courant.")
    public ResponseEntity<Void> enregistrer(@Valid @RequestBody EnregistrementAppareil requete,
                                            @AuthenticationPrincipal UserDetailsImpl moi) {
        push.enregistrer(moi.getId(), requete.jeton(), requete.plateforme());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/push/appareils")
    @Operation(summary = "Retirer l'appareil", description = "Appelé à la déconnexion.")
    public ResponseEntity<Void> retirer(@RequestParam String jeton, @AuthenticationPrincipal UserDetailsImpl moi) {
        push.supprimer(moi.getId(), jeton);
        return ResponseEntity.noContent().build();
    }

    // ── Interrupteurs du profil ────────────────────────────────────────────

    @GetMapping("/users/me/notifications")
    @Operation(summary = "Mes interrupteurs de notifications push")
    @Transactional(readOnly = true)
    public Interrupteurs lireInterrupteurs(@AuthenticationPrincipal UserDetailsImpl moi) {
        User u = utilisateur(moi);
        return new Interrupteurs(u.isNotifMessages(), u.isNotifAlertes());
    }

    @PutMapping("/users/me/notifications")
    @Operation(summary = "Activer ou couper les notifications push",
               description = "« Nouveaux messages » et « Alertes de recherche ». Les emails transactionnels restent obligatoires.")
    @Transactional
    public Interrupteurs modifierInterrupteurs(@RequestBody Interrupteurs requete,
                                               @AuthenticationPrincipal UserDetailsImpl moi) {
        User u = utilisateur(moi);
        u.setNotifMessages(requete.messages());
        u.setNotifAlertes(requete.alertes());
        utilisateurs.save(u);
        return requete;
    }

    // ── Alertes de recherche ───────────────────────────────────────────────

    @GetMapping("/alertes")
    @Operation(summary = "Mes alertes de recherche")
    public List<AlerteResponse> listerAlertes(@AuthenticationPrincipal UserDetailsImpl moi) {
        return alertes.lister(moi.getId()).stream().map(this::vers).toList();
    }

    @PostMapping("/alertes")
    @Operation(summary = "Créer une alerte de recherche",
               description = "Enregistre les critères en cours. 10 alertes au plus par compte (409 au-delà).")
    public ResponseEntity<AlerteResponse> creerAlerte(@Valid @RequestBody AlerteRequest requete,
                                                      @AuthenticationPrincipal UserDetailsImpl moi) {
        AlerteRecherche a = alertes.creer(moi.getId(), requete.nom(), requete.criteres());
        return ResponseEntity.status(HttpStatus.CREATED).body(vers(a));
    }

    @PatchMapping("/alertes/{id}")
    @Operation(summary = "Renommer, mettre en pause ou reprendre une alerte")
    public AlerteResponse modifierAlerte(@PathVariable Long id, @Valid @RequestBody AlerteUpdate requete,
                                         @AuthenticationPrincipal UserDetailsImpl moi) {
        return vers(alertes.modifier(moi.getId(), id, requete.nom(), requete.active()));
    }

    @PostMapping("/alertes/{id}/ouverture")
    @Operation(summary = "Signaler l'ouverture d'une notification d'alerte",
               description = "Évite la mise en pause automatique après 6 mois sans ouverture.")
    public AlerteResponse ouvrirAlerte(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl moi) {
        return vers(alertes.marquerOuverte(moi.getId(), id));
    }

    @DeleteMapping("/alertes/{id}")
    @Operation(summary = "Supprimer une alerte")
    public ResponseEntity<Void> supprimerAlerte(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl moi) {
        alertes.supprimer(moi.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private AlerteResponse vers(AlerteRecherche a) {
        return new AlerteResponse(a.getId(), a.getNom(), a.isActive(), alertes.lireCriteres(a), a.getDateCreation(),
                a.getDerniereNotification(), a.getDerniereOuverture());
    }

    private User utilisateur(UserDetailsImpl moi) {
        return utilisateurs.findById(moi.getId()).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
    }
}
