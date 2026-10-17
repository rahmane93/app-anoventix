import { create } from 'zustand';
import * as favorisApi from '../api/favoris.api';
import type { BienImmo } from '../types/annonce.types';
import { getErrorMessage } from '../utils/format';
import { appAlert } from '../components/ui/app-alert';

// ─── Interface ────────────────────────────────────────────────────────────────

interface FavorisStore {
  favoris: BienImmo[];
  /** IDs des annonces favorites — synchronisé depuis l'API */
  favorisIds: number[];
  isLoading: boolean;
  /** Set des IDs dont le toggle est en cours — permet un loading par carte, pas global */
  togglingIds: Set<number>;
  error: string | null;

  /** Charge tous les favoris (page par page) et leurs IDs */
  loadFavoris: () => Promise<void>;
  /** Ajoute une annonce aux favoris */
  addFavori: (annonceId: number) => Promise<void>;
  /** Retire une annonce des favoris */
  removeFavori: (annonceId: number) => Promise<void>;
  /** Toggle : ajoute si absent, retire si présent */
  toggleFavori: (annonceId: number) => Promise<void>;
  /** Vérifie si une annonce est en favori */
  clearError: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FAVORIS_PAGE_SIZE = 50;
/** Garde-fou : 20 pages × 50 = 1 000 favoris. */
const FAVORIS_MAX_PAGES = 20;
/** Incrémenté à chaque chargement : un chargement dépassé cesse d'écrire dans le store. */
let loadSeq = 0;

function addToggling(s: FavorisStore, id: number): Set<number> {
  const next = new Set(s.togglingIds);
  next.add(id);
  return next;
}

function removeToggling(s: FavorisStore, id: number): Set<number> {
  const next = new Set(s.togglingIds);
  next.delete(id);
  return next;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFavorisStore = create<FavorisStore>((set, get) => ({
  favoris: [],
  favorisIds: [],
  isLoading: false,
  togglingIds: new Set(),
  error: null,

  loadFavoris: async () => {
    const seq = ++loadSeq;
    set({ isLoading: true, error: null });
    try {
      // favorisIds doit être complet (cœurs d'Explorer) : on parcourt toutes les pages.
      // La première page est affichée tout de suite, les suivantes sont ajoutées ensuite.
      const first = await favorisApi.getFavoris(0, FAVORIS_PAGE_SIZE);
      if (seq !== loadSeq) return;
      let favoris = first.data;
      set({ favoris, favorisIds: favoris.map((b) => b.id), isLoading: false });

      const lastPage = Math.min(first.totalPages ?? 1, FAVORIS_MAX_PAGES);
      for (let page = 1; page < lastPage; page++) {
        const next = await favorisApi.getFavoris(page, FAVORIS_PAGE_SIZE);
        if (seq !== loadSeq) return;
        const known = new Set(favoris.map((b) => b.id));
        favoris = [...favoris, ...next.data.filter((b) => !known.has(b.id))];
        set({ favoris, favorisIds: favoris.map((b) => b.id) });
      }
    } catch (err: unknown) {
      if (seq !== loadSeq) return;
      set({ error: getErrorMessage(err, 'Impossible de charger vos favoris.'), isLoading: false });
    }
  },

  addFavori: async (annonceId) => {
    set((s) => ({ togglingIds: addToggling(s, annonceId), error: null }));
    try {
      const ids = await favorisApi.addFavori(annonceId);
      set((s) => ({
        favorisIds: ids ?? (s.favorisIds.includes(annonceId) ? s.favorisIds : [...s.favorisIds, annonceId]),
        togglingIds: removeToggling(s, annonceId),
      }));
    } catch (err: unknown) {
      set((s) => ({ error: getErrorMessage(err, "Erreur lors de l'ajout aux favoris."), togglingIds: removeToggling(s, annonceId) }));
    }
  },

  removeFavori: async (annonceId) => {
    set((s) => ({ togglingIds: addToggling(s, annonceId), error: null }));
    try {
      const ids = await favorisApi.removeFavori(annonceId);
      set((s) => ({
        favorisIds: ids ?? s.favorisIds.filter((id) => id !== annonceId),
        favoris: s.favoris.filter((b) => b.id !== annonceId),
        togglingIds: removeToggling(s, annonceId),
      }));
    } catch (err: unknown) {
      set((s) => ({ error: getErrorMessage(err, 'Erreur lors de la suppression.'), togglingIds: removeToggling(s, annonceId) }));
    }
  },

  toggleFavori: async (annonceId) => {
    // Éviter les doubles appels en cas de tapotements rapides.
    if (get().togglingIds.has(annonceId)) return;

    const currentIds = get().favorisIds;
    const currentFavoris = get().favoris;
    const isCurrentFav = currentIds.includes(annonceId);

    // Optimistic update + verrouillage de la carte concernée uniquement
    if (isCurrentFav) {
      set((s) => ({
        togglingIds: addToggling(s, annonceId),
        error: null,
        favorisIds: s.favorisIds.filter((id) => id !== annonceId),
        favoris: s.favoris.filter((b) => b.id !== annonceId),
      }));
    } else {
      set((s) => ({
        togglingIds: addToggling(s, annonceId),
        error: null,
        favorisIds: [...s.favorisIds, annonceId],
      }));
    }

    try {
      if (isCurrentFav) {
        const ids = await favorisApi.removeFavori(annonceId);
        set((s) => ({
          favorisIds: ids ?? s.favorisIds.filter((id) => id !== annonceId),
          favoris: s.favoris.filter((b) => b.id !== annonceId),
          togglingIds: removeToggling(s, annonceId),
        }));
      } else {
        const ids = await favorisApi.addFavori(annonceId);
        set((s) => ({
          favorisIds: ids ?? (s.favorisIds.includes(annonceId) ? s.favorisIds : [...s.favorisIds, annonceId]),
          togglingIds: removeToggling(s, annonceId),
        }));
      }
    } catch (err: unknown) {
      // Annuler l'optimistic update en cas d'erreur, et prévenir l'utilisateur :
      // sans message, le cœur « revient » tout seul sans explication.
      const message = getErrorMessage(err, 'Erreur lors de la mise à jour des favoris.');
      set((s) => ({
        favorisIds: currentIds,
        favoris: currentFavoris,
        error: message,
        togglingIds: removeToggling(s, annonceId),
      }));
      appAlert('Favoris', message);
    }
  },


  clearError: () => set({ error: null }),
}));
