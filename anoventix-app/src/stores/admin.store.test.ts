/* eslint-disable import/first -- jest.mock() doit précéder les imports du module testé (hoisting) */
jest.mock('../api/admin.api', () => ({
  getSignalements: jest.fn(),
  traiterSignalement: jest.fn(async () => undefined),
  supprimerMessage: jest.fn(async () => undefined),
}));
jest.mock('../api/localisation.api', () => ({}));

import * as adminApi from '../api/admin.api';
import type { MessageSignale, Signalement } from '../types/admin.types';
import { useAdminStore } from './admin.store';

const getSignalements = adminApi.getSignalements as jest.Mock;

const signalement = (id: number) => ({ id, statut: 'EN_ATTENTE', noteAdmin: null }) as unknown as Signalement;
const message = (id: number) => ({ id, supprime: false }) as unknown as MessageSignale;

async function chargerSignalements(statut?: 'EN_ATTENTE') {
  getSignalements.mockResolvedValue({
    content: [signalement(1), signalement(2)],
    number: 0,
    totalPages: 1,
    totalElements: 2,
  });
  await useAdminStore.getState().loadSignalements(0, statut);
}

describe('traiterSignalement', () => {
  it('retire le signalement de la file « En attente » et décrémente le total', async () => {
    await chargerSignalements('EN_ATTENTE');
    await useAdminStore.getState().traiterSignalement(1, { statut: 'IGNORE', noteAdmin: null });

    const { signalements, signalementsTotalElements } = useAdminStore.getState();
    expect(signalements.map((s) => s.id)).toEqual([2]);
    expect(signalementsTotalElements).toBe(1);
  });

  it('met à jour le signalement sur place quand la liste n’est pas filtrée', async () => {
    await chargerSignalements();
    await useAdminStore.getState().traiterSignalement(1, { statut: 'TRAITE', noteAdmin: 'ok' });

    const { signalements, signalementsTotalElements } = useAdminStore.getState();
    expect(signalements[0]).toMatchObject({ id: 1, statut: 'TRAITE', noteAdmin: 'ok' });
    expect(signalementsTotalElements).toBe(2);
  });
});

describe('supprimerMessage', () => {
  it('sort le message de la file, comme « Conforme »', async () => {
    useAdminStore.setState({ messagesSignales: [message(1), message(2)], messagesSignalesTotalElements: 2 });
    await useAdminStore.getState().supprimerMessage(1);

    const { messagesSignales, messagesSignalesTotalElements } = useAdminStore.getState();
    expect(messagesSignales.map((m) => m.id)).toEqual([2]);
    expect(messagesSignalesTotalElements).toBe(1);
  });
});
