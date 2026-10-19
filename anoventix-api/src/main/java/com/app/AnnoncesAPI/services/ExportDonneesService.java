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
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.AvertissementRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.HistoriqueAnnonceRepository;
import com.app.AnnoncesAPI.repositories.LicenceRepository;
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
    private final AvertissementRepository avertissementRepository;
    private final LicenceRepository licenceRepository;
    private final HistoriqueAnnonceRepository historiqueAnnonceRepository;

    public ExportDonneesService(UserRepository userRepository,
                                AnnonceRepository annonceRepository,
                                ConversationRepository conversationRepository,
                                MessageRepository messageRepository,
                                SignalementRepository signalementRepository,
                                AvertissementRepository avertissementRepository,
                                LicenceRepository licenceRepository,
                                HistoriqueAnnonceRepository historiqueAnnonceRepository) {
        this.userRepository = userRepository;
        this.annonceRepository = annonceRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.signalementRepository = signalementRepository;
        this.avertissementRepository = avertissementRepository;
        this.licenceRepository = licenceRepository;
        this.historiqueAnnonceRepository = historiqueAnnonceRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> exporter(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));

        Map<String, Object> export = new LinkedHashMap<>();
        export.put("dateExport", LocalDateTime.now());
        export.put("profil", profil(user));
        export.put("entreprise", entreprise(user));
        export.put("annonces", annonceRepository.findByOwnerId(user.getId(), Pageable.unpaged())
                .map(a -> annonce(a, user)).getContent());
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
        export.put("signalementsDeMessages", messageRepository.findBySignaleParId(user.getId()).stream()
                .map(msg -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("messageId", msg.getId());
                    m.put("motif", msg.getMotifSignalement());
                    m.put("date", msg.getDateSignalement());
                    return m;
                }).toList());
        export.put("avertissements", avertissementRepository.findByUtilisateurId(user.getId()).stream()
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", a.getDate());
                    m.put("niveau", a.getNiveau());
                    m.put("motif", a.getMotif());
                    m.put("suspensionAutomatique", a.getSuspenduAutomatiquement());
                    return m;
                }).toList());
        export.put("licences", licenceRepository.findByOwnerIdOrderByDateFinDesc(user.getId()).stream()
                .map(l -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("cle", l.getCle());
                    m.put("type", l.getType());
                    m.put("dateDebut", l.getDateDebut());
                    m.put("dateFin", l.getDateFin());
                    return m;
                }).toList());
        return export;
    }

    /** Fiche de l'entreprise : celle du professionnel, ou celle dont l'utilisateur est agent. */
    private Map<String, Object> entreprise(User user) {
        Entreprise e = user.getEntreprise();
        if (e == null) {
            return null;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("nom", e.getNom());
        m.put("description", e.getDescription());
        m.put("adresse", e.getAdresse());
        m.put("telephone", e.getTelephone());
        m.put("email", e.getEmail());
        m.put("numeroRCCM", e.getNumeroRCCM());
        m.put("active", e.getActive());
        m.put("proprietaire", e.getAnnonceurProfessionnel() != null
                && e.getAnnonceurProfessionnel().getId().equals(user.getId()));
        return m;
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
        m.put("cguAccepteesLe", user.getCguAccepteesLe());
        m.put("cguVersion", user.getCguVersion());
        m.put("typePieceIdentite", user.getTypePieceIdentite());
        m.put("numeroPieceIdentite", user.getNumeroPieceIdentite());
        m.put("statutPieceIdentite", user.getStatutPieceIdentite());
        m.put("motifRejetPieceIdentite", user.getMotifRejetPieceIdentite());
        // Le fichier de la pièce n'est pas joint à l'export (document d'identité sensible) : sa
        // présence est indiquée, et le titulaire peut le consulter dans l'application.
        m.put("pieceIdentiteFournie", user.getPieceIdentiteUrl() != null);
        m.put("selfieFourni", user.getSelfieUrl() != null);
        m.put("dateEnvoiVerification", user.getDateEnvoiVerification());
        m.put("dateDecisionVerification", user.getDateDecisionVerification());
        m.put("annoncesMasqueesParLAdministrateur", user.isAnnoncesMasquees());
        m.put("photoProfil", user.getPhotoProfil());
        m.put("entreprise", user.getEntreprise() != null ? user.getEntreprise().getNom() : null);
        return m;
    }

    private Map<String, Object> annonce(Annonce a, User user) {
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
        m.put("motifModeration", a.getMotifModeration());
        m.put("historique", historiqueAnnonceRepository.findByAnnonceId(a.getId()).stream()
                .map(h -> {
                    Map<String, Object> hm = new LinkedHashMap<>();
                    hm.put("date", h.getDateModification());
                    hm.put("champ", h.getChamp());
                    hm.put("ancienneValeur", h.getAncienneValeur());
                    hm.put("nouvelleValeur", h.getNouvelleValeur());
                    // L'identité du modérateur n'est pas une donnée de l'utilisateur.
                    hm.put("modifiePar", user.getEmail().equals(h.getModifiePar()) ? "vous" : "modération");
                    return hm;
                }).toList());
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
