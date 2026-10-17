import { create } from 'zustand';
import { getMaLicence } from '../api/licence.api';
import type { Licence } from '../types/licence.types';

/**
 * Licence de l'utilisateur connecté, partagée entre le profil, l'écran « Ma licence »
 * et les écrans d'annonceur qui doivent savoir si le compte est bloqué.
 */
interface LicenceStore {
  licence: Licence | null;
  load: () => Promise<Licence | null>;
  setLicence: (licence: Licence) => void;
  reset: () => void;
}

export const useLicenceStore = create<LicenceStore>((set) => ({
  licence: null,

  // Échec silencieux : sans réponse, on garde la dernière valeur connue
  // (le serveur reste l'autorité et répond 402 si le compte est bloqué).
  load: async () => {
    try {
      const licence = await getMaLicence();
      set({ licence });
      return licence;
    } catch {
      return null;
    }
  },

  setLicence: (licence) => set({ licence }),

  reset: () => set({ licence: null }),
}));
