package com.app.AnnoncesAPI.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProStatsResponse {

    private PortefeuilleStats portefeuille;
    private VisibiliteStats visibilite;
    private MessagerieStats messagerie;
    /** Null pour les AGENT_PROFESSIONNEL. */
    private EquipeStats equipe;
    private ConformiteStats conformite;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PortefeuilleStats {
        private long annoncesPubliees;
        private long annoncesMasquees;
        private long annoncesRejetees;
        private long clotureesVenduCeMois;
        private long clotureesLoueCeMois;
        private long clotureesRetireCeMois;
        /** (vendu + loué) / total clôturées ce mois × 100. 0 si aucune clôture. */
        private double tauxConversionMois;
        /** Clé = nom du TypeAnnonce (VENTE / LOCATION), valeur = nombre d'annonces actives. */
        private Map<String, Long> repartitionParType;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VisibiliteStats {
        private long totalVues;
        private List<TopAnnonceItem> top5ParVues;
        private long totalFavoris;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopAnnonceItem {
        private long id;
        private String titre;
        private String referenceAnnonce;
        private long vueCount;
        private int nbFavoris;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessagerieStats {
        private long totalConversations;
        private long messagesNonLus;
        /** % des conversations sur ses annonces auxquelles l'utilisateur a répondu. */
        private double tauxReponse;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EquipeStats {
        private long agentsActifs;
        private long agentsSuspendus;
        private List<AgentPerf> performances;
        /** Libellé « Prénom Nom (email) » de l'agent avec le plus de vues. Null si aucune vue. */
        private String topAgentUsername;
        private String topAgentPrenom;
        private String topAgentNom;
        private String topAgentEmail;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentPerf {
        private UUID agentId;
        /** Libellé « Prénom Nom (email) », conservé pour les anciennes versions de l'app. */
        private String agentUsername;
        private String agentPrenom;
        private String agentNom;
        private String agentEmail;
        private long nbAnnonces;
        private long totalVues;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConformiteStats {
        private String statutPieceIdentite;
        private long nbAvertissements;
        private long annoncesActives;
        private int quotaMax;
        private int annoncesRestantes;
        private boolean canCreateAnnonce;
        /** quotaMax = annonces gratuites (mode licence actif, pas de licence valide) au lieu du quota entreprise. */
        private boolean limiteParLicence;
    }
}
