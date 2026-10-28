package com.app.AnnoncesAPI.entities;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypePieceIdentite;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "account",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = "email"),
           @UniqueConstraint(columnNames = "telephone")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    // --- Identité de base ---
    @Id
    @GeneratedValue(generator = "UUID")
    @UuidGenerator
    private UUID id;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @NotBlank
    @Size(max = 100)
    @Email
    @Column(length = 100)
    private String email;

    @NotBlank
    @Size(max = 120)
    private String password;

    // --- Profil ---
    private String nom;
    private String prenom;
    @Column(length = 17)
    private String telephone;

    // --- Photos ---
    private String photoProfil;

    // --- Pièce d'identité ---
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TypePieceIdentite typePieceIdentite;

    private String numeroPieceIdentite;
    @Column(length = 500)
    private String pieceIdentiteUrl;

    /** Verso de la pièce (DEC-36) : obligatoire pour la carte d'identité et le permis. */
    @Column(name = "piece_identite_verso_url", length = 500)
    private String pieceIdentiteVersoUrl;

    /** Date d'expiration déclarée de la pièce, contrôlée par la modération. */
    @Column(name = "date_expiration_piece")
    private java.time.LocalDate dateExpirationPiece;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private StatutPieceIdentite statutPieceIdentite;

    private String motifRejetPieceIdentite;

    /** Selfie de vérification (EVO-01) : même dossier privé et mêmes protections que la pièce. */
    @Column(length = 500)
    private String selfieUrl;

    /** Notifications push : nouveaux messages et alertes de recherche (RG-11-09). */
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean notifMessages = true;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean notifAlertes = true;

    /** Relance d'activation (E19) envoyée à J+5 : une seule par compte (DEC-06). */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean relanceActivationEnvoyee = false;

    private LocalDateTime dateEnvoiVerification;
    private LocalDateTime dateDecisionVerification;

    @Column(length = 100)
    private String decisionVerificationPar;

    // --- Sécurité / authentification ---
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatutUtilisateur statut = StatutUtilisateur.EN_ATTENTE_ACTIVATION;

    private String activationCode; // token UUID envoyé par email

    /** Timestamp ms d'expiration du token d'activation. Null = pas de token actif. */
    @Column(name = "activation_code_expiry")
    private Long activationCodeExpiry;

    private String resetPasswordToken;
    private Long resetPasswordTokenExpiry; // timestamp ms, expire après 15 min

    /**
     * Timestamp ms du dernier changement / reset de mot de passe. Tout JWT (access
     * ou refresh) émis avant cette date est rejeté. Null = jamais changé.
     */
    @Column(name = "password_changed_at")
    private Long passwordChangedAt;

    @Column(name = "must_change_password", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean mustChangePassword = false;

    /** Acceptation des CGU à l'inscription ; null pour un compte créé avant leur enregistrement. */
    @Column(name = "cgu_acceptees_le")
    private LocalDateTime cguAccepteesLe;

    /** Version des CGU acceptées (app.cgu.version au moment de l'inscription). */
    @Column(name = "cgu_version", length = 20)
    private String cguVersion;

    /** Remise des codes de secours (double authentification du staff); null tant qu'ils n'ont pas été remis. */
    @Column(name = "codes_secours_generes_le")
    private LocalDateTime codesSecoursGeneresLe;

    @Column(name = "motif_statut", length = 500)
    private String motifStatut;

    /**
     * Date de la demande de suppression du compte par l'utilisateur lui-même (RGPD).
     * Non null ⇒ compte réactivable par son propriétaire pendant le délai de grâce,
     * puis anonymisé. Null pour un compte désactivé par un admin.
     */
    @Column(name = "date_suppression_demandee")
    private LocalDateTime dateSuppressionDemandee;

    /**
     * Date de la suppression définitive (anonymisation). Non null ⇒ le compte n'est
     * plus listé ni compté nulle part (utilisateurs, entreprises, statistiques).
     */
    @Column(name = "date_suppression_definitive")
    private LocalDateTime dateSuppressionDefinitive;

    /** Délai pendant lequel un compte supprimé par son propriétaire reste réactivable. */
    public static final int DELAI_GRACE_SUPPRESSION_JOURS = 30;

    // --- Masquage système (administrateur) ---
    /**
     * Toutes les annonces du compte sont retirées des vues publiques, sans toucher à
     * l'état de chaque annonce (actif, statut de modération, clôture) : réafficher rend
     * exactement la situation d'avant. Pendant le masquage, publier et modifier sont refusés.
     */
    @Column(name = "annonces_masquees", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean annoncesMasquees = false;

    @Column(name = "motif_masquage_annonces", length = 500)
    private String motifMasquageAnnonces;

    @Column(name = "date_masquage_annonces")
    private LocalDateTime dateMasquageAnnonces;

    // --- Rôle ---
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Role role;

    // --- Favoris ---
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "account_favoris",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "annonce_id"))
    @JsonIgnoreProperties({"medias", "owner", "localisation"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Annonce> favoris = new HashSet<>();

    // --- Annonces publiées ---
    @OneToMany(mappedBy = "owner", fetch = FetchType.LAZY)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Annonce> annonces = new ArrayList<>();

    // --- Relations ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id")
    @JsonIgnoreProperties({"agents", "annonceurProfessionnel"})
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_user_id")
    @JsonIgnoreProperties({"parentUser", "entreprise", "role"})
    private User parentUser;

    // --- Helpers ---
    public boolean isAnnonceurProfessionnel() {
        return role != null && role.getName() == TypeRole.PROFESSIONNEL;
    }

    public boolean isAgentProfessionnel() {
        return role != null && role.getName() == TypeRole.AGENT_PROFESSIONNEL;
    }

    public boolean isParticulier() {
        return role != null && role.getName() == TypeRole.PARTICULIER;
    }

    public boolean isModerateur() {
        return role != null && role.getName() == TypeRole.MODERATEUR;
    }

    public boolean isAdministrateur() {
        return role != null && role.getName() == TypeRole.ADMINISTRATEUR;
    }
}
