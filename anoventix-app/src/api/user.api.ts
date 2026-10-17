import type {
    TypePieceIdentite,
    UpdateProfileRequest,
    UserProfile,
} from '../types/user.types';
import { apiClient } from './client';
import { multipartPost, multipartPut } from './multipart';

// ─── User API ─────────────────────────────────────────────────────────────────

/**
 * Récupère le profil de l'utilisateur connecté.
 */
export const getProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/api/users/me');
  return response.data;
};

/**
 * Met à jour les informations du profil.
 */
export const updateProfile = async (
  data: UpdateProfileRequest,
): Promise<UserProfile> => {
  const response = await apiClient.put<UserProfile>('/api/users/me', data);
  return response.data;
};

/**
 * Upload de la photo de profil.
 */
export const uploadPhoto = async (
  file: { uri: string; name: string; type: string },
  photoType: 'profil' = 'profil',
): Promise<UserProfile> => {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  formData.append('type', photoType);
  return multipartPut<UserProfile>('/api/users/me/photo', formData);
};

/**
 * Uploade la pièce d'identité de l'utilisateur connecté.
 * Statut initial du document → EN_ATTENTE.
 */
export const uploadPieceIdentite = async (
  recto: { uri: string; name: string; type: string },
  typePiece: TypePieceIdentite,
  numeroPiece: string,
  verso?: { uri: string; name: string; type: string },
): Promise<void> => {
  const formData = new FormData();
  formData.append('file', { uri: recto.uri, name: recto.name, type: recto.type } as any);
  formData.append('typePieceIdentite', typePiece);
  formData.append('numeroPieceIdentite', numeroPiece);
  if (verso) {
    formData.append('fileVerso', { uri: verso.uri, name: verso.name, type: verso.type } as any);
  }
  await multipartPost<unknown>('/api/users/me/piece-identite', formData);
};

/**
 * Supprime le compte de l'utilisateur connecté : désactivation immédiate,
 * réactivable 30 jours, puis anonymisation (RGPD).
 * DELETE /api/users/me
 */
export const deleteAccount = async (): Promise<void> => {
  await apiClient.delete('/api/users/me');
};

/**
 * Export RGPD de toutes les données personnelles (JSON).
 * GET /api/users/me/export
 */
export const exportMesDonnees = async (): Promise<Record<string, unknown>> => {
  const response = await apiClient.get<Record<string, unknown>>('/api/users/me/export', {
    timeout: 30_000, // l'export agrège annonces, messages et transactions
  });
  return response.data;
};

/**
 * Récupère le profil public d'un utilisateur par son ID.
 * GET /api/users/{userId}
 */
export const getUserById = async (userId: string): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>(`/api/users/${userId}`);
  return response.data;
};

export interface UserPresence {
  userId: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeenAt: string | null;
}

export const getUserPresence = async (userId: string): Promise<UserPresence> => {
  const response = await apiClient.get<UserPresence>(`/api/users/${userId}/presence`);
  return response.data;
};
