/* eslint-disable import/first -- jest.mock() doit précéder les imports du module testé (hoisting) */
jest.mock('../api/messagerie.api', () => ({
  sendConversationMessage: jest.fn(),
  getConversationById: jest.fn(async () => ({ id: 1 })),
}));
jest.mock('../api/user.api', () => ({ getUserPresence: jest.fn() }));

import * as messagerieApi from '../api/messagerie.api';
import { useMessagerieStore } from './messagerie.store';

const send = messagerieApi.sendConversationMessage as jest.Mock;

const serverMessage = (id: number, content: string) => ({
  id,
  conversationId: 1,
  senderId: 'me',
  senderNomComplet: 'Moi',
  senderPhotoProfil: null,
  content,
  createdAt: new Date().toISOString(),
  readAt: null,
  mine: true,
});

beforeEach(() => {
  send.mockReset();
  useMessagerieStore.setState({ messages: [], conversations: [] });
});

describe('sendMessage (envoi optimiste)', () => {
  it('affiche la bulle avant la réponse, puis la remplace par le message serveur', async () => {
    let resolve!: (m: unknown) => void;
    send.mockReturnValue(new Promise((r) => { resolve = r; }));

    const pending = useMessagerieStore.getState().sendMessage(1, 'Bonjour');
    const [bulle] = useMessagerieStore.getState().messages;
    expect(bulle).toMatchObject({ content: 'Bonjour', status: 'sending', mine: true });

    resolve(serverMessage(42, 'Bonjour'));
    await pending;
    const messages = useMessagerieStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: 42, content: 'Bonjour' });
    expect(messages[0].status).toBeUndefined();
  });

  it('passe en échec sans perdre le texte, et « Réessayer » renvoie le message', async () => {
    send.mockRejectedValueOnce(new Error('réseau'));
    await useMessagerieStore.getState().sendMessage(1, 'Bonjour');
    const [echec] = useMessagerieStore.getState().messages;
    expect(echec).toMatchObject({ content: 'Bonjour', status: 'failed' });

    send.mockResolvedValueOnce(serverMessage(43, 'Bonjour'));
    await useMessagerieStore.getState().retryMessage(1, echec.id);
    const messages = useMessagerieStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: 43, content: 'Bonjour' });
    expect(messages[0].status).toBeUndefined();
  });

  it("n'ajoute pas de doublon si le polling a déjà ramené le message", async () => {
    send.mockImplementation(async () => {
      // Le polling livre le message pendant l'envoi.
      useMessagerieStore.setState({
        messages: [...useMessagerieStore.getState().messages, serverMessage(44, 'Salut')],
      });
      return serverMessage(44, 'Salut');
    });
    await useMessagerieStore.getState().sendMessage(1, 'Salut');
    expect(useMessagerieStore.getState().messages.map((m) => m.id)).toEqual([44]);
  });
});
