package com.app.AnnoncesAPI.repositories;

import com.app.AnnoncesAPI.entities.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByConversationId(Long conversationId, Pageable pageable);

    Optional<Message> findTopByConversationIdOrderByCreatedAtDesc(Long conversationId);

    long countByConversationIdAndSenderIdNotAndReadAtIsNull(Long conversationId, UUID senderId);

    /** Messages signalés encore à modérer, avec conversation et sender chargés (vue admin).
     *  Même périmètre que countBySignaleTrueAndSupprimeFalse (compteur du tableau de bord). */
    @Query(value = "SELECT m FROM Message m JOIN FETCH m.conversation JOIN FETCH m.sender LEFT JOIN FETCH m.signalePar "
            + "WHERE m.signale = true AND m.supprime = false ORDER BY m.createdAt DESC",
           countQuery = "SELECT COUNT(m) FROM Message m WHERE m.signale = true AND m.supprime = false")
    Page<Message> findSignalesWithDetails(Pageable pageable);

    /** Nombre de messages signalés non encore traités (signalés et non supprimés). */
    long countBySignaleTrueAndSupprimeFalse();

    /** Tous les messages d'une conversation (vue admin, sans filtre participant). */
    @Query("SELECT m FROM Message m JOIN FETCH m.sender WHERE m.conversation.id = :conversationId ORDER BY m.createdAt ASC")
    Page<Message> findByConversationIdAdmin(@Param("conversationId") Long conversationId, Pageable pageable);

    @Modifying
    @Query("""
            UPDATE Message m
            SET m.readAt = :readAt
            WHERE m.conversation.id = :conversationId
              AND m.sender.id <> :userId
              AND m.readAt IS NULL
            """)
    int markConversationAsRead(@Param("conversationId") Long conversationId,
                               @Param("userId") UUID userId,
                               @Param("readAt") LocalDateTime readAt);

    @Query("""
            SELECT COUNT(m) FROM Message m
            WHERE (m.conversation.participantOne.id = :userId OR m.conversation.participantTwo.id = :userId)
              AND m.sender.id <> :userId
              AND m.readAt IS NULL
            """)
    long countUnreadByUserId(@Param("userId") UUID userId);
}
