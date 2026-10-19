package com.app.AnnoncesAPI.controllers;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.app.AnnoncesAPI.payload.response.PageResponse;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.AnnoncesAPI.dto.AdminAnnonceDTO;
import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.UserDTO;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.ActionAudit.CibleAudit;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.StatutSignalement;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.payload.request.AvertissementRequest;
import com.app.AnnoncesAPI.payload.request.TraiterSignalementRequest;
import com.app.AnnoncesAPI.payload.response.AdminStatsAvanceesResponse;
import com.app.AnnoncesAPI.payload.response.AdminStatsResponse;
import com.app.AnnoncesAPI.payload.response.AuditEventResponse;
import com.app.AnnoncesAPI.payload.response.AvertissementResponse;
import com.app.AnnoncesAPI.payload.response.MessageModerationResponse;
import com.app.AnnoncesAPI.payload.response.MessageResponse;
import com.app.AnnoncesAPI.payload.response.SignalementResponse;
import com.app.AnnoncesAPI.services.AdminService;
import com.app.AnnoncesAPI.services.AuditService;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * Controller d'administration : statistiques globales et gestion des signalements.
 * Tous les endpoints nécessitent le rôle ADMINISTRATEUR ou MODERATEUR.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMINISTRATEUR') or hasRole('MODERATEUR')")
@Tag(name = "Administration", description = "Statistiques globales et gestion des signalements")
public class AdminController {

    private static final int MAX_PAGE_SIZE = 50;
    private static final Set<String> SORTABLE_FIELDS =
            Set.of("dateCreation", "prix", "titre", "statutModeration");

    private final AdminService adminService;
    private final AuditService auditService;
    private final com.app.AnnoncesAPI.services.VerificationEntrepriseService verificationEntreprises;
    private final com.app.AnnoncesAPI.services.ModerationAnnonceService moderationAnnonceService;

    public AdminController(AdminService adminService, AuditService auditService,
                           com.app.AnnoncesAPI.services.VerificationEntrepriseService verificationEntreprises,
                           com.app.AnnoncesAPI.services.ModerationAnnonceService moderationAnnonceService) {
        this.adminService = adminService;
        this.moderationAnnonceService = moderationAnnonceService;
        this.auditService = auditService;
        this.verificationEntreprises = verificationEntreprises;
    }

    @GetMapping("/entreprises/a-verifier")
    @Operation(summary = "File des entreprises à vérifier",
               description = "Entreprises dont le justificatif RCCM attend une décision, des plus anciennes aux plus récentes.")
    public ResponseEntity<PageResponse<com.app.AnnoncesAPI.dto.EntrepriseDTO>> getEntreprisesAVerifier(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(PageResponse.of(verificationEntreprises.aVerifier(pageable)));
    }

    @PutMapping("/entreprises/{id}/verification")
    @Operation(summary = "Vérifier ou refuser une entreprise",
               description = "VERIFIEE : badge « Agence vérifiée », nom et RCCM figés. REJETEE : motif obligatoire, "
                           + "communiqué au propriétaire. Un email part dans les deux cas.")
    public ResponseEntity<com.app.AnnoncesAPI.dto.EntrepriseDTO> deciderVerificationEntreprise(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody com.app.AnnoncesAPI.payload.request.DecisionVerificationEntrepriseRequest request,
            org.springframework.security.core.Authentication authentication) {
        return ResponseEntity.ok(verificationEntreprises.decider(id, request, authentication));
    }

    @GetMapping("/annonces")
    @Operation(summary = "Lister toutes les annonces",
               description = "Retourne toutes les annonces. Filtres optionnels : statut (PUBLIEE, MASQUEE, REJETEE, DESACTIVEE), "
                           + "cloturee (true / false) et q (titre, référence, email / nom du propriétaire). Réservé aux ADMIN/MOD.")
    public ResponseEntity<PageResponse<AdminAnnonceDTO>> getAllAnnonces(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "dateCreation") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) StatutAnnonce statut,
            @RequestParam(required = false) Boolean cloturee,
            @RequestParam(required = false) String q) {
        size = Math.min(size, MAX_PAGE_SIZE);
        Sort.Direction sortDir = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        String safeSort = SORTABLE_FIELDS.contains(sort) ? sort : "dateCreation";
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDir, safeSort));
        return ResponseEntity.ok(PageResponse.of(adminService.getAllAnnonces(statut, cloturee, q, pageable)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Tableau de bord — statistiques générales",
               description = "Retourne les compteurs globaux : utilisateurs, annonces, signalements, entreprises.")
    public ResponseEntity<AdminStatsResponse> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @GetMapping("/signalements")
    @Operation(summary = "Lister les signalements",
               description = "Retourne les signalements avec filtre optionnel par statut (EN_ATTENTE, TRAITE, IGNORE).")
    public ResponseEntity<PageResponse<SignalementResponse>> getSignalements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) StatutSignalement statut) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(PageResponse.of(adminService.getSignalements(statut, pageable)));
    }

    @PutMapping("/signalements/{id}/traiter")
    @Operation(summary = "Traiter un signalement",
               description = "Passe un signalement de EN_ATTENTE à TRAITE ou IGNORE.")
    public ResponseEntity<SignalementResponse> traiterSignalement(
            @PathVariable Long id,
            @Valid @RequestBody TraiterSignalementRequest request,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        return ResponseEntity.ok(adminService.traiterSignalement(id, request, currentAdmin.getUsername()));
    }

    @PutMapping("/signalements/{id}/decision")
    @Operation(summary = "Décider d'un signalement",
               description = "Masque, rejette ou remet l'annonce en ligne, ou classe le signalement sans suite. La décision sur "
                       + "l'annonce et la clôture de tous ses signalements en attente se font en une seule opération. Le motif "
                       + "est obligatoire pour masquer ou rejeter.")
    public ResponseEntity<SignalementResponse> deciderSignalement(
            @PathVariable Long id,
            @Valid @RequestBody com.app.AnnoncesAPI.payload.request.DecisionSignalementRequest request,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        return ResponseEntity.ok(adminService.deciderSignalement(id, request, currentAdmin.getUsername()));
    }

    @GetMapping("/reexamens")
    @Operation(summary = "File des réexamens",
               description = "Annonces masquées dont le propriétaire a demandé un réexamen, de la plus ancienne à la plus récente.")
    public ResponseEntity<PageResponse<com.app.AnnoncesAPI.dto.AdminAnnonceDTO>> getReexamens(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(PageResponse.of(adminService.getReexamens(pageable)));
    }

    @DeleteMapping("/signalements/{id}")
    @Operation(summary = "Supprimer un signalement",
               description = "Supprime définitivement un signalement. Réservé à l'ADMIN et au MODÉRATEUR.")
    public ResponseEntity<Void> supprimerSignalement(@PathVariable Long id) {
        adminService.supprimerSignalement(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Modération des annonces ──────────────────────────────────────────

    @GetMapping("/pieces-identite/en-attente")
    @Operation(summary = "Lister les pièces d'identité en attente",
               description = "Retourne les utilisateurs dont la pièce d'identité est en attente de validation.")
    public ResponseEntity<PageResponse<UserDTO>> getPiecesIdentiteEnAttente(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(PageResponse.of(adminService.getPiecesIdentiteEnAttente(pageable)));
    }

    @GetMapping("/utilisateurs")
    @Operation(summary = "Rechercher des utilisateurs",
               description = "Recherche paginée par username, email, nom, prénom ou téléphone, avec filtre optionnel par statut. "
                           + "L'admin appelant est exclu des résultats.")
    public ResponseEntity<PageResponse<UserDTO>> rechercherUtilisateurs(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) StatutUtilisateur statut,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetailsImpl currentUser) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(PageResponse.of(adminService.rechercherUtilisateurs(search, statut, pageable, currentUser.getId())));
    }

    @PutMapping("/annonces/{id}/masquer")
    @Operation(summary = "Masquer une annonce",
               description = "Rend une annonce invisible temporairement. Le motif (500 car. max) est affiché au propriétaire et enregistré dans l'historique.")
    public ResponseEntity<MessageResponse> masquerAnnonce(
            @PathVariable Long id,
            @RequestParam(defaultValue = "Non conforme aux règles de la plateforme") String raison,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        adminService.masquerAnnonce(id, raison, currentAdmin.getUsername());
        return ResponseEntity.ok(new MessageResponse("Annonce masquée avec succès."));
    }

    @PutMapping("/annonces/{id}/rejeter")
    @Operation(summary = "Rejeter une annonce",
               description = "Rejette définitivement une annonce. Le motif (500 car. max) est affiché au propriétaire et enregistré dans l'historique.")
    public ResponseEntity<MessageResponse> rejeterAnnonce(
            @PathVariable Long id,
            @RequestParam(defaultValue = "Contenu non autorisé") String raison,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        adminService.rejeterAnnonce(id, raison, currentAdmin.getUsername());
        return ResponseEntity.ok(new MessageResponse("Annonce rejetée."));
    }

    @PutMapping("/annonces/{id}/publier")
    @Operation(summary = "Remettre une annonce en ligne",
               description = "Remet une annonce masquée en ligne. Une annonce rejetée ne peut pas être remise en ligne (409). L'action est enregistrée dans l'historique.")
    public ResponseEntity<MessageResponse> publierAnnonce(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        adminService.publierAnnonce(id, currentAdmin.getUsername());
        return ResponseEntity.ok(new MessageResponse("Annonce remise en ligne."));
    }

    @PutMapping("/utilisateurs/{userId}/annonces/masquer")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Masquer toutes les annonces d'un compte (masquage système)",
               description = "Retire toutes les annonces de ce compte (pas celles des autres membres de son entreprise) des vues "
                           + "publiques, sans modifier les annonces elles-mêmes. Publication et modification sont suspendues pour "
                           + "le propriétaire. Le motif (500 car. max) lui est affiché et envoyé par email.")
    public ResponseEntity<MessageResponse> masquerAnnoncesCompte(
            @PathVariable UUID userId,
            @RequestParam String raison,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        int n = adminService.masquerAnnoncesCompte(userId, raison, currentAdmin.getUsername());
        return ResponseEntity.ok(new MessageResponse("Annonces du compte masquées (" + n + " annonce(s) visible(s) retirée(s) du public)."));
    }

    @PutMapping("/utilisateurs/{userId}/annonces/afficher")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "[Admin] Lever le masquage système des annonces d'un compte",
               description = "Chaque annonce retrouve exactement sa visibilité antérieure (celles masquées ou clôturées "
                           + "par le propriétaire restent hors ligne).")
    public ResponseEntity<MessageResponse> afficherAnnoncesCompte(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        int n = adminService.afficherAnnoncesCompte(userId, currentAdmin.getUsername());
        return ResponseEntity.ok(new MessageResponse("Annonces du compte réaffichées (" + n + " annonce(s) de nouveau visible(s))."));
    }

    // ─── Statistiques avancées ────────────────────────────────────────────

    @GetMapping("/stats/avancees")
    @Operation(summary = "Statistiques avancées",
               description = "Évolution mensuelle des annonces (12 mois), répartition par région, par type de bien et par type d'annonce.")
    public ResponseEntity<AdminStatsAvanceesResponse> getStatsAvancees() {
        return ResponseEntity.ok(adminService.getStatsAvancees());
    }

    // ─── Avertissements ───────────────────────────────────────────────────

    @PostMapping("/utilisateurs/{userId}/avertissements")
    @Operation(summary = "Émettre un avertissement",
               description = "Émet un avertissement et prévient le titulaire par email. Sans niveau choisi, il suit le rang "
                           + "parmi les avertissements en vigueur (6 mois, non levés) : LÉGER, MODÉRÉ, puis GRAVE. "
                           + "Un avertissement GRAVE suspend le compte.")
    public ResponseEntity<AvertissementResponse> emettreAvertissement(
            @PathVariable UUID userId,
            @Valid @RequestBody AvertissementRequest request,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(adminService.emettreAvertissement(userId, request, currentAdmin.getUsername(), currentAdmin.getId()));
    }

    @GetMapping("/utilisateurs/{userId}/avertissements")
    @Operation(summary = "Historique des avertissements d'un utilisateur")
    public ResponseEntity<List<AvertissementResponse>> getAvertissements(@PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.getAvertissements(userId));
    }

    @PostMapping("/utilisateurs/{userId}/avertissements/{avertissementId}/lever")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Lever un avertissement (administrateur)",
               description = "Annule un avertissement émis par erreur : il ne compte plus, reste dans l'historique et le "
                           + "journal d'audit. Une suspension éventuelle n'est pas levée.")
    public ResponseEntity<AvertissementResponse> leverAvertissement(
            @PathVariable UUID userId,
            @PathVariable Long avertissementId,
            @Valid @RequestBody com.app.AnnoncesAPI.payload.request.LeveeAvertissementRequest request,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        return ResponseEntity.ok(adminService.leverAvertissement(userId, avertissementId, request.getMotif(),
                currentAdmin.getUsername()));
    }

    // ─── Modération des messages ──────────────────────────────────────────

    @GetMapping("/messages/signales")
    @Operation(summary = "Messages signalés",
               description = "Liste paginée des messages signalés par les utilisateurs, en attente de modération.")
    public ResponseEntity<PageResponse<MessageModerationResponse>> getMessagesSignales(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(PageResponse.of(adminService.getMessagesSignales(pageable)));
    }

    @PutMapping("/messages/{messageId}/supprimer")
    @Operation(summary = "Supprimer un message",
               description = "Remplace le contenu du message par '[Message supprimé par la modération]'.")
    public ResponseEntity<MessageModerationResponse> supprimerMessage(
            @PathVariable Long messageId,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        return ResponseEntity.ok(adminService.supprimerMessage(messageId, currentAdmin.getUsername()));
    }

    @PutMapping("/messages/{messageId}/ignorer")
    @Operation(summary = "Ignorer un signalement de message",
               description = "Signalement infondé : le message est conservé tel quel et sort de la file de modération.")
    public ResponseEntity<MessageModerationResponse> ignorerSignalementMessage(@PathVariable Long messageId) {
        return ResponseEntity.ok(adminService.ignorerSignalementMessage(messageId));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    @Operation(summary = "Messages d'une conversation (vue admin)",
               description = "Retourne tous les messages d'une conversation, y compris les supprimés et signalés.")
    public ResponseEntity<PageResponse<MessageModerationResponse>> getMessagesConversationAdmin(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(PageResponse.of(adminService.getMessagesConversationAdmin(conversationId, pageable)));
    }

    // ─── Gestion des rôles ───────────────────────────────────────────────

    @PutMapping("/utilisateurs/{userId}/role")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Changer le rôle d'un compte",
               description = "Un compte a un seul rôle. Refusé pour soi-même, vers ADMINISTRATEUR ou AGENT_PROFESSIONNEL "
                           + "(un agent s'invite depuis son entreprise), pour un professionnel qui dirige une entreprise et "
                           + "pour un agent encore rattaché. Un modérateur promu voit ses annonces retirées du public. "
                           + "Le titulaire est prévenu par email et ses sessions sont fermées.")
    public ResponseEntity<MessageResponse> changerRole(
            @PathVariable UUID userId,
            @Valid @RequestBody com.app.AnnoncesAPI.payload.request.ChangementRoleRequest request,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        adminService.changerRole(userId, request.getRole(), currentAdmin.getId());
        return ResponseEntity.ok(new MessageResponse("Rôle modifié."));
    }

    // ─── Suppression de compte ───────────────────────────────────────────

    @DeleteMapping("/utilisateurs/{userId}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Supprimer un compte",
               description = "Supprime immédiatement un compte : annonces désactivées et photos effacées, "
                           + "favoris retirés, données personnelles anonymisées, sessions fermées. "
                           + "Un PROFESSIONNEL emporte son entreprise et tous ses agents. "
                           + "Les messages sont conservés (anonymes). "
                           + "Réservé à l'ADMINISTRATEUR ; impossible sur soi-même ou sur un autre administrateur.")
    public ResponseEntity<MessageResponse> supprimerCompte(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetailsImpl currentAdmin) {
        adminService.supprimerCompte(userId, currentAdmin.getId());
        return ResponseEntity.ok(new MessageResponse("Compte supprimé."));
    }

    // ─── Paramètres ──────────────────────────────────────────────────────

    @GetMapping("/parametres")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Paramètres de la modération",
               description = "seuilMasquageAuto : nombre de signalements « arnaque / fraude » de signaleurs distincts qui "
                           + "masquent une annonce en attendant la décision (0 = désactivé, DEC-11).")
    public ResponseEntity<java.util.Map<String, Integer>> getParametres() {
        return ResponseEntity.ok(java.util.Map.of("seuilMasquageAuto", moderationAnnonceService.getSeuilMasquageAuto()));
    }

    @PutMapping("/parametres")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Modifier les paramètres de la modération",
               description = "seuilMasquageAuto entre 0 (désactivé) et 50. La modification est journalisée.")
    public ResponseEntity<java.util.Map<String, Integer>> setParametres(
            @Valid @RequestBody com.app.AnnoncesAPI.payload.request.ParametresModerationRequest request) {
        return ResponseEntity.ok(java.util.Map.of("seuilMasquageAuto",
                moderationAnnonceService.setSeuilMasquageAuto(request.getSeuilMasquageAuto())));
    }

    // ─── Journal d'audit ─────────────────────────────────────────────────

    @GetMapping("/audit")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    @Operation(summary = "Journal d'audit",
               description = "Actions de la modération, de l'administration et du système, de la plus récente "
                           + "à la plus ancienne. Filtres facultatifs : acteurId, action, cibleType, cibleId. "
                           + "Réservé à l'ADMINISTRATEUR.")
    public ResponseEntity<PageResponse<AuditEventResponse>> getJournalAudit(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) UUID acteurId,
            @RequestParam(required = false) ActionAudit action,
            @RequestParam(required = false) CibleAudit cibleType,
            @RequestParam(required = false) String cibleId) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(PageResponse.of(
                auditService.rechercher(acteurId, action, cibleType, cibleId, pageable)
                        .map(AuditEventResponse::of)));
    }
}
