package com.app.AnnoncesAPI;

import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Chaque contexte de test part d'une base vide : le schéma est recréé par les
 * migrations Flyway, exactement comme sur une installation neuve.
 * Remplace l'ancien ddl-auto=create-drop, qui testait le schéma d'Hibernate
 * et non celui de la production.
 */
@Configuration
public class FlywayTestConfig {

    @Bean
    public FlywayMigrationStrategy cleanPuisMigrer() {
        return flyway -> {
            flyway.clean();
            flyway.migrate();
        };
    }
}
