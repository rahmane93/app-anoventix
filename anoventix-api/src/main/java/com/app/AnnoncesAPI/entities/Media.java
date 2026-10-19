package com.app.AnnoncesAPI.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "medias")
@Data
public class Media {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String url;

    private String typeMime;

    private Integer ordre;

    /** Miniature (_t) et version moyenne (_m) présentes sur le disque à côté du fichier d'origine (ECART-55). */
    @jakarta.persistence.Column(nullable = false)
    private boolean variantes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "annonce_id", nullable = false)
    @JsonBackReference
    private Annonce annonce;

    // Getters et setters
}