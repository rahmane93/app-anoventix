import type { PageResponse } from '../types/annonce.types';
import type {
  Licence,
  LicenceAdmin,
  ReglagesLicence,
  StatutCleLicence,
  TypeLicence,
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

export async function adminGenererCle(type: TypeLicence): Promise<string> {
  const res = await apiClient.post<{ cle: string }>('/api/licences/admin/cles', { type });
  return res.data.cle;
}

export async function adminListerCles(params: {
  statut?: StatutCleLicence;
  q?: string;
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

export async function adminGetModeLicence(): Promise<boolean> {
  const res = await apiClient.get<{ actif: boolean }>('/api/licences/admin/mode');
  return res.data.actif;
}

export async function adminSetModeLicence(actif: boolean): Promise<boolean> {
  const res = await apiClient.put<{ actif: boolean }>('/api/licences/admin/mode', { actif });
  return res.data.actif;
}
