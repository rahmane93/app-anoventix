package com.app.AnnoncesAPI.config;

import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration des ressources statiques.
 *
 * <p>Note : aucun ResourceHandler n'est enregistré pour {@code /uploads/**}.
 * Le service est entièrement assuré par {@link com.app.AnnoncesAPI.controllers.FileController},
 * qui applique :
 * <ul>
 *   <li>la protection contre le path traversal (P2.5)</li>
 *   <li>le rejet du sous-arbre {@code private/} (P0.3 — pièces d'identité)</li>
 *   <li>l'exposition du sous-arbre {@code public/} (P0.4 — médias et photos publiques)</li>
 * </ul>
 *
 * <p>Si un {@code ResourceHandler} était enregistré ici, il <b>court-circuiterait</b>
 * le FileController et exposerait les fichiers privés. Ne PAS le rétablir.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${upload.dir:./uploads/}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Volontairement vide. Toute lecture de /uploads/** passe par FileController.
        // Conserver la résolution du path absolu pour le debug uniquement.
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        // (uploadPath est conservé pour log éventuel — pas d'enregistrement de handler)
        if (uploadPath == null) {
            // never happens — ici uniquement pour silencier les warnings d'unused
        }
    }
}
