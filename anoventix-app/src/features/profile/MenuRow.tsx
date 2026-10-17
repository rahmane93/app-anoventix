import { colors, spacing, typography } from '@/src/theme';
import type { StatutPieceIdentite } from '@/src/types/user.types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export function PieceStatusBadge({ statut }: { statut: StatutPieceIdentite | null }) {
  if (!statut) return null;
  const config: Record<string, { icon: IoniconsName; color: string; label: string }> = {
    EN_ATTENTE: { icon: 'time-outline', color: colors.warningText, label: 'En attente de validation' },
    VALIDEE: { icon: 'checkmark-circle', color: colors.successText, label: 'Identité vérifiée' },
    REJETEE: { icon: 'close-circle', color: colors.error, label: 'Document rejeté' },
  };
  const { icon, color, label } = config[statut] ?? {
    icon: 'help-circle-outline' as IoniconsName,
    color: colors.textMuted,
    label: statut,
  };
  return (
    <View style={secStyles.pieceBadgeRow}>
      <Ionicons name={icon} size={18} color={color} />
      <AppText style={[secStyles.pieceBadgeText, { color }]}>{label}</AppText>
    </View>
  );
}

export function MenuRow({
  iconName,
  label,
  onPress,
  badgeCount,
  trailing,
}: {
  iconName: IoniconsName;
  label: string;
  onPress: () => void;
  badgeCount?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={secStyles.menuRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={badgeCount && badgeCount > 0 ? `${label}, ${badgeCount} non lu${badgeCount > 1 ? 's' : ''}` : label}
    >
      <View style={secStyles.menuLeft}>
        <View style={secStyles.menuIconWrap}>
          <Ionicons name={iconName} size={18} color={colors.primary} />
        </View>
        <AppText style={secStyles.menuLabel}>{label}</AppText>
      </View>
      <View style={secStyles.menuRight}>
        {trailing ?? null}
        {badgeCount && badgeCount > 0 ? (
          <View style={secStyles.menuBadge}>
            <AppText style={secStyles.menuBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</AppText>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// Partagé par MenuRow / PieceStatusBadge ET l'écran Profil (menuIconWrap, sectionLabel).
export const secStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  menuRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm },
  menuLabel: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: '500' as const,
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  menuBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.white,
    fontWeight: '700' as const,
  },
  pieceBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  pieceBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600' as const,
  },
});
