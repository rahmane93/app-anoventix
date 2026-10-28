import { LIST_PERF_PROPS } from '@/src/constants/list';
import { buildMediaUrl } from '@/src/api/annonce.api';
import { useAdminStore } from '@/src/stores/admin.store';
import { colors, typography } from '@/src/theme';
import type { AdminEntreprise } from '@/src/types/admin.types';
import { quotaTone } from '@/src/features/admin/status';
import {
    AdminPage,
    Avatar,
    EmptyState,
    ErrorBanner,
    FooterLoader,
    ListRow,
    LoadingState,
    MetaText,
    ResultCount,
    RowSeparator,
    SearchField,
    StatusBadge,
    TONES,
    Toolbar,
} from '@/src/features/admin/ui';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import AppText from '@/src/components/AppText';
import { useShallow } from 'zustand/react/shallow';

/** « 12/50 » ; orange dès 70 %, rouge dès 90 %. */
function Quota({ label, used, total }: { label: string; used: number; total: number }) {
  const tone = quotaTone(used, total);
  return (
    <AppText style={[s.quota, tone !== 'neutral' && { color: TONES[tone].fg, fontWeight: '700' }]}>
      {label} {used}/{total}
    </AppText>
  );
}

function EntrepriseRow({ item }: { item: AdminEntreprise }) {
  return (
    <ListRow
      leading={<Avatar name={item.nom} uri={item.photoProfil ? buildMediaUrl(item.photoProfil) : null} />}
      title={item.nom}
      subtitle={[item.adresse, item.numeroRCCM ? `RCCM ${item.numeroRCCM}` : null].filter(Boolean).join(' · ') || item.annonceurProfessionnelEmail}
      meta={
        <>
          <Quota label="Annonces" used={item.quotaAnnonces - item.annoncesRestantes} total={item.quotaAnnonces} />
          <MetaText>·</MetaText>
          <Quota label="Agents" used={item.quotaAgents - item.agentsRestants} total={item.quotaAgents} />
        </>
      }
      trailing={<StatusBadge label={item.active ? 'Active' : 'Inactive'} tone={item.active ? 'success' : 'danger'} />}
      onPress={() => router.push(`/(tabs)/administration/entreprises/${item.id}` as any)}
      accessibilityLabel={`${item.nom}, ${item.active ? 'active' : 'inactive'}`}
    />
  );
}

const ENTREPRISES_PAGE_SIZE = 20;

export default function EntreprisesAdminScreen() {
  const {
    entreprises,
    isLoadingEntreprises,
    entreprisesError,
    loadEntreprises,
  } = useAdminStore(
    useShallow((s) => ({
      entreprises: s.entreprises,
      isLoadingEntreprises: s.isLoadingEntreprises,
      entreprisesError: s.entreprisesError,
      loadEntreprises: s.loadEntreprises,
    })),
  );

  // L'endpoint backend renvoie toutes les entreprises d'un coup : on les affiche
  // par fenêtre croissante au scroll (vraie pagination serveur = point backend).
  const [visibleCount, setVisibleCount] = useState(ENTREPRISES_PAGE_SIZE);

  useFocusEffect(
    useCallback(() => {
      setVisibleCount(ENTREPRISES_PAGE_SIZE);
      loadEntreprises();
    }, [loadEntreprises]),
  );

  // Toutes les entreprises sont chargées : la recherche locale est complète.
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const matching = q
    ? entreprises.filter((e) =>
        [e.nom, e.email, e.numeroRCCM, e.telephone].some((v) => v?.toLowerCase().includes(q)),
      )
    : entreprises;
  const visibleEntreprises = matching.slice(0, visibleCount);
  const hasMore = visibleCount < matching.length;

  return (
    <AdminPage>
      <Toolbar>
        <SearchField
          value={search}
          onChangeText={(t) => { setSearch(t); setVisibleCount(ENTREPRISES_PAGE_SIZE); }}
          placeholder="Nom, email, RCCM ou téléphone"
          accessibilityLabel="Rechercher une entreprise"
        />
      </Toolbar>

      {entreprisesError ? <ErrorBanner message={entreprisesError} onRetry={loadEntreprises} /> : null}

      <FlatList
        {...LIST_PERF_PROPS}
        data={visibleEntreprises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EntrepriseRow item={item} />}
        ItemSeparatorComponent={RowSeparator}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          if (hasMore) setVisibleCount((c) => c + ENTREPRISES_PAGE_SIZE);
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={<FooterLoader visible={hasMore} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingEntreprises && entreprises.length > 0}
            onRefresh={() => {
              setVisibleCount(ENTREPRISES_PAGE_SIZE);
              loadEntreprises();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={(entreprises.length > 0 ? (
            <ResultCount>
              {matching.length} entreprise{matching.length > 1 ? 's' : ''}
              {q ? ` sur ${entreprises.length}` : ''}
            </ResultCount>
          ) : null) ?? undefined}
        ListEmptyComponent={(isLoadingEntreprises ? <LoadingState /> : entreprisesError ? null : (
            <EmptyState
              icon="business-outline"
              title="Aucune entreprise"
              message={q ? `Aucun résultat pour « ${search.trim()} ».` : undefined}
            />
          )) ?? undefined}
      />
    </AdminPage>
  );
}

const s = StyleSheet.create({
  quota: { fontSize: typography.sizes.xs, color: colors.textMuted },
});
