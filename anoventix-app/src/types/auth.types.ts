// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface SignupRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  password: string;
  role: string;
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
}

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
