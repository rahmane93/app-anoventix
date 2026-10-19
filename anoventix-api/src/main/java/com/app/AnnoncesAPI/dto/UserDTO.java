package com.app.AnnoncesAPI.dto;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypePieceIdentite;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour les informations utilisateur (sans données sensibles)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    
    private UUID id;
    private String email;
    private String nom;
    private String prenom;
    private String telephone;
    private String photoProfil;
    private TypePieceIdentite typePieceIdentite;
    private String numeroPieceIdentite;
    private String pieceIdentiteUrl;
    private StatutPieceIdentite statutPieceIdentite;
    private String motifRejetPieceIdentite;
    /** Le selfie de vérification est enregistré (le fichier n'est servi qu'au titulaire et à la modération). */
    private boolean selfieFourni;
    /** Verso de la pièce envoyé (DEC-36). */
    private boolean versoFourni;
    /** Date d'expiration déclarée de la pièce. */
    private java.time.LocalDate dateExpirationPiece;
    /** Interrupteurs des notifications push (profil). */
    private boolean notifMessages;
    private boolean notifAlertes;
    private java.time.LocalDateTime dateEnvoiVerification;
    private java.time.LocalDateTime dateDecisionVerification;
    private StatutUtilisateur statut;
    private String motifStatut;
    private long nbAvertissements;
    /** Annonces du compte masquées par l'administrateur (motif / date renseignés). */
    private boolean annoncesMasquees;
    private String motifMasquageAnnonces;
    private LocalDateTime dateMasquageAnnonces;
    private String role;
    private LocalDateTime createdAt;
    
    // Informations entreprise si agent
    private UUID entrepriseId;
    private String entrepriseNom;
    
    // Informations parent si agent
    private UUID parentUserId;

    // IDs des annonces en favoris
    private Set<Long> favorisIds;
}
