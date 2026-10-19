import { apiClient } from './client';

// ─── Notifications push (DEC-13) et alertes de recherche (DEC-16) ────────────

export interface CriteresAlerte {
  typeAnnonce?: string | null;
  typeBien?: string | null;
  typeUsage?: string | null;
  prixMin?: number | null;
  prixMax?: number | null;
  region?: string | null;
  prefecture?: string | null;
  commune?: string | null;
  quartier?: string | null;
  q?: string | null;
  nbPiecesMin?: number | null;
  nbChambresMin?: number | null;
  surfaceMin?: number | null;
  surfaceMax?: number | null;
}

export interface AlerteRecherche {
  id: number;
  nom: string;
  active: boolean;
  criteres: CriteresAlerte;
  dateCreation: string;
  derniereNotification: string | null;
  derniereOuverture: string | null;
}

export interface InterrupteursNotifications {
  messages: boolean;
  alertes: boolean;
}

/** Nombre maximal d'alertes par compte (RG-04-20). */
export const ALERTES_MAX = 10;

export const enregistrerAppareil = async (jeton: string): Promise<void> => {
  await apiClient.post('/api/push/appareils', { jeton, plateforme: 'android' });
};

export const retirerAppareil = async (jeton: string): Promise<void> => {
  await apiClient.delete('/api/push/appareils', { params: { jeton } });
};

export const getInterrupteurs = async (): Promise<InterrupteursNotifications> =>
  (await apiClient.get<InterrupteursNotifications>('/api/users/me/notifications')).data;

export const setInterrupteurs = async (v: InterrupteursNotifications): Promise<InterrupteursNotifications> =>
  (await apiClient.put<InterrupteursNotifications>('/api/users/me/notifications', v)).data;

export const getAlertes = async (): Promise<AlerteRecherche[]> =>
  (await apiClient.get<AlerteRecherche[]>('/api/alertes')).data;

export const creerAlerte = async (nom: string, criteres: CriteresAlerte): Promise<AlerteRecherche> =>
  (await apiClient.post<AlerteRecherche>('/api/alertes', { nom, criteres })).data;

export const modifierAlerte = async (id: number, patch: { nom?: string; active?: boolean }): Promise<AlerteRecherche> =>
  (await apiClient.patch<AlerteRecherche>(`/api/alertes/${id}`, patch)).data;

export const supprimerAlerte = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/alertes/${id}`);
};

export const signalerOuvertureAlerte = async (id: number): Promise<AlerteRecherche> =>
  (await apiClient.post<AlerteRecherche>(`/api/alertes/${id}/ouverture`)).data;
