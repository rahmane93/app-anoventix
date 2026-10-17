import AppText from '@/src/components/AppText';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Annonces du compte masquées par l'administrateur : invisibles du public, publication et
 * modification suspendues. Bandeau dans « Mes annonces », écran entier à la place de Publier.
 */
export function AnnoncesMasqueesNotice({ motif, pleinEcran = false }: { motif?: string | null; pleinEcran?: boolean }) {
  const texte =
    'Vos annonces ne sont plus visibles du public. Vous ne pouvez ni publier ni modifier '
    + "d'annonce tant que la modération n'a pas levé ce masquage ; vous pouvez encore les clôturer, "
    + 'les masquer ou les supprimer.';
  return (
    <View style={pleinEcran ? s.ecran : s.bandeau} accessibilityRole="alert">
      <View style={s.titreRow}>
        <Ionicons name="eye-off" size={pleinEcran ? 28 : 18} color={colors.errorText} />
        <AppText style={pleinEcran ? s.titreEcran : s.titre}>Annonces masquées par la modération</AppText>
      </View>
      {motif ? <AppText style={s.motif}>Motif : {motif}</AppText> : null}
      <AppText style={s.texte}>{texte}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  bandeau: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  ecran: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  titreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titre: { flex: 1, fontSize: typography.sizes.md, fontWeight: '700', color: colors.errorText },
  titreEcran: { flex: 1, fontSize: typography.sizes.xl, fontWeight: '700', color: colors.errorText },
  motif: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.errorText },
  texte: { fontSize: typography.sizes.sm, color: colors.errorText, lineHeight: 20 },
});
