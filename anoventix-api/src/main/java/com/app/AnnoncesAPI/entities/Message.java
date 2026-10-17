package com.app.AnnoncesAPI.entities;

import java.time.LocalDateTime;

import com.app.AnnoncesAPI.enums.MotifSignalementMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

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

@Entity
@Table(
        name = "message",
        indexes = {
                @Index(name = "idx_message_conversation", columnList = "conversation_id"),
                @Index(name = "idx_message_sender", columnList = "sender_id"),
                @Index(name = "idx_message_created_at", columnList = "created_at")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    @JsonIgnoreProperties({"annonce", "participantOne", "participantTwo", "createdBy"})
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    @JsonIgnoreProperties({"password", "role", "favoris", "annonces", "entreprise", "parentUser"})
    private User sender;

    @Column(nullable = false, length = 4000)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    /** Vrai si un participant a signalé ce message à la modération. */
    @Column(nullable = false)
    private Boolean signale = false;

    /** Motif choisi par le signaleur (null pour un signalement antérieur à V10). */
    @Enumerated(EnumType.STRING)
    @Column(name = "motif_signalement", length = 30)
    private MotifSignalementMessage motifSignalement;

    @Column(name = "date_signalement")
    private LocalDateTime dateSignalement;

    /** Participant ayant signalé le message. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signale_par_id")
    @JsonIgnoreProperties({"password", "role", "favoris", "annonces", "entreprise", "parentUser"})
    private User signalePar;

    /** Vrai si un admin/modérateur a supprimé le contenu de ce message. */
    @Column(nullable = false)
    private Boolean supprime = false;

    @Column(name = "supprime_par", length = 100)
    private String supprimePar;

    @Column(name = "date_suppression")
    private LocalDateTime dateSuppression;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
