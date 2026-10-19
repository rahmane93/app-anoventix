import type {
    ChangePasswordRequest,
    ChangePasswordResponse,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    ResultatSignin,
    SigninRequest,
    SigninResponse,
    SignupRequest,
    VerificationRequise,
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
export const signin = async (data: SigninRequest): Promise<ResultatSignin> => {
  const response = await apiClient.post<ResultatSignin>('/api/auth/signin', {
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

// ─── Double authentification du staff ─────────────────────────────────────────

/** Saisie du code reçu par email (6 chiffres) ou d'un code de secours : ouvre la session. */
export const verifierCode = async (verificationId: string, code: string): Promise<SigninResponse> => {
  const response = await apiClient.post<SigninResponse>('/api/auth/verification-code', { verificationId, code });
  return response.data;
};

/** « Renvoyer le code » : annule le code en cours et en envoie un nouveau (3 renvois par 15 minutes). */
export const renvoyerCode = async (verificationId: string): Promise<VerificationRequise> => {
  const response = await apiClient.post<VerificationRequise>('/api/auth/verification-code/renvoyer', { verificationId });
  return response.data;
};

/** Nouveaux codes de secours (les précédents sont annulés) ; le mot de passe est redemandé. */
export const regenererCodesSecours = async (password: string): Promise<string[]> => {
  const response = await apiClient.post<{ codesSecours: string[] }>('/api/users/me/codes-secours', { password });
  return response.data.codesSecours;
};

// ─── Invitation d'un agent ────────────────────────────────────────────────────

/** L'agent invité choisit son mot de passe depuis le lien de l'email : son compte devient actif. */
export const accepterInvitation = async (token: string, password: string): Promise<MessageResponse> => {
  const response = await apiClient.post<MessageResponse>('/api/auth/accept-invitation', { token, password });
  return response.data;
};
