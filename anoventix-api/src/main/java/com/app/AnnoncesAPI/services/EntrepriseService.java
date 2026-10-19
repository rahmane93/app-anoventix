package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.dto.AgentDTO;
import com.app.AnnoncesAPI.dto.EntrepriseDTO;
import com.app.AnnoncesAPI.payload.request.AgentRequest;
import com.app.AnnoncesAPI.payload.request.EntrepriseRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Interface du service de gestion des entreprises
 */
public interface EntrepriseService {
    
    /**
     * Crée une nouvelle entreprise pour un Annonceur Professionnel
     * 
     * @param request Les données de l'entreprise
     * @param authentication L'utilisateur authentifié (doit être PROFESSIONNEL)
     * @return L'entreprise créée
     */
    EntrepriseDTO createEntreprise(EntrepriseRequest request, Authentication authentication);
    
    /**
     * Met à jour une entreprise existante
     * 
     * @param id L'ID de l'entreprise
     * @param request Les nouvelles données
     * @param authentication L'utilisateur authentifié (propriétaire)
     * @return L'entreprise mise à jour
     */
    EntrepriseDTO updateEntreprise(UUID id, EntrepriseRequest request, Authentication authentication);
    
    /**
     * Récupère une entreprise par son ID
     * 
     * @param id L'ID de l'entreprise
     * @return L'entreprise trouvée
     */
    EntrepriseDTO getEntrepriseById(UUID id, Authentication authentication);
    
    /**
     * Récupère l'entreprise d'un utilisateur
     * 
     * @param userId L'ID de l'utilisateur
     * @return L'entreprise de l'utilisateur
     */
    EntrepriseDTO getEntrepriseByUser(UUID userId, Authentication authentication);
    
    /**
     * Récupère toutes les entreprises (actives et inactives).
     * Réservé à l'administration : le filtrage actif/inactif se fait côté client.
     *
     * @return La liste de toutes les entreprises
     */
    Page<EntrepriseDTO> getAllEntreprises(Pageable pageable);

    /**
     * Upload une photo de profil pour une entreprise.
     *
     * @param id L'ID de l'entreprise
     * @param file Le fichier image (multipart)
     * @param authentication L'utilisateur authentifié (propriétaire)
     * @return L'entreprise mise à jour
     */
    EntrepriseDTO uploadPhoto(UUID id, MultipartFile file, Authentication authentication);
    
    /**
     * Crée un nouvel agent et le rattache à une entreprise
     * Seul le PROFESSIONNEL propriétaire de l'entreprise peut créer des agents
     * 
     * @param entrepriseId L'ID de l'entreprise
     * @param request Les données de l'agent à créer
     * @param authentication L'utilisateur authentifié (propriétaire)
     * @return L'agent créé
     */
    AgentDTO createAgentForEntreprise(UUID entrepriseId, AgentRequest request, Authentication authentication);

    /**
     * Récupère la liste des agents d'une entreprise.
     *
     * @param entrepriseId L'ID de l'entreprise
     * @param authentication L'utilisateur courant (membre de l'entreprise ou ADMIN/MOD)
     * @return La liste des agents
     */
    List<AgentDTO> getAgentsByEntreprise(UUID entrepriseId, Authentication authentication);

    /**
     * Retire un agent d'une entreprise
     * 
     * @param entrepriseId L'ID de l'entreprise
     * @param agentId L'ID de l'agent
     * @param authentication L'utilisateur authentifié (propriétaire)
     */
    void removeAgentFromEntreprise(UUID entrepriseId, UUID agentId, Authentication authentication);

    /**
     * Suspend un agent de l'entreprise.
     * Seul l'annonceurProfessionnel de l'entreprise ou le créateur de l'agent peut effectuer cette action.
     */
    AgentDTO suspendreAgent(UUID entrepriseId, UUID agentId, Authentication authentication);

    /**
     * Réactive un agent suspendu ou inactif.
     * Seul l'annonceurProfessionnel de l'entreprise ou le créateur de l'agent peut effectuer cette action.
     */
    AgentDTO activerAgent(UUID entrepriseId, UUID agentId, Authentication authentication);

    /**
     * Renvoie l'invitation (nouveau lien, ancien invalidé) à un agent qui n'a pas encore choisi son
     * mot de passe. Réservé au propriétaire de l'entreprise.
     */
    AgentDTO renvoyerInvitation(UUID entrepriseId, UUID agentId, Authentication authentication);

    /**
     * Vérifie si une entreprise peut créer une nouvelle annonce
     * 
     * @param entrepriseId L'ID de l'entreprise
     * @return true si le quota n'est pas atteint
     */
    boolean canCreateAnnonce(UUID entrepriseId, Authentication authentication);
    
    /**
     * Vérifie si une entreprise peut ajouter un agent
     * 
     * @param entrepriseId L'ID de l'entreprise
     * @return true si le quota n'est pas atteint
     */
    boolean canAddAgent(UUID entrepriseId, Authentication authentication);
    
    /**
     * Désactive une entreprise
     * 
     * @param id L'ID de l'entreprise
     * @param authentication L'utilisateur authentifié (propriétaire ou admin)
     */
    void disableEntreprise(UUID id, Authentication authentication);

    /**
     * Réactive une entreprise désactivée (administrateur uniquement, contrôlé au
     * niveau du contrôleur). Sans effet si elle est déjà active.
     *
     * @param id L'ID de l'entreprise
     * @return L'entreprise mise à jour
     */
    EntrepriseDTO enableEntreprise(UUID id);

    /**
     * Récupère (avec pagination) les annonces actives des agents d'une entreprise.
     * Réservé aux membres de l'entreprise et à la modération.
     *
     * @param entrepriseId L'ID de l'entreprise
     * @param pageable     Les paramètres de pagination
     * @return Page d'annonces
     */
    org.springframework.data.domain.Page<com.app.AnnoncesAPI.dto.AnnonceDTO> getAnnoncesByEntreprise(
            UUID entrepriseId, org.springframework.data.domain.Pageable pageable, Authentication authentication);

    com.app.AnnoncesAPI.dto.EntrepriseProfilDTO getEntrepriseProfil(
            UUID entrepriseId, org.springframework.data.domain.Pageable pageable);
}
