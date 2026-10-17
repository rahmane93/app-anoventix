import { LIST_PERF_PROPS } from '@/src/constants/list';
import { useAdminStore } from '@/src/stores/admin.store';
import { colors } from '@/src/theme';
import { PIECE_TONE } from '@/src/features/admin/status';
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
    StatusBadge,
} from '@/src/features/admin/ui';
import {
    STATUT_PIECE_LABELS,
    TYPE_PIECE_LABELS,
    type AdminUser,
    type StatutPieceIdentite,
} from '@/src/types/admin.types';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

function PieceRow({ item }: { item: AdminUser }) {
  const fullName = [item.prenom, item.nom].filter(Boolean).join(' ') || item.email;
  const statut = (item.statutPieceIdentite ?? 'EN_ATTENTE') as StatutPieceIdentite;

  return (
    <ListRow
      leading={<Avatar name={fullName} />}
      title={fullName}
      subtitle={item.email}
      meta={item.typePieceIdentite ? <MetaText>{TYPE_PIECE_LABELS[item.typePieceIdentite]}</MetaText> : null}
      trailing={<StatusBadge label={STATUT_PIECE_LABELS[statut]} tone={PIECE_TONE[statut]} />}
      onPress={() => router.push({ pathname: '/(tabs)/administration/users/[id]', params: { id: item.id, from: 'pieces' } } as any)}
      accessibilityLabel={`Examiner la pièce de ${fullName}`}
    />
  );
}

export default function PiecesIdentiteScreen() {
  const {
    piecesIdentite,
    piecesIdentitePage,
    piecesIdentiteTotalPages,
    piecesIdentiteTotalElements,
    isLoadingPiecesIdentite,
    piecesIdentiteError,
    loadPiecesIdentite,
  } = useAdminStore(
    useShallow((s) => ({
      piecesIdentite: s.piecesIdentite,
      piecesIdentitePage: s.piecesIdentitePage,
      piecesIdentiteTotalPages: s.piecesIdentiteTotalPages,
      piecesIdentiteTotalElements: s.piecesIdentiteTotalElements,
      isLoadingPiecesIdentite: s.isLoadingPiecesIdentite,
      piecesIdentiteError: s.piecesIdentiteError,
      loadPiecesIdentite: s.loadPiecesIdentite,
    })),
  );

  useFocusEffect(
    useCallback(() => {
      loadPiecesIdentite(0);
    }, [loadPiecesIdentite]),
  );

  const loadMore = () => {
    if (!isLoadingPiecesIdentite && piecesIdentitePage < piecesIdentiteTotalPages - 1) {
      loadPiecesIdentite(piecesIdentitePage + 1);
    }
  };

  return (
    <AdminPage>
      {piecesIdentiteError ? (
        <ErrorBanner message={piecesIdentiteError} onRetry={() => loadPiecesIdentite(0)} />
      ) : null}
      <FlatList
        {...LIST_PERF_PROPS}
        data={piecesIdentite}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PieceRow item={item} />}
        ItemSeparatorComponent={RowSeparator}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingPiecesIdentite && piecesIdentitePage === 0 && piecesIdentite.length > 0}
            onRefresh={() => loadPiecesIdentite(0)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          piecesIdentiteTotalElements > 0 ? (
            <ResultCount>
              {piecesIdentiteTotalElements} pièce{piecesIdentiteTotalElements > 1 ? 's' : ''} à vérifier
            </ResultCount>
          ) : null
        }
        ListEmptyComponent={
          isLoadingPiecesIdentite ? <LoadingState /> : piecesIdentiteError ? null : (
            <EmptyState
              icon="checkmark-done-outline"
              tone="success"
              title="Aucune pièce en attente"
              message="Toutes les pièces d'identité ont été traitées."
            />
          )
        }
        ListFooterComponent={<FooterLoader visible={isLoadingPiecesIdentite && piecesIdentitePage > 0} />}
      />
    </AdminPage>
  );
}
