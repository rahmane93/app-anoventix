import AppText from '@/src/components/AppText';
import { ConversationList } from '@/src/features/messagerie/ConversationList';
import { useBreakpoint, WebContainer } from '@/src/lib/responsive';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, radius, spacing, typography, webShadow } from '@/src/theme';
import { Redirect, Stack, useGlobalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

export default function MessagerieLayout() {
  const { isAuthenticated } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated })));
  const { isDesktop } = useBreakpoint();
  const { conversationId } = useGlobalSearchParams<{ conversationId?: string }>();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const stack = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBackground },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontFamily: typography.fonts.bold, fontSize: 17, color: colors.headerText },
        headerTitleAlign: isDesktop ? 'left' : 'center',
        headerBackTitle: 'Retour',
        headerShadowVisible: !isDesktop,
        statusBarBackgroundColor: colors.headerBackground,
        statusBarStyle: 'dark',
        contentStyle: isDesktop ? { backgroundColor: colors.white } : undefined,
        animation: isDesktop ? 'none' : undefined,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Messagerie', headerShown: !isDesktop }} />
      <Stack.Screen name="[conversationId]" options={{ title: 'Conversation' }} />
    </Stack>
  );

  if (!isDesktop) return stack;

  // Web desktop : maître-détail — conversations à gauche, fil à droite.
  return (
    <View style={s.page}>
      <WebContainer style={s.container}>
        <AppText style={s.title} accessibilityRole="header">Messagerie</AppText>
        <View style={s.frame}>
          <View style={s.listPane}>
            <ConversationList activeId={conversationId ?? null} replace={!!conversationId} />
          </View>
          <View style={s.threadPane}>{stack}</View>
        </View>
      </WebContainer>
    </View>
  );
}

const s = StyleSheet.create({
  // La page ne défile pas : chaque panneau a son propre défilement.
  page: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.base },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '800',
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  frame: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    ...({ boxShadow: webShadow.sm } as object),
  },
  listPane: {
    width: 380,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  threadPane: { flex: 1, minWidth: 0 },
});
