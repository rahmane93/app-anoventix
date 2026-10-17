import { getRoleLabel } from '@/src/lib/roles';
import { useAdminStore } from '@/src/stores/admin.store';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { colors } from '@/src/theme';
import { USER_STATUT_TONE } from '@/src/features/admin/status';
import {
    AdminPage,
    Avatar,
    EmptyState,
    ErrorBanner,
    FilterBar,
    FooterLoader,
    ListRow,
    LoadingState,
    MetaText,
    ResultCount,
    RowSeparator,
    SearchField,
    StatusBadge,
    Toolbar,
} from '@/src/features/admin/ui';
import {
    STATUT_USER_LABELS,
    type AdminUser,
    type StatutUtilisateur,
} from '@/src/types/admin.types';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';

// ─── Ligne utilisateur ────────────────────────────────────────────────────────

function UserRow({ item }: { item: AdminUser }) {
  const statut = item.statut as StatutUtilisateur;
  const fullName = [item.prenom, item.nom].filter(Boolean).join(' ') || item.email;
  const role = getRoleLabel(item.role ? `ROLE_${item.role}` : 'ROLE_PARTICULIER');

  return (
    <ListRow
      leading={<Avatar name={fullName} />}
      title={fullName}
      subtitle={item.email}
      meta={
        <>
          <MetaText>{item.entrepriseNom ? `${role} · ${item.entrepriseNom}` : role}</MetaText>
          {item.statutPieceIdentite === 'EN_ATTENTE' ? (
            <StatusBadge label="Pièce à vérifier" tone="info" icon="card-outline" />
          ) : null}
        </>
      }
      trailing={<StatusBadge label={STATUT_USER_LABELS[statut]} tone={USER_STATUT_TONE[statut]} />}
      onPress={() => router.push(`/(tabs)/administration/users/${item.id}` as any)}
      accessibilityLabel={`${fullName}, ${STATUT_USER_LABELS[statut]}`}
    />
  );
}

// ─── Écran liste utilisateurs ─────────────────────────────────────────────────

const STATUTS: { key: StatutUtilisateur | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'ACTIF', label: STATUT_USER_LABELS.ACTIF },
  { key: 'EN_ATTENTE_ACTIVATION', label: STATUT_USER_LABELS.EN_ATTENTE_ACTIVATION },
  { key: 'SUSPENDU', label: STATUT_USER_LABELS.SUSPENDU },
  { key: 'INACTIF', label: STATUT_USER_LABELS.INACTIF },
];

export default function AdminUsers() {
  // Sélecteurs granulaires : ce composant ne se re-render que si l'une de
  // ces valeurs change (et non sur tout changement du store admin).
  const users = useAdminStore((s) => s.users);
  const isLoadingUsers = useAdminStore((s) => s.isLoadingUsers);
  const usersError = useAdminStore((s) => s.usersError);
  const usersPage = useAdminStore((s) => s.usersPage);
  const usersTotalElements = useAdminStore((s) => s.usersTotalElements);
  const loadUsers = useAdminStore((s) => s.loadUsers);
  const loadMoreUsers = useAdminStore((s) => s.loadMoreUsers);
  // Arrivée depuis l'accueil admin (« En attente d'activation ») : filtre présélectionné.
  const { statut: statutParam } = useLocalSearchParams<{ statut?: StatutUtilisateur }>();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<StatutUtilisateur | 'ALL'>(statutParam ?? 'ALL');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  // Recherche et statut sont appliqués par l'API : les résultats couvrent
  // tous les utilisateurs, pas seulement la page déjà chargée.
  const filtre = { search: search.trim(), statut: filterStatut === 'ALL' ? undefined : filterStatut };

  useFocusEffect(
    useCallback(() => {
      loadUsers(0, filtre);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatut]),
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadUsers(0, filtre), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const firstLoad = isLoadingUsers && usersPage === 0;

  return (
    <AdminPage>
      <Toolbar>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, email ou téléphone"
          accessibilityLabel="Rechercher un utilisateur"
          loading={firstLoad && users.length > 0}
        />
        <FilterBar options={STATUTS} value={filterStatut} onChange={setFilterStatut} />
      </Toolbar>

      {usersError ? <ErrorBanner message={usersError} onRetry={() => loadUsers(0, filtre)} /> : null}

      <FlatList
        {...LIST_PERF_PROPS}
        data={users ?? []}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <UserRow item={item} />}
        ItemSeparatorComponent={RowSeparator}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => loadMoreUsers()}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => loadUsers(0, filtre)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          users.length > 0 ? (
            <ResultCount>
              {usersTotalElements} utilisateur{usersTotalElements > 1 ? 's' : ''}
            </ResultCount>
          ) : null
        }
        ListEmptyComponent={
          firstLoad ? <LoadingState /> : usersError ? null : (
            <EmptyState
              icon="people-outline"
              title="Aucun utilisateur"
              message={search.trim() ? `Aucun résultat pour « ${search.trim()} ».` : 'Aucun compte ne correspond à ce filtre.'}
            />
          )
        }
        ListFooterComponent={<FooterLoader visible={isLoadingUsers && usersPage > 0} />}
      />
    </AdminPage>
  );
}
