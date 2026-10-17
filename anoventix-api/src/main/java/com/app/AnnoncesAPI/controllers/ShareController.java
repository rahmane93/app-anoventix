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

    public ShareController(SharePageService sharePageService) {
        this.sharePageService = sharePageService;
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
