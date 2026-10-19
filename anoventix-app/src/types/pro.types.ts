// ─── Blocs de réponse /api/stats/pro ─────────────────────────────────────────

// Miroir de ProStatsResponse (API) : champs à plat, pas de dictionnaires.
export interface ProStatsPortefeuille {
  annoncesPubliees: number;
  annoncesMasquees: number;
  annoncesRejetees: number;
  clotureesVenduCeMois: number;
  clotureesLoueCeMois: number;
  clotureesRetireCeMois: number;
  tauxConversionMois: number;
  repartitionParType: Record<string, number>;
}

export interface ProStatsTop5Item {
  id: number;
  titre: string;
  referenceAnnonce: string;
  vueCount: number;
  nbFavoris: number;
}

export interface ProStatsVisibilite {
  totalVues: number;
  top5ParVues: ProStatsTop5Item[];
  totalFavoris: number;
}

export interface ProStatsMessagerie {
  totalConversations: number;
  messagesNonLus: number;
  tauxReponse: number;
}

export interface ProStatsAgentPerf {
  agentId: string;
  /** « Prénom Nom (email) » : repli pour une API sans les champs séparés. */
  agentUsername: string;
  agentNom?: string | null;
  agentPrenom?: string | null;
  agentEmail?: string | null;
  nbAnnonces: number;
  totalVues: number;
}

export interface ProStatsEquipe {
  agentsActifs: number;
  agentsSuspendus: number;
  performances: ProStatsAgentPerf[];
  topAgentUsername: string | null;
  topAgentNom?: string | null;
  topAgentPrenom?: string | null;
  topAgentEmail?: string | null;
}

export interface ProStatsConformite {
  statutPieceIdentite: string | null;
  nbAvertissements: number;
  annoncesActives: number;
  quotaMax: number;
  annoncesRestantes: number;
  canCreateAnnonce: boolean;
  /** quotaMax = annonces gratuites (mode licence actif, pas de licence valide) au lieu du quota entreprise. */
  limiteParLicence: boolean;
  /** Raison pour laquelle la publication est impossible (pièce, masquage, entreprise, quota, licence). */
  motifPublicationImpossible?: string | null;
}

export interface ProStats {
  /** ENTREPRISE : le professionnel et ses agents ; PERSONNEL : le compte seul. */
  perimetre?: 'ENTREPRISE' | 'PERSONNEL';
  portefeuille: ProStatsPortefeuille;
  visibilite: ProStatsVisibilite;
  messagerie: ProStatsMessagerie;
  equipe: ProStatsEquipe | null;
  conformite: ProStatsConformite;
}
