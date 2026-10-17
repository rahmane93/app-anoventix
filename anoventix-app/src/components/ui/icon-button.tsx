import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { colors, radius, shadows } from '../../theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  icon: IoniconsName;
  /** Obligatoire : un bouton icône n'a pas de texte visible. */
  accessibilityLabel: string;
  /** « surface » : pastille blanche bordée (écrans sans en-tête) ; « plain » : icône seule. */
  variant?: 'surface' | 'plain';
  color?: string;
  size?: number;
}

/**
 * Bouton icône unique (retour, fermer, actions d'en-tête) : 40 px visibles,
 * zone tactile étendue à 44 px+, libellé d'accessibilité obligatoire.
 */
export function IconButton({
  icon,
  variant = 'surface',
  color = colors.textPrimary,
  size = 20,
  style,
  ...props
}: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, variant === 'surface' && styles.surface, style]}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
      {...props}
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.xs,
  },
});
