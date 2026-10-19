import AppText from '@/src/components/AppText';
import { colors, interactive, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

// Navigation latérale du back-office sur le web desktop : les sections restent
// accessibles depuis n'importe quel écran (sur mobile, on passe par l'accueil admin).

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Item {
  path: string;
  label: string;
  icon: IoniconName;
  adminOnly?: boolean;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Pilotage',
    items: [{ path: '', label: "Vue d'ensemble", icon: 'grid-outline' }],
  },
  {
    title: 'Modération',
    items: [
      { path: 'signalements', label: 'Signalements', icon: 'flag-outline' },
      { path: 'reexamens', label: 'Réexamens', icon: 'refresh-circle-outline' },
      { path: 'entreprises-a-verifier', label: 'Entreprises à vérifier', icon: 'shield-checkmark-outline' },
      { path: 'messages', label: 'Messages signalés', icon: 'chatbubble-ellipses-outline' },
      { path: 'pieces-identite', label: "Pièces d'identité", icon: 'card-outline' },
    ],
  },
  {
    title: 'Données',
    items: [
      { path: 'users', label: 'Utilisateurs', icon: 'people-outline' },
      { path: 'entreprises', label: 'Entreprises', icon: 'business-outline' },
      { path: 'annonces', label: 'Annonces', icon: 'home-outline' },
      { path: 'statistiques', label: 'Statistiques', icon: 'stats-chart-outline' },
      { path: 'localisations', label: 'Localisations', icon: 'location-outline', adminOnly: true },
      { path: 'quartiers-demandes', label: 'Quartiers demandés', icon: 'map-outline', adminOnly: true },
    ],
  },
  {
    title: 'Comptes pro',
    items: [
      { path: 'quotas', label: 'Quotas', icon: 'speedometer-outline', adminOnly: true },
      { path: 'licences', label: 'Licences', icon: 'key-outline', adminOnly: true },
    ],
  },
];

const BASE = '/administration';

export function AdminSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    const full = path ? `${BASE}/${path}` : BASE;
    return path ? pathname === full || pathname.startsWith(`${full}/`) : pathname === BASE;
  };

  return (
    <View style={s.side} accessibilityRole="menu">
      <View style={s.brand}>
        <Ionicons name={isAdmin ? 'shield-checkmark' : 'eye'} size={18} color={colors.accent} />
        <AppText style={s.brandText}>{isAdmin ? 'Administration' : 'Modération'}</AppText>
      </View>
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => isAdmin || !i.adminOnly);
        if (items.length === 0) return null;
        return (
          <View key={g.title} style={s.group}>
            <AppText style={s.groupTitle}>{g.title}</AppText>
            {items.map((i) => {
              const active = isActive(i.path);
              return (
                <Pressable
                  key={i.path || 'index'}
                  onPress={() => router.navigate(`/(tabs)/administration${i.path ? `/${i.path}` : ''}` as Href)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: active }}
                  style={({ hovered }: { hovered?: boolean }) => [s.item, hovered && !active && s.itemHover, active && s.itemActive]}
                >
                  <Ionicons name={i.icon} size={18} color={active ? colors.primary : colors.textSecondary} />
                  <AppText style={[s.itemText, active && s.itemTextActive]}>{i.label}</AppText>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  side: {
    width: 260,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  brandText: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  group: { gap: 2 },
  groupTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  itemHover: { backgroundColor: interactive.hoverSurface },
  itemActive: { backgroundColor: colors.primarySurface },
  itemText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textSecondary },
  itemTextActive: { color: colors.primary, fontWeight: '800' },
});
