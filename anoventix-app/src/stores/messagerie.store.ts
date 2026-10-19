import { create } from 'zustand';
import * as messagerieApi from '../api/messagerie.api';
import { getUserPresence } from '../api/user.api';
import type {
    ConversationDTO,
    CreateConversationRequest,
    MessageDTO,
} from '../types/messagerie.types';
import { demanderPermissionEtEnregistrer } from '../lib/push';
import { getErrorMessage } from '../utils/format';

interface MessagerieStore {
  conversations: ConversationDTO[];
  currentConversation: ConversationDTO | null;
  messages: MessageDTO[];
  isLoadingConversations: boolean;
  isLoadingConversation: boolean;
  isLoadingMoreMessages: boolean;
  creatingConversationForAnnonceId: number | null;
  error: string | null;
  peerOnline: boolean | null;
  messagesCurrentPage: number;
  messagesTotalPages: number;
  etatListe: 'ACTIVE' | 'ARCHIVEE';
  setEtatListe: (etat: 'ACTIVE' | 'ARCHIVEE') => void;
  loadConversations: () => Promise<void>;
  /** Archive, restaure ou supprime (pour soi) une conversation, puis la retire de la liste affichée. */
  changerEtatConversation: (id: string | number, action: 'archiver' | 'restaurer' | 'supprimer') => Promise<void>;
  /** Bloque ou débloque l'interlocuteur de la conversation courante. */
  basculerBlocage: (conversationId: string | number, userId: string, bloquer: boolean) => Promise<void>;
  loadConversation: (conversationId: string | number) => Promise<void>;
  loadMoreMessages: (conversationId: string | number) => Promise<void>;
  openOrCreateConversation: (data: CreateConversationRequest) => Promise<ConversationDTO>;
  /** Envoi optimiste : la bulle apparaît tout de suite (« envoi… »), puis
   *  est remplacée par le message du serveur, ou passe en « échec ». */
  sendMessage: (conversationId: string | number, content: string) => Promise<void>;
  retryMessage: (conversationId: string | number, tempId: number) => Promise<void>;
  markConversationRead: (conversationId: string | number) => Promise<void>;
  clearCurrentConversation: () => void;
  clearError: () => void;
  fetchInitialPresence: (userId: string) => Promise<void>;
  pollMessages: (conversationId: string | number) => Promise<void>;
}

function sortMessages(messages: MessageDTO[]): MessageDTO[] {
  return [...messages].sort((a, b) => {
    const da = new Date(a.createdAt ?? 0).getTime();
    const db = new Date(b.createdAt ?? 0).getTime();
    return da - db;
  });
}

export const useMessagerieStore = create<MessagerieStore>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingConversation: false,
  creatingConversationForAnnonceId: null,
  error: null,
  peerOnline: null,
  isLoadingMoreMessages: false,
  messagesCurrentPage: 0,
  messagesTotalPages: 0,

  etatListe: 'ACTIVE',
  setEtatListe: (etatListe) => set({ etatListe, conversations: [] }),

  changerEtatConversation: async (id, action) => {
    try {
      if (action === 'archiver') await messagerieApi.archiverConversation(id);
      else if (action === 'restaurer') await messagerieApi.restaurerConversation(id);
      else await messagerieApi.supprimerConversation(id);
      set((s) => ({ conversations: s.conversations.filter((c) => String(c.id) !== String(id)) }));
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Action impossible pour le moment.') });
      throw err;
    }
  },

  basculerBlocage: async (conversationId, userId, bloquer) => {
    try {
      if (bloquer) await messagerieApi.bloquerUtilisateur(userId);
      else await messagerieApi.debloquerUtilisateur(userId);
      const conversation = await messagerieApi.getConversationById(conversationId);
      set({ currentConversation: conversation });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Action impossible pour le moment.') });
      throw err;
    }
  },

  loadConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const response = await messagerieApi.getConversations({ etat: get().etatListe });
      const conversations = Array.isArray(response.data) ? response.data : [];
      set({ conversations, isLoadingConversations: false });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de charger les conversations.'), isLoadingConversations: false });
    }
  },

  loadConversation: async (conversationId) => {
    set({ isLoadingConversation: true, error: null });
    try {
      const [conversation, messagePage] = await Promise.all([
        messagerieApi.getConversationById(conversationId),
        messagerieApi.getConversationMessages(conversationId, { direction: 'desc', size: 50 }),
      ]);
      set({
        currentConversation: conversation,
        messages: sortMessages(messagePage.data ?? []),
        messagesCurrentPage: 0,
        messagesTotalPages: messagePage.totalPages ?? 1,
        isLoadingConversation: false,
      });
      await get().markConversationRead(conversationId);
      // Premier message reçu : moment de proposer les notifications (RG-06-23).
      if ((messagePage.data ?? []).some((m) => !m.mine)) demanderPermissionEtEnregistrer();
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible de charger cette conversation.'), isLoadingConversation: false });
      throw err;
    }
  },

  loadMoreMessages: async (conversationId) => {
    const { messagesCurrentPage, messagesTotalPages, isLoadingMoreMessages } = get();
    if (isLoadingMoreMessages || messagesCurrentPage + 1 >= messagesTotalPages) return;
    const nextPage = messagesCurrentPage + 1;
    set({ isLoadingMoreMessages: true });
    try {
      const page = await messagerieApi.getConversationMessages(conversationId, {
        direction: 'desc',
        size: 50,
        page: nextPage,
      });
      const older = page.data ?? [];
      const existing = get().messages;
      const existingIds = new Set(existing.map((m) => m.id));
      const deduplicated = older.filter((m) => !existingIds.has(m.id));
      set({
        messages: sortMessages([...existing, ...deduplicated]),
        messagesCurrentPage: nextPage,
        isLoadingMoreMessages: false,
      });
    } catch {
      set({ isLoadingMoreMessages: false });
    }
  },

  openOrCreateConversation: async (data) => {
    set({ creatingConversationForAnnonceId: data.annonceId, error: null });
    try {
      const conversation = await messagerieApi.createConversation(data);
      const currentList = get().conversations;
      const exists = currentList.some((item) => item.id === conversation.id);
      set({
        conversations: exists ? currentList.map((item) => item.id === conversation.id ? conversation : item) : [conversation, ...currentList],
        creatingConversationForAnnonceId: null,
      });
      return conversation;
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Impossible d’ouvrir la conversation.'), creatingConversationForAnnonceId: null });
      throw err;
    }
  },

  sendMessage: async (conversationId, content) => {
    // Id négatif : jamais en collision avec un id serveur.
    const tempId = -Date.now();
    const pending: MessageDTO = {
      id: tempId,
      conversationId: Number(conversationId),
      senderId: '',
      senderNomComplet: '',
      senderPhotoProfil: null,
      content,
      createdAt: new Date().toISOString(),
      readAt: null,
      mine: true,
      status: 'sending',
    };
    set({ messages: [...get().messages, pending], error: null });
    await get().retryMessage(conversationId, tempId);
    // Premier message envoyé : moment de proposer les notifications (RG-06-23).
    if (get().messages.some((m) => m.id !== tempId && m.mine && m.status !== 'failed')) demanderPermissionEtEnregistrer();
  },

  retryMessage: async (conversationId, tempId) => {
    const target = get().messages.find((m) => m.id === tempId);
    if (!target) return;
    const setStatus = (status: MessageDTO['status']) =>
      set({ messages: get().messages.map((m) => (m.id === tempId ? { ...m, status } : m)) });
    setStatus('sending');
    try {
      const created = await messagerieApi.sendConversationMessage(conversationId, { content: target.content });
      // Le polling a pu ramener le message avant la réponse : pas de doublon.
      const others = get().messages.filter((m) => m.id !== tempId && m.id !== created.id);
      set({ messages: sortMessages([...others, created]) });
    } catch {
      setStatus('failed');
      return;
    }
    // Aperçu de la liste des conversations : mis à jour sans bloquer l'affichage.
    try {
      const refreshedConversation = await messagerieApi.getConversationById(conversationId);
      const conversations = get().conversations;
      const exists = conversations.some((item) => String(item.id) === String(conversationId));
      set({
        currentConversation: refreshedConversation,
        conversations: exists
          ? [refreshedConversation, ...conversations.filter((item) => String(item.id) !== String(conversationId))]
          : [refreshedConversation, ...conversations],
      });
    } catch {
      // silencieux : le message est bien envoyé
    }
  },

  markConversationRead: async (conversationId) => {
    try {
      await messagerieApi.markConversationAsRead(conversationId);
      const conversations = get().conversations.map((conversation) =>
        String(conversation.id) === String(conversationId)
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      );
      const currentConversation = get().currentConversation;
      set({
        conversations,
        currentConversation:
          currentConversation && String(currentConversation.id) === String(conversationId)
            ? { ...currentConversation, unreadCount: 0 }
            : currentConversation,
      });
    } catch {
      // silencieux
    }
  },

  clearCurrentConversation: () => set({
    currentConversation: null,
    messages: [],
    peerOnline: null,
    messagesCurrentPage: 0,
    messagesTotalPages: 0,
    isLoadingMoreMessages: false,
  }),
  clearError: () => set({ error: null }),

  pollMessages: async (conversationId) => {
    try {
      const page = await messagerieApi.getConversationMessages(conversationId, { direction: 'desc', size: 20 });
      const incoming = page.data ?? [];
      const existing = get().messages;
      const existingIds = new Set(existing.map((m) => m.id));
      const newMessages = incoming.filter((m) => !existingIds.has(m.id));
      if (newMessages.length > 0) {
        set({ messages: sortMessages([...existing, ...newMessages]) });
      }
    } catch {
      // silencieux
    }
  },

  fetchInitialPresence: async (userId) => {
    try {
      const presence = await getUserPresence(userId);
      set({ peerOnline: presence.status === 'ONLINE' });
    } catch {
      // silencieux
    }
  },
}));
