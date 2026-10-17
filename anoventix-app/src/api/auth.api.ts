import type {
    ChangePasswordRequest,
    ChangePasswordResponse,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    SigninRequest,
    SigninResponse,
    SignupRequest,
} from '../types/auth.types';
import { apiClient } from './client';

// ─── Auth API ─────────────────────────────────────────────────────────────────

/**
 * Inscription d'un nouvel utilisateur (particulier ou professionnel).
 * Envoie un email d'activation après inscription.
 */
export const signup = async (data: SignupRequest): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>('/api/auth/signup', data);
  return response.data;
};

/**
 * Connexion utilisateur. Retourne un token JWT et les infos utilisateur.
 */
export const signin = async (data: SigninRequest): Promise<SigninResponse> => {
  const response = await apiClient.post<SigninResponse>('/api/auth/signin', {
    identifier: data.identifier,
    password: data.password,
  });
  return response.data;
};

/**
 * Réactive un compte supprimé par son propriétaire (délai de grâce de 30 jours).
 * Même réponse qu'une connexion : la session est ouverte directement.
 */
export const reactivateAccount = async (data: SigninRequest): Promise<SigninResponse> => {
  const response = await apiClient.post<SigninResponse>('/api/auth/reactivate', {
    identifier: data.identifier,
    password: data.password,
  });
  return response.data;
};

/**
 * Renvoie le lien d'activation (réponse identique que le compte existe ou non).
 */
export const resendActivation = async (email: string): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>('/api/auth/resend-activation', { email });
  return response.data;
};

/**
 * Envoi d'un email de réinitialisation de mot de passe.
 */
export const forgotPassword = async (
  data: ForgotPasswordRequest,
): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>('/api/auth/forgot-password', data);
  return response.data;
};

/**
 * Réinitialisation du mot de passe avec le token reçu par email.
 * Corps JSON : { email, token, newPassword }
 */
export const resetPassword = async (
  data: ResetPasswordRequest,
): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>('/api/auth/reset-password', data);
  return response.data;
};

/**
 * Changement de mot de passe depuis le profil (utilisateur connecté).
 * Corps JSON : { oldPassword, newPassword }
 */
export const changePassword = async (
  data: ChangePasswordRequest,
): Promise<ChangePasswordResponse> => {
  const response = await apiClient.post<ChangePasswordResponse>('/api/auth/change-password', data);
  return response.data;
};

/**
 * Déconnexion côté serveur — invalide le token JWT et le refresh token.
 * POST /api/auth/logout
 */
export const logout = async (refreshToken: string | null): Promise<void> => {
  try {
    await apiClient.post('/api/auth/logout', refreshToken ? { refreshToken } : undefined);
  } catch {
    // Silencieux : même si le serveur échoue, on déconnecte localement
  }
};

/**
 * Activation de compte via le lien reçu par email.
 * GET /api/auth/activate?token=
 */
export const activateAccount = async (token: string): Promise<MessageResponse> => {
  const response = await apiClient.get<MessageResponse>('/api/auth/activate', {
    params: { token },
  });
  return response.data;
};
