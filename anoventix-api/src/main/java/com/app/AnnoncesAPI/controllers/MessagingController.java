package com.app.AnnoncesAPI.controllers;

import com.app.AnnoncesAPI.dto.ConversationDTO;
import com.app.AnnoncesAPI.dto.MessageDTO;
import com.app.AnnoncesAPI.payload.request.CreateConversationRequest;
import com.app.AnnoncesAPI.payload.request.SendMessageRequest;
import com.app.AnnoncesAPI.payload.request.SignalerMessageRequest;
import com.app.AnnoncesAPI.services.MessagingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.app.AnnoncesAPI.payload.response.PageResponse;

@RestController
@RequestMapping("/api/messagerie")
@Tag(name = "Messagerie", description = "Messagerie interne autour des annonces")
public class MessagingController {

    private static final int MAX_PAGE_SIZE = 50;
    private static final java.util.Set<String> CONV_SORT_FIELDS = java.util.Set.of("lastMessageAt", "createdAt");
    private static final java.util.Set<String> MSG_SORT_FIELDS  = java.util.Set.of("createdAt");

    private final MessagingService messagingService;

    public MessagingController(MessagingService messagingService) {
        this.messagingService = messagingService;
    }

    @PostMapping("/conversations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Créer ou récupérer une conversation",
            description = "Démarre une conversation sur une annonce active ou retourne la conversation existante")
    public ResponseEntity<ConversationDTO> createOrGetConversation(
            @Valid @RequestBody CreateConversationRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messagingService.createOrGetConversation(request, authentication));
    }

    @GetMapping("/conversations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister mes conversations")
    public ResponseEntity<PageResponse<ConversationDTO>> getMyConversations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "lastMessageAt") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(defaultValue = "ACTIVE") com.app.AnnoncesAPI.enums.EtatConversation etat,
            Authentication authentication) {
        size = Math.min(size, MAX_PAGE_SIZE);
        String safeSort = CONV_SORT_FIELDS.contains(sort) ? sort : "lastMessageAt";
        Sort.Direction sortDirection = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, safeSort));
        return ResponseEntity.ok(PageResponse.of(messagingService.getMyConversations(authentication, etat, pageable)));
    }

    @PutMapping("/conversations/{conversationId}/archiver")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Archiver une conversation", description = "Rangée à part ; un nouveau message la ramène dans la boîte.")
    public ResponseEntity<Void> archiver(@PathVariable Long conversationId, Authentication authentication) {
        messagingService.changerEtat(conversationId, com.app.AnnoncesAPI.enums.EtatConversation.ARCHIVEE, authentication);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/conversations/{conversationId}/restaurer")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Sortir une conversation des archives")
    public ResponseEntity<Void> restaurer(@PathVariable Long conversationId, Authentication authentication) {
        messagingService.changerEtat(conversationId, com.app.AnnoncesAPI.enums.EtatConversation.ACTIVE, authentication);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/conversations/{conversationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Supprimer une conversation (pour moi)",
               description = "Masquée pour moi seulement : l'interlocuteur la garde, et un nouveau message la fait réapparaître.")
    public ResponseEntity<Void> supprimer(@PathVariable Long conversationId, Authentication authentication) {
        messagingService.changerEtat(conversationId, com.app.AnnoncesAPI.enums.EtatConversation.SUPPRIMEE, authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/blocages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mes interlocuteurs bloqués")
    public ResponseEntity<java.util.List<MessagingService.UtilisateurBloque>> mesBlocages(Authentication authentication) {
        return ResponseEntity.ok(messagingService.mesBlocages(authentication));
    }

    @PostMapping("/blocages/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Bloquer un interlocuteur", description = "Plus aucun message dans un sens comme dans l'autre.")
    public ResponseEntity<Void> bloquer(@PathVariable java.util.UUID userId, Authentication authentication) {
        messagingService.bloquer(userId, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/blocages/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Débloquer un interlocuteur")
    public ResponseEntity<Void> debloquer(@PathVariable java.util.UUID userId, Authentication authentication) {
        messagingService.debloquer(userId, authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/conversations/{conversationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtenir une conversation par ID")
    public ResponseEntity<ConversationDTO> getConversationById(
            @PathVariable Long conversationId,
            Authentication authentication) {
        return ResponseEntity.ok(messagingService.getConversationById(conversationId, authentication));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lister les messages d'une conversation")
    public ResponseEntity<PageResponse<MessageDTO>> getMessages(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "asc") String direction,
            Authentication authentication) {
        size = Math.min(size, MAX_PAGE_SIZE);
        String safeSort = MSG_SORT_FIELDS.contains(sort) ? sort : "createdAt";
        Sort.Direction sortDirection = direction.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, safeSort));
        return ResponseEntity.ok(PageResponse.of(messagingService.getMessages(conversationId, authentication, pageable)));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Envoyer un message dans une conversation")
    public ResponseEntity<MessageDTO> sendMessage(
            @PathVariable Long conversationId,
            @Valid @RequestBody SendMessageRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messagingService.sendMessage(conversationId, request, authentication));
    }

    @PutMapping("/conversations/{conversationId}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Marquer une conversation comme lue")
    public ResponseEntity<Void> markConversationAsRead(
            @PathVariable Long conversationId,
            Authentication authentication) {
        messagingService.markConversationAsRead(conversationId, authentication);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/messages/{messageId}/signaler")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Signaler un message à la modération",
               description = "Seul un participant de la conversation (autre que l'expéditeur) peut signaler un message. "
                       + "Corps : { motif } (ARNAQUE, PROPOS_INSULTANTS, HARCELEMENT, SPAM, AUTRE).")
    public ResponseEntity<MessageDTO> signalerMessage(
            @PathVariable Long messageId,
            @RequestBody(required = false) SignalerMessageRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(messagingService.signalerMessage(
                messageId, request != null ? request.getMotif() : null, authentication));
    }

}
