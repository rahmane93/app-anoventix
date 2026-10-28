package com.app.AnnoncesAPI;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationState;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.annotation.DirtiesContext.ClassMode;

/**
 * Installation sur une base vierge : toutes les migrations s'appliquent
 * depuis une base vide (FlywayTestConfig) et Hibernate valide le schéma obtenu au
 * démarrage du contexte (ddl-auto=validate). Si ce test échoue, une nouvelle
 * installation de l'API échouerait aussi.
 * Contexte neuf : les autres tests partagent la base et la vident.
 */
@SpringBootTest
@DirtiesContext(classMode = ClassMode.BEFORE_CLASS)
class MigrationsBaseViergeTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void toutesLesMigrationsSontAppliquees() {
        MigrationInfo[] migrations = flyway.info().all();

        assertThat(flyway.info().pending()).isEmpty();
        assertThat(migrations)
                .allSatisfy(m -> assertThat(m.getState()).isEqualTo(MigrationState.SUCCESS));
        assertThat(Arrays.stream(migrations).map(m -> m.getVersion().getVersion()))
                .contains("1.1", "13", "14");
    }

    @Test
    void leReferentielGeographiqueEstCharge() {
        Integer quartiers = jdbc.queryForObject("SELECT COUNT(*) FROM localisation", Integer.class);

        assertThat(quartiers).isEqualTo(743);
    }
}
