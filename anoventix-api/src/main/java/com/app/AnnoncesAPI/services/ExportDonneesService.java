package com.app.AnnoncesAPI.services;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.Conversation;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.SignalementRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

/**
 * Export RGPD (droit d'accès / portabilité) : toutes les données personnelles de
 * l'utilisateur connecté, en JSON. Construit avec des Map simples plutôt que les entités
 * pour ne pas exposer de champs internes (mot de passe, tokens) ni de relations cycliques.
 */
@Service
public class ExportDonneesService {

    private final UserRepository userRepository;
    private final AnnonceRepository annonceRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final SignalementRepository signalementRepository;

    public ExportDonneesService(UserRepository userRepository,
                                AnnonceRepository annonceRepository,
                                ConversationRepository conversationRepository,
                                MessageRepository messageRepository,
                                SignalementRepository signalementRepository) {
        this.userRepository = userRepository;
        this.annonceRepository = annonceRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.signalementRepository = signalementRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> exporter(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));

        Map<String, Object> export = new LinkedHashMap<>();
        export.put("dateExport", LocalDateTime.now());
        export.put("profil", profil(user));
        export.put("annonces", annonceRepository.findByOwnerId(user.getId(), Pageable.unpaged())
                .map(this::annonce).getContent());
        export.put("favoris", user.getFavoris().stream()
                .map(a -> Map.of("annonceId", a.getId(), "titre", a.getTitre()))
                .toList());
        export.put("conversations", conversationRepository.findByParticipant(user.getId(), Pageable.unpaged())
                .map(c -> conversation(c, user)).getContent());
        export.put("signalements", signalementRepository.findByReporterEmail(user.getEmail(), Pageable.unpaged())
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("annonceId", s.getAnnonce() != null ? s.getAnnonce().getId() : null);
                    m.put("motif", s.getMotif());
                    m.put("commentaire", s.getCommentaire());
                    m.put("date", s.getDate());
                    m.put("statut", s.getStatut());
                    return m;
                }).getContent());
        return export;
    }

    private Map<String, Object> profil(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("email", user.getEmail());
        m.put("nom", user.getNom());
        m.put("prenom", user.getPrenom());
        m.put("telephone", user.getTelephone());
        m.put("role", user.getRole() != null ? user.getRole().getName() : null);
        m.put("statut", user.getStatut());
        m.put("dateCreation", user.getCreatedAt());
        m.put("typePieceIdentite", user.getTypePieceIdentite());
        m.put("numeroPieceIdentite", user.getNumeroPieceIdentite());
        m.put("statutPieceIdentite", user.getStatutPieceIdentite());
        m.put("photoProfil", user.getPhotoProfil());
        m.put("entreprise", user.getEntreprise() != null ? user.getEntreprise().getNom() : null);
        return m;
    }

    private Map<String, Object> annonce(Annonce a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("reference", a.getReferenceAnnonce());
        m.put("titre", a.getTitre());
        m.put("description", a.getDescription());
        m.put("prix", a.getPrix());
        m.put("typeAnnonce", a.getTypeAnnonce());
        m.put("typeBien", a.getTypeBien());
        m.put("dateCreation", a.getDateCreation());
        m.put("actif", a.getActif());
        m.put("statutModeration", a.getStatutModeration());
        m.put("photos", a.getMedias() == null ? List.of()
                : a.getMedias().stream().map(md -> md.getUrl()).toList());
        return m;
    }

    private Map<String, Object> conversation(Conversation c, User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("annonceId", c.getAnnonce() != null ? c.getAnnonce().getId() : null);
        m.put("dateCreation", c.getCreatedAt());
        m.put("messages", messageRepository.findByConversationId(c.getId(), Pageable.unpaged())
                .map(msg -> {
                    Map<String, Object> mm = new LinkedHashMap<>();
                    mm.put("date", msg.getCreatedAt());
                    mm.put("deMoi", msg.getSender().getId().equals(user.getId()));
                    mm.put("contenu", Boolean.TRUE.equals(msg.getSupprime())
                            ? "[Message supprimé par la modération]" : msg.getContent());
                    return mm;
                }).getContent());
        return m;
    }
}
