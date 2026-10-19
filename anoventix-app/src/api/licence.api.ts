import type { PageResponse } from '../types/annonce.types';
import type {
  Licence,
  LicenceAdmin,
  ReglagesLicence,
  StatutCleLicence,
  VenteLicence,
} from '../types/licence.types';
import { apiClient } from './client';

export async function getMaLicence(): Promise<Licence> {
  const res = await apiClient.get<Licence>('/api/licences/me');
  return res.data;
}

export async function activerLicence(cle: string): Promise<Licence> {
  const res = await apiClient.post<Licence>('/api/licences/activer', { cle });
  return res.data;
}

/** Vend une clé nominative : l'acheteur reçoit un reçu par email et seul son compte peut l'activer. */
export async function adminVendreCle(vente: VenteLicence): Promise<LicenceAdmin> {
  const res = await apiClient.post<LicenceAdmin>('/api/licences/admin/cles', vente);
  return res.data;
}

/** Affecte un acheteur à une clé au porteur d'avant la mise en service. */
export async function adminAffecterAcheteur(id: number, vente: VenteLicence): Promise<LicenceAdmin> {
  const res = await apiClient.put<LicenceAdmin>(`/api/licences/admin/cles/${id}/acheteur`, vente);
  return res.data;
}

export async function adminListerCles(params: {
  statut?: StatutCleLicence;
  q?: string;
  /** Période de vente (AAAA-MM-JJ). */
  du?: string;
  au?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<LicenceAdmin>> {
  const res = await apiClient.get<PageResponse<LicenceAdmin>>('/api/licences/admin/cles', { params });
  return res.data;
}

export async function adminGetReglagesLicence(): Promise<ReglagesLicence> {
  const res = await apiClient.get<ReglagesLicence>('/api/licences/admin/reglages');
  return res.data;
}

export async function adminSetReglagesLicence(reglages: ReglagesLicence): Promise<ReglagesLicence> {
  const res = await apiClient.put<ReglagesLicence>('/api/licences/admin/reglages', reglages);
  return res.data;
}

export interface ModeLicence {
  actif: boolean;
  /** Date d'entrée en vigueur (J+30 après l'activation). */
  dateEffet: string | null;
}

export async function adminGetModeLicence(): Promise<ModeLicence> {
  const res = await apiClient.get<ModeLicence>('/api/licences/admin/mode');
  return res.data;
}

export async function adminSetModeLicence(actif: boolean): Promise<ModeLicence> {
  const res = await apiClient.put<ModeLicence>('/api/licences/admin/mode', { actif });
  return res.data;
}
