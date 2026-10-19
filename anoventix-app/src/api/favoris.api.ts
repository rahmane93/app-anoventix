import type { BienImmo, PageResponse } from '../types/annonce.types';
import { urlsAbsolues } from './annonce.api';
import { apiClient } from './client';

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractFavorisIds(payload: any): number[] | null {
  if (Array.isArray(payload?.favorisIds)) {
    return payload.favorisIds.filter((id: unknown): id is number => typeof id === 'number');
  }

  if (Array.isArray(payload)) {
    return payload.filter((id: unknown): id is number => typeof id === 'number');
  }

  if (Array.isArray(payload?.favoris)) {
    return payload.favoris
      .map((item: unknown) => {
        if (typeof item === 'number') return item;
        if (item && typeof item === 'object' && 'id' in item && typeof (item as { id?: unknown }).id === 'number') {
          return (item as { id: number }).id;
        }
        return null;
      })
      .filter((id: number | null): id is number => id != null);
  }

  return null;
}

function normalizeItem(item: BienImmo): BienImmo {
  return {
    ...item,
    medias: (item.medias ?? []).map(urlsAbsolues),
  };
}

// ─── Favoris API ──────────────────────────────────────────────────────────────

/**
 * Ajoute une annonce aux favoris.
 * POST /api/users/me/favoris/{annonceId}
 * Retourne le UserDTO avec favorisIds mis à jour.
 */
export const addFavori = async (annonceId: number): Promise<number[] | null> => {
  const res = await apiClient.post(`/api/users/me/favoris/${annonceId}`);
  return extractFavorisIds(res.data);
};

/**
 * Retire une annonce des favoris.
 * DELETE /api/users/me/favoris/{annonceId}
 */
export const removeFavori = async (annonceId: number): Promise<number[] | null> => {
  const res = await apiClient.delete(`/api/users/me/favoris/${annonceId}`);
  return extractFavorisIds(res.data);
};

/**
 * Récupère la liste paginée des favoris de l'utilisateur.
 * GET /api/users/me/favoris?page=0&size=10
 */
export const getFavoris = async (page = 0, size = 20): Promise<PageResponse<BienImmo>> => {
  const res = await apiClient.get<PageResponse<BienImmo>>('/api/users/me/favoris', {
    params: { page, size },
  });
  const data = (res.data.data ?? []).map(normalizeItem);
  return { ...res.data, data };
};
