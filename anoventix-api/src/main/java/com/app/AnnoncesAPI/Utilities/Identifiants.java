package com.app.AnnoncesAPI.Utilities;

import java.util.Locale;

/**
 * Normalisation des identifiants de connexion (email, téléphone).
 *
 * <p>À appliquer à CHAQUE point d'entrée (inscription, création d'agent, connexion,
 * mot de passe oublié…) : sinon {@code Foo@x.com} et {@code foo@x.com}, ou
 * {@code +224…} et {@code 00224…}, donnent deux comptes distincts.
 */
public final class Identifiants {

    private Identifiants() {}

    /** trim + minuscules. Retourne null si l'entrée est null. */
    public static String normaliserEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Supprime espaces, tirets, points et parenthèses, et remplace le préfixe
     * international {@code 00} par {@code +}. Retourne null si l'entrée est null ou vide.
     */
    public static String normaliserTelephone(String telephone) {
        if (telephone == null) return null;
        String t = telephone.replaceAll("[\\s\\-.()]", "");
        if (t.isEmpty()) return null;
        if (t.startsWith("00")) {
            t = "+" + t.substring(2);
        }
        return t;
    }
}
