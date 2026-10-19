package com.app.AnnoncesAPI.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonSubTypes;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.Formula;

@Entity
@Table(name = "annonce", indexes = {
    @Index(name = "idx_annonce_owner",         columnList = "owner_id"),
    @Index(name = "idx_annonce_actif",         columnList = "actif"),
    @Index(name = "idx_annonce_date_creation", columnList = "date_creation"),
    @Index(name = "idx_annonce_localisation",  columnList = "localisation_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Inheritance(strategy = InheritanceType.JOINED)
@JsonSubTypes({
    @JsonSubTypes.Type(value = com.app.AnnoncesAPI.entities.BienImmo.class, name = "bien_immo")
})
public abstract class Annonce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    /**
     * Identifiant public, non devinable, utilisé dans les URLs partagées
     * (/annonce/&lt;slug&gt;-&lt;publicId&gt;). L'id numérique reste interne.
     */
    @Column(name = "public_id", unique = true, nullable = false, updatable = false, length = 16)
    private String publicId;

    @Column(unique = true, nullable = false)
    private String referenceAnnonce;

    @Column(nullable = false)
    private String titre;

    @Column(length = 2000, nullable = false)
    private String description;

    @Column(nullable = false)
    private BigDecimal prix;

    private BigDecimal prixRevise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "localisation_id", nullable = false)
    private Localisation localisation;

    private String complementAdresse;

    @DecimalMin(value = "-180.0", message = "La longitude doit être >= -180")
    @DecimalMax(value = "180.0",  message = "La longitude doit être <= 180")
    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @DecimalMin(value = "-90.0", message = "La latitude doit être >= -90")
    @DecimalMax(value = "90.0",  message = "La latitude doit être <= 90")
    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TypeAnnonce typeAnnonce;

    @Column(nullable = false)
    private BigDecimal fraisHonoraire = BigDecimal.ZERO;

    /** Location / bail : caution demandée, en mois de loyer (0 à 12). Nul pour une vente (DEC-23). */
    @Column(name = "caution_mois")
    private Integer cautionMois;

    /** Location / bail : avance demandée, en mois de loyer (0 à 24). Nul pour une vente (DEC-23). */
    @Column(name = "avance_mois")
    private Integer avanceMois;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TypeBien typeBien;

    @Column(nullable = false)
    private String documentsDisponibles;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(nullable = false)
    private LocalDateTime dateModification;

    @Column(nullable = false)
    private Boolean actif = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutAnnonce statutModeration = StatutAnnonce.PUBLIEE;

    /**
     * Visibilité publique calculée par la base (fonction annonce_est_visible, migration V15)
     * à chaque écriture de l'annonce ou de son propriétaire. Filtre de toutes les requêtes
     * publiques. Lecture seule, et pas rafraîchie dans une entité déjà chargée : en Java,
     * utiliser {@link #estVisiblePubliquement()}.
     */
    @Setter(AccessLevel.NONE)
    @Column(name = "visible_public", nullable = false, insertable = false, updatable = false)
    private boolean visiblePublic;

    /** Date à laquelle l'annonce est devenue visible du public (posée par la base, alertes de recherche). */
    @Setter(AccessLevel.NONE)
    @Column(name = "visible_depuis", insertable = false, updatable = false)
    private LocalDateTime visibleDepuis;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private MotifCloture motifCloture;

    private LocalDateTime dateCloture;

    /**
     * Motif communiqué au propriétaire quand un modérateur masque ou rejette
     * l'annonce. Effacé à la remise en ligne.
     */
    @Column(length = 500)
    private String motifModeration;

    /** Date du dernier masquage par la modération (ou par le système). */
    private LocalDateTime dateMasquage;

    /** Vrai si le dernier masquage vient des signalements (DEC-11), pas d'un modérateur. */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean masquageAutomatique = false;

    /** Réexamen demandé par le propriétaire d'une annonce masquée (DEC-09). */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean reexamenDemande = false;

    private LocalDateTime dateReexamen;

    @Column(length = 500)
    private String messageReexamen;

    /** Nombre de demandes de réexamen déjà faites (3 au plus, DEC-09). */
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int nbReexamens = 0;

    /**
     * Fin de validité de l'annonce : au-delà, elle est clôturée automatiquement
     * (motif EXPIREE) et le propriétaire peut la prolonger gratuitement.
     * Repoussée à chaque (re)mise en ligne. Null = annonce antérieure à la fonctionnalité.
     */
    private LocalDateTime dateExpiration;

    /** Vrai une fois l'email de relance « expire bientôt » envoyé pour la période en cours. */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean relanceExpirationEnvoyee = false;

    @Column(nullable = false, columnDefinition = "bigint default 0")
    private long vueCount = 0;

    @PrePersist
    protected void onCreate() {
        if (publicId == null) {
            publicId = com.app.AnnoncesAPI.Utilities.Utility.generatePublicId();
        }
        dateCreation = LocalDateTime.now();
        dateModification = dateCreation;
    }

    @PreUpdate
    protected void onUpdate() {
        dateModification = LocalDateTime.now();
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User owner;

    // Relation avec les médias (images, vidéos, etc.)
    @OneToMany(mappedBy = "annonce", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @jakarta.persistence.OrderBy("ordre ASC, id ASC")
    @JsonManagedReference
    private List<Media> medias;

    @Formula("(SELECT COUNT(*) FROM account_favoris af WHERE af.annonce_id = id)")
    private int nbFavoris;

    /**
     * Règle unique de visibilité publique : en ligne, publiée, compte propriétaire ACTIF et non
     * masqué par l'administrateur, entreprise du propriétaire active (DEC-01, DEC-12). Les requêtes filtrent sur {@code visiblePublic}, calculée par la
     * fonction SQL annonce_est_visible (migration V15) : toute évolution de la règle se fait aux deux
     * endroits, VisibiliteAnnonceTest vérifie qu'ils concordent.
     * Nom sans préfixe get/is : ni Hibernate ni Jackson ne le prennent pour une propriété.
     */
    public boolean estVisiblePubliquement() {
        return Boolean.TRUE.equals(actif)
                && statutModeration == StatutAnnonce.PUBLIEE
                && owner != null
                && !owner.isAnnoncesMasquees()
                && owner.getStatut() == com.app.AnnoncesAPI.enums.StatutUtilisateur.ACTIF
                && (owner.getEntreprise() == null || !Boolean.FALSE.equals(owner.getEntreprise().getActive()));
    }
}