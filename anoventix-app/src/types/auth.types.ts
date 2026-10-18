// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface SignupRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  password: string;
  role: string;
  /** Consentement aux CGU, enregistré par le serveur avec sa version (ECART-41). */
  acceptCgu: boolean;
}

export interface SigninRequest {
  identifier: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

// ─── Response Payloads ────────────────────────────────────────────────────────

export interface SigninResponse {
  token: string;
  refreshToken?: string;
  type: string;
  id: string;
  email: string;
  role: string[];
  mustChangePassword?: boolean;
  /** Codes de secours du staff, remis une seule fois à la première connexion avec double authentification. */
  codesSecours?: string[];
}

/**
 * Réponse (202) à la connexion d'un modérateur ou d'un administrateur : un code a été envoyé par
 * email, à saisir avant d'obtenir une session (double authentification).
 */
export interface VerificationRequise {
  verificationRequise: true;
  verificationId: string;
  methode: 'EMAIL';
  expireDansSecondes: number;
  message: string;
}

export type ResultatSignin = SigninResponse | VerificationRequise;

export const estVerificationRequise = (r: ResultatSignin): r is VerificationRequise =>
  'verificationRequise' in r && r.verificationRequise === true;

export interface MessageResponse {
  message: string;
}

/** Le backend invalide les anciens tokens : ceux-ci doivent remplacer les tokens stockés. */
export interface ChangePasswordResponse extends MessageResponse {
  token: string;
  refreshToken: string;
  type: string;
}

// ─── Auth State ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}
