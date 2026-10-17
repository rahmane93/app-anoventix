package com.app.AnnoncesAPI.controllers;

import com.app.AnnoncesAPI.payload.response.ProStatsResponse;
import com.app.AnnoncesAPI.services.ProStatsService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@Tag(name = "Statistiques PRO", description = "Tableau de bord pour PROFESSIONNEL et AGENT_PROFESSIONNEL")
public class ProStatsController {

    private final ProStatsService proStatsService;

    @GetMapping("/pro")
    @PreAuthorize("hasAnyRole('PROFESSIONNEL', 'AGENT_PROFESSIONNEL')")
    @Operation(summary = "Statistiques du tableau de bord pro",
               description = "Réservé aux rôles PROFESSIONNEL et AGENT_PROFESSIONNEL.\n\n"
                           + "Retourne 5 sections :\n"
                           + "- **portefeuille** : annonces par statut (PUBLIEE/MASQUEE/REJETEE), clôtures du mois "
                           + "par motif (VENDU/LOUE/RETIRE), tauxConversionMois, repartitionParType (VENTE/LOCATION)\n"
                           + "- **visibilite** : totalVues, top5ParVues [{id, titre, referenceAnnonce, vueCount, nbFavoris}], "
                           + "totalFavoris\n"
                           + "- **messagerie** : totalConversations, messagesNonLus, tauxReponse (%)\n"
                           + "- **equipe** : agentsActifs, agentsSuspendus, performances [{agentId, agentUsername, "
                           + "nbAnnonces, totalVues}], topAgentUsername. **null** pour un AGENT_PROFESSIONNEL.\n"
                           + "- **conformite** : statutPieceIdentite, nbAvertissements, annoncesActives, quotaMax, "
                           + "annoncesRestantes, canCreateAnnonce")
    public ResponseEntity<ProStatsResponse> getProStats(Authentication authentication) {
        return ResponseEntity.ok(proStatsService.getStats(authentication));
    }
}
