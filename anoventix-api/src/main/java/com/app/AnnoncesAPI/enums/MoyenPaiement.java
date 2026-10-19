package com.app.AnnoncesAPI.enums;

/** Moyen de paiement d'une licence, saisi par l'administrateur à la vente (DEC-17). */
public enum MoyenPaiement {
    ORANGE_MONEY("Orange Money"),
    MTN_MOMO("MTN MoMo"),
    ESPECES("Espèces"),
    VIREMENT("Virement"),
    AUTRE("Autre");

    private final String libelle;

    MoyenPaiement(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
