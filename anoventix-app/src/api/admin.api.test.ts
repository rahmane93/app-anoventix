/* eslint-disable import/first -- jest.mock() doit précéder les imports du module testé (hoisting) */
jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(async () => ({ data: { data: [], totalPages: 0, totalItems: 0, currentPage: 0 } })),
    put: jest.fn(async () => ({ data: {} })),
  },
}));

import { getAdminAnnonces, getAdminConversationMessages, getAllUsers, ignorerSignalementMessage } from './admin.api';
import { apiClient } from './client';

const get = apiClient.get as jest.Mock;
const paramsOf = () => get.mock.calls[get.mock.calls.length - 1][1].params;

beforeEach(() => get.mockClear());

describe('getAdminAnnonces : filtres appliqués par l’API', () => {
  it('sans filtre : ni statut ni texte', async () => {
    await getAdminAnnonces(0, 10);
    expect(paramsOf()).toEqual({ page: 0, size: 10, sort: 'dateCreation', direction: 'desc' });
  });

  it('« Clôturée » = publiée avec motif de clôture', async () => {
    await getAdminAnnonces(0, 10, { statut: 'CLOTUREE' });
    expect(paramsOf()).toMatchObject({ statut: 'PUBLIEE', cloturee: true });
  });

  it('« Publiée » exclut les clôturées', async () => {
    await getAdminAnnonces(0, 10, { statut: 'PUBLIEE' });
    expect(paramsOf()).toMatchObject({ statut: 'PUBLIEE', cloturee: false });
  });

  it('autre statut et texte transmis tels quels (texte nettoyé)', async () => {
    await getAdminAnnonces(1, 10, { statut: 'MASQUEE', q: '  REF-12 ' });
    const params = paramsOf();
    expect(params).toMatchObject({ page: 1, statut: 'MASQUEE', q: 'REF-12' });
    expect(params).not.toHaveProperty('cloturee');
  });
});

describe('getAllUsers', () => {
  it('transmet le statut seulement s’il est choisi', async () => {
    await getAllUsers('diallo', 0, 20);
    expect(paramsOf()).toEqual({ search: 'diallo', page: 0, size: 20 });
    await getAllUsers('', 0, 20, 'EN_ATTENTE_ACTIVATION');
    expect(paramsOf()).toMatchObject({ statut: 'EN_ATTENTE_ACTIVATION' });
  });
});

it('ignorerSignalementMessage appelle le bon endpoint', async () => {
  await ignorerSignalementMessage(42);
  expect(apiClient.put).toHaveBeenCalledWith('/api/admin/messages/42/ignorer');
});

describe('getAdminConversationMessages', () => {
  it('lit data (PageResponse) et enchaîne les pages jusqu’à la dernière', async () => {
    get
      .mockResolvedValueOnce({ data: { data: [{ id: 1 }, { id: 2 }], totalPages: 2, totalItems: 3, currentPage: 0 } })
      .mockResolvedValueOnce({ data: { data: [{ id: 3 }], totalPages: 2, totalItems: 3, currentPage: 1 } });

    const messages = await getAdminConversationMessages(7);

    expect(messages.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][0]).toBe('/api/admin/conversations/7/messages');
    expect(get.mock.calls[1][1].params).toEqual({ page: 1, size: 50 });
  });
});
