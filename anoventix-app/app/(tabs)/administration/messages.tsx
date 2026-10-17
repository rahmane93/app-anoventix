import { LIST_PERF_PROPS } from '@/src/constants/list';
import { useAdminStore } from '@/src/stores/admin.store';
import { colors, spacing, typography } from '@/src/theme';
import type { MessageSignale } from '@/src/types/admin.types';
import { MOTIF_SIGNALEMENT_MESSAGE_LABELS } from '@/src/types/messagerie.types';
import { confirmerMessageConforme, confirmerSuppressionMessage } from '@/src/features/admin/moderationMessage';
import {
    AdminPage,
    BlockGap,
    EmptyState,
    ErrorBanner,
    FooterLoader,
    ItemBlock,
    LoadingState,
    ResultCount,
    StatusBadge,
} from '@/src/features/admin/ui';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { useShallow } from 'zustand/react/shallow';

// ─── Carte message signalé ────────────────────────────────────────────────────

function formatDateHeure(raw: string | null): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ouvrirFiche(userId: string) {
  router.push(`/(tabs)/administration/users/${userId}` as any);
}

function MessageCard({ item }: { item: MessageSignale }) {
  const isSuppressing = useAdminStore((st) => st.suppressingMessageIds.has(item.id));
  const motif = item.motifSignalement
    ? MOTIF_SIGNALEMENT_MESSAGE_LABELS[item.motifSignalement]
    : 'Motif non précisé';

  return (
    <ItemBlock>
      {/* Pourquoi : motif + date du signalement */}
      <View style={s.cardHeader}>
        <StatusBadge label={motif} tone="danger" icon="flag" />
        <AppText style={s.dateText}>{formatDateHeure(item.dateSignalement ?? item.createdAt)}</AppText>
      </View>

      {/* Quoi : le message */}
      <View style={s.contentBox}>
        <AppText style={s.content} numberOfLines={4}>{item.content}</AppText>
      </View>

      {/* Qui : auteur et signaleur, chacun vers sa fiche */}
      <View style={s.people}>
        <TouchableOpacity
          style={s.personRow}
          onPress={() => ouvrirFiche(item.senderId)}
          accessibilityRole="link"
          accessibilityLabel={`Écrit par ${item.senderUsername}, ouvrir sa fiche`}
        >
          <Ionicons name="person-outline" size={13} color={colors.textMuted} />
          <AppText style={s.personLabel}>Écrit par</AppText>
          <AppText style={s.personLink} numberOfLines={1}>{item.senderUsername}</AppText>
          <AppText style={s.personDate}>· {formatDateHeure(item.createdAt)}</AppText>
        </TouchableOpacity>
        {item.signaleParId ? (
          <TouchableOpacity
            style={s.personRow}
            onPress={() => ouvrirFiche(item.signaleParId!)}
            accessibilityRole="link"
            accessibilityLabel={`Signalé par ${item.signaleParUsername ?? 'un participant'}, ouvrir sa fiche`}
          >
            <Ionicons name="flag-outline" size={13} color={colors.textMuted} />
            <AppText style={s.personLabel}>Signalé par</AppText>
            <AppText style={s.personLink} numberOfLines={1}>{item.signaleParUsername}</AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Annonce liée */}
      {item.annonceId ? (
        <TouchableOpacity
          style={s.annonceRow}
          onPress={() => router.push(`/annonce/${item.annonceId}` as any)}
          activeOpacity={0.75}
          accessibilityRole="link"
        >
          <Ionicons name="home-outline" size={13} color={colors.primary} />
          <AppText style={s.annonceText} numberOfLines={1}>
            {item.annonceTitre ?? `Annonce #${item.annonceId}`}
          </AppText>
          {item.annonceReference ? (
            <AppText style={s.annonceRef}>{item.annonceReference}</AppText>
          ) : null}
          <Ionicons name="open-outline" size={13} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      {/* Contexte : la conversation, centrée sur ce message */}
      <TouchableOpacity
        style={s.convRow}
        onPress={() => router.push({
          pathname: '/(tabs)/administration/messages/[id]',
          params: { id: String(item.conversationId), messageId: String(item.id) },
        } as any)}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <Ionicons name="chatbubbles-outline" size={15} color={colors.primary} />
        <AppText style={s.convText}>Voir dans la conversation</AppText>
        <Ionicons name="chevron-forward" size={15} color={colors.primary} />
      </TouchableOpacity>

      {/* Décision : conforme (signalement classé) ou suppression du contenu */}
      <View style={s.actionsRow}>
        <Button
          title="Conforme"
          variant="outline"
          size="sm"
          fullWidth={false}
          style={s.actionBtn}
          leftIcon={<Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />}
          onPress={() => confirmerMessageConforme(item.id)}
          disabled={isSuppressing}
          accessibilityLabel="Message conforme, classer le signalement"
        />
        <Button
          title="Supprimer"
          variant="danger"
          size="sm"
          fullWidth={false}
          style={s.actionBtn}
          leftIcon={<Ionicons name="trash-outline" size={14} color={colors.white} />}
          onPress={() => confirmerSuppressionMessage(item.id)}
          isLoading={isSuppressing}
          accessibilityLabel="Supprimer le message"
        />
      </View>
    </ItemBlock>
  );
}

// ─── Écran messages signalés ──────────────────────────────────────────────────

export default function AdminMessages() {
  const {
    messagesSignales,
    messagesSignalesPage,
    messagesSignalesTotalElements,
    isLoadingMessagesSignales,
    messagesSignalesError,
    loadMessagesSignales,
    loadMoreMessagesSignales,
  } = useAdminStore(
    useShallow((s) => ({
      messagesSignales: s.messagesSignales,
      messagesSignalesPage: s.messagesSignalesPage,
      messagesSignalesTotalElements: s.messagesSignalesTotalElements,
      isLoadingMessagesSignales: s.isLoadingMessagesSignales,
      messagesSignalesError: s.messagesSignalesError,
      loadMessagesSignales: s.loadMessagesSignales,
      loadMoreMessagesSignales: s.loadMoreMessagesSignales,
    })),
  );

  useFocusEffect(
    useCallback(() => {
      loadMessagesSignales(0);
    }, [loadMessagesSignales]),
  );

  const firstLoad = isLoadingMessagesSignales && messagesSignalesPage === 0;

  return (
    <AdminPage>
      {messagesSignalesError ? (
        <ErrorBanner message={messagesSignalesError} onRetry={() => loadMessagesSignales(0)} />
      ) : null}

      <FlatList
        {...LIST_PERF_PROPS}
        data={messagesSignales}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MessageCard item={item} />}
        ItemSeparatorComponent={BlockGap}
        refreshControl={
          <RefreshControl
            refreshing={firstLoad && messagesSignales.length > 0}
            onRefresh={() => loadMessagesSignales(0)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          messagesSignales.length > 0 ? (
            <ResultCount>
              {messagesSignalesTotalElements} message{messagesSignalesTotalElements !== 1 ? 's' : ''} à traiter
            </ResultCount>
          ) : null
        }
        ListEmptyComponent={
          firstLoad ? <LoadingState /> : messagesSignalesError ? null : (
            <EmptyState icon="checkmark-done-outline" tone="success" title="File vide" message="Aucun message signalé en attente." />
          )
        }
        onEndReached={() => loadMoreMessagesSignales()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={<FooterLoader visible={isLoadingMessagesSignales && messagesSignalesPage > 0} />}
      />
    </AdminPage>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateText: { marginLeft: 'auto', fontSize: typography.sizes.xs, color: colors.textMuted },
  contentBox: { paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.warning },
  content: { fontSize: typography.sizes.sm, color: colors.textPrimary, lineHeight: 20 },
  people: { gap: 0 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 28 },
  personLabel: { fontSize: typography.sizes.xs, color: colors.textMuted },
  personLink: { flexShrink: 1, fontSize: typography.sizes.xs, color: colors.primary, fontWeight: '600' },
  personDate: { fontSize: typography.sizes.xs, color: colors.textMuted },
  annonceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  annonceText: { flex: 1, fontSize: typography.sizes.xs, color: colors.primary, fontWeight: '600' },
  annonceRef: { fontSize: typography.sizes.xs, color: colors.textMuted },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  convText: { flex: 1, fontSize: typography.sizes.sm, color: colors.primary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});
