import { useBreakpoint } from '@/src/lib/responsive';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/src/components/AppText';

// ─── Point fort ───────────────────────────────────────────────────────────────

export function PointFort({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={pf.item}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <AppText style={pf.value}>{value}</AppText>
      <AppText style={pf.label}>{label}</AppText>
    </View>
  );
}
const pf = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: 2, padding: spacing.sm },
  value: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  label: { fontSize: typography.sizes.xs, color: colors.textMuted, textAlign: 'center' },
});

// ─── Section ──────────────────────────────────────────────────────────────────

/**
 * Bloc de la fiche annonce : plat, pleine largeur, séparé du suivant par le fond
 * de l'écran (pas de carte ombrée). L'icône est conservée dans l'API pour les
 * appelants mais n'est plus affichée : le titre suffit.
 */
export function Section({
  title,
  children,
}: {
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
}) {
  // Web desktop : bloc en carte dans la colonne de contenu.
  const { isDesktop } = useBreakpoint();
  return (
    <View style={[sec.block, isDesktop && sec.blockDesktop]}>
      <AppText style={[sec.title, isDesktop && sec.titleDesktop]} accessibilityRole="header">{title}</AppText>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  block: {
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.textPrimary },
  blockDesktop: {
    marginBottom: 0,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  titleDesktop: { fontSize: typography.sizes.xl, letterSpacing: -0.3 },
});
