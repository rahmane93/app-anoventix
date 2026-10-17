package com.app.AnnoncesAPI.services;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.UserDTO;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutSignalement;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.payload.request.TraiterSignalementRequest;
import com.app.AnnoncesAPI.payload.request.AvertissementRequest;
import com.app.AnnoncesAPI.payload.response.AdminStatsAvanceesResponse;
import com.app.AnnoncesAPI.payload.response.AdminStatsResponse;
import com.app.AnnoncesAPI.payload.response.AvertissementResponse;
import com.app.AnnoncesAPI.payload.response.HistoriqueAnnonceResponse;
import com.app.AnnoncesAPI.payload.response.MessageModerationResponse;
import com.app.AnnoncesAPI.payload.response.SignalementResponse;

public interface AdminService {

    AdminStatsResponse getStats();

    /** Liste les signalements, avec filtre optionnel par statut. */
    Page<SignalementResponse> getSignalements(StatutSignalement statut, Pageable pageable);

    /** Traite un signalement (EN_ATTENTE → TRAITE ou IGNORE). */
    SignalementResponse traiterSignalement(Long id, TraiterSignalementRequest request, String adminUsername);

    void supprimerSignalement(Long id);

    /** Masque une annonce (statut=MASQUEE) et enregistre dans l'historique. */
    void masquerAnnonce(Long id, String raison, String adminUsername);

    /** Rejette définitivement une annonce (statut=REJETEE) et enregistre dans l'historique. */
    void rejeterAnnonce(Long id, String raison, String adminUsername);

    /** Remet une annonce en ligne (statut=PUBLIEE) et enregistre dans l'historique. */
    void publierAnnonce(Long id, String adminUsername);

    /**
     * Masquage système : retire toutes les annonces du compte (ce compte seul, pas son
     * entreprise) des vues publiques via un drapeau sur le compte, sans modifier les annonces.
     * Publication et modification sont suspendues. Un email au propriétaire. Retourne le
     * nombre d'annonces qui étaient visibles.
     */
    int masquerAnnoncesCompte(UUID userId, String raison, String adminUsername);

    /**
     * Lève le masquage système : chaque annonce retrouve exactement sa visibilité antérieure.
     * Retourne le nombre d'annonces de nouveau visibles.
     */
    int afficherAnnoncesCompte(UUID userId, String adminUsername);

    /**
     * Liste les annonces pour les ADMIN/MOD. Filtres optionnels (null = ignoré) :
     * statut de modération, clôture (true = clôturées, false = non clôturées),
     * texte sur titre, référence ou propriétaire.
     */
    Page<AnnonceDTO> getAllAnnonces(StatutAnnonce statut, Boolean cloturee, String q, Pageable pageable);

    /** Retourne l'historique de modération d'une annonce. */
    List<HistoriqueAnnonceResponse> getHistoriqueAnnonce(Long annonceId);

    /** Recherche paginée d'utilisateurs par username, email, nom, prénom ou téléphone. L'admin appelant est exclu des résultats. */
    Page<UserDTO> rechercherUtilisateurs(String search, StatutUtilisateur statut, Pageable pageable, UUID adminId);

    /** Liste les utilisateurs dont la pièce d'identité est en attente de validation. */
    Page<UserDTO> getPiecesIdentiteEnAttente(Pageable pageable);

    /** Octroie un rôle à un utilisateur. Un admin ne peut pas modifier son propre rôle. */
    void octroierRole(UUID userId, TypeRole role, UUID adminId);

    /** Révoque un rôle d'un utilisateur. */
    void revoquerRole(UUID userId, TypeRole role, UUID adminId);

    // ─── Statistiques avancées ────────────────────────────────────────────

    AdminStatsAvanceesResponse getStatsAvancees();

    // ─── Avertissements gradués ───────────────────────────────────────────

    /** Émet un avertissement gradué à un utilisateur. Au 3ème : suspension automatique. Un admin ne peut pas s'émettre un avertissement à lui-même. */
    AvertissementResponse emettreAvertissement(UUID userId, AvertissementRequest request, String adminUsername, UUID adminId);

    /** Retourne l'historique des avertissements d'un utilisateur. */
    List<AvertissementResponse> getAvertissements(UUID userId);

    // ─── Modération des messages ──────────────────────────────────────────

    /** Liste paginée des messages signalés (vue admin). */
    Page<MessageModerationResponse> getMessagesSignales(Pageable pageable);

    /** Supprime le contenu d'un message (remplacé par un texte de modération). */
    MessageModerationResponse supprimerMessage(Long messageId, String adminUsername);

    /** Signalement infondé : le message reste intact et sort de la file de modération. */
    MessageModerationResponse ignorerSignalementMessage(Long messageId);

    /** Tous les messages d'une conversation, sans restriction de participant (vue admin). */
    Page<MessageModerationResponse> getMessagesConversationAdmin(Long conversationId, Pageable pageable);

    /** Supprime immédiatement un compte (et, pour un PROFESSIONNEL, son entreprise et ses agents). */
    void supprimerCompte(UUID userId, UUID adminId);
}
