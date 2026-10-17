/* eslint-disable import/first -- jest.mock() doit précéder les imports du module testé (hoisting) */
import axios from 'axios';

// ─── Mocks de stockage natif ──────────────────────────────────────────────────

const secureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => secureStore[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    secureStore[k] = v;
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    delete secureStore[k];
  }),
}));

const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => {
    asyncStore[k] = v;
  }),
  removeItem: jest.fn(async (k: string) => {
    delete asyncStore[k];
  }),
}));

import {
  apiClient,
  getRefreshToken,
  getToken,
  removeToken,
  rethrowApiError,
  saveRefreshToken,
  saveToken,
  setOnSessionExpired,
} from './client';

beforeEach(() => {
  for (const k of Object.keys(secureStore)) delete secureStore[k];
  for (const k of Object.keys(asyncStore)) delete asyncStore[k];
  jest.restoreAllMocks();
});

describe('rethrowApiError', () => {
  it('normalise une erreur quelconque en ApiError', () => {
    expect(() =>
      rethrowApiError({ message: 'Boom', status: 500 }, 'repli'),
    ).toThrow();
    try {
      rethrowApiError({ status: 422, raw: { errors: { nom: 'requis' } } }, 'repli');
    } catch (e: any) {
      expect(e.message).toBe('repli'); // pas de message → fallback
      expect(e.status).toBe(422);
      expect(e.errors).toEqual({ nom: 'requis' });
    }
  });
});

describe('helpers de token (SecureStore)', () => {
  it('saveToken / getToken via SecureStore', async () => {
    await saveToken('jwt-123');
    expect(await getToken()).toBe('jwt-123');
  });

  it('removeToken efface SecureStore et le legacy AsyncStorage', async () => {
    await saveToken('jwt-123');
    await removeToken();
    expect(await getToken()).toBeNull();
  });

  it('migre un token legacy depuis AsyncStorage vers SecureStore', async () => {
    asyncStore['auth_token'] = 'legacy-jwt';
    // 1er accès : SecureStore vide → migration depuis AsyncStorage
    expect(await getToken()).toBe('legacy-jwt');
    // legacy supprimé, valeur désormais dans SecureStore
    expect(asyncStore['auth_token']).toBeUndefined();
    expect(secureStore['auth_token']).toBe('legacy-jwt');
  });
});

describe('intercepteur 401 → auto-refresh', () => {
  beforeEach(() => {
    // L'intercepteur logge en __DEV__ sur 401 : bruit attendu ici.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('rafraîchit le token puis rejoue la requête', async () => {
    await saveRefreshToken('refresh-old');

    const postSpy = jest
      .spyOn(axios, 'post')
      .mockResolvedValue({
        data: { token: 'jwt-new', refreshToken: 'refresh-new' },
      } as any);

    let calls = 0;
    (apiClient.defaults as any).adapter = async (config: any) => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject({
          isAxiosError: true,
          config,
          message: 'Request failed with status code 401',
          response: { status: 401, data: { message: 'unauthorized' }, config },
        });
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    const res = await apiClient.get('/protected');

    expect(res.data).toEqual({ ok: true });
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/refresh'),
      { refreshToken: 'refresh-old' },
      expect.any(Object),
    );
    expect(await getToken()).toBe('jwt-new');
    expect(await getRefreshToken()).toBe('refresh-new');
  });

  const adapter401 = async (config: any) =>
    Promise.reject({
      isAxiosError: true,
      config,
      message: 'Request failed with status code 401',
      response: { status: 401, data: { message: 'unauthorized' }, config },
    });

  it('si le serveur refuse le refresh, purge les tokens et signale la fin de session', async () => {
    await saveToken('jwt-stale');
    await saveRefreshToken('refresh-stale');
    const onExpired = jest.fn();
    setOnSessionExpired(onExpired);

    // Refresh token révoqué / compte suspendu : le serveur répond 401 (ou 403).
    jest.spyOn(axios, 'post').mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
    (apiClient.defaults as any).adapter = adapter401;

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      status: 401,
    });
    expect(await getToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
    setOnSessionExpired(null);
  });

  it('une coupure réseau pendant le refresh ne déconnecte pas', async () => {
    await saveToken('jwt-stale');
    await saveRefreshToken('refresh-stale');
    const onExpired = jest.fn();
    setOnSessionExpired(onExpired);

    // Pas de réponse serveur : on garde les tokens pour réessayer plus tard.
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('Network Error'));
    (apiClient.defaults as any).adapter = adapter401;

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      status: 401,
    });
    expect(await getToken()).toBe('jwt-stale');
    expect(await getRefreshToken()).toBe('refresh-stale');
    expect(onExpired).not.toHaveBeenCalled();
    setOnSessionExpired(null);
  });
});
