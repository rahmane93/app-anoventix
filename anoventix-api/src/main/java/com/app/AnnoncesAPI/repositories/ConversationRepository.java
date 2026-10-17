package com.app.AnnoncesAPI.repositories;

import com.app.AnnoncesAPI.entities.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("""
            SELECT c FROM Conversation c
            WHERE c.annonce.id = :annonceId
              AND ((c.participantOne.id = :userOneId AND c.participantTwo.id = :userTwoId)
                OR (c.participantOne.id = :userTwoId AND c.participantTwo.id = :userOneId))
            """)
    Optional<Conversation> findExistingConversation(
            @Param("annonceId") Long annonceId,
            @Param("userOneId") UUID userOneId,
            @Param("userTwoId") UUID userTwoId);

    @Query("""
            SELECT c FROM Conversation c
            WHERE c.participantOne.id = :userId OR c.participantTwo.id = :userId
            """)
    Page<Conversation> findByParticipant(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
            SELECT c FROM Conversation c
            WHERE c.id = :conversationId
              AND (c.participantOne.id = :userId OR c.participantTwo.id = :userId)
            """)
    Optional<Conversation> findByIdForParticipant(@Param("conversationId") Long conversationId,
                                                  @Param("userId") UUID userId);

    @Query("""
            SELECT COUNT(c) > 0 FROM Conversation c
            WHERE (c.participantOne.id = :userOneId AND c.participantTwo.id = :userTwoId)
               OR (c.participantOne.id = :userTwoId AND c.participantTwo.id = :userOneId)
            """)
    boolean existsBetweenUsers(@Param("userOneId") UUID userOneId, @Param("userTwoId") UUID userTwoId);

    @Query("SELECT COUNT(c) FROM Conversation c WHERE c.participantOne.id = :userId OR c.participantTwo.id = :userId")
    long countByParticipant(@Param("userId") UUID userId);

    @Query("SELECT COUNT(c) FROM Conversation c WHERE c.annonce.owner.id = :userId")
    long countConversationsAsOwner(@Param("userId") UUID userId);

    @Query(value = """
            SELECT COUNT(DISTINCT c.id) FROM conversation c
            WHERE c.annonce_id IN (SELECT a.id FROM annonce a WHERE a.owner_id = :userId AND a.actif = true)
              AND EXISTS (SELECT 1 FROM message m WHERE m.conversation_id = c.id AND m.sender_id = :userId)
            """, nativeQuery = true)
    long countConversationsWithUserReply(@Param("userId") UUID userId);
}
