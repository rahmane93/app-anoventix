import type { BienImmo, PageResponse } from '../types/annonce.types';
import type {
    AgentDTO,
    CreateAgentRequest,
    CreateEntrepriseRequest,
    EntrepriseDTO,
    EntrepriseProfilResponse,
    UpdateEntrepriseRequest,
} from '../types/entreprise.types';
import { normalizeMediaUrls } from './annonce.api';
import { API_BASE_URL, apiClient } from './client';
import type { Operation } from './contrat';
import { multipartPut } from './multipart';

// ─── Entreprise API ───────────────────────────────────────────────────────────

/**
 * Le backend expose la photo de l'entreprise sous `photoProfil` (chemin relatif
 * `/uploads/...`), alors que l'app lit `photoUrl`. On harmonise le champ et on
 * préfixe l'URL absolue pour que l'image s'affiche.
 */
function normalizeEntreprise(raw: any): EntrepriseDTO {
  const rawPhoto: string | null = raw?.photoUrl ?? raw?.photoProfil ?? null;
  const photoUrl =
    rawPhoto && !/^https?:\/\//.test(rawPhoto)
      ? `${API_BASE_URL}${rawPhoto.startsWith('/') ? '' : '/'}${rawPhoto}`
      : rawPhoto;
  return { ...raw, photoUrl };
}

/**
 * Crée une entreprise pour l'utilisateur PROFESSIONNEL connecté.
 */
export const createEntreprise = async (
  data: CreateEntrepriseRequest,
): Promise<EntrepriseDTO> => {
  const response = await apiClient.post<EntrepriseDTO>('/api/entreprises', data);
  return normalizeEntreprise(response.data);
};

/**
 * Met à jour les informations de l'entreprise.
 */
export const updateEntreprise = async (
  id: string,
  data: UpdateEntrepriseRequest,
): Promise<EntrepriseDTO> => {
  const response = await apiClient.put<EntrepriseDTO>(`/api/entreprises/${id}`, data);
  return normalizeEntreprise(response.data);
};

/**
 * Récupère l'entreprise d'un utilisateur par son ID.
 */
export const getEntrepriseByUserId = async (userId: string): Promise<EntrepriseDTO> => {
  const response = await apiClient.get<EntrepriseDTO>(`/api/entreprises/user/${userId}`);
  return normalizeEntreprise(response.data);
};

/**
 * Récupère une entreprise par son ID (usage interne / authentifié).
 */
export const getEntrepriseById = async (id: string): Promise<EntrepriseDTO> => {
  const response = await apiClient.get<EntrepriseDTO>(`/api/entreprises/${id}`);
  return normalizeEntreprise(response.data);
};

/**
 * Récupère le profil public d'une entreprise avec ses annonces paginées.
 */
export const getEntrepriseProfil = async (
  id: string,
  page = 0,
  size = 20,
): Promise<EntrepriseProfilResponse> => {
  // Paramètres typés par le contrat de l'API : un nom erroné (ex. « limit »)
  // ne compile plus.
  const params: Operation<'getEntrepriseProfil'>['parameters']['query'] = { page, size };
  const response = await apiClient.get<EntrepriseProfilResponse>(
    `/api/entreprises/${id}/profil`,
    { params },
  );
  return response.data;
};

/** MAX_PAGE_SIZE de EntrepriseController. */
const ANNONCES_PAGE_SIZE = 50;
/** Garde-fou : 1 000 annonces au plus. */
const MAX_ANNONCES_PAGES = 20;

/**
 * Récupère les annonces liées à une entreprise.
 * Le backend peut renvoyer soit un tableau direct, soit une page { data: [...] }.
 */
export const getEntrepriseAnnonces = async (entrepriseId: string): Promise<BienImmo[]> => {
  // L'API pagine (10 par défaut, 50 max) : on charge toutes les pages, sinon
  // l'écran Entreprise n'affiche et ne compte que les 10 plus récentes.
  const all: BienImmo[] = [];
  for (let page = 0; page < MAX_ANNONCES_PAGES; page++) {
    const response = await apiClient.get<BienImmo[] | PageResponse<BienImmo>>(
      `/api/entreprises/${entrepriseId}/annonces`,
      { params: { page, size: ANNONCES_PAGE_SIZE } },
    );
    // Même normalisation que les autres listes : URLs des médias, statut CLOTUREE.
    if (Array.isArray(response.data)) return response.data.map(normalizeMediaUrls);
    all.push(...(response.data.data ?? []).map(normalizeMediaUrls));
    if (page + 1 >= (response.data.totalPages ?? 1)) break;
  }
  return all;
};

/**
 * Récupère la liste des agents d'une entreprise.
 * Le backend peut renvoyer soit un tableau direct, soit une page { data: [...] }.
 */
export const getEntrepriseAgents = async (entrepriseId: string): Promise<AgentDTO[]> => {
  const response = await apiClient.get<AgentDTO[] | PageResponse<AgentDTO>>(
    `/api/entreprises/${entrepriseId}/agents`,
  );
  return Array.isArray(response.data) ? response.data : (response.data.data ?? []);
};

/**
 * Crée un agent rattaché à une entreprise.
 * L'agent reçoit par email un lien d'invitation (usage unique, 7 jours) pour choisir son mot de passe.
 */
export const createAgent = async (
  entrepriseId: string,
  data: CreateAgentRequest,
): Promise<AgentDTO> => {
  const response = await apiClient.post<AgentDTO>(
    `/api/entreprises/${entrepriseId}/agents`,
    data,
  );
  return response.data;
};

/**
 * Retire un agent de l'entreprise (réponse 204 sans corps).
 */
export const deleteAgent = async (
  entrepriseId: string,
  agentId: string,
): Promise<void> => {
  const response = await apiClient.delete(
    `/api/entreprises/${entrepriseId}/agents/${agentId}`,
  );
  // 204 No Content — pas de corps à lire
  if (response.status !== 204 && response.status !== 200) {
    throw { message: `Erreur inattendue (${response.status})`, status: response.status };
  }
};

/**
 * Suspend un agent de l'entreprise.
 */
export const suspendAgent = async (
  entrepriseId: string,
  agentId: string,
): Promise<void> => {
  const response = await apiClient.put(
    `/api/entreprises/${entrepriseId}/agents/${agentId}/suspendre`,
  );
  if (response.status !== 204 && response.status !== 200) {
    throw { message: `Erreur inattendue (${response.status})`, status: response.status };
  }
};

/**
 * Réactive un agent de l'entreprise.
 */
export const activateAgent = async (
  entrepriseId: string,
  agentId: string,
): Promise<void> => {
  const response = await apiClient.put(
    `/api/entreprises/${entrepriseId}/agents/${agentId}/activer`,
  );
  if (response.status !== 204 && response.status !== 200) {
    throw { message: `Erreur inattendue (${response.status})`, status: response.status };
  }
};

/**
 * Upload la photo de l'entreprise.
 * PUT /api/entreprises/{id}/photo (multipart)
 */
export const uploadEntreprisePhoto = async (
  entrepriseId: string,
  file: { uri: string; name: string; type: string },
): Promise<EntrepriseDTO> => {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  const json = await multipartPut<any>(`/api/entreprises/${entrepriseId}/photo`, formData);
  return normalizeEntreprise(json);
};

/**
 * Désactive (supprime) une entreprise.
 * DELETE /api/entreprises/{id}
 */
export const deleteEntreprise = async (entrepriseId: string): Promise<void> => {
  await apiClient.delete(`/api/entreprises/${entrepriseId}`);
};

/** Renvoie l'invitation d'un agent qui n'a pas encore choisi son mot de passe (l'ancien lien est invalidé). */
export const renvoyerInvitation = async (entrepriseId: string, agentId: string): Promise<AgentDTO> => {
  const response = await apiClient.post<AgentDTO>(
    `/api/entreprises/${entrepriseId}/agents/${agentId}/invitation`,
  );
  return response.data;
};
