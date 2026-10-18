/* eslint-disable import/first -- jest.mock() doit précéder les imports du module testé (hoisting) */
// ─── Mocks des dépendances ────────────────────────────────────────────────────

const mockUserReset = jest.fn();

// Brouillons de publication effacés à la déconnexion (features/publier/brouillon).
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock est hissé avant les imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../api/auth.api', () => ({
  signin: jest.fn(),
  reactivateAccount: jest.fn(),
  resendActivation: jest.fn(),
  signup: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
  verifierCode: jest.fn(),
  renvoyerCode: jest.fn(),
  logout: jest.fn(async () => {}),
}));

jest.mock('../api/user.api', () => ({
  getProfile: jest.fn(),
}));

jest.mock('../api/client', () => ({
  getToken: jest.fn(),
  getRefreshToken: jest.fn(async () => null),
  saveToken: jest.fn(async () => {}),
  removeToken: jest.fn(async () => {}),
  saveRefreshToken: jest.fn(async () => {}),
  removeRefreshToken: jest.fn(async () => {}),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('./user.store', () => ({
  useUserStore: { getState: () => ({ reset: mockUserReset }) },
}));

import * as authApi from '../api/auth.api';
import * as client from '../api/client';
import * as userApi from '../api/user.api';
import { useAuthStore } from './auth.store';

const INITIAL = {
  user: null,
  token: null,
  isAuthenticated: false,
  mustChangePassword: false,
  isLoading: true,
  verification: null,
  codesSecoursARemettre: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ ...INITIAL });
});

describe('signin', () => {
  it('stocke les tokens, mappe l’utilisateur et réinitialise le user store', async () => {
    (authApi.signin as jest.Mock).mockResolvedValue({
      token: 'jwt',
      refreshToken: 'refresh',
      id: 42,
      email: 'a@b.com',
      role: 'PARTICULIER',
      mustChangePassword: false,
    });

    await useAuthStore.getState().signin({ identifier: 'a@b.com', password: 'x' });

    expect(mockUserReset).toHaveBeenCalled();
    expect(client.saveToken).toHaveBeenCalledWith('jwt');
    expect(client.saveRefreshToken).toHaveBeenCalledWith('refresh');

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.token).toBe('jwt');
    expect(s.user).toEqual({
      id: 42,
      email: 'a@b.com',
      roles: ['ROLE_PARTICULIER'],
    });
  });

  it('propage mustChangePassword', async () => {
    (authApi.signin as jest.Mock).mockResolvedValue({
      token: 'jwt',
      id: 1,
      email: 'a@b.com',
      role: ['ROLE_PROFESSIONNEL'],
      mustChangePassword: true,
    });
    await useAuthStore.getState().signin({ identifier: 'a@b.com', password: 'x' });
    expect(useAuthStore.getState().mustChangePassword).toBe(true);
  });
});

describe('logout', () => {
  it('purge tokens, réinitialise les stores et l’état', async () => {
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.com', roles: ['ROLE_PARTICULIER'] },
      token: 'jwt',
      isAuthenticated: true,
      mustChangePassword: false,
      isLoading: false,
    });

    await useAuthStore.getState().logout();

    expect(authApi.logout).toHaveBeenCalled();
    expect(client.removeToken).toHaveBeenCalled();
    expect(client.removeRefreshToken).toHaveBeenCalled();
    expect(mockUserReset).toHaveBeenCalled();

    const s = useAuthStore.getState();
    expect(s).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
      mustChangePassword: false,
    });
  });
});

describe('hydrateFromStorage', () => {
  it('token présent + profil valide → utilisateur restauré', async () => {
    (client.getToken as jest.Mock).mockResolvedValue('jwt');
    (userApi.getProfile as jest.Mock).mockResolvedValue({
      id: 7,
      email: 'me@x.com',
      roles: ['ROLE_PROFESSIONNEL'],
    });

    await useAuthStore.getState().hydrateFromStorage();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user).toEqual({
      id: 7,
      email: 'me@x.com',
      roles: ['ROLE_PROFESSIONNEL'],
    });
    expect(s.isLoading).toBe(false);
  });

  it('token présent mais profil rejeté → déconnexion propre', async () => {
    (client.getToken as jest.Mock).mockResolvedValue('jwt-expired');
    (userApi.getProfile as jest.Mock).mockRejectedValue(new Error('401'));

    await useAuthStore.getState().hydrateFromStorage();

    expect(client.removeToken).toHaveBeenCalled();
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.isLoading).toBe(false);
  });

  it('aucun token → non authentifié, isLoading retombe à false', async () => {
    (client.getToken as jest.Mock).mockResolvedValue(null);

    await useAuthStore.getState().hydrateFromStorage();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isLoading).toBe(false);
    expect(userApi.getProfile).not.toHaveBeenCalled();
  });

  it('pas d’état optimiste : isAuthenticated reste false tant que /me n’a pas répondu', async () => {
    (client.getToken as jest.Mock).mockResolvedValue('jwt');
    let resolveProfile: (v: unknown) => void = () => {};
    (userApi.getProfile as jest.Mock).mockReturnValue(
      new Promise((res) => { resolveProfile = res; }),
    );

    const pending = useAuthStore.getState().hydrateFromStorage();

    // /me en vol : la session ne doit PAS être marquée authentifiée
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    resolveProfile({ id: 1, email: 'a@b.com', roles: ['ROLE_PARTICULIER'] });
    await pending;

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe('double authentification du staff', () => {
  const verification = {
    verificationRequise: true,
    verificationId: 'defi-1',
    methode: 'EMAIL',
    expireDansSecondes: 600,
    message: 'Un code vous a été envoyé.',
  };
  const session = (extra = {}) => ({
    token: 'jwt-staff',
    refreshToken: 'refresh-staff',
    id: 'u1',
    email: 'mod@b.com',
    role: ['ROLE_MODERATEUR'],
    ...extra,
  });

  it('n’ouvre aucune session tant que le code n’est pas saisi', async () => {
    (authApi.signin as jest.Mock).mockResolvedValue(verification);

    const resultat = await useAuthStore.getState().signin({ identifier: 'mod@b.com', password: 'x' });

    expect(resultat).toEqual(verification);
    expect(client.saveToken).not.toHaveBeenCalled();
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.verification).toEqual(verification);
  });

  it('ouvre la session avec le bon code', async () => {
    useAuthStore.setState({ verification: verification as never });
    (authApi.verifierCode as jest.Mock).mockResolvedValue(session());

    await useAuthStore.getState().verifierCode(' 123456 ');

    expect(authApi.verifierCode).toHaveBeenCalledWith('defi-1', '123456');
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.verification).toBeNull();
    expect(client.saveToken).toHaveBeenCalledWith('jwt-staff');
  });

  it('retient la session jusqu’à ce que les codes de secours aient été vus', async () => {
    useAuthStore.setState({ verification: verification as never });
    const codes = ['ABCD-EFGH', 'JKLM-NPQR'];
    (authApi.verifierCode as jest.Mock).mockResolvedValue(session({ codesSecours: codes }));

    await useAuthStore.getState().verifierCode('123456');

    let s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(client.saveToken).not.toHaveBeenCalled();
    expect(s.codesSecoursARemettre?.codes).toEqual(codes);

    await useAuthStore.getState().confirmerCodesSecours();

    s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.codesSecoursARemettre).toBeNull();
    expect(client.saveToken).toHaveBeenCalledWith('jwt-staff');
  });

  it('un mauvais code laisse la vérification en cours', async () => {
    useAuthStore.setState({ verification: verification as never });
    (authApi.verifierCode as jest.Mock).mockRejectedValue({ message: 'Code incorrect.', status: 401 });

    await expect(useAuthStore.getState().verifierCode('000000')).rejects.toMatchObject({ status: 401 });

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.verification).toEqual(verification);
  });

  it('remplace le défi quand le code est renvoyé', async () => {
    useAuthStore.setState({ verification: verification as never });
    (authApi.renvoyerCode as jest.Mock).mockResolvedValue({ ...verification, verificationId: 'defi-2' });

    await useAuthStore.getState().renvoyerCode();

    expect(authApi.renvoyerCode).toHaveBeenCalledWith('defi-1');
    expect(useAuthStore.getState().verification?.verificationId).toBe('defi-2');
  });

  it('refuse de vérifier sans connexion préalable', async () => {
    await expect(useAuthStore.getState().verifierCode('123456')).rejects.toMatchObject({ status: 400 });
  });
});
