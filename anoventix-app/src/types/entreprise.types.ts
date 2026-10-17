// ─── Entreprise ───────────────────────────────────────────────────────────────

import type { BienImmo } from './annonce.types';

/** Réponse du endpoint public GET /api/entreprises/{id}/profil */
export interface EntrepriseProfilDTO {
  id: string;
  nom: string;
  description: string | null;
  numeroRCCM: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  photoProfil: string | null;
  quotaAnnonces: number;
  quotaAgents: number;
  active: boolean;
  dateCreation: string;
  dateModification: string | null;
  annonceurProfessionnelId: string;
  annonceurProfessionnelEmail: string | null;
  nombreAgents: number;
  annoncesRestantes: number;
  agentsRestants: number;
}

export interface EntrepriseProfilResponse {
  entreprise: EntrepriseProfilDTO;
  annonces: BienImmo[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}



export interface AgentDTO {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  entrepriseId: string;
  statut: string;
}

export interface EntrepriseDTO {
  id: string;
  nom: string;
  description: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  numeroRCCM: string | null;
  photoUrl: string | null;
  proprietaireId: string;
  proprietaireUsername?: string | null;
  agents: AgentDTO[];
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export interface CreateEntrepriseRequest {
  nom: string;
  description?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  numeroRCCM?: string;
}

export type UpdateEntrepriseRequest = CreateEntrepriseRequest;

export interface CreateAgentRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}
