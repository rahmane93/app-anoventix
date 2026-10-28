import { HapticTab } from '@/components/haptic-tab';
import { WebPageHeader } from '@/src/components/web/WebPageHeader';
import { useNavState } from '@/src/lib/nav-items';
import { useBreakpoint, type ContainerSize } from '@/src/lib/responsive';
import { useUserStore } from '@/src/stores/user.store';
import { colors, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


function PublishButton() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/publier')}
      style={pubStyles.btn}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Publier une annonce"
    >
      <Ionicons name="add" size={26} color={colors.primary} />
    </TouchableOpacity>
  );
}

const pubStyles = StyleSheet.create({
  // 44 × 44 : zone tactile minimale recommandée.
  btn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
});

// ─── Badge non-lu ─────────────────────────────────────────────────────────────

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={bStyles.badge}>
      <AppText style={bStyles.badgeText}>{count > 99 ? '99+' : String(count)}</AppText>
    </View>
  );
}

const bStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 12,
  },
});

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { isAuthenticated, flags, unreadCount, items } = useNavState();
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const { bottom } = useSafeAreaInsets();
  // Web desktop : la navigation passe par la barre du haut (app/_layout) ;
  // la tab bar disparaît et les en-têtes deviennent des titres de page.
  const { isDesktop, isWide } = useBreakpoint();
  // Titre aligné sur la largeur du contenu de chaque onglet.
  const headerSize: Record<string, ContainerSize> = {
    'mes-annonces': 'detail',
    entreprise: isWide ? 'detail' : 'form',
    profile: isWide ? 'detail' : 'form',
    publier: 'form',
  };

  useEffect(() => {
    if (isAuthenticated) fetchProfile();
  }, [isAuthenticated, fetchProfile]);

  const { isAgentProfessionnel } = flags;
  const visible = (key: string) => items.find((i) => i.key === key)?.visible ?? false;

  const TAB_HEIGHT = 56;
  const TAB_PADDING_BOTTOM = 8;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.headerBackground,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 3,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontFamily: typography.fonts.bold, fontSize: 17, color: colors.headerText },
        headerTitleAlign: 'center',
        ...(isDesktop && {
          header: ({ options, route }) => (
            <WebPageHeader
              title={typeof options.headerTitle === 'string' ? options.headerTitle : options.title ?? route.name}
              right={options.headerRight?.({ canGoBack: false })}
              size={headerSize[route.name] ?? 'page'}
            />
          ),
        }),
        tabBarStyle: isDesktop ? { display: 'none' } : {
          backgroundColor: colors.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 10,
          height: TAB_HEIGHT + bottom,
          paddingBottom: TAB_PADDING_BOTTOM + bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: typography.sizes.xs, fontFamily: typography.fonts.semibold, letterSpacing: 0.1 },
        tabBarButton: HapticTab,
        // Masque la barre d'onglets quand le clavier est ouvert : la saisie
        // dispose de toute la hauteur et les boutons de l'écran restent atteignables.
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Caché — redirect interne */}
      <Tabs.Screen name="index" options={{ href: null }} />

      {/* ── Annonces — public ─────────────────────────────────────── */}
      <Tabs.Screen
        name="explore"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color as string} />,
          tabBarLabel: 'Accueil',
        }}
      />

      {/* ── Messagerie — particulier, pro, agent ──────────────────── */}
      <Tabs.Screen
        name="messagerie"
        options={{
          href: visible('messagerie') ? undefined : null,
          title: 'Messagerie',
          headerShown: false,  // géré par le Stack dans (tabs)/messagerie/_layout.tsx
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color as string} />
              <UnreadBadge count={unreadCount} />
            </View>
          ),
        }}
      />

      {/* ── Favoris — tous les comptes connectés (DEC-15) ─────────── */}
      <Tabs.Screen
        name="favoris"
        options={{
          href: visible('favoris') ? undefined : null,
          title: 'Favoris',
          // Onglet racine : pas de bouton retour (cohérent avec les autres onglets).
          headerTitle: 'Mes favoris',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color as string} />,
        }}
      />

      {/* ── Administration — admin et modérateur ──────────────────── */}
      <Tabs.Screen
        name="administration"
        options={{
          href: visible('administration') ? undefined : null,
          title: 'Administration',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'shield' : 'shield-outline'} size={24} color={color as string} />,
        }}
      />

      {/* ── Mes annonces — agent professionnel ────────────────────── */}
      <Tabs.Screen
        name="mes-annonces"
        options={{
          href: visible('mes-annonces') ? undefined : null,
          title: 'Mes annonces',
          // Agent pro : onglet racine avec bouton publier.
          // Particulier : écran ouvert depuis le profil → flèche de retour, pas de bouton « + ».
          headerLeft: isAgentProfessionnel || isDesktop
            ? undefined
            : () => (
                <TouchableOpacity
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
                  style={favStyles.btn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Retour au profil"
                >
                  <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
              ),
          headerRight: isAgentProfessionnel && !isDesktop ? () => <PublishButton /> : undefined,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color as string} />,
        }}
      />

      {/* ── Entreprise — professionnel uniquement ─────────────────────── */}
      <Tabs.Screen
        name="entreprise"
        options={{
          href: visible('entreprise') ? undefined : null,
          title: 'Entreprise',
          headerTitle: 'Mon entreprise',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'business' : 'business-outline'} size={24} color={color as string} />,
        }}
      />

      {/* ── Dashboard PRO — professionnel et agent ────────────────── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          // Mobile : 5 onglets au plus. Les statistiques passent dans le profil
          // (Profil > Statistiques) ; le web desktop les garde dans la barre du haut.
          href: visible('dashboard') && isDesktop ? undefined : null,
          title: 'Statistiques',
          headerTitle: 'Statistiques',
          headerLeft: isDesktop
            ? undefined
            : () => (
                <TouchableOpacity
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
                  style={favStyles.btn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Retour au profil"
                >
                  <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
              ),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color as string} />,
          tabBarLabel: 'Stats',
        }}
      />

      {/* publier — accessible via router.push mais absent de la tab bar.
          Parcours plein écran : pas de barre d'onglets sous Retour / Suivant. */}
      <Tabs.Screen name="publier" options={{ href: null, tabBarStyle: { display: 'none' } }} />

{/* ── Profil — toujours visible ──────────────────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          href: isAuthenticated ? undefined : '/(auth)/login',
          title: isAuthenticated ? 'Profil' : 'Connexion',
          headerTitle: isAuthenticated ? 'Mon profil' : 'Connexion',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={isAuthenticated ? (focused ? 'person' : 'person-outline') : 'log-in-outline'}
                size={24}
                color={color as string}
              />
            </View>
          ),
        }}
      />
    </Tabs>
    </View>
  );
}

const favStyles = StyleSheet.create({
  // 44 × 44 : zone tactile minimale recommandée.
  btn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
});
