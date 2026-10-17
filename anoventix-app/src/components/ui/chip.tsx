import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import AppText from '../AppText';
import { colors, radius, spacing, typography } from '../../theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IoniconsName;
  /** « danger » : choix d'un motif de signalement. */
  tone?: 'primary' | 'danger';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pastille de sélection (filtres, quartiers, motifs…) : un seul style dans
 * toute l'app. Sélectionnée : fond teinté, bordure et texte de la couleur du ton.
 */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  tone = 'primary',
  accessibilityLabel,
  style,
}: ChipProps) {
  const toneColors =
    tone === 'danger'
      ? { fg: colors.errorText, bg: colors.errorLight }
      : { fg: colors.primary, bg: colors.primarySurface };
  const fg = selected ? toneColors.fg : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && { borderColor: toneColors.fg, backgroundColor: toneColors.bg },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
    >
      {icon && <Ionicons name={icon} size={14} color={fg} />}
      <AppText style={[styles.text, { color: fg }, selected && styles.textSelected]}>{label}</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  textSelected: {
    fontWeight: '700',
  },
});
