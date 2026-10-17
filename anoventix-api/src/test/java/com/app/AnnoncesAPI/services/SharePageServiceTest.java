package com.app.AnnoncesAPI.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.services.SharePageService.SharePage;

/** Page d'annonce partagée : balises Open Graph, URL canonique, anciens liens numériques. */
class SharePageServiceTest {

    private static final String TEMPLATE = "<!DOCTYPE html><html lang=\"fr\"><head><title data-rh=\"true\"></title>"
            + "<meta name=\"description\" content=\"générique\"/><title>Anoventix</title></head><body><div id=\"root\"></div></body></html>";

    @TempDir
    Path webRoot;

    private final BienImmoRepository repo = mock(BienImmoRepository.class);
    private SharePageService service;
    private BienImmo annonce;

    @BeforeEach
    void setUp() throws Exception {
        Files.createDirectories(webRoot.resolve("annonce"));
        Files.writeString(webRoot.resolve("annonce/[id].html"), TEMPLATE);
        service = new SharePageService(repo, "https://www.anoventix.com/", "https://anoventix.com", webRoot.toString());

        annonce = new BienImmo();
        annonce.setId(30L);
        annonce.setPublicId("k3x9a2bz7q4m");
        annonce.setTitre("Terrain à vendre \"Kaloum\"");
        annonce.setDescription("Beau terrain\n titré.");
        annonce.setPrix(new BigDecimal("150000000"));
        annonce.setTypeAnnonce(TypeAnnonce.VENTE);
        annonce.setTypeBien(TypeBien.TERRAIN);
        annonce.setSurfaceTotal(600.0);
        Localisation loc = new Localisation();
        loc.setQuartier("Kaloum");
        loc.setCommune("Conakry");
        annonce.setLocalisation(loc);
        Media photo = new Media();
        photo.setUrl("/uploads/public/a.jpg");
        photo.setTypeMime("image/jpeg");
        photo.setOrdre(0);
        annonce.setMedias(List.of(photo));
        annonce.setActif(true);
        annonce.setStatutModeration(StatutAnnonce.PUBLIEE);
        annonce.setOwner(new User());

        when(repo.findByPublicId("k3x9a2bz7q4m")).thenReturn(Optional.of(annonce));
        when(repo.findById(30L)).thenReturn(Optional.of(annonce));
    }

    @Test
    void injecteLesBalisesOpenGraph() {
        SharePage.Html page = assertInstanceOf(SharePage.Html.class,
                service.render("terrain-a-vendre-kaloum-k3x9a2bz7q4m"));

        assertTrue(page.found());
        String html = page.body();
        assertTrue(html.contains("<meta property=\"og:title\" content=\"Terrain à vendre &quot;Kaloum&quot;\"/>"));
        assertTrue(html.contains("<meta property=\"og:image\" content=\"https://anoventix.com/uploads/public/a.jpg\"/>"));
        assertTrue(html.contains("<meta property=\"og:url\" content=\"https://www.anoventix.com/annonce/terrain-a-vendre-kaloum-k3x9a2bz7q4m\"/>"));
        assertTrue(html.contains("À vendre · Terrain · 150 000 000 GNF · 600 m² · Kaloum, Conakry — Beau terrain titré."),
                html);
        assertTrue(html.contains("summary_large_image"));
        // Les balises génériques de l'export sont remplacées, pas doublées.
        assertFalse(html.contains("générique"));
        assertEquals(1, html.split("<title").length - 1);
    }

    @Test
    void ancienLienNumeriqueRedirige() {
        SharePage.Redirect redirect = assertInstanceOf(SharePage.Redirect.class, service.render("30"));
        assertEquals("/annonce/terrain-a-vendre-kaloum-k3x9a2bz7q4m", redirect.location());
    }

    @Test
    void slugObsoleteRedirigeVersLUrlCanonique() {
        assertInstanceOf(SharePage.Redirect.class, service.render("ancien-titre-k3x9a2bz7q4m"));
    }

    @Test
    void annonceNonPubliqueSansApercu() {
        annonce.setStatutModeration(StatutAnnonce.MASQUEE);
        SharePage.Html page = assertInstanceOf(SharePage.Html.class,
                service.render("terrain-a-vendre-kaloum-k3x9a2bz7q4m"));
        assertFalse(page.found());
        assertFalse(page.body().contains("og:title"));
        assertFalse(page.body().contains("Kaloum"));
    }

    @Test
    void annonceInconnue() {
        SharePage.Html page = assertInstanceOf(SharePage.Html.class, service.render("x-inconnu12345"));
        assertFalse(page.found());
    }
}
