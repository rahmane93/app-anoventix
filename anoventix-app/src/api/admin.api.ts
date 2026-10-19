import type {
    AdminAnnoncesPage,
    AdminEntreprise,
    AdminStats,
    AdminUser,
    Avertissement,
    ChangePieceIdentiteStatutRequest,
    ChangeStatutUserRequest,
    DecisionSignalementRequest,
    EmettrAvertissementRequest,
    MessageSignale,
    QuotasPro,
    MessagesSignalesPage,
    PiecesIdentitePage,
    SignalementsPage,
    StatutSignalement,
    StatutUtilisateur,
    TraiterSignalementRequest,
} from '../types/admin.types';
import type { PageResponse, StatutAnnonce } from '../types/annonce.types';
import { apiClient } from './client';

/** Page au format des écrans d'administration (content / totalElements / number). */
interface PageAdmin<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

/** Toutes les listes paginées de l'API renvoient une PageResponse (data / totalItems / currentPage). */
function versPageAdmin<T>(raw: PageResponse<T>, page: number, size: number): PageAdmin<T> {
  return {
    content: Array.isArray(raw.data) ? raw.data : [],
    totalPages: raw.totalPages ?? 1,
    totalElements: raw.totalItems ?? 0,
    number: typeof raw.currentPage === 'number' ? raw.currentPage : page,
    size,
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiClient.get<AdminStats>('/api/admin/stats');
  return res.data;
}

// ─── Signalements ─────────────────────────────────────────────────────────────

export async function getSignalements(
  page = 0,
  size = 20,
  statut?: StatutSignalement,
): Promise<SignalementsPage> {
  const res = await apiClient.get<PageResponse<SignalementsPage['content'][number]>>('/api/admin/signalements', {
    params: { page, size, ...(statut ? { statut } : {}) },
  });
  return versPageAdmin(res.data, page, size);
}

export async function traiterSignalement(
  id: number,
  body: TraiterSignalementRequest,
): Promise<void> {
  await apiClient.put(`/api/admin/signalements/${id}/traiter`, body);
}

/** Décision unique : action sur l'annonce et clôture de ses signalements en une seule opération. */
export async function deciderSignalement(id: number, body: DecisionSignalementRequest): Promise<void> {
  await apiClient.put(`/api/admin/signalements/${id}/decision`, body);
}

/** File « Réexamens » : annonces masquées dont le propriétaire attend une décision. */
export async function getReexamens(page = 0, size = 20): Promise<AdminAnnoncesPage> {
  const res = await apiClient.get<AdminAnnoncesPage>('/api/admin/reexamens', { params: { page, size } });
  return res.data;
}

export async function deleteSignalement(id: number): Promise<void> {
  await apiClient.delete(`/api/admin/signalements/${id}`);
}

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

export interface AdminUsersPage {
  content: AdminUser[];
  totalPages: number;
  totalElements: number;
  number: number;
}

export async function getAllUsers(
  search = '',
  page = 0,
  size = 20,
  statut?: StatutUtilisateur,
): Promise<AdminUsersPage> {
  const res = await apiClient.get<PageResponse<AdminUser>>('/api/admin/utilisateurs', {
    params: { search, page, size, ...(statut ? { statut } : {}) },
  });
  return versPageAdmin(res.data, page, size);
}

export async function getUserById(id: string): Promise<AdminUser> {
  const res = await apiClient.get<AdminUser>(`/api/users/${id}`);
  return res.data;
}

export async function changeUserStatut(
  id: string,
  body: ChangeStatutUserRequest,
): Promise<AdminUser> {
  const res = await apiClient.put<AdminUser>(`/api/users/${id}/statut`, body);
  return res.data;
}

export async function changePieceIdentiteStatut(
  id: string,
  body: ChangePieceIdentiteStatutRequest,
): Promise<AdminUser> {
  const res = await apiClient.put<AdminUser>(
    `/api/users/${id}/piece-identite/statut`,
    body,
  );
  return res.data;
}

// ─── Utilisateurs admin ───────────────────────────────────────────────────────

export interface StatsAvancees {
  evolutionAnnonces: { periode: string; count: number }[];
  annonceParRegion: { categorie: string; count: number }[];
  annonceParTypeBien: { categorie: string; count: number }[];
  annonceParTypeAnnonce: { categorie: string; count: number }[];
}

/** Évolution sur 12 mois et répartitions des annonces visibles (ECART-30). */
export async function getStatsAvancees(): Promise<StatsAvancees> {
  return (await apiClient.get<StatsAvancees>('/api/admin/stats/avancees')).data;
}

export async function getAvertissements(userId: string): Promise<Avertissement[]> {
  const res = await apiClient.get<Avertissement[]>(`/api/admin/utilisateurs/${userId}/avertissements`);
  return res.data;
}

export async function emettrAvertissement(
  userId: string,
  body: EmettrAvertissementRequest,
): Promise<Avertissement> {
  const res = await apiClient.post<Avertissement>(
    `/api/admin/utilisateurs/${userId}/avertissements`,
    body,
  );
  return res.data;
}

/** Levée d'un avertissement émis par erreur (administrateur). */
export async function leverAvertissement(userId: string, avertissementId: number, motif: string): Promise<Avertissement> {
  const res = await apiClient.post<Avertissement>(
    `/api/admin/utilisateurs/${userId}/avertissements/${avertissementId}/lever`,
    { motif },
  );
  return res.data;
}

export async function octroiRole(userId: string, role: string): Promise<void> {
  await apiClient.post(`/api/admin/utilisateurs/${userId}/roles/${role}`);
}

export async function revoquerRole(userId: string, role: string): Promise<void> {
  await apiClient.delete(`/api/admin/utilisateurs/${userId}/roles/${role}`);
}

/**
 * Supprime immédiatement un compte (ADMINISTRATEUR uniquement) : annonces et photos,
 * favoris, données personnelles ; entreprise et agents pour un PROFESSIONNEL.
 */
export async function supprimerCompte(userId: string): Promise<void> {
  await apiClient.delete(`/api/admin/utilisateurs/${userId}`);
}

// ─── Annonces admin ───────────────────────────────────────────────────────────

/**
 * Filtres appliqués par l'API (et non sur la page chargée). « Clôturée » n'est
 * pas un statut serveur : c'est une annonce PUBLIEE avec un motif de clôture.
 */
export async function getAdminAnnonces(
  page = 0,
  size = 10,
  filtre: { statut?: StatutAnnonce; q?: string } = {},
): Promise<AdminAnnoncesPage> {
  const { statut, q } = filtre;
  const statutParams =
    statut === 'CLOTUREE' ? { statut: 'PUBLIEE', cloturee: true }
      : statut === 'PUBLIEE' ? { statut: 'PUBLIEE', cloturee: false }
        : statut ? { statut }
          : {};
  const res = await apiClient.get<AdminAnnoncesPage>('/api/admin/annonces', {
    params: {
      page, size, sort: 'dateCreation', direction: 'desc',
      ...statutParams,
      ...(q?.trim() ? { q: q.trim() } : {}),
    },
  });
  // Dérive le statut CLOTUREE (motifCloture != null), cohérent avec le reste de l'app.
  return {
    ...res.data,
    data: (res.data.data ?? []).map((a) => ({
      ...a,
      // La modération (MASQUEE / REJETEE / DESACTIVEE) prime sur la clôture.
      statutModeration:
        a.motifCloture != null && a.statutModeration === 'PUBLIEE' ? 'CLOTUREE' : a.statutModeration,
    })),
  };
}

export async function toggleAnnonceActif(id: number): Promise<void> {
  await apiClient.put(`/api/biens-immo/${id}/toggle-actif`);
}

export async function masquerAnnonce(id: number, raison: string): Promise<void> {
  await apiClient.put(`/api/admin/annonces/${id}/masquer`, null, { params: { raison } });
}

export async function rejeterAnnonce(id: number, raison: string): Promise<void> {
  await apiClient.put(`/api/admin/annonces/${id}/rejeter`, null, { params: { raison } });
}

export async function publierAnnonce(id: number): Promise<void> {
  await apiClient.put(`/api/admin/annonces/${id}/publier`);
}

/**
 * Masquage système (ADMINISTRATEUR) : retire toutes les annonces du compte (ce compte seul,
 * pas son entreprise) des vues publiques sans modifier les annonces. Retourne le message de l'API.
 */
export async function masquerAnnoncesUtilisateur(userId: string, raison: string): Promise<string> {
  const res = await apiClient.put<{ message: string }>(
    `/api/admin/utilisateurs/${userId}/annonces/masquer`, null, { params: { raison } },
  );
  return res.data.message;
}

/** Lève le masquage système : chaque annonce retrouve sa visibilité antérieure (ADMINISTRATEUR). */
export async function afficherAnnoncesUtilisateur(userId: string): Promise<string> {
  const res = await apiClient.put<{ message: string }>(`/api/admin/utilisateurs/${userId}/annonces/afficher`);
  return res.data.message;
}

// ─── Entreprises ──────────────────────────────────────────────────────────────

/** Toutes les entreprises : l'écran les affiche sans pagination, on enchaîne donc les pages. */
export async function getAdminEntreprises(): Promise<AdminEntreprise[]> {
  const size = 100;
  const entreprises: AdminEntreprise[] = [];
  for (let page = 0; ; page++) {
    const res = await apiClient.get<PageResponse<AdminEntreprise>>('/api/entreprises', {
      params: { page, size },
    });
    entreprises.push(...(res.data.data ?? []));
    if (page + 1 >= (res.data.totalPages ?? 1)) return entreprises;
  }
}

export async function getAdminEntrepriseById(id: string): Promise<AdminEntreprise> {
  const res = await apiClient.get<AdminEntreprise>(`/api/entreprises/${id}`);
  return res.data;
}

/** Désactive une entreprise (ADMINISTRATEUR, ou le propriétaire côté pro). */
export async function desactiverEntreprise(id: string): Promise<void> {
  await apiClient.delete(`/api/entreprises/${id}`);
}

/** Réactive une entreprise désactivée (ADMINISTRATEUR). */
export async function reactiverEntreprise(id: string): Promise<AdminEntreprise> {
  const res = await apiClient.put<AdminEntreprise>(`/api/entreprises/${id}/reactiver`);
  return res.data;
}

// ─── Quotas des comptes pro ───────────────────────────────────────────────────

export async function getQuotasPro(): Promise<QuotasPro> {
  const res = await apiClient.get<QuotasPro>('/api/admin/quotas');
  return res.data;
}

/** Valeurs globales, appliquées aux entreprises sans exception (ADMINISTRATEUR). */
export async function setQuotasPro(quotas: { quotaAgents: number; quotaAnnonces: number }): Promise<QuotasPro> {
  const res = await apiClient.put<QuotasPro>('/api/admin/quotas', quotas);
  return res.data;
}

/** Exception d'une entreprise ; null = revenir à la valeur globale (ADMINISTRATEUR). */
export async function setQuotasEntreprise(entrepriseId: string, quotas: QuotasPro): Promise<AdminEntreprise> {
  const res = await apiClient.put<AdminEntreprise>(`/api/admin/entreprises/${entrepriseId}/quotas`, quotas);
  return res.data;
}

// ─── Pièces d'identité ────────────────────────────────────────────────────────

export async function getPiecesIdentiteEnAttente(
  page = 0,
  size = 20,
): Promise<PiecesIdentitePage> {
  const res = await apiClient.get<PageResponse<AdminUser>>(
    '/api/admin/pieces-identite/en-attente',
    { params: { page, size } },
  );
  return versPageAdmin(res.data, page, size);
}

// ─── Messages signalés ────────────────────────────────────────────────────────

export async function getMessagesSignales(
  page = 0,
  size = 20,
): Promise<MessagesSignalesPage> {
  const res = await apiClient.get<PageResponse<MessageSignale>>('/api/admin/messages/signales', {
    params: { page, size },
  });
  return versPageAdmin(res.data, page, size);
}

export async function supprimerMessage(messageId: number): Promise<void> {
  await apiClient.put(`/api/admin/messages/${messageId}/supprimer`);
}

/** Signalement infondé : le message est conservé et sort de la file. */
export async function ignorerSignalementMessage(messageId: number): Promise<void> {
  await apiClient.put(`/api/admin/messages/${messageId}/ignorer`);
}

const CONVERSATION_PAGE_SIZE = 50; // plafond MAX_PAGE_SIZE du backend
const CONVERSATION_MAX_PAGES = 20;

/**
 * Conversation complète (ordre chronologique) : le backend pagine par 50 depuis
 * le plus ancien, donc un message signalé récent peut être au-delà de la 1re page.
 */
export async function getAdminConversationMessages(conversationId: number): Promise<MessageSignale[]> {
  const messages: MessageSignale[] = [];
  for (let page = 0; page < CONVERSATION_MAX_PAGES; page++) {
    const res = await apiClient.get<PageResponse<MessageSignale>>(
      `/api/admin/conversations/${conversationId}/messages`,
      { params: { page, size: CONVERSATION_PAGE_SIZE } },
    );
    const raw = res.data;
    messages.push(...(Array.isArray(raw.data) ? raw.data : []));
    if (page + 1 >= (raw.totalPages ?? 1)) break;
  }
  return messages;
}
