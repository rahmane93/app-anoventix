package com.app.AnnoncesAPI.entities;

import com.app.AnnoncesAPI.enums.TypeLicence;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Clé de licence annuelle. Générée par l'administrateur (owner null), puis activée
 * par un particulier ou un professionnel (la licence du pro couvre ses agents).
 */
@Entity
@Table(name = "licence", indexes = {
    @Index(name = "idx_licence_owner", columnList = "owner_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Licence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String cle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TypeLicence type;

    /** Titulaire, renseigné à l'activation. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    /** Acheteur désigné à la vente : seul compte autorisé à activer la clé (DEC-17). Nul = clé au porteur. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acheteur_id")
    private User acheteur;

    /** Montant payé en GNF. */
    private Long montant;

    @Enumerated(EnumType.STRING)
    @Column(name = "moyen_paiement", length = 20)
    private com.app.AnnoncesAPI.enums.MoyenPaiement moyenPaiement;

    @Column(name = "reference_paiement", length = 100)
    private String referencePaiement;

    /** Administrateur qui a généré la clé. */
    @Column(name = "genere_par", length = 100)
    private String generePar;

    @Column(name = "date_vente")
    private LocalDateTime dateVente;

    /** Ordre d'activation : enchaîne les clés « en attente de démarrage » (DEC-28). */
    @Column(name = "date_activation")
    private LocalDateTime dateActivation;

    /** Nul tant que la licence est « en attente de démarrage » (activée avant l'ouverture du mode, DEC-28). */
    @Column(name = "date_debut")
    private LocalDate dateDebut;

    /** Dernier jour de validité (inclus). */
    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
