import { AdminSidebar } from '@/src/features/admin/AdminSidebar';
import { useBreakpoint } from '@/src/lib/responsive';
import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { useUserStore } from '@/src/stores/user.store';
import { colors, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

export default function AdministrationLayout() {
  const { user, isAuthenticated } = useAuthStore(useShallow((s) => ({ user: s.user, isAuthenticated: s.isAuthenticated })));
  const { profile } = useUserStore(useShallow((s) => ({ profile: s.profile })));

  // Même source de rôles que la barre d'onglets ((tabs)/_layout.tsx) : sinon
  // l'onglet peut être visible et l'écran rediriger aussitôt.
  const { isAdministrateur, isModerateur } = getRoleFlags(profile?.roles ?? profile?.role ?? user?.roles);
  const isAdminOrMod = isAuthenticated && (isAdministrateur || isModerateur);
  // Web desktop : barre latérale des sections + écran courant à droite.
  const { isDesktop } = useBreakpoint();

  if (!isAdminOrMod) {
    return <Redirect href="/(tabs)/explore" />;
  }

  const stack = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBackground },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: typography.fonts.bold, fontSize: 17, color: colors.textPrimary },
        headerTitleAlign: isDesktop ? 'left' : 'center',
        headerBackTitle: 'Retour',
        headerShadowVisible: !isDesktop,
        animation: isDesktop ? 'none' : undefined,
        statusBarBackgroundColor: colors.headerBackground,
        statusBarStyle: 'dark',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Administration',
          headerLeft: isDesktop ? undefined : () => (
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          ),
        }}
      />
      <Stack.Screen name="users" options={{ title: 'Utilisateurs' }} />
      <Stack.Screen name="users/[id]" options={{ title: 'Détail utilisateur' }} />
      <Stack.Screen name="signalements" options={{ title: 'Signalements' }} />
      <Stack.Screen name="annonces" options={{ title: 'Annonces' }} />
      <Stack.Screen name="pieces-identite" options={{ title: 'Pièces d\'identité' }} />
      <Stack.Screen name="entreprises" options={{ title: 'Entreprises' }} />
      <Stack.Screen name="entreprises/[id]" options={{ title: 'Détail entreprise' }} />
      <Stack.Screen name="messages" options={{ title: 'Messages signalés' }} />
      <Stack.Screen name="messages/[id]" options={{ title: 'Conversation' }} />
      <Stack.Screen name="localisations" options={{ title: 'Localisations' }} />
      <Stack.Screen name="licences" options={{ title: 'Licences' }} />
      <Stack.Screen name="quotas" options={{ title: 'Quotas des comptes pro' }} />
    </Stack>
  );

  if (!isDesktop) return stack;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
      <AdminSidebar isAdmin={isAdministrateur} />
      <View style={{ flex: 1, minWidth: 0 }}>{stack}</View>
    </View>
  );
}
