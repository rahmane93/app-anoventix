package com.app.AnnoncesAPI.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import com.app.AnnoncesAPI.entities.Conversation;
import com.app.AnnoncesAPI.entities.Message;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.MotifSignalementMessage;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

/** Signalement d'un message : le motif, la date et le signaleur sont enregistrés. */
class SignalementMessageTest {

    private final ConversationRepository conversationRepo = mock(ConversationRepository.class);
    private final MessageRepository messageRepo = mock(MessageRepository.class);
    private final UserRepository userRepo = mock(UserRepository.class);
    private final MessagingServiceImpl service = new MessagingServiceImpl(
            conversationRepo, messageRepo, mock(AnnonceRepository.class), userRepo);

    private User signaleur;
    private User expediteur;
    private Message message;
    private Authentication auth;

    @BeforeEach
    void setUp() {
        signaleur = user();
        expediteur = user();

        Conversation conversation = new Conversation();
        conversation.setId(10L);

        message = new Message();
        message.setId(1L);
        message.setConversation(conversation);
        message.setSender(expediteur);
        message.setContent("Envoyez l'acompte par transfert");

        when(userRepo.findById(signaleur.getId())).thenReturn(Optional.of(signaleur));
        when(messageRepo.findById(1L)).thenReturn(Optional.of(message));
        when(conversationRepo.findByIdForParticipant(10L, signaleur.getId())).thenReturn(Optional.of(conversation));
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn(new UserDetailsImpl(
                signaleur.getId(), "signaleur@test.gn", "x", StatutUtilisateur.ACTIF, false, List.of()));
    }

    private static User user() {
        User u = new User();
        u.setId(UUID.randomUUID());
        return u;
    }

    @Test
    void enregistreMotifDateEtSignaleur() {
        service.signalerMessage(1L, MotifSignalementMessage.ARNAQUE, auth);

        assertTrue(message.getSignale());
        assertEquals(MotifSignalementMessage.ARNAQUE, message.getMotifSignalement());
        assertNotNull(message.getDateSignalement());
        assertEquals(signaleur, message.getSignalePar());
    }

    @Test
    void accepteUnSignalementSansMotifDesAnciennesVersions() {
        service.signalerMessage(1L, null, auth);

        assertTrue(message.getSignale());
        assertEquals(signaleur, message.getSignalePar());
    }

    @Test
    void refuseUnDeuxiemeSignalement() {
        message.setSignale(true);

        assertThrows(IllegalArgumentException.class,
                () -> service.signalerMessage(1L, MotifSignalementMessage.SPAM, auth));
        verify(messageRepo, never()).save(any());
    }
}
