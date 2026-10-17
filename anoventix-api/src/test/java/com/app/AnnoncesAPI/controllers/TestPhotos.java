package com.app.AnnoncesAPI.controllers;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

import org.springframework.mock.web.MockMultipartFile;

/** Photo minimale valide pour les tests : une annonce ne peut pas être créée sans photo. */
final class TestPhotos {

    private TestPhotos() {}

    static MockMultipartFile photo() throws Exception {
        BufferedImage img = new BufferedImage(64, 48, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return new MockMultipartFile("medias", "photo.png", "image/png", out.toByteArray());
    }
}
