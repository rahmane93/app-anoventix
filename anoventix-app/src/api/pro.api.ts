import type { ProStats } from '../types/pro.types';
import { apiClient } from './client';

export async function getProStats(): Promise<ProStats> {
  const res = await apiClient.get<ProStats>('/api/stats/pro');
  return res.data;
}
