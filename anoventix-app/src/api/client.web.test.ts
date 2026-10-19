/* eslint-disable import/first -- jest.mock() doit précéder les imports du module testé (hoisting) */
import axios from 'axios';

// Site web : le jeton de rafraîchissement est un cookie HttpOnly posé par l'API.
// Ces tests simulent Platform.OS = 'web' et un localStorage de navigateur.

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-secure-store', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({}));

const localStorageSimule: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => localStorageSimule[k] ?? null,
    setItem: (k: string, v: string) => {
      localStorageSimule[k] = v;
    },
    removeItem: (k: string) => {
      delete localStorageSimule[k];
    },
  },
});

import { apiClient, getRefreshToken, getToken, saveRefreshToken, saveToken } from './client';

beforeEach(() => {
  for (const k of Object.keys(localStorageSimule)) delete localStorageSimule[k];
  jest.restoreAllMocks();
});

describe('client HTTP sur le web', () => {
  it('envoie le cookie avec chaque requête et signale le mode web', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(apiClient.defaults.headers['X-Client']).toBe('web');
  });

  it("n'écrit jamais le jeton de rafraîchissement dans le localStorage", async () => {
    await saveRefreshToken('jeton-de-rafraichissement');

    expect(await getRefreshToken()).toBeNull();
    expect(Object.keys(localStorageSimule)).toEqual([]);
  });

  it("garde le jeton d'accès (15 min) dans le localStorage", async () => {
    await saveToken('jeton-acces');

    expect(await getToken()).toBe('jeton-acces');
  });

  it('se rafraîchit avec le cookie seul : corps vide, identifiants joints, aucun jeton stocké', async () => {
    await saveToken('acces-expire');
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: { token: 'nouvel-acces' } });
    const reponse401 = {
      response: { status: 401 },
      config: { url: '/api/users/me', headers: {} },
    };
    jest.spyOn(apiClient, 'request').mockRejectedValueOnce(reponse401);

    // Déclenche le rafraîchissement par l'intercepteur de réponse (401 sur une route protégée).
    const handlers = (apiClient.interceptors.response as unknown as {
      handlers: { rejected: (e: unknown) => Promise<unknown> }[];
    }).handlers;
    await handlers[0].rejected(reponse401).catch(() => undefined);

    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/refresh'),
      {},
      expect.objectContaining({
        withCredentials: true,
        headers: expect.objectContaining({ 'X-Client': 'web' }),
      }),
    );
    expect(await getToken()).toBe('nouvel-acces');
    expect(Object.keys(localStorageSimule)).toEqual(['auth_token']);
  });

  it("convertit un ancien jeton resté dans le localStorage puis le supprime", async () => {
    localStorageSimule.auth_refresh_token = 'ancien-jeton';
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: { token: 'nouvel-acces' } });
    const reponse401 = { response: { status: 401 }, config: { url: '/api/users/me', headers: {} } };
    const handlers = (apiClient.interceptors.response as unknown as {
      handlers: { rejected: (e: unknown) => Promise<unknown> }[];
    }).handlers;

    await handlers[0].rejected(reponse401).catch(() => undefined);

    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      { refreshToken: 'ancien-jeton' },
      expect.anything(),
    );
    expect(localStorageSimule.auth_refresh_token).toBeUndefined();
  });
});
