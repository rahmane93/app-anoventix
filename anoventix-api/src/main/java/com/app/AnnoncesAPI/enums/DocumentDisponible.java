package com.app.AnnoncesAPI.enums;

import java.text.Normalizer;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Documents disponibles d'une annonce : liste fermée, choix multiple (DEC-35). Stockés en codes séparés par des
 * virgules, dans l'ordre de cette énumération.
 */
public enum DocumentDisponible {
    TITRE_FONCIER("Titre foncier"),
    DONATION("Donation"),
    ACTE_DE_VENTE("Acte de vente"),
    CERTIFICAT_USAGE_FONCIER("Certificat d'usage foncier"),
    AUTRE("Autre");

    private final String libelle;

    DocumentDisponible(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }

    /**
     * Valeur saisie (codes ou libellés, séparés par des virgules ; accents et casse ignorés) → codes canoniques.
     * Une valeur inconnue est refusée.
     */
    public static String normaliser(String saisie) {
        if (saisie == null || saisie.isBlank()) {
            throw new IllegalArgumentException("Vous devez mentionner au moins un document.");
        }
        Set<DocumentDisponible> choisis = EnumSet.noneOf(DocumentDisponible.class);
        for (String brut : saisie.split(",")) {
            String cle = cle(brut);
            if (cle.isEmpty()) {
                continue;
            }
            DocumentDisponible trouve = null;
            for (DocumentDisponible d : values()) {
                if (cle(d.name()).equals(cle) || cle(d.libelle).equals(cle)) {
                    trouve = d;
                }
            }
            if (trouve == null) {
                throw new IllegalArgumentException("Document inconnu : « " + brut.trim() + " ». Valeurs possibles : "
                        + java.util.Arrays.stream(values()).map(DocumentDisponible::getLibelle).collect(Collectors.joining(", ")) + ".");
            }
            choisis.add(trouve);
        }
        if (choisis.isEmpty()) {
            throw new IllegalArgumentException("Vous devez mentionner au moins un document.");
        }
        return choisis.stream().map(Enum::name).collect(Collectors.joining(","));
    }

    private static String cle(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
    }
}
