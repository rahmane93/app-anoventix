import { ScreenContainer } from '@/src/components/ui/screen-container';
import AppText from '@/src/components/AppText';
import { ConversationList } from '@/src/features/messagerie/ConversationList';
import { useBreakpoint } from '@/src/lib/responsive';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

export default function ConversationsScreen() {
  const { isAuthenticated } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated })));
  const { isDesktop } = useBreakpoint();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Web desktop : la liste est dans le panneau de gauche (_layout) ; ici, le
  // panneau de droite attend qu'une conversation soit choisie.
  if (isDesktop) {
    return (
      <View style={styles.placeholder}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.primary} />
        </View>
        <AppText style={styles.title}>Sélectionnez une conversation</AppText>
        <AppText style={styles.sub}>Vos échanges avec les annonceurs s’affichent ici.</AppText>
      </View>
    );
  }

  return (
    <ScreenContainer scrollable={false} padded={false}>
      <ConversationList />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing['2xl'],
    backgroundColor: colors.white,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: typography.sizes.xl, fontWeight: '800', color: colors.textPrimary },
  sub: { fontSize: typography.sizes.md, color: colors.textMuted, textAlign: 'center' },
});
