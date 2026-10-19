// ─── Entreprise ───────────────────────────────────────────────────────────────

import type { BienImmo } from './annonce.types';

/**
 * Réponse du endpoint public GET /api/entreprises/{id}/profil : ce que le public voit d'une agence.
 * Le téléphone et l'email ne sont fournis qu'à un utilisateur connecté (DEC-14) ; ni RCCM, ni quotas,
 * ni email du propriétaire (DEC-14).
 */
export interface EntrepriseProfilDTO {
  id: string;
  nom: string;
  description: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  photoProfil: string | null;
  nombreAgents: number;
  /** Badge « Agence vérifiée » (DEC-04). */
  verifiee?: boolean;
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
  /** Vérification sur justificatif RCCM (DEC-04). */
  statutVerification?: 'NON_VERIFIEE' | 'EN_ATTENTE' | 'VERIFIEE' | 'REJETEE';
  motifRejetVerification?: string | null;
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
