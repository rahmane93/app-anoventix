import type { StatutCleLicence } from '@/src/types/licence.types';
import type { StatutAnnonce } from '@/src/types/annonce.types';
import type {
    NiveauAvertissement,
    StatutPieceIdentite,
    StatutSignalement,
    StatutUtilisateur,
} from '@/src/types/admin.types';
import type { Tone } from './ui';

// Un statut = un ton, partout dans l'administration.

export const USER_STATUT_TONE: Record<StatutUtilisateur, Tone> = {
  ACTIF: 'success',
  SUSPENDU: 'danger',
  INACTIF: 'neutral',
  EN_ATTENTE_ACTIVATION: 'warning',
};

export const PIECE_TONE: Record<StatutPieceIdentite, Tone> = {
  EN_ATTENTE: 'warning',
  VALIDEE: 'success',
  REJETEE: 'danger',
};

export const SIGNALEMENT_TONE: Record<StatutSignalement, Tone> = {
  EN_ATTENTE: 'warning',
  TRAITE: 'success',
  IGNORE: 'neutral',
};

export const ANNONCE_TONE: Record<StatutAnnonce, Tone> = {
  PUBLIEE: 'success',
  MASQUEE: 'warning',
  REJETEE: 'danger',
  CLOTUREE: 'neutral',
  DESACTIVEE: 'neutral',
};

export const CLE_TONE: Record<StatutCleLicence, Tone> = {
  LIBRE: 'info',
  ACTIVE: 'success',
  EXPIREE: 'neutral',
};

export const NIVEAU_TONE: Record<NiveauAvertissement, Tone> = {
  LEGER: 'warning',
  MODERE: 'danger',
  GRAVE: 'danger',
};

/** Remplissage d'un quota : orange dès 70 %, rouge dès 90 %. */
export function quotaTone(used: number, total: number): Tone {
  if (total <= 0) return used > 0 ? 'danger' : 'neutral';
  const ratio = used / total;
  if (ratio >= 0.9) return 'danger';
  if (ratio >= 0.7) return 'warning';
  return 'neutral';
}
