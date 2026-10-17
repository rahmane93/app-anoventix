package com.app.AnnoncesAPI.Utilities;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.function.Predicate;

public class Utility {

    public static String renderTemplate(String path, Map<String, String> vars) {
        try (InputStream is = Utility.class.getClassLoader().getResourceAsStream(path)) {
            if (is == null) throw new RuntimeException("Template introuvable : " + path);
            String content = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            content = content.replace("{{year}}", String.valueOf(LocalDate.now().getYear()));
            for (Map.Entry<String, String> e : vars.entrySet()) {
                // Les valeurs viennent en partie de l'utilisateur (nom, prénom, entreprise…) :
                // sans échappement, on pourrait injecter du HTML / un lien de phishing dans
                // un email envoyé depuis notre domaine.
                content = content.replace("{{" + e.getKey() + "}}", escapeHtml(e.getValue()));
            }
            return content;
        } catch (IOException e) {
            throw new RuntimeException("Erreur de lecture du template : " + path, e);
        }
    }

    /**
     * Email complet : contenu propre ({@code contentPath}, variables échappées) inséré dans
     * la mise en page commune (en-tête, pied de page, charte). {@code preheader} = aperçu
     * affiché dans la boîte de réception ; {@code footerNote} = mention de bas de carte.
     */
    public static String renderEmail(String contentPath, Map<String, String> vars,
                                     String preheader, String footerNote) {
        String content = renderTemplate(contentPath, vars);
        return renderTemplate("templates/email-layout.html",
                Map.of("preheader", preheader, "footerNote", footerNote))
                .replace("{{content}}", content);
    }

    /** Page web servie par l'API (activation…) dans la mise en page commune. */
    public static String renderPage(String contentPath, Map<String, String> vars, String title) {
        String content = renderTemplate(contentPath, vars);
        return renderTemplate("templates/page-layout.html", Map.of("title", title))
                .replace("{{content}}", content);
    }

    /** Échappe une valeur pour insertion dans du HTML (contenu ou attribut entre guillemets). */
    public static String escapeHtml(String value) {
        if (value == null) return "";
        StringBuilder sb = new StringBuilder(value.length());
        for (char c : value.toCharArray()) {
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }

    private static final String PUBLIC_ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int PUBLIC_ID_LENGTH = 12;
    private static final int SLUG_MAX_LENGTH = 60;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /** Identifiant public d'annonce : 12 caractères [a-z0-9] tirés au hasard (~62 bits), sans tiret. */
    public static String generatePublicId() {
        StringBuilder sb = new StringBuilder(PUBLIC_ID_LENGTH);
        for (int i = 0; i < PUBLIC_ID_LENGTH; i++) {
            sb.append(PUBLIC_ID_CHARS.charAt(SECURE_RANDOM.nextInt(PUBLIC_ID_CHARS.length())));
        }
        return sb.toString();
    }

    /** « Terrain à vendre – Kaloum ! » → « terrain-a-vendre-kaloum » (60 caractères max, "annonce" si vide). */
    public static String slugify(String text) {
        if (text == null) return "annonce";
        String slug = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.length() > SLUG_MAX_LENGTH) {
            slug = slug.substring(0, SLUG_MAX_LENGTH).replaceAll("-+$", "");
        }
        return slug.isEmpty() ? "annonce" : slug;
    }

    // Sans O, I, 0, 1 pour éviter la confusion visuelle
    private static final String REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /**
     * Référence lisible d'une annonce : préfixe du type, date (aammjj) et 4 caractères,
     * par exemple VE-260317-K7QM. L'année évite que les collisions s'accumulent d'une année
     * sur l'autre (ECART-08). Les références antérieures (VE-0317-K7QM) restent valides.
     */
    public static String generateUniqueReference(String prefix, int randomLength, Predicate<String> isUnique) {
        String ref;
        int maxAttempts = 10;
        int attempts = 0;
        Random rnd = new Random();
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        do {
            StringBuilder randomPart = new StringBuilder();
            for (int i = 0; i < randomLength; i++) {
                randomPart.append(REF_CHARS.charAt(rnd.nextInt(REF_CHARS.length())));
            }
            ref = prefix + "-" + datePart + "-" + randomPart;
            attempts++;
            if (attempts >= maxAttempts && !isUnique.test(ref)) {
                throw new RuntimeException("Impossible de générer une référence unique après " + maxAttempts + " tentatives");
            }
        } while (!isUnique.test(ref));
        return ref;
    }
    
}