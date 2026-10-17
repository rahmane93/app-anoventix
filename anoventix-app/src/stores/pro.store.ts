import { create } from 'zustand';
import * as proApi from '../api/pro.api';
import type { ProStats } from '../types/pro.types';

interface ProStore {
  stats: ProStats | null;
  isLoading: boolean;
  error: string | null;
  loadStats: () => Promise<void>;
}

export const useProStore = create<ProStore>((set, get) => ({
  stats: null,
  isLoading: false,
  error: null,

  loadStats: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const data = await proApi.getProStats();
      set({ stats: data, error: null });
    } catch (e: unknown) {
      const err = e as { message?: string };
      set({ error: err?.message ?? 'Impossible de charger le tableau de bord.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
