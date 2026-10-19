package com.app.AnnoncesAPI.services.media;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import net.coobird.thumbnailator.Thumbnails;

/**
 * Variantes d'une photo d'annonce (ECART-55) : à côté de {@code abc.jpg} (1920 px) se trouvent
 * {@code abc_t.jpg} (miniature, 400 px) et {@code abc_m.jpg} (moyenne, 1080 px). Les listes, les cartes et la
 * carte chargent la miniature, la fiche la version moyenne : des dizaines de Ko au lieu de plusieurs centaines.
 */
public final class VariantesPhoto {

    public static final String MINIATURE = "_t";
    public static final String MOYENNE = "_m";
    static final int LARGEUR_MINIATURE = 400;
    static final int LARGEUR_MOYENNE = 1080;
    private static final double QUALITE = 0.75;

    private VariantesPhoto() {}

    /** URL de la variante ({@code /uploads/public/x/abc.jpg} → {@code /uploads/public/x/abc_t.jpg}) ; null sans variantes. */
    public static String url(String url, boolean variantes, String suffixe) {
        if (!variantes || url == null || !url.endsWith(".jpg")) {
            return null;
        }
        return url.substring(0, url.length() - ".jpg".length()) + suffixe + ".jpg";
    }

    /** Chemin disque de la variante d'un fichier d'origine. */
    static Path chemin(Path original, String suffixe) {
        String nom = original.getFileName().toString();
        return original.resolveSibling(nom.substring(0, nom.length() - ".jpg".length()) + suffixe + ".jpg");
    }

    /** Vrai si le fichier est lui-même une variante (jamais décliné davantage). */
    public static boolean estVariante(String nom) {
        return nom.endsWith(MINIATURE + ".jpg") || nom.endsWith(MOYENNE + ".jpg");
    }

    /** Produit la miniature et la version moyenne d'une photo déjà enregistrée. */
    public static void generer(Path original) throws IOException {
        generer(original, MINIATURE, LARGEUR_MINIATURE);
        generer(original, MOYENNE, LARGEUR_MOYENNE);
    }

    private static void generer(Path original, String suffixe, int largeur) throws IOException {
        java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(original.toFile());
        if (image == null) {
            throw new IOException("Image illisible : " + original);
        }
        // Une photo plus étroite que la cible n'est pas agrandie : la variante est alors une simple copie.
        if (image.getWidth() <= largeur) {
            Files.copy(original, chemin(original, suffixe), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            return;
        }
        Thumbnails.of(image)
                .width(largeur)
                .outputFormat("jpg")
                .outputQuality(QUALITE)
                .toFile(chemin(original, suffixe).toFile());
    }

    /** Supprime les variantes d'un fichier d'origine (idempotent). */
    public static void supprimer(Path original) throws IOException {
        String nom = original.getFileName().toString();
        if (!nom.endsWith(".jpg") || estVariante(nom)) {
            return;
        }
        Files.deleteIfExists(chemin(original, MINIATURE));
        Files.deleteIfExists(chemin(original, MOYENNE));
    }
}
