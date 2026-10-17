import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '../AppText';
import { colors, radius, shadows, spacing, typography } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertVariant = 'error' | 'success' | 'info' | 'warning';

interface AlertBannerProps {
  message: string;
  variant?: AlertVariant;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const variantConfig: Record<AlertVariant, { bg: string; border: string; text: string; iconName: IoniconsName }> = {
  error:   { bg: colors.errorLight,   border: colors.error,   text: colors.errorText,   iconName: 'close-circle' },
  success: { bg: colors.successLight, border: colors.success, text: colors.successText, iconName: 'checkmark-circle' },
  info:    { bg: colors.infoLight,    border: colors.info,    text: colors.infoText,    iconName: 'information-circle' },
  warning: { bg: colors.warningLight, border: colors.warning, text: colors.warningText, iconName: 'warning' },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function AlertBanner({ message, variant = 'error', onDismiss, autoDismissMs }: AlertBannerProps) {
  const config = variantConfig[variant];
  const opacity = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();

    if (autoDismissMs && onDismiss) {
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(onDismiss);
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        { backgroundColor: config.bg, borderLeftColor: config.border, opacity },
      ]}
    >
      <Ionicons name={config.iconName} size={20} color={config.text} style={styles.icon} />
      <AppText style={[styles.message, { color: config.text }]}>{message}</AppText>
      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Fermer le message"
        >
          <Ionicons name="close" size={18} color={config.text} style={{ opacity: 0.7 }} />
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    marginBottom: spacing.base,
    gap: spacing.sm,
    ...shadows.sm,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: 20,
  },
});
