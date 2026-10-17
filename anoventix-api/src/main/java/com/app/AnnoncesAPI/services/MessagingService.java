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

    ConversationDTO getConversationById(Long conversationId, Authentication authentication);

    Page<MessageDTO> getMessages(Long conversationId, Authentication authentication, Pageable pageable);

    MessageDTO sendMessage(Long conversationId, SendMessageRequest request, Authentication authentication);

    MessageDTO markMessageAsRead(Long messageId, Authentication authentication);

    void markConversationAsRead(Long conversationId, Authentication authentication);

    /** Signale un message à la modération. Seul un participant de la conversation peut signaler. */
    MessageDTO signalerMessage(Long messageId, MotifSignalementMessage motif, Authentication authentication);
}
