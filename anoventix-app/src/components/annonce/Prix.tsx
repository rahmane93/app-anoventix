import AppText from '@/src/components/AppText';
import { colors, spacing, typography } from '@/src/theme';
import { formatPrix, formatPrixCompact } from '@/src/utils/format';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type PrixVariant = 'card' | 'detail' | 'small';

/**
 * Prix d'une annonce, rendu identique partout :
 *  - « card » / « small » : montant court (« 4,5 M GNF ») ;
 *  - « detail » : montant complet (« 4 500 000 GNF »).
 * Prix révisé : le nouveau prix garde la couleur principale, l'ancien est barré
 * et une pastille « Prix baissé » le signale quand il a diminué.
 */
export function Prix({
  prix,
  prixRevise,
  mensuel = false,
  variant = 'card',
}: {
  prix: number;
  prixRevise?: number | null;
  mensuel?: boolean;
  variant?: PrixVariant;
}) {
  const format = variant === 'detail' ? formatPrix : formatPrixCompact;
  const courant = prixRevise ?? prix;
  const revise = prixRevise != null && prixRevise !== prix;
  const baisse = revise && prixRevise! < prix;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AppText style={[styles.montant, styles[variant]]}>{format(courant)}</AppText>
        {mensuel && <AppText style={styles.suffixe}>par mois</AppText>}
      </View>
      {revise && (
        <View style={styles.row}>
          {baisse && variant !== 'small' && (
            <View style={styles.baisse}>
              <AppText style={styles.baisseText}>Prix baissé</AppText>
            </View>
          )}
          <AppText style={styles.ancien}>{format(prix)}</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs + 2 },
  montant: { fontWeight: '800', color: colors.primary },
  card: { fontSize: typography.sizes['2xl'], letterSpacing: -0.5 },
  detail: { fontSize: typography.sizes['3xl'], letterSpacing: -0.8 },
  small: { fontSize: typography.sizes.md },
  suffixe: { fontSize: typography.sizes.sm, color: colors.textMuted },
  ancien: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  baisse: {
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  baisseText: { fontSize: typography.sizes.xs, fontWeight: '800', color: colors.primaryDark },
});
