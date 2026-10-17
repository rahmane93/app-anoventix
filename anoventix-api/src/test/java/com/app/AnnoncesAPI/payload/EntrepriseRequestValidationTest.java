package com.app.AnnoncesAPI.payload;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.app.AnnoncesAPI.payload.request.EntrepriseRequest;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

class EntrepriseRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static EntrepriseRequest complete() {
        return new EntrepriseRequest(
                "Anoventix SARL",
                "Agence immobilière à Conakry",
                "RC-GN-2024-001",
                "Kipé, Ratoma, Conakry",
                null, // pays : facultatif
                "+224622757044",
                "contact@anoventix.com");
    }

    private static Set<String> champsEnErreur(EntrepriseRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    @Test
    void accepteUneEntrepriseCompleteSansPays() {
        assertThat(champsEnErreur(complete())).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = { "nom", "description", "numeroRCCM", "adresse", "telephone", "email" })
    void exigeChaqueChampSaufLePays(String champ) {
        for (String valeur : new String[] { null, "", "   " }) {
            EntrepriseRequest request = complete();
            setter(request, champ).accept(valeur);
            assertThat(champsEnErreur(request)).as("%s = '%s'", champ, valeur).contains(champ);
        }
    }

    private static Consumer<String> setter(EntrepriseRequest r, String champ) {
        return switch (champ) {
            case "nom" -> r::setNom;
            case "description" -> r::setDescription;
            case "numeroRCCM" -> r::setNumeroRCCM;
            case "adresse" -> r::setAdresse;
            case "telephone" -> r::setTelephone;
            case "email" -> r::setEmail;
            default -> throw new IllegalArgumentException(champ);
        };
    }
}
