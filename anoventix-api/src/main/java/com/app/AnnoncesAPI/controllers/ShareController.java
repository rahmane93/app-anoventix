package com.app.AnnoncesAPI.controllers;

import java.net.URI;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.AnnoncesAPI.services.SharePageService;
import com.app.AnnoncesAPI.services.SharePageService.SharePage;

import io.swagger.v3.oas.annotations.Hidden;

/**
 * Pages web des annonces avec aperçu pour les réseaux sociaux. nginx y envoie
 * www.anoventix.com/annonce/{segment} (cf. nginx/default.conf).
 */
@RestController
@RequestMapping("/share")
@Hidden
public class ShareController {

    private final SharePageService sharePageService;

    private final com.app.AnnoncesAPI.services.SeoService seoService;

    public ShareController(SharePageService sharePageService, com.app.AnnoncesAPI.services.SeoService seoService) {
        this.sharePageService = sharePageService;
        this.seoService = seoService;
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic())
                .contentType(new MediaType(MediaType.APPLICATION_XML, java.nio.charset.StandardCharsets.UTF_8))
                .body(seoService.sitemap());
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> robots() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic())
                .contentType(new MediaType(MediaType.TEXT_PLAIN, java.nio.charset.StandardCharsets.UTF_8))
                .body(seoService.robots());
    }

    @GetMapping(value = "/agence/{identifiant}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> agence(@PathVariable String identifiant) {
        SharePage page = seoService.renderAgence(identifiant);
        if (page instanceof SharePage.Html html) {
            return ResponseEntity.status(html.found() ? HttpStatus.OK : HttpStatus.NOT_FOUND)
                    .cacheControl(CacheControl.noCache())
                    .contentType(new MediaType(MediaType.TEXT_HTML, java.nio.charset.StandardCharsets.UTF_8))
                    .body(html.body());
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping(value = "/annonce/{segment}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> annonce(@PathVariable String segment) {
        return switch (sharePageService.render(segment)) {
            case SharePage.Redirect redirect -> ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY)
                    .location(URI.create(redirect.location()))
                    .build();
            // Même revalidation que les autres pages HTML du site : un déploiement est visible tout de suite.
            case SharePage.Html html -> ResponseEntity.status(html.found() ? HttpStatus.OK : HttpStatus.NOT_FOUND)
                    .cacheControl(CacheControl.noCache())
                    .contentType(new MediaType(MediaType.TEXT_HTML, java.nio.charset.StandardCharsets.UTF_8))
                    .body(html.body());
        };
    }
}
