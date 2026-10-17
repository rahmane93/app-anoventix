package com.app.AnnoncesAPI.config;

import com.app.AnnoncesAPI.exceptions.ErreurApi;

import org.springdoc.core.customizers.OpenApiCustomizer;

import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        Components components = new Components()
                .addSecuritySchemes("Bearer", new SecurityScheme()
                        .name("Bearer")
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Entrez votre token JWT (sans le préfixe 'Bearer')"));
        return new OpenAPI()
                .info(new Info()
                        .title("Anoventix API")
                        .version("1.0.0")
                        .description("""
                                API REST pour la plateforme immobilière Anoventix.

                                ## Authentification
                                Tous les endpoints protégés nécessitent un JWT dans le header :
                                ```
                                Authorization: Bearer <token>
                                ```
                                Obtenez un token via `POST /api/auth/signin`.
                                """))
                .addSecurityItem(new SecurityRequirement().addList("Bearer"))
                .components(components)
                .tags(List.of(
                        new Tag().name("Auth").description("Inscription, connexion, activation de compte"),
                        new Tag().name("Users").description("Profil utilisateur, favoris, administration"),
                        new Tag().name("Biens Immobiliers").description("Annonces immobilières (CRUD, recherche, signalement)"),
                        new Tag().name("Messaging").description("Conversations et messages entre utilisateurs"),
                        new Tag().name("Admin").description("Administration et modération"),
                        new Tag().name("Localisations").description("Référentiel géographique")
                ));
    }

    /**
     * Format des erreurs ({@link ErreurApi}) : renvoyé par le gestionnaire d'exceptions et les
     * filtres, aucun endpoint ne le déclare. Ajouté au contrat pour que les clients en génèrent
     * le type (code d'erreur compris).
     */
    @Bean
    public OpenApiCustomizer schemaErreurApi() {
        return openApi -> ModelConverters.getInstance()
                .readAll(ErreurApi.class)
                .forEach(openApi.getComponents()::addSchemas);
    }
}
