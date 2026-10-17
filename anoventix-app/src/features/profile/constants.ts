import { API_BASE_URL } from '@/src/api/client';
import type { TypePieceIdentite } from '@/src/types/user.types';

export const AVATAR_SIZE = 96;
export const BANNER_HEIGHT = 160;

export const PIECES: { label: string; value: TypePieceIdentite }[] = [
  { label: "Carte nationale", value: 'CARTE_IDENTITE' },
  { label: 'Passeport', value: 'PASSEPORT' },
  { label: 'Permis de conduire', value: 'PERMIS_DE_CONDUIRE' },
  { label: 'Autre', value: 'AUTRE' },
];

export function buildPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
}

