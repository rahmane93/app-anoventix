import type { Localisation } from '../types/annonce.types';
import { apiClient } from './client';

// ─── Helper : dépagination ────────────────────────────────────────────────────

// Fetch toutes les pages d'un endpoint paginé ou non (taille max 100 par page).
const fetchAllPages = async (url: string): Promise<Localisation[]> => {
  const first = await apiClient.get<any>(url, { params: { size: 100, page: 0 } });
  const p0: any = first.data;
  if (Array.isArray(p0)) return p0 as Localisation[];
  if (!p0?.data) return [];
  const items: Localisation[] = [...p0.data];
  const totalPages: number = p0.totalPages ?? 1;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        apiClient.get<any>(url, { params: { size: 100, page: i + 1 } })
          .then(r => { const p: any = r.data; return Array.isArray(p?.data) ? (p.data as Localisation[]) : []; }),
      ),
    );
    items.push(...rest.flat());
  }
  // Déduplique par id — évite les doublons liés au décalage de pagination offset
  const seen = new Set<string>();
  return items.filter(item => {
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ─── Localisation API ─────────────────────────────────────────────────────────

export const getAllLocalisations = async (): Promise<Localisation[]> =>
  fetchAllPages('/api/localisations');

export const getLocalisationsByRegion = async (region: string): Promise<Localisation[]> =>
  fetchAllPages(`/api/localisations/region/${encodeURIComponent(region)}`);

/**
 * Entrée « Autre quartier » d'une commune, à utiliser comme localisation quand le quartier de l'annonceur
 * n'est pas dans la liste (avec `quartierSaisi`).
 */
export const getAutreQuartier = async (region: string, prefecture: string, commune: string): Promise<Localisation> =>
  (await apiClient.get<Localisation>('/api/localisations/autre-quartier', { params: { region, prefecture, commune } })).data;

/** Régions du référentiel, triées (ECART-59). */
export const getRegions = async (): Promise<string[]> =>
  (await apiClient.get<string[]>('/api/localisations/regions')).data;

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export type LocalisationPayload = Omit<Localisation, 'id'>;

export const createLocalisation = async (body: LocalisationPayload): Promise<Localisation> => {
  const res = await apiClient.post<Localisation>('/api/localisations', body);
  const payload: any = res.data as any;
  return (payload?.data ?? payload) as Localisation;
};

export const updateLocalisation = async (id: string, body: LocalisationPayload): Promise<Localisation> => {
  const res = await apiClient.put<Localisation>(`/api/localisations/${encodeURIComponent(id)}`, body);
  const payload: any = res.data as any;
  return (payload?.data ?? payload) as Localisation;
};

export const deleteLocalisation = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/localisations/${encodeURIComponent(id)}`);
};
