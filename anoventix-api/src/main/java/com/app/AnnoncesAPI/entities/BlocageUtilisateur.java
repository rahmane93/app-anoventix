package com.app.AnnoncesAPI.entities;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Un utilisateur en bloque un autre : plus aucun message dans un sens comme dans l'autre. */
@Entity
@Table(name = "blocage_utilisateur")
@Getter
@Setter
@NoArgsConstructor
public class BlocageUtilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bloqueur_id", nullable = false)
    private User bloqueur;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bloque_id", nullable = false)
    private User bloque;

    @Column(name = "date_blocage", nullable = false)
    private LocalDateTime dateBlocage = LocalDateTime.now();
}
