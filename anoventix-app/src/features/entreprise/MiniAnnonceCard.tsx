import { annonceHref } from '@/src/lib/annonce-url';
import { AnnonceMosaic } from '@/src/components/annonce/AnnonceMosaic';
import { getStatutChip } from '@/src/lib/annonce-statut';
import { isLoyerMensuel } from '@/src/lib/bien';
import { colors, radius, shadows, spacing, typography, typeAnnonceColors } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS } from '@/src/types/annonce.types';
import { formatPrix, formatPrixCompact } from '@/src/utils/format';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { useBreakpoint } from '@/src/lib/responsive';

export const MiniAnnonceCard = React.memo(function MiniAnnonceCard({ item }: { item: BienImmo }) {
  const suffix = isLoyerMensuel(item.typeAnnonce) ? ' /mois' : '';
  // Vue interne de l'entreprise : on signale ce qui n'est pas visible du public.
  const statut = item.proprietaireMasque
    ? { text: 'Masquée (compte)', color: colors.errorText }
    : getStatutChip(item);
  // Web desktop : la cellule de grille fixe la largeur.
  const { isDesktop } = useBreakpoint();
  return (
    <TouchableOpacity
      style={[miniCard.card, isDesktop && miniCard.cardGrid]}
      onPress={() => router.push(annonceHref(item))}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={[TYPE_BIEN_LABELS[item.typeBien], item.titre, `${formatPrix(item.prixRevise ?? item.prix)}${suffix}`, statut?.text].filter(Boolean).join(', ')}
    >
      <AnnonceMosaic medias={item.medias} height={110} recyclingKey={item.id} placeholderIconSize={18}>
        <View style={[
          miniCard.badge,
          { backgroundColor: typeAnnonceColors[item.typeAnnonce].bg },
        ]}>
          <AppText style={[miniCard.badgeText, {
            color: typeAnnonceColors[item.typeAnnonce].fg,
          }]}>
            {TYPE_ANNONCE_LABELS[item.typeAnnonce]}
          </AppText>
        </View>
      </AnnonceMosaic>
      <View style={miniCard.body}>
        <View style={miniCard.topRow}>
          <AppText style={miniCard.typeBien} numberOfLines={1}>{TYPE_BIEN_LABELS[item.typeBien]}</AppText>
          {statut ? (
            <View style={[miniCard.statut, { backgroundColor: statut.color }]}>
              <AppText style={miniCard.statutText} numberOfLines={1}>{statut.text}</AppText>
            </View>
          ) : null}
        </View>
        <AppText style={miniCard.titre} numberOfLines={2}>{item.titre}</AppText>
        <AppText style={miniCard.prix} numberOfLines={1}>{formatPrixCompact(item.prixRevise ?? item.prix)}{suffix}</AppText>
      </View>
    </TouchableOpacity>
  );
});

const miniCard = StyleSheet.create({
  card: {
    flexBasis: '48%',
    flexGrow: 0,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardGrid: { flexBasis: 'auto', flex: 1 },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  body: { padding: spacing.sm, gap: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statut: {
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    flexShrink: 1,
    minWidth: 0,
    marginLeft: 'auto',
  },
  statutText: { fontSize: 10, fontWeight: '700', color: colors.white },
  typeBien: {
    flexShrink: 1,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  titre: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  prix: { fontSize: typography.sizes.sm, fontWeight: '800', color: colors.primary, marginTop: 2 },
});
