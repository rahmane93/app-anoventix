import { create } from 'zustand';
import * as annonceApi from '../api/annonce.api';
import * as localisationApi from '../api/localisation.api';
import { parseAnnonceParam } from '../lib/annonce-url';
import type { BienImmo, CreateBienImmoRequest, Localisation, MotifCloture, NearbyParams, UpdateBienImmoRequest } from '../types/annonce.types';
import { getErrorMessage } from '../utils/format';

// Régions de Guinée — liste fixe (pas d'endpoint GET /api/localisations)
export const REGIONS_GUINEE = [
  'Conakry',
  'Boké',
  'Kindia',
  'Mamou',
  'Labé',
  'Faranah',
  'Kankan',
  "N'Zérékoré",
];

const MES_ANNONCES_PAGE_SIZE = 20;

/**
 * Recharge une annonce de « Mes annonces » depuis le serveur (statut, clôture, date
 * d'expiration recalculés côté serveur). Silencieux en cas d'échec : l'état optimiste reste.
 */
async function rafraichirMonAnnonce(
  id: number,
  set: (fn: (s: AnnonceStore) => Partial<AnnonceStore>) => void,
): Promise<void> {
  try {
    const fraiche = await annonceApi.getAnnonceById(id);
    set((s) => ({ mesAnnonces: s.mesAnnonces.map((a) => (a.id === id ? fraiche : a)) }));
  } catch {
    // réseau : on garde la mise à jour optimiste
  }
}

// ─── Interface ────────────────────────────────────────────────────────────────

interface AnnonceStore {
  isLoadingLoc: boolean;
  isCreating: boolean;
  isLoading: boolean;
  publicListStale: boolean;
  mesAnnonces: BienImmo[];
  mesAnnoncesPage: number;
  mesAnnoncesTotalPages: number;
  isLoadingMoreMesAnnonces: boolean;
  currentAnnonce: BienImmo | null;
  similaires: BienImmo[];
  nearbyResults: BienImmo[];
  error: string | null;

  loadLocalisationsByRegion: (region: string) => Promise<Localisation[]>;
  createAnnonce: (
    req: CreateBienImmoRequest,
    onPhotoUploaded?: (done: number, total: number) => void,
  ) => Promise<BienImmo>;
  updateAnnonce: (id: number, req: UpdateBienImmoRequest) => Promise<BienImmo>;
  deleteAnnonce: (id: number) => Promise<void>;
  loadMesAnnonces: () => Promise<void>;
  loadMoreMesAnnonces: () => Promise<void>;
  clearPublicListStale: () => void;
  /** `param` = segment d'URL de la fiche : « slug-publicId » ou ancien id numérique. */
  loadAnnonce: (param: string) => Promise<void>;
  clearCurrentAnnonce: () => void;
  loadSimilaires: (id: number, max?: number) => Promise<void>;
  loadNearby: (params: NearbyParams) => Promise<void>;
  cloturerAnnonce: (id: number, motif: MotifCloture) => Promise<void>;
  reactiverAnnonce: (id: number) => Promise<void>;
  toggleActifAnnonce: (id: number) => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAnnonceStore = create<AnnonceStore>((set, get) => ({
  isLoadingLoc: false,
  isCreating: false,
  isLoading: false,
  publicListStale: false,
  mesAnnonces: [],
  mesAnnoncesPage: 0,
  mesAnnoncesTotalPages: 1,
  isLoadingMoreMesAnnonces: false,
  currentAnnonce: null,
  similaires: [],
  nearbyResults: [],
  error: null,

  /**
   * Charge les localisations d'une région spécifique.
   * Retourne la liste pour que le composant puisse filtrer préfectures / communes / quartiers.
   */
  loadLocalisationsByRegion: async (region) => {
    set({ isLoadingLoc: true, error: null });
    try {
      const list = await localisationApi.getLocalisationsByRegion(region);
      const safeList = Array.isArray(list) ? list : [];
      set({ isLoadingLoc: false });
      return safeList;
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de charger les localisations.'), isLoadingLoc: false });
      return [];
    }
  },

  /**
   * Crée une annonce immobilière et la retourne.
   */
  createAnnonce: async (req, onPhotoUploaded) => {
    set({ isCreating: true, error: null });
    try {
      const annonce = await annonceApi.createBienImmo(req, onPhotoUploaded);
      set({ isCreating: false, publicListStale: true });
      return annonce;
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de créer l'annonce."), isCreating: false });
      throw err;
    }
  },

  /**
   * Met à jour une annonce immobilière.
   */
  updateAnnonce: async (id, req) => {
    set({ isCreating: true, error: null });
    try {
      const annonce = await annonceApi.updateBienImmo(id, req);
      set({ isCreating: false });
      return annonce;
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de modifier l'annonce."), isCreating: false });
      throw err;
    }
  },

  deleteAnnonce: async (id) => {
    try {
      await annonceApi.deleteAnnonce(id);
      set((s) => ({ mesAnnonces: s.mesAnnonces.filter((a) => a.id !== id) }));
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de supprimer l'annonce.") });
      throw err;
    }
  },

  /**
   * Charge les annonces de l'utilisateur connecté.
   */
  loadMesAnnonces: async () => {
    set({ isLoading: true, error: null });
    try {
      const page = await annonceApi.getMesAnnonces(0, MES_ANNONCES_PAGE_SIZE);
      set({
        mesAnnonces: page.data,
        mesAnnoncesPage: page.currentPage ?? 0,
        mesAnnoncesTotalPages: page.totalPages ?? 1,
        isLoading: false,
      });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de charger vos annonces.'), isLoading: false });
    }
  },

  /**
   * Charge la page suivante de « Mes annonces » (scroll infini).
   */
  loadMoreMesAnnonces: async () => {
    const { isLoadingMoreMesAnnonces, isLoading, mesAnnoncesPage, mesAnnoncesTotalPages } = get();
    if (isLoadingMoreMesAnnonces || isLoading) return;
    if (mesAnnoncesPage >= mesAnnoncesTotalPages - 1) return;
    set({ isLoadingMoreMesAnnonces: true });
    try {
      const next = mesAnnoncesPage + 1;
      const page = await annonceApi.getMesAnnonces(next, MES_ANNONCES_PAGE_SIZE);
      set((s) => ({
        mesAnnonces: [...s.mesAnnonces, ...page.data],
        mesAnnoncesPage: page.currentPage ?? next,
        mesAnnoncesTotalPages: page.totalPages ?? s.mesAnnoncesTotalPages,
        isLoadingMoreMesAnnonces: false,
      }));
    } catch {
      set({ isLoadingMoreMesAnnonces: false });
    }
  },

  clearPublicListStale: () => set({ publicListStale: false }),

  /**
   * Charge le détail d'une annonce à partir du segment d'URL de sa fiche.
   */
  loadAnnonce: async (param) => {
    set({ isLoading: true, error: null, currentAnnonce: null });
    try {
      const ref = parseAnnonceParam(param);
      const annonce = ref.kind === 'id'
        ? await annonceApi.getAnnonceById(ref.id)
        : await annonceApi.getAnnonceByPublicId(ref.publicId);
      set({ currentAnnonce: annonce, isLoading: false });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de charger l'annonce."), isLoading: false });
    }
  },

  clearCurrentAnnonce: () => set({ currentAnnonce: null }),

  /**
   * Charge les annonces similaires à une annonce donnée.
   */
  loadSimilaires: async (id, max = 5) => {
    try {
      const list = await annonceApi.getAnnonceSimilaires(id, max);
      set({ similaires: list });
    } catch {
      set({ similaires: [] });
    }
  },

  /**
   * Recherche géospatiale par proximité.
   */
  loadNearby: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const page = await annonceApi.getAnnoncesNearby(params);
      set({ nearbyResults: page.data, isLoading: false });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de charger les annonces à proximité.'), isLoading: false });
    }
  },

  // Ces endpoints renvoient 204 No Content (pas de corps) : on ne lit donc PAS
  // la réponse — on met à jour localement le seul champ impacté (évite le crash
  // dû à un objet vide injecté dans la liste).
  cloturerAnnonce: async (id, motif) => {
    set({ error: null });
    try {
      await annonceApi.cloturerAnnonce(id, motif);
      set((s) => ({
        mesAnnonces: s.mesAnnonces.map((a) =>
          a.id === id ? { ...a, statutModeration: 'CLOTUREE', motifCloture: motif, actif: false } : a,
        ),
      }));
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de clôturer cette annonce.') });
      throw err;
    }
  },

  reactiverAnnonce: async (id) => {
    set({ error: null });
    try {
      await annonceApi.reactiverAnnonce(id);
      set((s) => ({
        mesAnnonces: s.mesAnnonces.map((a) =>
          a.id === id ? { ...a, statutModeration: 'PUBLIEE', motifCloture: null, actif: true } : a,
        ),
      }));
      // Le serveur a repoussé la date d'expiration : on resynchronise l'annonce.
      await rafraichirMonAnnonce(id, set);
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de réactiver cette annonce.') });
      throw err;
    }
  },

  toggleActifAnnonce: async (id) => {
    set({ error: null });
    try {
      await annonceApi.toggleActifAnnonce(id);
      set((s) => ({
        mesAnnonces: s.mesAnnonces.map((a) => (a.id === id ? { ...a, actif: !a.actif } : a)),
      }));
      await rafraichirMonAnnonce(id, set);
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de modifier la visibilité de l'annonce.") });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
