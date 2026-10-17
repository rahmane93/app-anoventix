import { colors } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import { MOTIF_CLOTURE_LABELS, STATUT_ANNONCE_LABELS } from '@/src/types/annonce.types';

// ─── Statut d'une annonce côté propriétaire ──────────────────────────────────
// Puce condensée (clôturée + motif, masquée, rejetée, en attente, inactive),
// partagée par « Mes annonces » et l'écran Entreprise. Une annonce publiée
// n'a pas de puce : seul ce qui demande l'attention est signalé.

export interface StatutChip {
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
