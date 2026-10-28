import { AnnonceMosaic } from '@/src/components/annonce/AnnonceMosaic';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import AppText from '@/src/components/AppText';
import { isLoyerMensuel } from '@/src/lib/bien';
import { colors, radius, shadows, spacing, typography, typeAnnonceColors } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS } from '@/src/types/annonce.types';
import { formatPrix, formatPrixCompact } from '@/src/utils/format';

export function SuggestCard({ item, onPress, style }: { item: BienImmo; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const suffix = isLoyerMensuel(item.typeAnnonce) ? ' /mois' : '';
  return (
    <TouchableOpacity
      style={[scStyles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={[TYPE_BIEN_LABELS[item.typeBien], item.titre, `${formatPrix(item.prixRevise ?? item.prix)}${suffix}`].filter(Boolean).join(', ')}
    >
      <AnnonceMosaic medias={item.medias} height={100} recyclingKey={item.id} placeholderIconSize={16}>
        <View style={[scStyles.badge, { backgroundColor: typeAnnonceColors[item.typeAnnonce].bg }]}>
          <AppText style={[scStyles.badgeText, { color: typeAnnonceColors[item.typeAnnonce].fg }]}>
            {TYPE_ANNONCE_LABELS[item.typeAnnonce]}
          </AppText>
        </View>
      </AnnonceMosaic>
      <View style={scStyles.body}>
        <AppText style={scStyles.typeBien}>{TYPE_BIEN_LABELS[item.typeBien]}</AppText>
        <AppText style={scStyles.titre} numberOfLines={2}>{item.titre}</AppText>
        <AppText style={scStyles.prix} numberOfLines={1}>{formatPrixCompact(item.prixRevise ?? item.prix)}{suffix}</AppText>
      </View>
    </TouchableOpacity>
  );
}

const scStyles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginRight: spacing.sm,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  body: { padding: spacing.sm, gap: 3 },
  typeBien: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
  titre: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  prix: { fontSize: typography.sizes.sm, fontWeight: '800', color: colors.primary },
});
