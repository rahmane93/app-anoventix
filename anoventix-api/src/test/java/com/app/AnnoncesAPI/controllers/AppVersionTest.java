package com.app.AnnoncesAPI.controllers;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/** Version minimale de l'app, lisible sans connexion (RG-12-21). */
@SpringBootTest
class AppVersionTest {

    @Autowired private WebApplicationContext context;

    @Test
    void laVersionMinimaleEstPublique() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build()
                .perform(get("/api/app/version"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionMinimale").value("1.0.0"))
                .andExpect(jsonPath("$.urlMiseAJour").isString());
    }
}
