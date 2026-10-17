import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Défile le contenu si nécessaire (utile pour les formulaires) */
  scrollable?: boolean;
  /** Padding horizontal */
  padded?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ScreenContainer({
  children,
  scrollable = true,
  padded = true,
}: ScreenContainerProps) {
  const content = (
    <View style={[styles.inner, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
    ...(Platform.OS === 'web' ? ({ overflow: 'hidden' } as object) : {}),
  },
  scroll: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.base,
  },
});
