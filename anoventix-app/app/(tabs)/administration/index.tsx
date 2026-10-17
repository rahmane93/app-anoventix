import { getRoleFlags } from '@/src/lib/roles';
import { useAdminStore } from '@/src/stores/admin.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { useUserStore } from '@/src/stores/user.store';
import { colors, spacing, typography } from '@/src/theme';
import {
    ErrorBanner,
    IconTile,
    ListRow,
    RowSeparator,
    Section,
    StatusBadge,
    webColumn,
    type Tone,
} from '@/src/features/admin/ui';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { useShallow } from 'zustand/react/shallow';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Entree = {
  key: string;
  icon: IoniconName;
  label: string;
  /** Compteur ; `null` = entrée de navigation sans compteur. */
  value: number | null;
  href: Parameters<typeof router.push>[0];
};

// ─── Ligne « file de travail » ────────────────────────────────────────────────

function QueueRow({ entree, unknown, aTraiter }: { entree: Entree; unknown: boolean; aTraiter: boolean }) {
  const count = entree.value ?? 0;
  const pending = aTraiter && !unknown && count > 0;
  const tone: Tone = pending ? 'danger' : aTraiter ? 'neutral' : 'primary';
  const subtitle = !aTraiter
    ? null
    : unknown ? 'Compteur indisponible' : pending ? 'À examiner' : 'Rien en attente';
  return (
    <ListRow
      leading={<IconTile icon={entree.icon} tone={tone} />}
      title={entree.label}
      subtitle={subtitle}
      trailing={
        entree.value === null ? null : pending ? (
          <StatusBadge label={String(count)} tone="danger" />
        ) : (
          <AppText style={s.count}>{unknown ? '—' : count.toLocaleString('fr-FR')}</AppText>
        )
      }
      onPress={() => router.push(entree.href)}
      accessibilityLabel={entree.value === null ? entree.label : `${entree.label} : ${unknown ? 'inconnu' : count}`}
    />
  );
}

function Rows({ entrees, unknown, aTraiter }: { entrees: Entree[]; unknown: boolean; aTraiter: boolean }) {
  return (
    <>
      {entrees.map((e, i) => (
        <View key={e.key}>
          {i > 0 && <RowSeparator />}
          <QueueRow entree={e} unknown={unknown && e.value !== null} aTraiter={aTraiter} />
        </View>
      ))}
    </>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuthStore(useShallow((s) => ({ user: s.user })));
  const { profile } = useUserStore(useShallow((s) => ({ profile: s.profile })));
  const { stats, isLoadingStats, statsError, loadStats } = useAdminStore(useShallow((s) => ({ stats: s.stats, isLoadingStats: s.isLoadingStats, statsError: s.statsError, loadStats: s.loadStats })));

  // Même source de rôles que le layout : sinon la carte Licences peut manquer à un admin.
  const { isAdministrateur: isAdmin } = getRoleFlags(profile?.roles ?? profile?.role ?? user?.roles);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const unknown = !stats;
  const aTraiter: Entree[] = [
    {
      key: 'signalements', icon: 'flag-outline', label: 'Signalements d’annonces',
      value: stats?.signalementsEnAttente ?? stats?.totalSignalements ?? 0,
      href: '/(tabs)/administration/signalements' as any,
    },
    {
      key: 'messages', icon: 'chatbubble-ellipses-outline', label: 'Messages signalés',
      value: stats?.messagesSignalesEnAttente ?? 0,
      href: '/(tabs)/administration/messages' as any,
    },
    {
      key: 'pieces', icon: 'card-outline', label: 'Pièces d’identité',
      value: stats?.piecesIdentiteEnAttente ?? 0,
      href: '/(tabs)/administration/pieces-identite' as any,
    },
    {
      key: 'activation', icon: 'time-outline', label: 'Comptes en attente d’activation',
      value: stats?.utilisateursEnAttenteActivation ?? 0,
      href: { pathname: '/(tabs)/administration/users', params: { statut: 'EN_ATTENTE_ACTIVATION' } } as any,
    },
  ];
  const gestion: Entree[] = [
    { key: 'users', icon: 'people-outline', label: 'Utilisateurs', value: stats?.totalUtilisateurs ?? 0, href: '/(tabs)/administration/users' as any },
    { key: 'entreprises', icon: 'business-outline', label: 'Entreprises', value: stats?.totalEntreprises ?? 0, href: '/(tabs)/administration/entreprises' as any },
    { key: 'annonces', icon: 'home-outline', label: 'Annonces actives', value: stats?.totalAnnoncesActives ?? 0, href: '/(tabs)/administration/annonces' as any },
    { key: 'localisations', icon: 'location-outline', label: 'Localisations', value: null, href: '/(tabs)/administration/localisations' as any },
    ...(isAdmin
      ? [
          { key: 'quotas', icon: 'speedometer-outline' as IoniconName, label: 'Quotas des comptes pro', value: null, href: '/(tabs)/administration/quotas' as any },
          { key: 'licences', icon: 'key-outline' as IoniconName, label: 'Licences', value: null, href: '/(tabs)/administration/licences' as any },
        ]
      : []),
  ];

  const pendingTotal = unknown ? 0 : aTraiter.reduce((sum, e) => sum + (e.value ?? 0), 0);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.container, webColumn]}
      refreshControl={
        <RefreshControl refreshing={isLoadingStats} onRefresh={loadStats} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      {/* Identité de la session */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <StatusBadge
            label={isAdmin ? 'Administrateur' : 'Modérateur'}
            tone={isAdmin ? 'danger' : 'neutral'}
            icon={isAdmin ? 'shield-checkmark' : 'eye'}
          />
          <AppText style={s.email} numberOfLines={1}>{user?.email}</AppText>
        </View>
        <View style={s.headerRight}>
          <AppText style={[s.total, pendingTotal > 0 && s.totalPending]}>
            {unknown ? '—' : pendingTotal}
          </AppText>
          <AppText style={s.totalLabel}>à traiter</AppText>
        </View>
      </View>

      {statsError ? <ErrorBanner message={statsError} onRetry={loadStats} /> : null}

      <Section title="À traiter">
        <Rows entrees={aTraiter} unknown={unknown} aTraiter />
      </Section>

      <Section title="Gestion">
        <Rows entrees={gestion} unknown={unknown} aTraiter={false} />
      </Section>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: spacing['4xl'] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1, gap: 4 },
  email: { fontSize: typography.sizes.xs, color: colors.textMuted },
  headerRight: { alignItems: 'flex-end' },
  total: { fontSize: typography.sizes['2xl'], fontWeight: '800', color: colors.textPrimary, lineHeight: 28 },
  totalPending: { color: colors.errorText },
  totalLabel: { fontSize: typography.sizes.xs, color: colors.textMuted },
  count: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textSecondary },
});
