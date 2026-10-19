import { create } from 'zustand';
import * as authApi from '../api/auth.api';
import { getRefreshToken, getToken, removeRefreshToken, removeToken, saveRefreshToken, saveToken, setOnSessionExpired } from '../api/client';

import * as userApi from '../api/user.api';
import { effacerBrouillons } from '../features/publier/brouillon';
import { desenregistrer } from '../lib/push';
import { useUserStore } from './user.store';
import type {
    AuthUser,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResultatSignin,
    SigninRequest,
    SigninResponse,
    SignupRequest,
    VerificationRequise,
} from '../types/auth.types';
import { estVerificationRequise } from '../types/auth.types';

const toArray = (v: string | string[] | null | undefined): string[] => {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.filter(Boolean).map((r) => (r.startsWith('ROLE_') ? r : `ROLE_${r}`));
};

// ─── State Interface ──────────────────────────────────────────────────────────

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  isLoading: boolean;

  // Actions
  signin: (data: SigninRequest) => Promise<ResultatSignin>;

  // Double authentification du staff : code envoyé par email avant l'ouverture de la session.
  verification: VerificationRequise | null;
  /** Codes de secours à montrer avant d'entrer dans l'app (session retenue jusque-là). */
  codesSecoursARemettre: { codes: string[]; session: SigninResponse } | null;
  verifierCode: (code: string) => Promise<void>;
  renvoyerCode: () => Promise<void>;
  confirmerCodesSecours: () => Promise<void>;
  annulerVerification: () => void;
  reactivate: (data: SigninRequest) => Promise<SigninResponse>;
  resendActivation: (email: string) => Promise<string>;
  signup: (data: SignupRequest) => Promise<string>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<string>;
  resetPassword: (data: ResetPasswordRequest) => Promise<string>;
  changePassword: (data: ChangePasswordRequest) => Promise<string>;
  logout: () => Promise<void>;
  hydrateFromStorage: () => Promise<void>;
}

/** Stocke les tokens et marque la session comme ouverte (signin / réactivation). */
async function ouvrirSession(
  response: SigninResponse,
  set: (partial: Partial<AuthStore>) => void,
): Promise<void> {
  await saveToken(response.token);
  if (response.refreshToken) await saveRefreshToken(response.refreshToken);
  set({
    token: response.token,
    user: {
      id: response.id,
      email: response.email,
      roles: toArray(response.role),
    },
    isAuthenticated: true,
    mustChangePassword: response.mustChangePassword ?? false,
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  mustChangePassword: false,
  isLoading: true, // true au démarrage pour l'hydratation
  verification: null,
  codesSecoursARemettre: null,

  /**
   * Connexion : stocke le token et met à jour l'état. Pour un modérateur ou un administrateur,
   * aucune session n'est ouverte : le serveur demande d'abord le code envoyé par email.
   */
  signin: async (data) => {
    useUserStore.getState().reset();
    const response = await authApi.signin(data);
    if (estVerificationRequise(response)) {
      set({ verification: response });
      return response;
    }
    await ouvrirSession(response, set);
    return response;
  },

  /** Saisie du code (email ou secours). Si des codes de secours sont remis, la session attend qu'ils soient vus. */
  verifierCode: async (code) => {
    const verification = useAuthStore.getState().verification;
    if (!verification) throw { message: 'Aucune vérification en cours. Reconnectez-vous.', status: 400 };
    const session = await authApi.verifierCode(verification.verificationId, code.trim());
    if (session.codesSecours?.length) {
      set({ codesSecoursARemettre: { codes: session.codesSecours, session } });
      return;
    }
    set({ verification: null });
    await ouvrirSession(session, set);
  },

  renvoyerCode: async () => {
    const verification = useAuthStore.getState().verification;
    if (!verification) throw { message: 'Aucune vérification en cours. Reconnectez-vous.', status: 400 };
    set({ verification: await authApi.renvoyerCode(verification.verificationId) });
  },

  /** « J'ai conservé mes codes » : la session retenue s'ouvre. */
  confirmerCodesSecours: async () => {
    const attente = useAuthStore.getState().codesSecoursARemettre;
    if (!attente) return;
    set({ verification: null, codesSecoursARemettre: null });
    await ouvrirSession(attente.session, set);
  },

  annulerVerification: () => set({ verification: null, codesSecoursARemettre: null }),

  /**
   * Réactivation d'un compte supprimé (délai de grâce) : ouvre la session comme un signin.
   */
  reactivate: async (data) => {
    useUserStore.getState().reset();
    const response = await authApi.reactivateAccount(data);
    await ouvrirSession(response, set);
    return response;
  },

  /**
   * Renvoi du lien d'activation : retourne le message (identique que le compte existe ou non).
   */
  resendActivation: async (email) => {
    const response = await authApi.resendActivation(email);
    return response.message;
  },

  /**
   * Inscription : retourne le message de confirmation.
   */
  signup: async (data) => {
    const response = await authApi.signup(data);
    return response.message;
  },

  /**
   * Demande de réinitialisation du mot de passe.
   */
  forgotPassword: async (data) => {
    const response = await authApi.forgotPassword(data);
    return response.message;
  },

  /**
   * Réinitialisation effective du mot de passe.
   */
  resetPassword: async (data) => {
    const response = await authApi.resetPassword(data);
    return response.message;
  },

  /**
   * Changement de mot de passe depuis le profil.
   */
  changePassword: async (data) => {
    const response = await authApi.changePassword(data);
    // Les anciens tokens sont révoqués par le serveur : on stocke les nouveaux.
    await saveToken(response.token);
    await saveRefreshToken(response.refreshToken);
    set({ token: response.token, mustChangePassword: false });
    return response.message;
  },

  /**
   * Déconnexion : supprime le token et réinitialise l'état.
   */
  logout: async () => {
    await desenregistrer();
    await authApi.logout(await getRefreshToken());
    await removeToken();
    await removeRefreshToken();
    await effacerBrouillons();
    useUserStore.getState().reset();
    set({ user: null, token: null, isAuthenticated: false, mustChangePassword: false });
  },

  /**
   * Appelé au démarrage de l'app pour restaurer la session depuis AsyncStorage.
   * Si un token existe, l'utilisateur reste connecté (à améliorer avec /me endpoint).
   */
  hydrateFromStorage: async () => {
    const TIMEOUT_MS = 8000;
    try {
      const token = await getToken();
      if (token) {
        // Valide le token AVANT de marquer la session authentifiée.
        // Pas d'état optimiste : tant que /me n'a pas répondu, isAuthenticated
        // reste false (évite tout appel API ultérieur avec un token périmé).
        // Le timeout évite un blocage indéfini sur réseau mort.
        try {
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
          );
          const profile = await Promise.race([userApi.getProfile(), timeout]);
          set({
            token,
            isAuthenticated: true,
            mustChangePassword: profile.mustChangePassword ?? false,
            user: {
              id: profile.id,
              email: profile.email,
              roles: toArray(profile.roles ?? profile.role),
            },
          });
        } catch {
          // Token expiré, révoqué, ou réseau mort → déconnexion propre
          await removeToken();
          set({ user: null, token: null, isAuthenticated: false, mustChangePassword: false });
        }
      }
    } catch {
      // Token absent ou erreur AsyncStorage
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Session refusée par le serveur (refresh révoqué, compte suspendu, mot de passe changé
// ailleurs) : les tokens sont déjà purgés par le client HTTP, on remet l'état à zéro.
setOnSessionExpired(() => {
  useUserStore.getState().reset();
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false, mustChangePassword: false });
});
