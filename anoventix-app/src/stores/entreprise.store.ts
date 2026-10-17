import { create } from 'zustand';
import * as entrepriseApi from '../api/entreprise.api';
import type { BienImmo } from '../types/annonce.types';
import type {
  AgentDTO,
  CreateAgentRequest,
  CreateEntrepriseRequest,
  EntrepriseDTO,
  UpdateEntrepriseRequest,
} from '../types/entreprise.types';
import { getErrorMessage } from '../utils/format';

// ─── Interface ────────────────────────────────────────────────────────────────

interface EntrepriseStore {
  entreprise: EntrepriseDTO | null;
  annonces: BienImmo[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchByUserId: (userId: string) => Promise<void>;
  fetchById: (entrepriseId: string) => Promise<void>;
  fetchAgents: (entrepriseId: string) => Promise<void>;
  fetchAnnonces: (entrepriseId: string) => Promise<void>;
  createEntreprise: (data: CreateEntrepriseRequest) => Promise<EntrepriseDTO>;
  updateEntreprise: (id: string, data: UpdateEntrepriseRequest) => Promise<void>;
  addAgent: (entrepriseId: string, data: CreateAgentRequest) => Promise<AgentDTO>;
  suspendAgent: (entrepriseId: string, agentId: string) => Promise<void>;
  activateAgent: (entrepriseId: string, agentId: string) => Promise<void>;
  removeAgent: (entrepriseId: string, agentId: string) => Promise<void>;
  uploadPhoto: (entrepriseId: string, file: { uri: string; name: string; type: string }) => Promise<void>;
  deleteEntreprise: (entrepriseId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEntrepriseStore = create<EntrepriseStore>((set, get) => ({
  entreprise: null,
  annonces: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchAgents: async (entrepriseId) => {
    try {
      const agents = await entrepriseApi.getEntrepriseAgents(entrepriseId);
      const current = get().entreprise;
      if (current && current.id === entrepriseId) {
        set({ entreprise: { ...current, agents } });
      }
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de charger les agents de l'entreprise.") });
    }
  },

  /**
   * Charge l'entreprise d'un utilisateur (PROFESSIONNEL ou AGENT_PRO).
   * Retourne silencieusement si l'utilisateur n'a pas d'entreprise (404).
   */
  fetchByUserId: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const entreprise = await entrepriseApi.getEntrepriseByUserId(userId);
      const [agents, annonces] = await Promise.all([
        entrepriseApi.getEntrepriseAgents(entreprise.id),
        entrepriseApi.getEntrepriseAnnonces(entreprise.id),
      ]);
      const normalized = { ...entreprise, agents };
      set({ entreprise: normalized, annonces });
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        // L'utilisateur n'a pas encore d'entreprise — cas normal
        set({ entreprise: null, annonces: [] });
      } else {
        set({ error: getErrorMessage(err, "Impossible de charger l'entreprise.") });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Charge l'entreprise par son ID (utile pour un agent rattaché à une entreprise).
   */
  fetchById: async (entrepriseId) => {
    set({ isLoading: true, error: null });
    try {
      const entreprise = await entrepriseApi.getEntrepriseById(entrepriseId);
      const [agents, annonces] = await Promise.all([
        entrepriseApi.getEntrepriseAgents(entrepriseId),
        entrepriseApi.getEntrepriseAnnonces(entrepriseId),
      ]);
      const normalized = { ...entreprise, agents };
      set({ entreprise: normalized, annonces });
    } catch (err: unknown) {
      if ((err as any)?.status === 404) {
        set({ entreprise: null, annonces: [] });
      } else {
        set({ error: getErrorMessage(err, "Impossible de charger l'entreprise.") });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Recharge uniquement les annonces liées à l'entreprise.
   */
  fetchAnnonces: async (entrepriseId) => {
    try {
      const annonces = await entrepriseApi.getEntrepriseAnnonces(entrepriseId);
      set({ annonces });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de charger les annonces de l'entreprise.") });
    }
  },

  /**
   * Crée l'entreprise et la stocke en state.
   */
  createEntreprise: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const entreprise = await entrepriseApi.createEntreprise(data);
      const normalized = { ...entreprise, agents: [] };
      set({ entreprise: normalized, annonces: [] });
      return normalized;
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de créer l'entreprise.") });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Met à jour les informations de l'entreprise.
   */
  updateEntreprise: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const entreprise = await entrepriseApi.updateEntreprise(id, data);
      const currentAgents = get().entreprise?.agents ?? [];
      set({ entreprise: { ...entreprise, agents: currentAgents } });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de modifier l'entreprise.") });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Crée un agent et le rajoute à la liste locale.
   */
  addAgent: async (entrepriseId, data) => {
    set({ isSaving: true, error: null });
    try {
      const agent = await entrepriseApi.createAgent(entrepriseId, data);
      const agents = await entrepriseApi.getEntrepriseAgents(entrepriseId);
      const current = get().entreprise;
      if (current) {
        set({ entreprise: { ...current, agents } });
      }
      return agent;
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible d'inviter l\'agent.") });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Suspend un agent et recharge la liste serveur.
   */
  suspendAgent: async (entrepriseId, agentId) => {
    set({ isSaving: true, error: null });
    try {
      await entrepriseApi.suspendAgent(entrepriseId, agentId);
      const agents = await entrepriseApi.getEntrepriseAgents(entrepriseId);
      const current = get().entreprise;
      if (current) {
        set({ entreprise: { ...current, agents } });
      }
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de suspendre cet agent.') });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Réactive un agent et recharge la liste serveur.
   */
  activateAgent: async (entrepriseId, agentId) => {
    set({ isSaving: true, error: null });
    try {
      await entrepriseApi.activateAgent(entrepriseId, agentId);
      const agents = await entrepriseApi.getEntrepriseAgents(entrepriseId);
      const current = get().entreprise;
      if (current) {
        set({ entreprise: { ...current, agents } });
      }
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible d'activer cet agent.") });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Retire un agent et le supprime de la liste locale.
   * 204 No Content — pas de corps.
   */
  removeAgent: async (entrepriseId, agentId) => {
    set({ isSaving: true, error: null });
    try {
      await entrepriseApi.deleteAgent(entrepriseId, agentId);
      const agents = await entrepriseApi.getEntrepriseAgents(entrepriseId);
      const current = get().entreprise;
      if (current) {
        set({
          entreprise: {
            ...current,
            agents,
          },
        });
      }
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de retirer l'agent.") });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  uploadPhoto: async (entrepriseId, file) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await entrepriseApi.uploadEntreprisePhoto(entrepriseId, file);
      const currentAgents = get().entreprise?.agents ?? [];
      set({ entreprise: { ...updated, agents: currentAgents } });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de mettre à jour la photo.') });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  deleteEntreprise: async (entrepriseId) => {
    set({ isSaving: true, error: null });
    try {
      await entrepriseApi.deleteEntreprise(entrepriseId);
      set({ entreprise: null, annonces: [] });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, "Impossible de désactiver l'entreprise.") });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({ entreprise: null, annonces: [], isLoading: false, isSaving: false, error: null }),
}));
