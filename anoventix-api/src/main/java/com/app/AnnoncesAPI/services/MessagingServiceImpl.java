package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.dto.ConversationDTO;
import com.app.AnnoncesAPI.dto.MessageDTO;
import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.Conversation;
import com.app.AnnoncesAPI.entities.Message;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.MotifSignalementMessage;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.exceptions.UnauthorizedActionException;
import com.app.AnnoncesAPI.payload.request.CreateConversationRequest;
import com.app.AnnoncesAPI.payload.request.SendMessageRequest;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Transactional
public class MessagingServiceImpl implements MessagingService {

    private static final Logger logger = LoggerFactory.getLogger(MessagingServiceImpl.class);

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AnnonceRepository annonceRepository;
    private final UserRepository userRepository;

    public MessagingServiceImpl(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            AnnonceRepository annonceRepository,
            UserRepository userRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.annonceRepository = annonceRepository;
        this.userRepository = userRepository;
    }

    @Override
    public ConversationDTO createOrGetConversation(CreateConversationRequest request, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        // Nouvelle conversation : uniquement sur une annonce visible du public. Les
        // conversations déjà ouvertes restent accessibles depuis la messagerie.
        Annonce annonce = annonceRepository.findById(request.getAnnonceId())
                .filter(Annonce::estVisiblePubliquement)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Annonce introuvable ou inactive avec l'ID: " + request.getAnnonceId()));

        User otherParticipant = annonce.getOwner();
        if (otherParticipant == null) {
            throw new IllegalStateException("Cette annonce n'a pas de propriétaire associé");
        }
        if (otherParticipant.getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Vous ne pouvez pas démarrer une conversation sur votre propre annonce");
        }
        if (otherParticipant.getStatut() != StatutUtilisateur.ACTIF) {
            throw new IllegalStateException("Impossible de contacter ce vendeur : son compte n'est pas actif.");
        }

        Conversation existing = conversationRepository.findExistingConversation(
                        annonce.getId(), currentUser.getId(), otherParticipant.getId())
                .orElse(null);
        if (existing != null) {
            return toConversationDTO(existing, currentUser.getId());
        }

        Conversation conversation = new Conversation();
        conversation.setAnnonce(annonce);
        conversation.setCreatedBy(currentUser);
        conversation.setActive(true);

        if (isFirstUserBeforeSecond(currentUser.getId(), otherParticipant.getId())) {
            conversation.setParticipantOne(currentUser);
            conversation.setParticipantTwo(otherParticipant);
        } else {
            conversation.setParticipantOne(otherParticipant);
            conversation.setParticipantTwo(currentUser);
        }

        Conversation saved = conversationRepository.save(conversation);
        logger.info("Conversation {} créée pour l'annonce {} entre {} et {}",
                saved.getId(), annonce.getId(), currentUser.getEmail(), otherParticipant.getEmail());
        return toConversationDTO(saved, currentUser.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ConversationDTO> getMyConversations(Authentication authentication, Pageable pageable) {
        User currentUser = getCurrentUser(authentication);
        return conversationRepository.findByParticipant(currentUser.getId(), pageable)
                .map(conversation -> toConversationDTO(conversation, currentUser.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationDTO getConversationById(Long conversationId, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Conversation conversation = getConversationForParticipant(conversationId, currentUser.getId());
        return toConversationDTO(conversation, currentUser.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MessageDTO> getMessages(Long conversationId, Authentication authentication, Pageable pageable) {
        User currentUser = getCurrentUser(authentication);
        Conversation conversation = getConversationForParticipant(conversationId, currentUser.getId());
        return messageRepository.findByConversationId(conversation.getId(), pageable)
                .map(message -> toMessageDTO(message, currentUser.getId()));
    }

    @Override
    public MessageDTO sendMessage(Long conversationId, SendMessageRequest request, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Conversation conversation = getConversationForParticipant(conversationId, currentUser.getId());

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(currentUser);
        message.setContent(request.getContent().trim());

        Message saved = messageRepository.save(message);
        conversation.setLastMessageAt(saved.getCreatedAt());
        conversation.setUpdatedAt(saved.getCreatedAt());
        conversationRepository.save(conversation);

        logger.info("Message {} envoyé dans la conversation {} par {}",
                saved.getId(), conversationId, currentUser.getEmail());
        return toMessageDTO(saved, currentUser.getId());
    }

    @Override
    public MessageDTO markMessageAsRead(Long messageId, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message non trouvé avec l'ID: " + messageId));

        Conversation conversation = getConversationForParticipant(message.getConversation().getId(), currentUser.getId());
        if (message.getSender().getId().equals(currentUser.getId())) {
            return toMessageDTO(message, currentUser.getId());
        }
        if (message.getReadAt() == null) {
            message.setReadAt(LocalDateTime.now());
            messageRepository.save(message);
        }
        return toMessageDTO(message, currentUser.getId());
    }

    @Override
    public void markConversationAsRead(Long conversationId, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Conversation conversation = getConversationForParticipant(conversationId, currentUser.getId());

        messageRepository.markConversationAsRead(conversation.getId(), currentUser.getId(), LocalDateTime.now());
    }

    @Override
    public MessageDTO signalerMessage(Long messageId, MotifSignalementMessage motif, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message non trouvé avec l'ID: " + messageId));

        // Seul un participant de la conversation peut signaler
        getConversationForParticipant(message.getConversation().getId(), currentUser.getId());

        if (message.getSender().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Vous ne pouvez pas signaler votre propre message.");
        }
        if (Boolean.TRUE.equals(message.getSignale())) {
            throw new IllegalArgumentException("Ce message a déjà été signalé.");
        }

        message.setSignale(true);
        message.setMotifSignalement(motif);
        message.setDateSignalement(LocalDateTime.now());
        message.setSignalePar(currentUser);
        return toMessageDTO(messageRepository.save(message), currentUser.getId());
    }

    private Conversation getConversationForParticipant(Long conversationId, UUID userId) {
        return conversationRepository.findByIdForParticipant(conversationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Conversation introuvable avec l'ID: " + conversationId));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedActionException("Authentification requise");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetailsImpl userDetails) {
            return userRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
    }

    private ConversationDTO toConversationDTO(Conversation conversation, UUID currentUserId) {
        User otherParticipant = getOtherParticipant(conversation, currentUserId);
        Message lastMessage = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conversation.getId()).orElse(null);
        long unreadCount = messageRepository.countByConversationIdAndSenderIdNotAndReadAtIsNull(conversation.getId(), currentUserId);

        return ConversationDTO.builder()
                .id(conversation.getId())
                .annonceId(conversation.getAnnonce().getId())
                .annonceReference(conversation.getAnnonce().getReferenceAnnonce())
                .annonceTitre(conversation.getAnnonce().getTitre())
                .annonceActive(conversation.getAnnonce().getActif())
                .otherParticipantId(otherParticipant.getId())
                // Email volontairement non exposé : n'importe quel inscrit peut ouvrir une
                // conversation sur une annonce, il récupérerait l'email du vendeur.
                .otherParticipantUsername(null)
                .otherParticipantNomComplet(buildFullName(otherParticipant))
                .otherParticipantPhotoProfil(otherParticipant.getPhotoProfil())
                .createdById(conversation.getCreatedBy().getId())
                .lastMessagePreview(lastMessage != null ? truncate(displayedContent(lastMessage), 120) : null)
                .unreadCount(unreadCount)
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .lastMessageAt(conversation.getLastMessageAt())
                .build();
    }

    private static final String MSG_SUPPRIME = "[Message supprimé par la modération]";

    private MessageDTO toMessageDTO(Message message, UUID currentUserId) {
        String content = displayedContent(message);
        return MessageDTO.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSender().getId())
                .senderUsername(null) // email non exposé aux participants
                .senderNomComplet(buildFullName(message.getSender()))
                .senderPhotoProfil(message.getSender().getPhotoProfil())
                .content(content)
                .createdAt(message.getCreatedAt())
                .readAt(message.getReadAt())
                .mine(message.getSender().getId().equals(currentUserId))
                .supprime(message.getSupprime())
                .signale(message.getSignale())
                .build();
    }

    /** Contenu affichable : un message supprimé par la modération n'est jamais renvoyé. */
    private static String displayedContent(Message message) {
        return Boolean.TRUE.equals(message.getSupprime()) ? MSG_SUPPRIME : message.getContent();
    }

    private User getOtherParticipant(Conversation conversation, UUID currentUserId) {
        if (conversation.getParticipantOne().getId().equals(currentUserId)) {
            return conversation.getParticipantTwo();
        }
        return conversation.getParticipantOne();
    }

    private boolean isFirstUserBeforeSecond(UUID firstUserId, UUID secondUserId) {
        return firstUserId.toString().compareTo(secondUserId.toString()) <= 0;
    }

    private String buildFullName(User user) {
        String prenom = user.getPrenom() == null ? "" : user.getPrenom().trim();
        String nom = user.getNom() == null ? "" : user.getNom().trim();
        String fullName = (prenom + " " + nom).trim();
        return fullName.isBlank() ? "Utilisateur" : fullName;
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength - 3) + "...";
    }
}
