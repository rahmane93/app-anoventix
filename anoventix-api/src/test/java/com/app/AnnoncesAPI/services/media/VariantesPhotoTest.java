package com.app.AnnoncesAPI.services.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Miniatures des photos (ECART-55) : deux variantes à côté de l'original, jamais agrandies. */
class VariantesPhotoTest {

    @TempDir Path dossier;

    private Path photo(String nom, int largeur, int hauteur) throws Exception {
        Path p = dossier.resolve(nom);
        ImageIO.write(new BufferedImage(largeur, hauteur, BufferedImage.TYPE_INT_RGB), "jpg", p.toFile());
        return p;
    }

    private int largeur(Path p) throws Exception {
        return ImageIO.read(p.toFile()).getWidth();
    }

    @Test
    void uneGrandePhotoDonneUneMiniatureDe400pxEtUneVersionMoyenneDe1080px() throws Exception {
        Path original = photo("abc.jpg", 1920, 1080);

        VariantesPhoto.generer(original);

        assertThat(largeur(dossier.resolve("abc_t.jpg"))).isEqualTo(400);
        assertThat(largeur(dossier.resolve("abc_m.jpg"))).isEqualTo(1080);
        assertThat(largeur(original)).isEqualTo(1920);
        assertThat(Files.size(dossier.resolve("abc_t.jpg"))).isLessThan(Files.size(original));
    }

    @Test
    void uneVarianteNEstJamaisPlusGrandeQueLOriginal() throws Exception {
        Path petite = photo("petite.jpg", 300, 200);

        VariantesPhoto.generer(petite);

        assertThat(largeur(dossier.resolve("petite_t.jpg"))).isEqualTo(300);
        assertThat(largeur(dossier.resolve("petite_m.jpg"))).isEqualTo(300);
    }

    @Test
    void lesUrlDesVariantesNExistentQuePourLesPhotosQuiLesOnt() {
        assertThat(VariantesPhoto.url("/uploads/public/VE-1/abc.jpg", true, VariantesPhoto.MINIATURE))
                .isEqualTo("/uploads/public/VE-1/abc_t.jpg");
        assertThat(VariantesPhoto.url("/uploads/public/VE-1/abc.jpg", true, VariantesPhoto.MOYENNE))
                .isEqualTo("/uploads/public/VE-1/abc_m.jpg");
        assertThat(VariantesPhoto.url("/uploads/public/VE-1/abc.jpg", false, VariantesPhoto.MINIATURE)).isNull();
        assertThat(VariantesPhoto.url(null, true, VariantesPhoto.MINIATURE)).isNull();
    }

    @Test
    void lesVariantesSontSupprimeesAvecLOriginalMaisPasUneVarianteSeule() throws Exception {
        Path original = photo("abc.jpg", 1920, 1080);
        VariantesPhoto.generer(original);

        VariantesPhoto.supprimer(dossier.resolve("abc_t.jpg"));
        assertThat(dossier.resolve("abc_m.jpg")).exists();

        VariantesPhoto.supprimer(original);
        assertThat(dossier.resolve("abc_t.jpg")).doesNotExist();
        assertThat(dossier.resolve("abc_m.jpg")).doesNotExist();
    }
}
