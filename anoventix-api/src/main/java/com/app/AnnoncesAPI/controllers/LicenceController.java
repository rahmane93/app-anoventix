package com.app.AnnoncesAPI.controllers;

import com.app.AnnoncesAPI.dto.ReglagesLicenceDTO;
import com.app.AnnoncesAPI.payload.request.ActivationLicenceRequest;
import com.app.AnnoncesAPI.payload.request.VenteLicenceRequest;
import com.app.AnnoncesAPI.payload.request.ModeLicenceRequest;
import com.app.AnnoncesAPI.payload.response.LicenceAdminResponse;
import com.app.AnnoncesAPI.payload.response.LicenceResponse;
import com.app.AnnoncesAPI.payload.response.PageResponse;
import com.app.AnnoncesAPI.services.LicenceService;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/licences")
@RequiredArgsConstructor
@Tag(name = "Licences", description = "Licence annuelle : annonces gratuites puis licence obligatoire (mode activé par l'administrateur)")
public class LicenceController {

    private static final int MAX_PAGE_SIZE = 50;

    private final LicenceService licenceService;

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('PARTICULIER', 'PROFESSIONNEL', 'AGENT_PROFESSIONNEL')")
    @Operation(summary = "Licence de l'utilisateur connecté",
               description = "Statut ACTIVE / EXPIREE / AUCUNE. Un agent voit la licence de son professionnel (partage=true). "
                           + "modeActif=false : les licences ne sont pas encore exigées.")
    public ResponseEntity<LicenceResponse> getMaLicence(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(licenceService.getMaLicence(principal.getId()));
    }

    @PostMapping("/activer")
    @PreAuthorize("hasAnyRole('PARTICULIER', 'PROFESSIONNEL')")
    @Operation(summary = "Activer une clé de licence",
               description = "Valable 1 an ; prolonge une licence encore valide. La clé doit correspondre au type de compte. "
                           + "Refusé tant que le mode licence n'est pas activé.")
    public ResponseEntity<LicenceResponse> activer(
            @Valid @RequestBody ActivationLicenceRequest request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(licenceService.activer(principal.getId(), request.getCle()));
    }

    @PostMapping("/admin/cles")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Vendre une clé de licence",
               description = "Clé nominative : l'acheteur est un compte existant (email ou téléphone), le type de licence découle de son rôle. "
                           + "Montant, moyen de paiement et référence de transaction (obligatoire sauf espèces) sont enregistrés avec "
                           + "l'administrateur et la date. L'acheteur reçoit un reçu par email et seul son compte peut activer la clé.")
    public ResponseEntity<LicenceAdminResponse> vendre(@Valid @RequestBody VenteLicenceRequest request,
                                                       @AuthenticationPrincipal UserDetailsImpl admin) {
        return ResponseEntity.ok(licenceService.vendre(admin.getUsername(), request));
    }

    @PutMapping("/admin/cles/{id}/acheteur")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Affecter un acheteur à une clé au porteur",
               description = "Pour les clés générées avant la mise en service, encore libres et sans acheteur.")
    public ResponseEntity<LicenceAdminResponse> affecterAcheteur(@PathVariable Long id,
                                                                 @Valid @RequestBody VenteLicenceRequest request,
                                                                 @AuthenticationPrincipal UserDetailsImpl admin) {
        return ResponseEntity.ok(licenceService.affecterAcheteur(admin.getUsername(), id, request));
    }

    @GetMapping("/admin/cles")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Lister les clés de licence",
               description = "statut : TOUTES (défaut), LIBRE, EN_ATTENTE, ACTIVE, EXPIREE. q : clé, email du titulaire ou de l'acheteur, "
                           + "référence de paiement. du / au : période de vente (rapprochement des encaissements).")
    public ResponseEntity<PageResponse<LicenceAdminResponse>> listerCles(
            @RequestParam(defaultValue = "TOUTES") String statut,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(licenceService.listerCles(statut, q, du, au, pageable));
    }

    @GetMapping("/admin/reglages")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Tarifs et contact de vente des licences")
    public ResponseEntity<ReglagesLicenceDTO> getReglages() {
        return ResponseEntity.ok(licenceService.getReglages());
    }

    @PutMapping("/admin/reglages")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Modifier les tarifs et le contact de vente",
               description = "Prix annuels en GNF (particulier / professionnel) et numéro affiché aux utilisateurs pour acheter une licence. "
                           + "Un champ null est effacé.")
    public ResponseEntity<ReglagesLicenceDTO> setReglages(@Valid @RequestBody ReglagesLicenceDTO reglages) {
        return ResponseEntity.ok(licenceService.setReglages(reglages));
    }

    @GetMapping("/admin/mode")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] État du mode licence", description = "dateEffet : date d'entrée en vigueur (J+30 après l'activation).")
    public ResponseEntity<Map<String, Object>> getMode() {
        return ResponseEntity.ok(etatMode());
    }

    @PutMapping("/admin/mode")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Activer / désactiver le mode licence",
               description = "Activer fixe une date d'effet à J+30 : la publication reste libre d'ici là et les comptes au-delà des annonces "
                           + "gratuites sont prévenus par email. Désactiver est immédiat.")
    public ResponseEntity<Map<String, Object>> setMode(@Valid @RequestBody ModeLicenceRequest request) {
        licenceService.setModeActif(request.getActif());
        return ResponseEntity.ok(etatMode());
    }

    private Map<String, Object> etatMode() {
        Map<String, Object> etat = new java.util.LinkedHashMap<>();
        etat.put("actif", licenceService.isModeActif());
        etat.put("dateEffet", licenceService.getDateEffet().map(LocalDate::toString).orElse(null));
        return etat;
    }
}
