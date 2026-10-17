package com.app.AnnoncesAPI.services;

import java.util.List;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.UserDTO;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.payload.request.UpdateProfileRequest;
import com.app.AnnoncesAPI.payload.request.UpdateStatutRequest;
import com.app.AnnoncesAPI.payload.request.ValidationPieceIdentiteRequest;

/**
 * Interface définissant les opérations de gestion des utilisateurs
 */
public interface UserService {

    org.springframework.data.domain.Page<UserDTO> getAllUsers(org.springframework.data.domain.Pageable pageable);
    UserDTO getUserById(UUID id);
    UserDTO getMyProfile(String username);
    UserDTO updateProfile(String username, UpdateProfileRequest request);

    /** Uploade la photo de profil de l'utilisateur connecté. */
    UserDTO uploadProfilePhoto(String username, MultipartFile file, String type);

    /**
     * Uploade la pièce d'identité de l'utilisateur connecté.
     * Le statut passe automatiquement à EN_ATTENTE.
     */
    UserDTO uploadPieceIdentite(String username, MultipartFile file,
                                String typePieceIdentite, String numeroPieceIdentite);

    /**
     * Valide ou rejette la pièce d'identité d'un utilisateur (admin/modérateur).
     * Un MODÉRATEUR ne peut pas agir sur un autre MODÉRATEUR (réservé à l'ADMINISTRATEUR).
     */
    UserDTO validerPieceIdentite(UUID userId, ValidationPieceIdentiteRequest request, Authentication authentication);

    /** Ajoute l'annonce aux favoris de l'utilisateur (idempotent). */
    UserDTO addFavori(String username, Long annonceId);

    /** Retire l'annonce des favoris de l'utilisateur (idempotent). */
    UserDTO removeFavori(String username, Long annonceId);

    /** Liste paginée des annonces en favoris. */
    Page<AnnonceDTO> getFavoris(String username, Pageable pageable);

    /** Change le statut d'un compte utilisateur (ADMIN/MOD). Enregistre le motif si fourni.
     * Un MODÉRATEUR ne peut pas modifier le statut d'un autre MODÉRATEUR (réservé à l'ADMINISTRATEUR). */
    UserDTO updateStatut(UUID userId, UpdateStatutRequest request, Authentication authentication);

    /** Suppression douce du compte de l'utilisateur connecté. */
    void deleteMyAccount(String username);

    /**
     * Sert le contenu binaire de la pièce d'identité d'un utilisateur.
     *
     * <p>Autorisations : l'appelant doit être soit le propriétaire,
     * soit un ADMINISTRATEUR ou un MODERATEUR.
     *
     * @throws org.springframework.security.access.AccessDeniedException si l'appelant n'est pas autorisé
     * @throws com.app.AnnoncesAPI.exceptions.ResourceNotFoundException si l'utilisateur ou le fichier n'existe pas
     */
    Resource servirPieceIdentite(UUID userId, Authentication authentication);
}
