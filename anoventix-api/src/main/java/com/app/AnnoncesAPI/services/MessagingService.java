package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.dto.ConversationDTO;
import com.app.AnnoncesAPI.dto.MessageDTO;
import com.app.AnnoncesAPI.enums.MotifSignalementMessage;
import com.app.AnnoncesAPI.payload.request.CreateConversationRequest;
import com.app.AnnoncesAPI.payload.request.SendMessageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

public interface MessagingService {

    ConversationDTO createOrGetConversation(CreateConversationRequest request, Authentication authentication);

    Page<ConversationDTO> getMyConversations(Authentication authentication, Pageable pageable);

    /** Ma boîte (ACTIVE) ou mes archives (ARCHIVEE) ; une conversation supprimée n'est jamais listée. */
    Page<ConversationDTO> getMyConversations(Authentication authentication, com.app.AnnoncesAPI.enums.EtatConversation etat,
                                             Pageable pageable);

    /** Archive, restaure ou supprime (pour moi seulement) une conversation. */
    void changerEtat(Long conversationId, com.app.AnnoncesAPI.enums.EtatConversation etat, Authentication authentication);

    /** Blocage d'un interlocuteur : plus aucun message dans un sens comme dans l'autre. */
    void bloquer(java.util.UUID userId, Authentication authentication);

    void debloquer(java.util.UUID userId, Authentication authentication);

    java.util.List<UtilisateurBloque> mesBlocages(Authentication authentication);

    record UtilisateurBloque(java.util.UUID id, String nomComplet, String photoProfil, java.time.LocalDateTime dateBlocage) {}

    ConversationDTO getConversationById(Long conversationId, Authentication authentication);

    Page<MessageDTO> getMessages(Long conversationId, Authentication authentication, Pageable pageable);

    MessageDTO sendMessage(Long conversationId, SendMessageRequest request, Authentication authentication);

    void markConversationAsRead(Long conversationId, Authentication authentication);

    /** Signale un message à la modération. Seul un participant de la conversation peut signaler. */
    MessageDTO signalerMessage(Long messageId, MotifSignalementMessage motif, Authentication authentication);
}
