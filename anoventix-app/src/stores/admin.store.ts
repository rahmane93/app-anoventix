import { create } from 'zustand';
import type { AdminUsersPage } from '../api/admin.api';
import * as adminApi from '../api/admin.api';
import * as localisationApi from '../api/localisation.api';
import type { LocalisationPayload } from '../api/localisation.api';
import type { Localisation, StatutAnnonce } from '../types/annonce.types';
import type {
    AdminAnnonce,
    AdminEntreprise,
    AdminStats,
    AdminUser,
    Avertissement,
    ChangePieceIdentiteStatutRequest,
    ChangeStatutUserRequest,
    DecisionSignalementRequest,
    EmettrAvertissementRequest,
    MessageSignale,
    MessagesSignalesPage,
    PiecesIdentitePage,
    Signalement,
    SignalementsPage,
    StatutSignalement,
    StatutUtilisateur,
    TraiterSignalementRequest,
} from '../types/admin.types';
import { getErrorMessage } from '../utils/format';

// Critères de la liste affichée : réutilisés pour charger les pages suivantes.
export type AdminUsersFiltre = { search: string; statut?: StatutUtilisateur };
export type AdminAnnoncesFiltre = { statut?: StatutAnnonce; q?: string };

// Ignore les réponses d'une recherche remplacée entre-temps (frappe rapide,
// changement de filtre) : la dernière demandée gagne.
let usersRequestId = 0;
let annoncesRequestId = 0;

// ─── State ────────────────────────────────────────────────────────────────────

interface AdminStore {
  // Stats
  stats: AdminStats | null;
  isLoadingStats: boolean;
  statsError: string | null;

  // Signalements
  signalements: Signalement[];
  signalementsPage: number;
  signalementsTotalPages: number;
  signalementsTotalElements: number;
  /** Filtre de la liste chargée : un signalement qui n'y correspond plus en sort. */
  signalementsStatut: StatutSignalement | undefined;
  isLoadingSignalements: boolean;
  signalementsError: string | null;
  traitingSignalementIds: Set<number>;

  // Avertissements
  avertissements: Avertissement[];
  isLoadingAvertissements: boolean;
  avertissementsError: string | null;

  // Messages signalés
  messagesSignales: MessageSignale[];
  messagesSignalesPage: number;
  messagesSignalesTotalPages: number;
  messagesSignalesTotalElements: number;
  isLoadingMessagesSignales: boolean;
  messagesSignalesError: string | null;
  suppressingMessageIds: Set<number>;

  // Utilisateurs
  users: AdminUser[];
  usersFiltre: AdminUsersFiltre;
  usersPage: number;
  usersTotalPages: number;
  usersTotalElements: number;
  currentUser: AdminUser | null;
  isLoadingUsers: boolean;
  isLoadingUser: boolean;
  usersError: string | null;

  // Annonces
  annonces: AdminAnnonce[];
  annoncesFiltre: AdminAnnoncesFiltre;
  annoncesPage: number;
  annoncesTotalPages: number;
  annoncesTotalItems: number;
  isLoadingAnnonces: boolean;
  annoncesError: string | null;
  togglingAnnonceIds: Set<number>;

  // Entreprises
  entreprises: AdminEntreprise[];
  isLoadingEntreprises: boolean;
  entreprisesError: string | null;

  // Pièces d'identité en attente
  piecesIdentite: AdminUser[];
  piecesIdentitePage: number;
  piecesIdentiteTotalPages: number;
  piecesIdentiteTotalElements: number;
  isLoadingPiecesIdentite: boolean;
  piecesIdentiteError: string | null;

  // Moderation en cours
  moderatingAnnonceIds: Set<number>;
  deletingSignalementIds: Set<number>;

  // Conversation admin
  adminConversationMessages: MessageSignale[];
  isLoadingAdminConversation: boolean;
  adminConversationError: string | null;

  // Localisations (admin)
  localisations: Localisation[];
  localisationsTotalItems: number;
  isLoadingLocalisations: boolean;
  localisationsError: string | null;
  savingLocalisation: boolean;
  deletingLocalisationIds: Set<string>;

  // Actions
  loadStats: () => Promise<void>;
  loadEntreprises: () => Promise<void>;
  loadPiecesIdentite: (page?: number) => Promise<void>;
  loadSignalements: (page?: number, statut?: StatutSignalement) => Promise<void>;
  loadMoreSignalements: (statut?: StatutSignalement) => Promise<void>;
  traiterSignalement: (id: number, body: TraiterSignalementRequest) => Promise<void>;
  deciderSignalement: (id: number, body: DecisionSignalementRequest) => Promise<void>;
  reexamens: AdminAnnonce[];
  reexamensPage: number;
  reexamensTotalPages: number;
  reexamensTotalElements: number;
  isLoadingReexamens: boolean;
  reexamensError: string | null;
  loadReexamens: (page?: number) => Promise<void>;
  deleteSignalement: (id: number) => Promise<void>;
  loadUsers: (page?: number, filtre?: AdminUsersFiltre) => Promise<void>;
  loadMoreUsers: () => Promise<void>;
  loadUserById: (id: string) => Promise<void>;
  changeUserStatut: (id: string, body: ChangeStatutUserRequest) => Promise<void>;
  changePieceIdentiteStatut: (id: string, body: ChangePieceIdentiteStatutRequest) => Promise<void>;
  loadAvertissements: (userId: string) => Promise<void>;
  emettrAvertissement: (userId: string, body: EmettrAvertissementRequest) => Promise<void>;
  leverAvertissement: (userId: string, avertissementId: number, motif: string) => Promise<void>;
  octroiRole: (userId: string, role: string) => Promise<void>;
  revoquerRole: (userId: string, role: string) => Promise<void>;
  supprimerCompte: (userId: string) => Promise<void>;
  loadAnnonces: (page?: number, filtre?: AdminAnnoncesFiltre) => Promise<void>;
  loadMoreAnnonces: () => Promise<void>;
  toggleAnnonceActif: (id: number) => Promise<void>;
  masquerAnnonce: (id: number, raison: string) => Promise<void>;
  rejeterAnnonce: (id: number, raison: string) => Promise<void>;
  publierAnnonce: (id: number) => Promise<void>;
  loadMessagesSignales: (page?: number) => Promise<void>;
  loadMoreMessagesSignales: () => Promise<void>;
  supprimerMessage: (messageId: number) => Promise<void>;
  ignorerSignalementMessage: (messageId: number) => Promise<void>;
  loadAdminConversationMessages: (conversationId: number) => Promise<void>;
  loadLocalisations: () => Promise<void>;
  saveLocalisation: (payload: LocalisationPayload, id?: string) => Promise<void>;
  deleteLocalisationAdmin: (id: string) => Promise<void>;
  clearErrors: () => void;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAdminStore = create<AdminStore>((set, get) => ({
  stats: null,
  isLoadingStats: false,
  statsError: null,

  signalements: [],
  signalementsPage: 0,
  signalementsTotalPages: 0,
  signalementsTotalElements: 0,
  signalementsStatut: undefined,
  isLoadingSignalements: false,
  signalementsError: null,
  traitingSignalementIds: new Set(),

  avertissements: [],
  isLoadingAvertissements: false,
  avertissementsError: null,

  messagesSignales: [],
  messagesSignalesPage: 0,
  messagesSignalesTotalPages: 0,
  messagesSignalesTotalElements: 0,
  isLoadingMessagesSignales: false,
  messagesSignalesError: null,
  suppressingMessageIds: new Set(),

  users: [],
  usersFiltre: { search: '' },
  usersPage: 0,
  usersTotalPages: 0,
  usersTotalElements: 0,
  currentUser: null,
  isLoadingUsers: false,
  isLoadingUser: false,
  usersError: null,

  annonces: [],
  annoncesFiltre: {},
  annoncesPage: 0,
  annoncesTotalPages: 0,
  annoncesTotalItems: 0,
  isLoadingAnnonces: false,
  annoncesError: null,
  togglingAnnonceIds: new Set(),
  moderatingAnnonceIds: new Set(),
  deletingSignalementIds: new Set(),

  adminConversationMessages: [],
  isLoadingAdminConversation: false,
  adminConversationError: null,

  entreprises: [],
  isLoadingEntreprises: false,
  entreprisesError: null,

  localisations: [],
  localisationsTotalItems: 0,
  isLoadingLocalisations: false,
  localisationsError: null,
  savingLocalisation: false,
  deletingLocalisationIds: new Set(),

  piecesIdentite: [],
  piecesIdentitePage: 0,
  piecesIdentiteTotalPages: 0,
  piecesIdentiteTotalElements: 0,
  isLoadingPiecesIdentite: false,
  piecesIdentiteError: null,

  // ── Entreprises ────────────────────────────────────────────────────────────
  loadEntreprises: async () => {
    set({ isLoadingEntreprises: true, entreprisesError: null });
    try {
      const data = await adminApi.getAdminEntreprises();
      set({ entreprises: data });
    } catch (e: unknown) {
      set({ entreprisesError: getErrorMessage(e, 'Impossible de charger les entreprises.') });
    } finally {
      set({ isLoadingEntreprises: false });
    }
  },

  // ── Pièces d'identité ──────────────────────────────────────────────────────
  loadPiecesIdentite: async (page = 0) => {
    set({ isLoadingPiecesIdentite: true, piecesIdentiteError: null });
    try {
      const res: PiecesIdentitePage = await adminApi.getPiecesIdentiteEnAttente(page, 20);
      set({
        piecesIdentite: res.content,
        piecesIdentitePage: res.number,
        piecesIdentiteTotalPages: res.totalPages,
        piecesIdentiteTotalElements: res.totalElements,
      });
    } catch (e: unknown) {
      set({ piecesIdentiteError: getErrorMessage(e, 'Impossible de charger les pièces d\'identité.') });
    } finally {
      set({ isLoadingPiecesIdentite: false });
    }
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  loadStats: async () => {
    set({ isLoadingStats: true, statsError: null });
    try {
      const stats = await adminApi.getAdminStats();
      set({ stats });
    } catch (e: unknown) {
      set({ statsError: getErrorMessage(e, 'Impossible de charger les statistiques.') });
    } finally {
      set({ isLoadingStats: false });
    }
  },

  // ── Signalements ───────────────────────────────────────────────────────────
  loadSignalements: async (page = 0, statut?: StatutSignalement) => {
    set({ isLoadingSignalements: true, signalementsError: null });
    try {
      const res: SignalementsPage = await adminApi.getSignalements(page, 20, statut);
      set((s) => ({
        signalements: page === 0 ? res.content : [...s.signalements, ...res.content],
        signalementsPage: res.number,
        signalementsTotalPages: res.totalPages,
        signalementsTotalElements: res.totalElements,
        signalementsStatut: statut,
      }));
    } catch (e: unknown) {
      set({ signalementsError: getErrorMessage(e, 'Impossible de charger les signalements.') });
    } finally {
      set({ isLoadingSignalements: false });
    }
  },

  loadMoreSignalements: async (statut?: StatutSignalement) => {
    const { signalementsPage, signalementsTotalPages, isLoadingSignalements, signalementsError } = get();
    const nextPage = signalementsPage + 1;
    if (isLoadingSignalements || signalementsError || nextPage >= signalementsTotalPages) return;
    await get().loadSignalements(nextPage, statut);
  },

  reexamens: [],
  reexamensPage: 0,
  reexamensTotalPages: 0,
  reexamensTotalElements: 0,
  isLoadingReexamens: false,
  reexamensError: null,

  loadReexamens: async (page = 0) => {
    set({ isLoadingReexamens: true, reexamensError: null });
    try {
      const res = await adminApi.getReexamens(page, 20);
      set((s) => ({
        reexamens: page === 0 ? res.data : [...s.reexamens, ...res.data],
        reexamensPage: res.currentPage,
        reexamensTotalPages: res.totalPages,
        reexamensTotalElements: res.totalItems,
      }));
    } catch (e: unknown) {
      set({ reexamensError: getErrorMessage(e, 'Impossible de charger les demandes de réexamen.') });
    } finally {
      set({ isLoadingReexamens: false });
    }
  },

  deciderSignalement: async (id, body) => {
    const ids = new Set(get().traitingSignalementIds);
    ids.add(id);
    set({ traitingSignalementIds: ids });
    try {
      await adminApi.deciderSignalement(id, body);
      // La décision clôt tous les signalements de l'annonce : on recharge la file telle qu'elle est filtrée.
      await get().loadSignalements(0, get().signalementsStatut ?? undefined);
    } finally {
      const next = new Set(get().traitingSignalementIds);
      next.delete(id);
      set({ traitingSignalementIds: next });
    }
  },

  traiterSignalement: async (id, body) => {
    const ids = new Set(get().traitingSignalementIds);
    ids.add(id);
    set({ traitingSignalementIds: ids });
    try {
      await adminApi.traiterSignalement(id, body);
      set((s) => {
        // Liste filtrée sur un autre statut (ex. file « En attente ») : le
        // signalement traité en sort, comme il le ferait au rechargement.
        if (s.signalementsStatut && s.signalementsStatut !== body.statut) {
          return {
            signalements: s.signalements.filter((sg) => sg.id !== id),
            signalementsTotalElements: Math.max(0, s.signalementsTotalElements - 1),
          };
        }
        return {
          signalements: s.signalements.map((sg) =>
            sg.id === id
              ? { ...sg, statut: body.statut, noteAdmin: body.noteAdmin ?? null }
              : sg,
          ),
        };
      });
    } finally {
      const next = new Set(get().traitingSignalementIds);
      next.delete(id);
      set({ traitingSignalementIds: next });
    }
  },

  deleteSignalement: async (id) => {
    const ids = new Set(get().deletingSignalementIds);
    ids.add(id);
    set({ deletingSignalementIds: ids });
    try {
      await adminApi.deleteSignalement(id);
      set((s) => ({
        signalements: s.signalements.filter((sg) => sg.id !== id),
        signalementsTotalElements: Math.max(0, s.signalementsTotalElements - 1),
      }));
    } finally {
      const next = new Set(get().deletingSignalementIds);
      next.delete(id);
      set({ deletingSignalementIds: next });
    }
  },

  // ── Utilisateurs ───────────────────────────────────────────────────────────
  loadUsers: async (page = 0, filtre) => {
    const f = filtre ?? get().usersFiltre;
    const requestId = ++usersRequestId;
    set({ isLoadingUsers: true, usersError: null, usersFiltre: f });
    try {
      const res: AdminUsersPage = await adminApi.getAllUsers(f.search, page, 20, f.statut);
      if (requestId !== usersRequestId) return;
      const currentPage = typeof res.number === 'number' && !isNaN(res.number) ? res.number : page;
      const content = Array.isArray(res.content) ? res.content : [];
      set({
        users: page === 0 ? content : [...get().users, ...content],
        usersPage: currentPage,
        usersTotalPages: res.totalPages ?? 0,
        usersTotalElements: res.totalElements ?? 0,
      });
    } catch (e: unknown) {
      if (requestId !== usersRequestId) return;
      set({ usersError: getErrorMessage(e, 'Impossible de charger les utilisateurs.') });
    } finally {
      if (requestId === usersRequestId) set({ isLoadingUsers: false });
    }
  },

  loadMoreUsers: async () => {
    const { usersPage, usersTotalPages, isLoadingUsers, usersError } = get();
    const nextPage = usersPage + 1;
    if (isLoadingUsers || usersError || isNaN(nextPage) || nextPage >= usersTotalPages) return;
    await get().loadUsers(nextPage);
  },

  loadUserById: async (id) => {
    set({ isLoadingUser: true, usersError: null, currentUser: null });
    try {
      const user = await adminApi.getUserById(id);
      set({ currentUser: user });
    } catch (e: unknown) {
      set({ usersError: getErrorMessage(e, 'Impossible de charger cet utilisateur.') });
    } finally {
      set({ isLoadingUser: false });
    }
  },

  changeUserStatut: async (id, body) => {
    const updated = await adminApi.changeUserStatut(id, body);
    if (!updated) return;
    set((s) => ({
      currentUser: s.currentUser?.id === id ? updated : s.currentUser,
      users: (s.users ?? []).map((u) => (u.id === id ? updated : u)),
    }));
  },

  changePieceIdentiteStatut: async (id, body) => {
    const updated = await adminApi.changePieceIdentiteStatut(id, body);
    if (!updated) return;
    set((s) => ({
      currentUser: s.currentUser?.id === id ? updated : s.currentUser,
      users: (s.users ?? []).map((u) => (u.id === id ? updated : u)),
    }));
  },

  // ── Avertissements ─────────────────────────────────────────────────────────
  loadAvertissements: async (userId) => {
    set({ isLoadingAvertissements: true, avertissementsError: null });
    try {
      const data = await adminApi.getAvertissements(userId);
      set({ avertissements: Array.isArray(data) ? data : [] });
    } catch (e: unknown) {
      set({ avertissements: [], avertissementsError: getErrorMessage(e, 'Impossible de charger les avertissements.') });
    } finally {
      set({ isLoadingAvertissements: false });
    }
  },

  emettrAvertissement: async (userId, body) => {
    const avert = await adminApi.emettrAvertissement(userId, body);
    if (!avert) return;
    set((s) => ({ avertissements: [avert, ...(s.avertissements ?? [])] }));
    // Compteur en vigueur et statut (suspension éventuelle) recalculés par l'API.
    const fresh = await adminApi.getUserById(userId);
    if (fresh) set({ currentUser: fresh });
  },

  leverAvertissement: async (userId, avertissementId, motif) => {
    const leve = await adminApi.leverAvertissement(userId, avertissementId, motif);
    set((s) => ({ avertissements: (s.avertissements ?? []).map((a) => (a.id === leve.id ? leve : a)) }));
    const fresh = await adminApi.getUserById(userId);
    if (fresh) set({ currentUser: fresh });
  },

  // ── Rôles ──────────────────────────────────────────────────────────────────
  octroiRole: async (userId, role) => {
    await adminApi.octroiRole(userId, role);
    const fresh = await adminApi.getUserById(userId);
    if (fresh) set({ currentUser: fresh });
  },

  revoquerRole: async (userId, role) => {
    await adminApi.revoquerRole(userId, role);
    const fresh = await adminApi.getUserById(userId);
    if (fresh) set({ currentUser: fresh });
  },

  supprimerCompte: async (userId) => {
    await adminApi.supprimerCompte(userId);
    // Le compte reste en base (anonymisé) : on recharge la liste plutôt que de le retirer.
    set({ currentUser: null });
    await get().loadUsers(0);
  },

  // ── Annonces ───────────────────────────────────────────────────────────────
  loadAnnonces: async (page = 0, filtre) => {
    const f = filtre ?? get().annoncesFiltre;
    const requestId = ++annoncesRequestId;
    set({ isLoadingAnnonces: true, annoncesError: null, annoncesFiltre: f });
    try {
      const res = await adminApi.getAdminAnnonces(page, 10, f);
      if (requestId !== annoncesRequestId) return;
      set((s) => ({
        annonces: page === 0 ? res.data : [...s.annonces, ...res.data],
        annoncesPage: res.currentPage,
        annoncesTotalPages: res.totalPages,
        annoncesTotalItems: res.totalItems,
      }));
    } catch (e: unknown) {
      if (requestId !== annoncesRequestId) return;
      set({ annoncesError: getErrorMessage(e, 'Impossible de charger les annonces.') });
    } finally {
      if (requestId === annoncesRequestId) set({ isLoadingAnnonces: false });
    }
  },

  loadMoreAnnonces: async () => {
    const { annoncesPage, annoncesTotalPages, isLoadingAnnonces, annoncesError } = get();
    const nextPage = annoncesPage + 1;
    if (isLoadingAnnonces || annoncesError || nextPage >= annoncesTotalPages) return;
    await get().loadAnnonces(nextPage);
  },

  toggleAnnonceActif: async (id) => {
    const ids = new Set(get().togglingAnnonceIds);
    ids.add(id);
    set({ togglingAnnonceIds: ids });
    try {
      await adminApi.toggleAnnonceActif(id);
      set((s) => ({
        annonces: s.annonces.map((a) => {
          if (a.id !== id) return a;
          const nextActif = !a.actif;
          // Miroir du backend : masquer ne change plus le statut (masquer ≠ supprimer) ;
          // réafficher une annonce supprimée (DESACTIVEE) la restaure en PUBLIEE.
          let statutModeration = a.statutModeration;
          if (nextActif && a.statutModeration === 'DESACTIVEE') statutModeration = 'PUBLIEE';
          return { ...a, actif: nextActif, statutModeration };
        }),
      }));
    } finally {
      const next = new Set(get().togglingAnnonceIds);
      next.delete(id);
      set({ togglingAnnonceIds: next });
    }
  },

  masquerAnnonce: async (id, raison) => {
    const ids = new Set(get().moderatingAnnonceIds);
    ids.add(id);
    set({ moderatingAnnonceIds: ids });
    try {
      await adminApi.masquerAnnonce(id, raison);
    } finally {
      const next = new Set(get().moderatingAnnonceIds);
      next.delete(id);
      set({ moderatingAnnonceIds: next });
    }
  },

  rejeterAnnonce: async (id, raison) => {
    const ids = new Set(get().moderatingAnnonceIds);
    ids.add(id);
    set({ moderatingAnnonceIds: ids });
    try {
      await adminApi.rejeterAnnonce(id, raison);
    } finally {
      const next = new Set(get().moderatingAnnonceIds);
      next.delete(id);
      set({ moderatingAnnonceIds: next });
    }
  },

  publierAnnonce: async (id) => {
    const ids = new Set(get().moderatingAnnonceIds);
    ids.add(id);
    set({ moderatingAnnonceIds: ids });
    try {
      await adminApi.publierAnnonce(id);
    } finally {
      const next = new Set(get().moderatingAnnonceIds);
      next.delete(id);
      set({ moderatingAnnonceIds: next });
    }
  },

  // ── Messages signalés ──────────────────────────────────────────────────────
  loadMessagesSignales: async (page = 0) => {
    set({ isLoadingMessagesSignales: true, messagesSignalesError: null });
    try {
      const res: MessagesSignalesPage = await adminApi.getMessagesSignales(page, 20);
      set((s) => ({
        messagesSignales: page === 0 ? res.content : [...s.messagesSignales, ...res.content],
        messagesSignalesPage: res.number,
        messagesSignalesTotalPages: res.totalPages,
        messagesSignalesTotalElements: res.totalElements,
      }));
    } catch (e: unknown) {
      set({ messagesSignalesError: getErrorMessage(e, 'Impossible de charger les messages signalés.') });
    } finally {
      set({ isLoadingMessagesSignales: false });
    }
  },

  loadMoreMessagesSignales: async () => {
    const { messagesSignalesPage, messagesSignalesTotalPages, isLoadingMessagesSignales, messagesSignalesError } = get();
    const nextPage = messagesSignalesPage + 1;
    if (isLoadingMessagesSignales || messagesSignalesError || nextPage >= messagesSignalesTotalPages) return;
    await get().loadMessagesSignales(nextPage);
  },

  supprimerMessage: async (messageId) => {
    const ids = new Set(get().suppressingMessageIds);
    ids.add(messageId);
    set({ suppressingMessageIds: ids });
    try {
      await adminApi.supprimerMessage(messageId);
      // Décision prise : le message sort de la file, comme pour « Conforme ».
      set((s) => ({
        messagesSignales: s.messagesSignales.filter((m) => m.id !== messageId),
        messagesSignalesTotalElements: Math.max(0, s.messagesSignalesTotalElements - 1),
        adminConversationMessages: s.adminConversationMessages.map((m) =>
          m.id === messageId ? { ...m, supprime: true } : m,
        ),
      }));
    } finally {
      const next = new Set(get().suppressingMessageIds);
      next.delete(messageId);
      set({ suppressingMessageIds: next });
    }
  },

  ignorerSignalementMessage: async (messageId) => {
    const ids = new Set(get().suppressingMessageIds);
    ids.add(messageId);
    set({ suppressingMessageIds: ids });
    try {
      await adminApi.ignorerSignalementMessage(messageId);
      // Sorti de la file côté serveur : on le retire de la liste.
      set((s) => ({
        messagesSignales: s.messagesSignales.filter((m) => m.id !== messageId),
        messagesSignalesTotalElements: Math.max(0, s.messagesSignalesTotalElements - 1),
        adminConversationMessages: s.adminConversationMessages.map((m) =>
          m.id === messageId ? { ...m, signale: false } : m,
        ),
      }));
    } finally {
      const next = new Set(get().suppressingMessageIds);
      next.delete(messageId);
      set({ suppressingMessageIds: next });
    }
  },

  loadAdminConversationMessages: async (conversationId) => {
    set({ isLoadingAdminConversation: true, adminConversationError: null });
    try {
      const messages = await adminApi.getAdminConversationMessages(conversationId);
      set({ adminConversationMessages: Array.isArray(messages) ? messages : [] });
    } catch (e: unknown) {
      set({ adminConversationError: getErrorMessage(e, 'Impossible de charger les messages.') });
    } finally {
      set({ isLoadingAdminConversation: false });
    }
  },

  // ── Localisations ──────────────────────────────────────────────────────────
  loadLocalisations: async () => {
    set({ isLoadingLocalisations: true, localisationsError: null });
    try {
      const data = await localisationApi.getAllLocalisations();
      set({ localisations: data, localisationsTotalItems: data.length });
    } catch (e: unknown) {
      set({ localisationsError: getErrorMessage(e, 'Impossible de charger les localisations.') });
    } finally {
      set({ isLoadingLocalisations: false });
    }
  },

  saveLocalisation: async (payload, id) => {
    set({ savingLocalisation: true });
    try {
      if (id) {
        const updated = await localisationApi.updateLocalisation(id, payload);
        set((s) => ({ localisations: s.localisations.map((l) => l.id === id ? updated : l) }));
      } else {
        const created = await localisationApi.createLocalisation(payload);
        set((s) => ({ localisations: [created, ...s.localisations] }));
      }
    } finally {
      set({ savingLocalisation: false });
    }
  },

  deleteLocalisationAdmin: async (id) => {
    const ids = new Set(get().deletingLocalisationIds);
    ids.add(id);
    set({ deletingLocalisationIds: ids });
    try {
      await localisationApi.deleteLocalisation(id);
      set((s) => ({ localisations: s.localisations.filter((l) => l.id !== id) }));
    } finally {
      const next = new Set(get().deletingLocalisationIds);
      next.delete(id);
      set({ deletingLocalisationIds: next });
    }
  },

  clearErrors: () =>
    set({ statsError: null, signalementsError: null, usersError: null, annoncesError: null, messagesSignalesError: null }),

  reset: () =>
    set({
      stats: null,
      signalements: [],
      users: [],
      usersFiltre: { search: '' },
      usersPage: 0,
      usersTotalPages: 0,
      usersTotalElements: 0,
      currentUser: null,
      annonces: [],
      annoncesFiltre: {},
      togglingAnnonceIds: new Set(),
      avertissements: [],
      messagesSignales: [],
      localisations: [],
      localisationsTotalItems: 0,
    }),
}));
