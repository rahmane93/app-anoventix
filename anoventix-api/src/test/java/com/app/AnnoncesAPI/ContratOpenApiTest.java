package com.app.AnnoncesAPI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;

/**
 * Contrat de l'API (OpenAPI), versionné dans openapi/openapi.json. L'app en génère
 * ses types TypeScript (npm run api:types), si bien qu'un champ renommé ou retiré
 * côté API casse la compilation de l'app au lieu de casser un écran en production.
 *
 * Ce test échoue si le contrat a changé sans que le fichier soit mis à jour.
 * Pour le régénérer : mvn test -Dtest=ContratOpenApiTest -Dcontrat.maj=true
 * puis, dans l'app : npm run api:types
 */
@SpringBootTest
class ContratOpenApiTest {

    private static final Path CONTRAT = Path.of("openapi", "openapi.json");

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper mapper;

    @Test
    void leContratVersionneEstAJour() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
        String json = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode actuel = mapper.readTree(json);

        if (Boolean.getBoolean("contrat.maj")) {
            Files.createDirectories(CONTRAT.getParent());
            Files.writeString(CONTRAT,
                    mapper.writer(SerializationFeature.INDENT_OUTPUT).writeValueAsString(actuel) + "\n",
                    StandardCharsets.UTF_8);
            return;
        }

        assertThat(CONTRAT).as("Contrat absent : lancer avec -Dcontrat.maj=true").exists();
        JsonNode versionne = mapper.readTree(Files.readString(CONTRAT, StandardCharsets.UTF_8));
        assertThat(actuel)
                .as("Le contrat de l'API a changé : mvn test -Dtest=ContratOpenApiTest -Dcontrat.maj=true, "
                        + "puis npm run api:types dans l'app")
                .isEqualTo(versionne);
    }
}
