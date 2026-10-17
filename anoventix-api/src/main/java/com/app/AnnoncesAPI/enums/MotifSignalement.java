package com.app.AnnoncesAPI.enums;

public enum MotifSignalement {

    CONTENU_INAPPROPRIE("Contenu inapproprié"),
    DEJA_VENDU_LOUE("Déjà vendu / loué"),
    ARNAQUE_FRAUDE("Arnaque / fraude"),
    ANNONCE_EN_DOUBLE("Annonce en double"),
    INFOS_INCORRECTES("Infos incorrectes"),
    MAUVAISE_CATEGORIE("Mauvaise catégorie"),
    PROBLEME_LOCALISATION("Problème de localisation"),
    AUTRE("Autre");

    private final String libelle;

    MotifSignalement(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
