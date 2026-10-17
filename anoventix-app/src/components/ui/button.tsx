import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    TouchableOpacityProps,
    View,
} from 'react-native';
import AppText from '../AppText';
import { colors, radius, spacing, typography } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

// danger : action destructive principale (fond rouge) ;
// dangerOutline : action destructive secondaire (ex. « Supprimer » dans une liste).
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dangerOutline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'danger'
              ? colors.white
              : variant === 'dangerOutline'
                ? colors.errorText
                : colors.primary
          }
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <AppText
            style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}
            numberOfLines={1}
          >
            {title}
          </AppText>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primarySurface,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.errorText,
    borderColor: colors.errorText,
  },
  dangerOutline: {
    backgroundColor: 'transparent',
    borderColor: colors.errorText,
  },

  // Sizes
  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    minHeight: 44, // cible tactile minimale recommandée
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
  },
  size_lg: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing['2xl'],
    minHeight: 62,
  },

  // States
  disabled: {
    opacity: 0.5,
  },

  // Labels
  label: {
    fontWeight: typography.weights.bold,
    letterSpacing: 0.2,
  },
  label_primary: {
    color: colors.textOnPrimary,
  },
  label_secondary: {
    color: colors.primary,
  },
  label_outline: {
    color: colors.primary,
  },
  label_ghost: {
    color: colors.primary,
  },
  label_danger: {
    color: colors.white,
  },
  label_dangerOutline: {
    color: colors.errorText,
  },
  labelSize_sm: {
    fontSize: typography.sizes.sm,
  },
  labelSize_md: {
    fontSize: typography.sizes.md,
  },
  labelSize_lg: {
    fontSize: typography.sizes.lg,
  },
});
