package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Conversation;
import com.app.AnnoncesAPI.entities.Message;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.EtatConversation;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;

/**
 * Retrait d'un agent (DEC-34) : toutes ses annonces, en ligne ou non, et ses conversations passent au
 * professionnel de l'entreprise. L'acheteur continue l'échange avec l'agence ; un message l'informe du changement
 * d'interlocuteur.
 */
@Service
public class TransfertAgentService {

    private static final Logger logger = LoggerFactory.getLogger(TransfertAgentService.class);

    private final BienImmoRepository bienImmoRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public TransfertAgentService(BienImmoRepository bienImmoRepository, ConversationRepository conversationRepository,
                                 MessageRepository messageRepository) {
        this.bienImmoRepository = bienImmoRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    /** À appeler dans la transaction du retrait. Renvoie {annonces transférées, conversations transférées}. */
    @Transactional(propagation = Propagation.MANDATORY)
    public int[] transferer(User agent, User professionnel, String nomEntreprise) {
        List<BienImmo> annonces = bienImmoRepository.findAllByOwnerId(agent.getId());
        annonces.forEach(a -> a.setOwner(professionnel));
        bienImmoRepository.saveAll(annonces);

        int conversations = 0;
        for (Conversation c : conversationRepository.findAllByParticipant(agent.getId())) {
            boolean agentEstUn = c.getParticipantOne().getId().equals(agent.getId());
            User autre = agentEstUn ? c.getParticipantTwo() : c.getParticipantOne();
            Long annonceId = c.getAnnonce() != null ? c.getAnnonce().getId() : null;
            // Échange entre l'agent et son professionnel, ou conversation déjà ouverte avec l'agence : rien à reprendre.
            if (autre.getId().equals(professionnel.getId())
                    || conversationRepository.findExistingConversation(annonceId, professionnel.getId(), autre.getId()).isPresent()) {
                continue;
            }
            if (agentEstUn) {
                c.setParticipantOne(professionnel);
                c.setEtatParticipantOne(EtatConversation.ACTIVE);
            } else {
                c.setParticipantTwo(professionnel);
                c.setEtatParticipantTwo(EtatConversation.ACTIVE);
            }
            if (c.getCreatedBy() != null && c.getCreatedBy().getId().equals(agent.getId())) {
                c.setCreatedBy(professionnel);
            }
            conversationRepository.save(c);

            Message info = new Message();
            info.setConversation(c);
            info.setSender(professionnel);
            info.setContent("Votre interlocuteur a changé : l'agence " + nomEntreprise
                    + " reprend cet échange et vous répondra désormais.");
            info.setCreatedAt(LocalDateTime.now());
            messageRepository.save(info);
            c.setLastMessageAt(info.getCreatedAt());
            conversations++;
        }
        logger.info("Retrait de l'agent {} : {} annonce(s) et {} conversation(s) reprises par {}",
                agent.getId(), annonces.size(), conversations, professionnel.getId());
        return new int[] { annonces.size(), conversations };
    }
}
