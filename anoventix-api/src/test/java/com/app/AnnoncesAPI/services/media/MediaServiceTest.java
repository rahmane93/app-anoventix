package com.app.AnnoncesAPI.services.media;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

/**
 * Tests unitaires du garde-fou anti « image bombe » (lecture des dimensions sans décodage).
 */
class MediaServiceTest {

    private final MediaService mediaService = new MediaService(null, null, null, null, null);

    private static MockMultipartFile png(int width, int height) throws Exception {
        // TYPE_BYTE_BINARY : 1 bit/pixel, pour générer une grande image sans exploser la mémoire du test.
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_BINARY);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return new MockMultipartFile("file", "image.png", "image/png", out.toByteArray());
    }

    @Test
    void imageNormaleAcceptee() throws Exception {
        assertDoesNotThrow(() -> mediaService.verifierDimensions(png(1920, 1080)));
    }

    @Test
    void imageTropGrandeRejetee() throws Exception {
        // 8000 x 8000 = 64 Mpx > 50 Mpx, pour quelques Ko compressés.
        MockMultipartFile bombe = png(8000, 8000);
        assertThrows(IllegalArgumentException.class, () -> mediaService.verifierDimensions(bombe));
    }

    @Test
    void fichierNonImageRejete() {
        MockMultipartFile faux = new MockMultipartFile("file", "x.jpg", "image/jpeg", "pas une image".getBytes());
        assertThrows(IllegalArgumentException.class, () -> mediaService.verifierDimensions(faux));
    }

    @Test
    void creationSansPhotoRefusee() {
        assertThrows(IllegalArgumentException.class, () -> MediaService.verifierAuMoinsUnePhoto(null));
        assertThrows(IllegalArgumentException.class, () -> MediaService.verifierAuMoinsUnePhoto(List.of()));
        MockMultipartFile vide = new MockMultipartFile("medias", "vide.jpg", "image/jpeg", new byte[0]);
        assertThrows(IllegalArgumentException.class, () -> MediaService.verifierAuMoinsUnePhoto(List.of(vide)));
    }

    @Test
    void creationAvecPhotoAcceptee() throws Exception {
        assertDoesNotThrow(() -> MediaService.verifierAuMoinsUnePhoto(List.of(png(800, 600))));
    }
}
