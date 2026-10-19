package com.app.AnnoncesAPI.entities;

import com.app.AnnoncesAPI.enums.StatutVerificationEntreprise;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Entité représentant une entreprise
 * Utilisée pour gérer les Annonceurs Professionnels et leurs agents
 */
@Entity
@Table(name = "entreprises")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Entreprise {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @UuidGenerator
    private UUID id;
    
    @Column(nullable = false, length = 100)
    private String nom;
    
    @Column(length = 200)
    private String description;
    
    /** Réservé une fois l'entreprise vérifiée (index partiel, V27) ; figé après vérification. */
    @Column(length = 50)
    private String numeroRCCM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutVerificationEntreprise statutVerification = StatutVerificationEntreprise.NON_VERIFIEE;

    /** Extrait RCCM (image ou PDF) dans uploads/private/entreprise/&lt;id&gt;/, lisible par le propriétaire et la modération. */
    @Column(length = 500)
    private String justificatifRccmUrl;

    private LocalDateTime dateEnvoiVerification;
    private LocalDateTime dateDecisionVerification;

    @Column(length = 100)
    private String decisionVerificationPar;

    @Column(length = 255)
    private String motifRejetVerification;
    
    @Column(length = 100)
    private String adresse;
    
    @Column(unique = true, length = 17)
    private String telephone;
    
    @Column(length = 100)
    private String email;

    /**
     * URL de la photo de profil de l'entreprise (stockée dans uploads/)
     */
    @Column(length = 500)
    private String photoProfil;
    
    /**
     * L'Annonceur Professionnel propriétaire de cette entreprise
     */
    @OneToOne
    @JoinColumn(name = "annonceur_professionnel_id", unique = true)
    @JsonIgnore // Évite les boucles infinies lors de la sérialisation JSON
    private User annonceurProfessionnel;
    
    /**
     * Liste des agents rattachés à cette entreprise
     */
    @OneToMany(mappedBy = "entreprise", fetch = FetchType.LAZY)
    @JsonIgnore // Évite les boucles infinies lors de la sérialisation JSON
    private List<User> agents = new ArrayList<>();
    
    /**
     * Quota d'annonces actives propre à cette entreprise ; null = valeur globale
     * (voir QuotaEntrepriseService, seul point de lecture des quotas effectifs).
     */
    @Column
    private Integer quotaAnnonces;

    /**
     * Quota d'agents propre à cette entreprise ; null = valeur globale.
     */
    @Column
    private Integer quotaAgents;
    
    /**
     * Statut de l'entreprise
     */
    @Column(nullable = false)
    private Boolean active = true;
    
    /**
     * Date de création de l'entreprise
     */
    @Column(nullable = false, updatable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();
    
    /**
     * Date de dernière modification
     */
    @Column
    private LocalDateTime dateModification;
    
    @PreUpdate
    protected void onUpdate() {
        this.dateModification = LocalDateTime.now();
    }
    
    /**
     * Retourne toutes les annonces des agents rattachés à cette entreprise.
     * Nécessite que la collection agents (et leurs annonces) soit initialisée.
     */
    @Transient
    public List<Annonce> getAnnonces() {
        return agents.stream()
                .flatMap(agent -> agent.getAnnonces().stream())
                .collect(Collectors.toList());
    }
}
