package com.app.AnnoncesAPI.enums;

/** Motif choisi par un participant qui signale un message à la modération. */
public enum MotifSignalementMessage {

    ARNAQUE("Arnaque / fraude"),
    PROPOS_INSULTANTS("Propos insultants"),
    HARCELEMENT("Harcèlement"),
    SPAM("Spam / publicité"),
    AUTRE("Autre");

    private final String libelle;

    MotifSignalementMessage(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
