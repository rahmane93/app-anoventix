package com.app.AnnoncesAPI.Utilities;

import java.util.regex.Pattern;

/**
 * Règle unique de robustesse des mots de passe, appliquée à l'inscription,
 * à la réinitialisation et au changement de mot de passe.
 *
 * Même règle dans l'app (src/lib/validation.ts) ; les deux sont vérifiées sur les mêmes
 * cas limites : src/test/resources/cas-mots-de-passe.json.
 */
public final class MotDePasse {

    public static final int LONGUEUR_MIN = 8;
    public static final int LONGUEUR_MAX = 64;

    public static final String MESSAGE = "Le mot de passe doit contenir entre " + LONGUEUR_MIN + " et "
            + LONGUEUR_MAX + " caractères, dont une minuscule, une majuscule, un chiffre et un caractère spécial.";

    private static final Pattern MINUSCULE = Pattern.compile("[a-z]");
    private static final Pattern MAJUSCULE = Pattern.compile("[A-Z]");
    private static final Pattern CHIFFRE = Pattern.compile("[0-9]");
    /** Spécial = tout caractère non alphanumérique ASCII (- _ . ! @ espace, lettre accentuée…). */
    private static final Pattern SPECIAL = Pattern.compile("[^A-Za-z0-9]");

    private MotDePasse() {}

    public static boolean estValide(String motDePasse) {
        return motDePasse != null
                && motDePasse.length() >= LONGUEUR_MIN
                && motDePasse.length() <= LONGUEUR_MAX
                && MINUSCULE.matcher(motDePasse).find()
                && MAJUSCULE.matcher(motDePasse).find()
                && CHIFFRE.matcher(motDePasse).find()
                && SPECIAL.matcher(motDePasse).find();
    }
}
