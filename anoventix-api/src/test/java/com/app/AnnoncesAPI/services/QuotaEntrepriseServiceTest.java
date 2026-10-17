package com.app.AnnoncesAPI.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.app.AnnoncesAPI.dto.EntrepriseDTO;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.ParametrePlateforme;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.mappers.EntrepriseMapper;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.ParametrePlateformeRepository;

/** Quotas pro : valeur globale, exception par entreprise, décompte des agents. */
class QuotaEntrepriseServiceTest {

    private final ParametrePlateformeRepository params = mock(ParametrePlateformeRepository.class);
    private final BienImmoRepository biens = mock(BienImmoRepository.class);
    private final EntrepriseRepository entreprises = mock(EntrepriseRepository.class);
    private final EntrepriseMapper mapper = mock(EntrepriseMapper.class);
    private final QuotaEntrepriseService service = new QuotaEntrepriseService(params, biens, entreprises, mapper);

    private Entreprise entreprise;
    private User proprietaire;

    @BeforeEach
    void setUp() {
        when(params.findById(any())).thenReturn(Optional.empty());
        when(mapper.toDTO(any())).thenAnswer(inv -> new EntrepriseDTO());

        proprietaire = user(StatutUtilisateur.ACTIF);
        entreprise = new Entreprise();
        entreprise.setId(UUID.randomUUID());
        entreprise.setAnnonceurProfessionnel(proprietaire);
        entreprise.setAgents(new ArrayList<>(List.of(proprietaire)));
    }

    private static User user(StatutUtilisateur statut) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setStatut(statut);
        return u;
    }

    @Test
    void valeursGlobalesParDefaut() {
        assertEquals(5, service.quotaAgents(entreprise));
        assertEquals(50, service.quotaAnnonces(entreprise));
    }

    @Test
    void valeurGlobaleReglee() {
        when(params.findById(QuotaEntrepriseService.PARAM_QUOTA_AGENTS))
                .thenReturn(Optional.of(new ParametrePlateforme(QuotaEntrepriseService.PARAM_QUOTA_AGENTS, "8")));
        assertEquals(8, service.quotaAgents(entreprise));
    }

    @Test
    void exceptionDeLEntreprisePrioritaire() {
        entreprise.setQuotaAgents(12);
        assertEquals(12, service.quotaAgents(entreprise));
        assertEquals(50, service.quotaAnnonces(entreprise));
    }

    @Test
    void neCompteNiLeProprietaireNiLesAgentsRetires() {
        entreprise.getAgents().add(user(StatutUtilisateur.ACTIF));
        entreprise.getAgents().add(user(StatutUtilisateur.SUSPENDU));
        entreprise.getAgents().add(user(StatutUtilisateur.INACTIF));

        assertEquals(2, service.nombreAgents(entreprise));
    }

    @Test
    void bloqueLAjoutAuQuota() {
        entreprise.setQuotaAgents(1);
        assertTrue(service.peutAjouterAgent(entreprise));
        entreprise.getAgents().add(user(StatutUtilisateur.ACTIF));
        assertFalse(service.peutAjouterAgent(entreprise));
    }

    @Test
    void dtoAvecQuotasEffectifsEtVraisRestants() {
        entreprise.getAgents().add(user(StatutUtilisateur.ACTIF));
        entreprise.setQuotaAnnonces(10);
        when(biens.countActiveAnnoncesByEntreprise(entreprise.getId())).thenReturn(4L);

        EntrepriseDTO dto = service.toDTO(entreprise);

        assertEquals(5, dto.getQuotaAgents());
        assertEquals(10, dto.getQuotaAnnonces());
        assertEquals(1, dto.getNombreAgents());
        assertEquals(4, dto.getAgentsRestants());
        assertEquals(6, dto.getAnnoncesRestantes());
        assertFalse(dto.getQuotaAgentsPersonnalise());
        assertTrue(dto.getQuotaAnnoncesPersonnalise());
    }
}
