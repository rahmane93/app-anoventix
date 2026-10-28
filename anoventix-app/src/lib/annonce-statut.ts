import { colors } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import { MOTIF_CLOTURE_LABELS, STATUT_ANNONCE_LABELS } from '@/src/types/annonce.types';

// ─── Statut d'une annonce côté propriétaire ──────────────────────────────────
// Puce condensée (clôturée + motif, masquée, rejetée, en attente, inactive),
// partagée par « Mes annonces » et l'écran Entreprise. Une annonce publiée
// n'a pas de puce : seul ce qui demande l'attention est signalé.

interface StatutChip {
  text: string;
  color: string;
}

export function getStatutChip(
  item: Pick<BienImmo, 'statutModeration' | 'motifCloture' | 'actif'>,
): StatutChip | null {
  switch (item.statutModeration) {
    case 'CLOTUREE':
      return {
        text: item.motifCloture ? `Clôturée · ${MOTIF_CLOTURE_LABELS[item.motifCloture]}` : 'Clôturée',
        color: colors.textMuted,
      };
    case 'MASQUEE':
      return { text: STATUT_ANNONCE_LABELS.MASQUEE, color: colors.warningText };
    case 'REJETEE':
      return { text: STATUT_ANNONCE_LABELS.REJETEE, color: colors.errorText };
  }
  return item.actif ? null : { text: 'Masquée', color: colors.warningText };
}

// ─── Correction et réexamen d'une annonce masquée (DEC-09, DEC-10) ───────────

/** Demandes de réexamen permises par annonce (RG-03-31). */
const REEXAMENS_MAX = 3;

type EtatModeration = Pick<BienImmo, 'statutModeration' | 'reexamenDemande' | 'nbReexamens'>;

/** Masquée par la modération : le propriétaire la corrige et peut demander un réexamen. */
export const estCorrigeable = (item: Pick<BienImmo, 'statutModeration'>): boolean =>
  item.statutModeration === 'MASQUEE';

/** Rejetée : définitif, seule la suppression reste possible. */
export const estRejetee = (item: Pick<BienImmo, 'statutModeration'>): boolean =>
  item.statutModeration === 'REJETEE';

type EtatReexamen = 'DISPONIBLE' | 'EN_COURS' | 'EPUISE' | 'AUCUN';

/** « Demander un réexamen », « Réexamen en cours », ou plus de demande possible (support). */
export function getEtatReexamen(item: EtatModeration): EtatReexamen {
  if (item.statutModeration !== 'MASQUEE') return 'AUCUN';
  if (item.reexamenDemande) return 'EN_COURS';
  return (item.nbReexamens ?? 0) >= REEXAMENS_MAX ? 'EPUISE' : 'DISPONIBLE';
}
