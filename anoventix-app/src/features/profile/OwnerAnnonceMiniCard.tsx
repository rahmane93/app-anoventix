import { AnnonceMosaic } from '@/src/components/annonce/AnnonceMosaic';
import { colors, radius, spacing, typography } from '@/src/theme';
import {
  STATUT_ANNONCE_LABELS,
  TYPE_BIEN_LABELS,
  type BienImmo,
  type StatutAnnonce,
} from '@/src/types/annonce.types';
import { formatPrix, formatPrixCompact } from '@/src/utils/format';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';

// Couleurs « …Text » : lisibles en blanc sur fond (contraste ≥ 4.5:1).
const STATUT_COLORS: Partial<Record<StatutAnnonce, string>> = {
  PUBLIEE: colors.successText,
  MASQUEE: colors.warningText,
  REJETEE: colors.errorText,
};

export const OwnerAnnonceMiniCard = React.memo(function OwnerAnnonceMiniCard({ item, onPress }: { item: BienImmo; onPress: () => void }) {

  const statusColor = STATUT_COLORS[item.statutModeration] ?? colors.textSecondary;
  const statusLabel = STATUT_ANNONCE_LABELS[item.statutModeration] ?? '—';
  const typeLabel = item.typeBien ? TYPE_BIEN_LABELS[item.typeBien] : null;
  const prix = item.prixRevise ?? item.prix;

  return (
    <TouchableOpacity
      style={miniStyles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={[typeLabel, item.titre || item.description, prix ? formatPrix(prix) : null, statusLabel].filter(Boolean).join(', ')}
    >
      <AnnonceMosaic medias={item.medias} height={110} recyclingKey={item.id} placeholderIconSize={20}>
        <View style={[miniStyles.statusBadge, { backgroundColor: statusColor }]}>
          <AppText style={miniStyles.statusText}>{statusLabel}</AppText>
        </View>
      </AnnonceMosaic>
      <View style={miniStyles.body}>
        <AppText style={miniStyles.type} numberOfLines={1}>{typeLabel ?? '—'}</AppText>
        <AppText style={miniStyles.title} numberOfLines={2}>{item.titre || item.description || '—'}</AppText>
        <AppText style={miniStyles.price}>{prix ? formatPrixCompact(prix) : '—'}</AppText>
      </View>
    </TouchableOpacity>
  );
});

const miniStyles = StyleSheet.create({
  card: {
    width: 168,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  statusBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.white },
  body: { padding: spacing.sm, gap: 2 },
  type: {
    fontSize: typography.sizes['2xs'],
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  title: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  price: { fontSize: typography.sizes.sm, fontWeight: '800', color: colors.primary, marginTop: 2 },
});
