import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { CodeErreur, ErreurApi } from "./contrat";

// ─── Refresh token state (module-level) ──────────────────────────────────────
// Une seule requête /refresh peut être en vol à un instant donné. Toutes les
// requêtes 401 concurrentes attendent la même promesse, évitant les races et
// les multiples POST /refresh simultanés.
let _refreshPromise: Promise<string | null> | null = null;
const REFRESH_TIMEOUT_MS = 15_000;

// Appelé quand le serveur refuse définitivement la session (refresh token révoqué,
// compte suspendu, mot de passe changé sur un autre appareil…). Enregistré par
// auth.store pour repasser l'app en état déconnecté (client.ts n'importe pas le store).
let _onSessionExpired: (() => void) | null = null;

export const setOnSessionExpired = (callback: (() => void) | null) => {
  _onSessionExpired = callback;
};

// Appelé sur un 402 : action d'annonceur refusée faute de licence valide. Enregistré
// par le layout racine pour rediriger vers « Ma licence ».
let _onLicenceRequise: (() => void) | null = null;

export const setOnLicenceRequise = (callback: (() => void) | null) => {
  _onLicenceRequise = callback;
};

// Endpoints d'auth publics : un 401 y signifie « identifiants incorrects », pas
// « token expiré » → ne pas tenter de refresh.
const NO_REFRESH_PATHS = [
  "/api/auth/signin",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/auth/reactivate",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/resend-activation",
  "/api/auth/verification-code",
];

// ─── Types ────────────────────────────────────────────────────────────────────

/** Forme normalisée des erreurs renvoyées par l'intercepteur de réponse. */
export interface ApiError {
  message: string;
  status?: number;
  /** Code stable renvoyé par l'API (absent pour une erreur réseau). */
  code?: CodeErreur;
  raw?: unknown;
  errors?: Record<string, string> | null;
}

/**
 * Re-throw une erreur quelconque (axios, ApiError, ou inconnue) sous la forme
 * normalisée `ApiError`, avec un message de repli. À utiliser dans les
 * `catch` des fonctions d'API pour éviter `catch (err: any)`.
 */
export function rethrowApiError(err: unknown, fallbackMessage: string): never {
  const e = err as Partial<ApiError> & {
    raw?: { errors?: Record<string, string> | null };
  };
  throw {
    message: e?.message ?? fallbackMessage,
    status: e?.status,
    code: e?.code,
    errors: e?.errors ?? e?.raw?.errors ?? null,
  } satisfies ApiError;
}

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * URL de base de l'API.
 * Défaut = production HTTPS : si `EXPO_PUBLIC_API_URL` est absent d'un build
 * (notamment en prod), l'app pointe sur l'API réelle, jamais sur un localhost
 * d'émulateur. En développement, surcharger via `.env` :
 *   - émulateur Android : http://10.0.2.2:8080
 *   - téléphone physique : http://192.168.1.XX:8080
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://anoventix.com";

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

// ─── Secure token storage (expo-secure-store) ────────────────────────────────
// JWT et refresh token sont stockés dans le keystore chiffré du device.
// Migration depuis AsyncStorage faite au premier accès pour ne pas
// déconnecter les utilisateurs existants.

// Sur web, expo-secure-store n'est pas disponible → fallback sur localStorage.
const isWeb = Platform.OS === "web";

const secureGet = async (key: string): Promise<string | null> => {
  if (isWeb) return localStorage.getItem(key);
  const value = await SecureStore.getItemAsync(key);
  if (value) return value;
  // Migration one-shot depuis AsyncStorage (legacy)
  const legacy = await AsyncStorage.getItem(key);
  if (legacy) {
    await SecureStore.setItemAsync(key, legacy);
    await AsyncStorage.removeItem(key);
    return legacy;
  }
  return null;
};

const secureSet = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const secureDelete = async (key: string): Promise<void> => {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
  await AsyncStorage.removeItem(key);
};

// ─── Instance Axios ───────────────────────────────────────────────────────────

// Site web : le jeton de rafraîchissement voyage dans un cookie HttpOnly posé par l'API
// (illisible par les scripts de la page). `withCredentials` l'envoie avec les
// requêtes vers l'API ; l'en-tête X-Client active ce mode côté serveur et sert de garde CSRF.
const WEB_AUTH = isWeb ? { withCredentials: true, headers: { "X-Client": "web" } } : {};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  withCredentials: isWeb,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(isWeb ? { "X-Client": "web" } : {}),
  },
});

// ─── Intercepteur Request : injection du token ────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await secureGet(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Intercepteur Response : auto-refresh + normalisation des erreurs ────────

apiClient.interceptors.response.use(
  (response) => response,
  async (
    error: AxiosError<{ message?: string; error?: string; errors?: unknown }>,
  ) => {
    const status = error.response?.status;
    const config = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Auto-refresh on 401 (skip if already retried or it's a public auth endpoint)
    if (
      status === 401 &&
      config &&
      !config._retry &&
      !NO_REFRESH_PATHS.some((p) => config.url?.includes(p))
    ) {
      config._retry = true;
      const newToken = await _refreshAccessToken();
      if (newToken) {
        config.headers = config.headers ?? ({} as any);
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      }
      // refresh échoué → fall through vers la normalisation d'erreur
    }

    if (__DEV__) {
      if (!error.response) {
        console.warn("[API Network Error]", {
          url: error.config?.url,
          message: error.message,
        });
      } else {
        console.warn("[API Error]", {
          status,
          url: error.config?.url,
          data: error.response?.data,
        });
      }
    }

    // Absence de réponse = problème réseau (pas de connexion, DNS, timeout…).
    if (!error.response) {
      const isTimeout =
        error.code === "ECONNABORTED" || /timeout/i.test(error.message ?? "");
      return Promise.reject({
        message: isTimeout
          ? "La connexion au serveur a expiré. Vérifiez votre connexion Internet et réessayez."
          : "Pas de connexion Internet. Vérifiez votre réseau et réessayez.",
        status: undefined,
        raw: null,
        errors: null,
        isNetworkError: true,
      });
    }

    if (status === 402) _onLicenceRequise?.();

    const data = error.response?.data as any;
    // Jamais de texte technique anglais à l'écran : ni `error.message` d'axios
    // (« Request failed with status code 500 »), ni le champ `error` par défaut
    // de Spring (« Internal Server Error ») pour les erreurs serveur.
    const serverMessage =
      data?.message ??
      (status !== undefined && status < 500 ? data?.error : null) ??
      (typeof data === "string" && data.length < 300 && !/<html/i.test(data) ? data : null);
    const message = serverMessage ?? fallbackMessageForStatus(status);

    return Promise.reject({
      message,
      status,
      code: (data as Partial<ErreurApi> | undefined)?.code,
      raw: data,
      errors: (data?.errors ?? null) as Record<string, string> | null,
    });
  },
);

/** Message par défaut quand le serveur n'en fournit pas : dit quoi faire. */
export function fallbackMessageForStatus(status?: number): string {
  if (status !== undefined && status >= 500) {
    return "Le serveur rencontre un problème. Réessayez dans quelques instants.";
  }
  if (status === 404) return "Élément introuvable. Il a peut-être été supprimé.";
  if (status === 403) return "Vous n'avez pas les droits pour cette action.";
  if (status === 429) return "Trop de tentatives. Patientez un instant puis réessayez.";
  return "La requête n'a pas abouti. Vérifiez votre connexion puis réessayez.";
}

// ─── Refresh logic ───────────────────────────────────────────────────────────

async function _doRefresh(): Promise<string | null> {
  try {
    // Application : le jeton est dans le stockage sécurisé. Site web : il est dans le cookie
    // HttpOnly ; un jeton resté dans le localStorage par une version antérieure est envoyé une
    // dernière fois pour que l'API le convertisse en cookie, puis supprimé.
    const storedRefresh = await secureGet(REFRESH_TOKEN_KEY);
    if (!storedRefresh && !isWeb) {
      // 401 sans refresh token possible : s'il restait un access token, la session est morte.
      if (await secureGet(TOKEN_KEY)) {
        await secureDelete(TOKEN_KEY);
        _onSessionExpired?.();
      }
      return null;
    }

    const res = await axios.post<{ token: string; refreshToken?: string }>(
      `${API_BASE_URL}/api/auth/refresh`,
      storedRefresh ? { refreshToken: storedRefresh } : {},
      {
        ...WEB_AUTH,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...WEB_AUTH.headers,
        },
        timeout: REFRESH_TIMEOUT_MS,
      },
    );

    const newToken = res.data.token;
    await secureSet(TOKEN_KEY, newToken);
    if (isWeb) {
      await secureDelete(REFRESH_TOKEN_KEY);
    } else if (res.data.refreshToken) {
      await secureSet(REFRESH_TOKEN_KEY, res.data.refreshToken);
    }
    return newToken;
  } catch (err) {
    // Seul un refus explicite du serveur (401 : token révoqué/expiré, 403 : compte
    // suspendu/désactivé) termine la session. Une coupure réseau ne doit PAS
    // déconnecter l'utilisateur : on garde les tokens pour réessayer plus tard.
    const status = (err as AxiosError)?.response?.status;
    if (status === 401 || status === 403) {
      await secureDelete(TOKEN_KEY);
      await secureDelete(REFRESH_TOKEN_KEY);
      _onSessionExpired?.();
    }
    return null;
  }
}

/**
 * Garantit qu'une seule requête /refresh est en vol. Les appels concurrents
 * reçoivent la même promesse. La promesse est nettoyée une fois résolue afin
 * qu'un futur 401 puisse déclencher un nouveau refresh.
 */
function _refreshAccessToken(): Promise<string | null> {
  if (!_refreshPromise) {
    _refreshPromise = _doRefresh().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

// ─── Helpers Token ───────────────────────────────────────────────────────────

export const saveToken = (token: string) => secureSet(TOKEN_KEY, token);

export const removeToken = () => secureDelete(TOKEN_KEY);

export const getToken = () => secureGet(TOKEN_KEY);

/** Application seulement : sur le web le jeton reste dans le cookie HttpOnly, jamais dans le JavaScript. */
export const saveRefreshToken = async (token: string): Promise<void> => {
  if (!isWeb) await secureSet(REFRESH_TOKEN_KEY, token);
};

export const removeRefreshToken = () => secureDelete(REFRESH_TOKEN_KEY);

export const getRefreshToken = () => secureGet(REFRESH_TOKEN_KEY);
