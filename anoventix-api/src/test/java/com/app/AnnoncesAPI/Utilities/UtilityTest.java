package com.app.AnnoncesAPI.Utilities;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

/**
 * Rendu des emails et pages : chaque modèle s'insère dans sa mise en page commune,
 * sans variable oubliée, et les valeurs saisies par les utilisateurs sont échappées.
 */
class UtilityTest {

    private static final Map<String, String> VARS = Map.ofEntries(
            Map.entry("prenom", "Aïssatou"), Map.entry("nom", "Diallo"),
            Map.entry("activationLink", "https://anoventix.com/activate?token=abc"),
            Map.entry("code", "12345678"), Map.entry("minutes", "15"),
            Map.entry("titre", "Annonce publiée"), Map.entry("message", "Votre annonce est en ligne."),
            Map.entry("email", "agent@test.com"), Map.entry("temporaryPassword", "Tmp!2345"),
            Map.entry("entrepriseName", "Immo Conakry"), Map.entry("parentNomComplet", "Mamadou Bah"));

    @ParameterizedTest
    @ValueSource(strings = {
            "templates/email-activation.html",
            "templates/email-password-reset.html",
            "templates/email-notification.html",
            "templates/email-temporary-password.html" })
    void emailComplet(String modele) {
        String html = Utility.renderEmail(modele, VARS, "Aperçu du message", "Mention de bas de carte");
        assertTrue(html.startsWith("<!doctype html>"));
        assertTrue(html.contains("Aperçu du message"));
        assertTrue(html.contains("Mention de bas de carte"));
        assertFalse(html.contains("{{"), "variable non remplacée dans " + modele);
    }

    @Test
    void valeursUtilisateurEchappees() {
        String html = Utility.renderEmail("templates/email-notification.html",
                Map.of("titre", "<b>x</b>", "message", "<a href=\"http://pirate\">clic</a>"),
                "<script>", "note");
        assertFalse(html.contains("<b>x</b>"));
        assertFalse(html.contains("<a href=\"http://pirate\">"));
        assertFalse(html.contains("<script>"));
        assertTrue(html.contains("&lt;b&gt;x&lt;/b&gt;"));
    }

    @Test
    void pagesActivation() {
        String ok = Utility.renderPage("templates/page-activation-success.html", Map.of(), "Compte activé");
        String ko = Utility.renderPage("templates/page-activation-error.html",
                Map.of("message", "Lien expiré"), "Activation impossible");
        assertTrue(ok.contains("anoventixapp://login"));
        assertTrue(ko.contains("Lien expiré"));
        assertFalse(ok.contains("{{"));
        assertFalse(ko.contains("{{"));
    }

    @Test
    void slugSansAccentsNiPonctuation() {
        assertEquals("terrain-a-vendre-kaloum", Utility.slugify("  Terrain à vendre – Kaloum ! "));
        assertEquals("annonce", Utility.slugify("¡¿!"));
        assertEquals("annonce", Utility.slugify(null));
        assertTrue(Utility.slugify("a".repeat(100)).length() <= 60);
    }

    @Test
    void identifiantPublicAleatoireSansTiret() {
        String id = Utility.generatePublicId();
        assertTrue(id.matches("[a-z0-9]{12}"), id);
        assertNotEquals(id, Utility.generatePublicId());
    }
}
