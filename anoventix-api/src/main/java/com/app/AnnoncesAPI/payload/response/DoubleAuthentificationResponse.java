package com.app.AnnoncesAPI.payload.response;

import java.util.UUID;

/**
 * Réponse (202) à une connexion de modérateur ou d'administrateur dont le mot de passe est correct :
 * pas de jetons tant que le code envoyé par email n'a pas été saisi (DEC-03). Le client le reconnaît
 * à {@code verificationRequise = true} et poursuit avec {@code POST /api/auth/verification-code}.
 *
 * @param verificationRequise toujours vrai (sert de discriminant côté client)
 * @param verificationId      identifiant du défi, à renvoyer avec le code
 * @param methode             canal du code (EMAIL)
 * @param expireDansSecondes  durée de validité restante du code
 * @param message             texte affichable
 */
public record DoubleAuthentificationResponse(
        boolean verificationRequise,
        UUID verificationId,
        String methode,
        long expireDansSecondes,
        String message) {

    public static DoubleAuthentificationResponse parEmail(UUID verificationId, long expireDansSecondes) {
        return new DoubleAuthentificationResponse(true, verificationId, "EMAIL", expireDansSecondes,
                "Un code de vérification vient d'être envoyé à votre adresse email.");
    }
}
