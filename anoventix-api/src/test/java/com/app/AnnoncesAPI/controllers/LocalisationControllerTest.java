package com.app.AnnoncesAPI.controllers;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.repositories.LocalisationRepository;

@SpringBootTest
public class LocalisationControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private LocalisationRepository localisationRepository;

    private MockMvc mockMvc;
    private static final String LOC_ID = "test-loc-region-001";

    @BeforeEach
    void setup() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

        if (!localisationRepository.existsById(LOC_ID)) {
            Localisation loc = new Localisation();
            loc.setId(LOC_ID);
            loc.setRegion("Boké");
            loc.setPrefecture("Boké");
            loc.setCommune("Boké Centre");
            loc.setQuartier("Centre");
            localisationRepository.save(loc);
        }
    }

    @Test
    void testGetAllLocalisations() throws Exception {
        mockMvc.perform(get("/api/localisations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray()); // réponse paginée (PageResponse)
    }

    @Test
    void testGetLocalisationById_found() throws Exception {
        mockMvc.perform(get("/api/localisations/{id}", LOC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(LOC_ID));
    }

    @Test
    void testGetLocalisationById_notFound() throws Exception {
        mockMvc.perform(get("/api/localisations/nonexistent-id-xyz"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetByCommune() throws Exception {
        mockMvc.perform(get("/api/localisations/commune/{commune}", "Boké Centre"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray()); // réponse paginée (PageResponse)
    }

    @Test
    void testGetByPrefecture() throws Exception {
        mockMvc.perform(get("/api/localisations/prefecture/{prefecture}", "Boké"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray()); // réponse paginée (PageResponse)
    }

    @Test
    void testGetByRegion() throws Exception {
        mockMvc.perform(get("/api/localisations/region/{region}", "Boké"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray()); // réponse paginée (PageResponse)
    }
}
