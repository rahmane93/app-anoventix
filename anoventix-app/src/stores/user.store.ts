import { create } from 'zustand';
import * as userApi from '../api/user.api';
import type { TypePieceIdentite, UpdateProfileRequest, UserProfile } from '../types/user.types';
import { getErrorMessage } from '../utils/format';

// ─── Interface ────────────────────────────────────────────────────────────────

interface UserStore {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  uploadingPiece: boolean;
  isDeletingAccount: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  reset: () => void;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  uploadPhoto: (file: { uri: string; name: string; type: string }, photoType?: 'profil') => Promise<void>;
  uploadPieceIdentite: (
    piece: { uri: string; name: string; type: string },
    selfie: { uri: string; name: string; type: string },
    typePiece: TypePieceIdentite,
    numeroPiece: string,
  ) => Promise<void>;
  /** Selfie seul, pour un dossier envoyé avant la mise en service du selfie. */
  uploadSelfie: (selfie: { uri: string; name: string; type: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  isLoading: false,
  isSaving: false,
  uploadingPiece: false,
  isDeletingAccount: false,
  error: null,

  /**
   * Charge le profil depuis le serveur.
   */
  fetchProfile: async () => {
    set({ isLoading: true, error: null, profile: null });
    try {
      const profile = await userApi.getProfile();
      set({ profile });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de charger le profil.') });
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => set({ profile: null, isLoading: false, isSaving: false, error: null }),

  /**
   * Met à jour les champs du profil.
   */
  updateProfile: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const profile = await userApi.updateProfile(data);
      set({ profile });
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: Record<string, string> | null };
      const fieldMsgs = apiErr?.errors ? Object.values(apiErr.errors).filter(Boolean) : [];
      const errorMsg = fieldMsgs.length > 0
        ? fieldMsgs.join(' · ')
        : getErrorMessage(err, 'Impossible de sauvegarder le profil.');
      set({ error: errorMsg });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Upload de la photo de profil.
   */
  uploadPhoto: async (file, photoType) => {
    set({ isSaving: true, error: null });
    try {
      const profile = await userApi.uploadPhoto(file, photoType);
      set({ profile });
    } catch (err: unknown) {
      const error = err as { message?: string };
      set({ error: error?.message ?? 'Impossible d\'uploader la photo.' });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Upload du document d'identité (pièce CNI / Passeport / Permis).
   * Après l'upload, le statut est EN_ATTENTE côté serveur.
   * Le profil est rechargé pour refléter le nouveau champ pieceIdentite.
   */
  uploadPieceIdentite: async (piece, selfie, typePiece, numeroPiece) => {
    set({ uploadingPiece: true, error: null });
    try {
      await userApi.uploadPieceIdentite(piece, selfie, typePiece, numeroPiece);
      // Recharge le profil complet pour afficher le statut exact retourné par le serveur
      const profile = await userApi.getProfile();
      set({ profile });
    } catch (err: unknown) {
      const error = err as { message?: string };
      set({ error: error?.message ?? 'Impossible d\'uploader la pièce.' });
      throw err;
    } finally {
      set({ uploadingPiece: false });
    }
  },

  uploadSelfie: async (selfie) => {
    set({ uploadingPiece: true, error: null });
    try {
      await userApi.uploadSelfie(selfie);
      set({ profile: await userApi.getProfile() });
    } catch (err: unknown) {
      const error = err as { message?: string };
      set({ error: error?.message ?? "Impossible d'envoyer le selfie." });
      throw err;
    } finally {
      set({ uploadingPiece: false });
    }
  },

  /**
   * Supprime le compte de l'utilisateur connecté (soft delete).
   */
  deleteAccount: async () => {
    set({ isDeletingAccount: true, error: null });
    try {
      await userApi.deleteAccount();
      set({ profile: null });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de supprimer le compte.') });
      throw err;
    } finally {
      set({ isDeletingAccount: false });
    }
  },

  clearError: () => set({ error: null }),
}));
