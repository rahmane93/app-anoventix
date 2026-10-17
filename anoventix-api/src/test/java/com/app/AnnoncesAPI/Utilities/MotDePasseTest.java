package com.app.AnnoncesAPI.Utilities;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Règle de mot de passe (ECART-01) sur les cas limites partagés avec l'app
 * (cas-mots-de-passe.json, aussi lu par anoventix-app/src/lib/validation.test.ts).
 */
class MotDePasseTest {

    @ParameterizedTest
    @MethodSource("valides")
    void accepte(String motDePasse) {
        assertThat(MotDePasse.estValide(motDePasse)).isTrue();
    }

    @ParameterizedTest
    @MethodSource("invalides")
    void refuse(String motDePasse) {
        assertThat(MotDePasse.estValide(motDePasse)).isFalse();
    }

    @Test
    void refuseNull() {
        assertThat(MotDePasse.estValide(null)).isFalse();
    }

    static Stream<String> valides() {
        return cas("valides");
    }

    static Stream<String> invalides() {
        return cas("invalides");
    }

    private static Stream<String> cas(String groupe) {
        try (InputStream in = MotDePasseTest.class.getResourceAsStream("/cas-mots-de-passe.json")) {
            JsonNode racine = new ObjectMapper().readTree(in);
            return racine.get(groupe).valueStream().map(JsonNode::asString);
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
