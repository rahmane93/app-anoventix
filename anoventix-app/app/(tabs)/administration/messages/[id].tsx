import { useAdminStore } from '@/src/stores/admin.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import type { MessageSignale } from '@/src/types/admin.types';
import { MOTIF_SIGNALEMENT_MESSAGE_LABELS } from '@/src/types/messagerie.types';
import { confirmerMessageConforme, confirmerSuppressionMessage } from '@/src/features/admin/moderationMessage';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { ErrorBanner, LoadingState, webColumn } from '@/src/features/admin/ui';
import { useShallow } from 'zustand/react/shallow';

function formatTime(raw?: string | null): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(raw?: string | null): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DateSeparator({ date }: { date: string }) {
  return (
    <View style={s.dateSep}>
      <AppText style={s.dateSepText}>{date}</AppText>
    </View>
  );
}

type Item =
  | { type: 'date'; date: string; key: string }
  | { type: 'message'; msg: MessageSignale; showSender: boolean; key: string };

export default function AdminConversationScreen() {
  // messageId : message signalé depuis lequel on arrive (mis en évidence et centré).
  const { id, messageId } = useLocalSearchParams<{ id: string; messageId?: string }>();
  const {
    adminConversationMessages,
    isLoadingAdminConversation,
    adminConversationError,
    loadAdminConversationMessages,
    suppressingMessageIds,
  } = useAdminStore(
    useShallow((s) => ({
      adminConversationMessages: s.adminConversationMessages,
      isLoadingAdminConversation: s.isLoadingAdminConversation,
      adminConversationError: s.adminConversationError,
      loadAdminConversationMessages: s.loadAdminConversationMessages,
      suppressingMessageIds: s.suppressingMessageIds,
    })),
  );
  const listRef = useRef<FlatList<Item>>(null);

  useEffect(() => {
    if (id) loadAdminConversationMessages(Number(id));
  }, [id, loadAdminConversationMessages]);

  const sorted = useMemo(
    () =>
      [...adminConversationMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [adminConversationMessages],
  );

  const cibleId = messageId ? Number(messageId) : sorted.find((m) => m.signale)?.id;
  const cible = sorted.find((m) => m.id === cibleId);

  // Mis en cause (auteur du message signalé) à gauche, son interlocuteur à droite.
  const misEnCauseId = cible?.senderId ?? sorted[0]?.senderId;
  const interlocuteur = sorted.find((m) => m.senderId !== misEnCauseId);

  const items = useMemo<Item[]>(() => {
    const result: Item[] = [];
    let lastDate = '';
    let lastSender = '';
    for (const msg of sorted) {
      const day = formatDate(msg.createdAt);
      if (day !== lastDate) {
        lastDate = day;
        lastSender = '';
        result.push({ type: 'date', date: day, key: `sep-${day}` });
      }
      result.push({ type: 'message', msg, showSender: msg.senderId !== lastSender, key: String(msg.id) });
      lastSender = msg.senderId;
    }
    return result;
  }, [sorted]);

  const cibleIndex = items.findIndex((it) => it.type === 'message' && it.msg.id === cibleId);

  // Une fois la conversation affichée, centre le message signalé.
  useEffect(() => {
    if (cibleIndex < 0 || isLoadingAdminConversation) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: cibleIndex, viewPosition: 0.4, animated: true });
    }, 250);
    return () => clearTimeout(t);
  }, [cibleIndex, isLoadingAdminConversation]);

  const renderMessage = (msg: MessageSignale, showSender: boolean) => {
    const aGauche = msg.senderId === misEnCauseId;
    const estCible = msg.id === cibleId;
    const enAttente = msg.signale && !msg.supprime;
    const busy = suppressingMessageIds.has(msg.id);
    return (
      <View style={[s.row, aGauche ? s.rowLeft : s.rowRight]}>
        {showSender ? (
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/administration/users/${msg.senderId}` as any)}
            accessibilityRole="link"
            accessibilityLabel={`${msg.senderUsername}, ouvrir sa fiche`}
            hitSlop={6}
          >
            <AppText style={s.senderText} numberOfLines={1}>{msg.senderUsername}</AppText>
          </TouchableOpacity>
        ) : null}
        <View
          style={[
            s.bubble,
            aGauche ? s.bubbleLeft : s.bubbleRight,
            msg.signale && s.bubbleSignale,
            estCible && s.bubbleCible,
            msg.supprime && s.bubbleSupprime,
          ]}
        >
          {msg.signale ? (
            <View style={s.flagRow}>
              <Ionicons name="flag" size={11} color={colors.errorText} />
              <AppText style={s.flagText}>
                Signalé
                {msg.motifSignalement ? ` · ${MOTIF_SIGNALEMENT_MESSAGE_LABELS[msg.motifSignalement]}` : ''}
              </AppText>
            </View>
          ) : null}
          <AppText style={[s.content, !aGauche && !msg.signale && s.contentRight, msg.supprime && s.contentSupprime]}>
            {msg.content}
          </AppText>
          <AppText style={[s.time, !aGauche && !msg.signale && s.timeRight]}>{formatTime(msg.createdAt)}</AppText>
        </View>
        {enAttente ? (
          <View style={s.decision}>
            <Button
              title="Conforme"
              variant="outline"
              size="sm"
              fullWidth={false}
              leftIcon={<Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />}
              onPress={() => confirmerMessageConforme(msg.id)}
              disabled={busy}
              accessibilityLabel="Message conforme, classer le signalement"
            />
            <Button
              title="Supprimer"
              variant="danger"
              size="sm"
              fullWidth={false}
              leftIcon={<Ionicons name="trash-outline" size={14} color={colors.white} />}
              onPress={() => confirmerSuppressionMessage(msg.id)}
              isLoading={busy}
              accessibilityLabel="Supprimer le message"
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Conversation' }} />
      <View style={s.root}>
        {/* Qui est qui : légende des deux côtés */}
        {cible ? (
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, s.legendDotLeft]} />
              <AppText style={s.legendText} numberOfLines={1}>Mis en cause : {cible.senderUsername}</AppText>
            </View>
            {interlocuteur ? (
              <View style={s.legendItem}>
                <View style={[s.legendDot, s.legendDotRight]} />
                <AppText style={s.legendText} numberOfLines={1}>Interlocuteur : {interlocuteur.senderUsername}</AppText>
              </View>
            ) : null}
          </View>
        ) : null}
        {adminConversationError ? (
          <ErrorBanner message={adminConversationError} onRetry={() => id && loadAdminConversationMessages(Number(id))} />
        ) : null}
        {isLoadingAdminConversation ? (
          <LoadingState />
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(item) => item.key}
            contentContainerStyle={[s.list, webColumn]}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              // Élément pas encore mesuré : approche par l'offset, puis réessaie.
              listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
              setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.4, animated: true }), 100);
            }}
            ListEmptyComponent={
              adminConversationError ? null : (
                <View style={s.centered}>
                  <Ionicons name="chatbubble-outline" size={36} color={colors.border} />
                  <AppText style={s.emptyText}>Aucun message dans cette conversation</AppText>
                </View>
              )
            }
            renderItem={({ item }) =>
              item.type === 'date' ? <DateSeparator date={item.date} /> : renderMessage(item.msg, item.showSender)
            }
          />
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  legend: {
    gap: 4,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDotLeft: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.textMuted },
  legendDotRight: { backgroundColor: colors.primary },
  legendText: { flex: 1, fontSize: typography.sizes.xs, color: colors.textSecondary },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
    paddingTop: spacing['3xl'],
  },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing['4xl'] },
  dateSep: { alignItems: 'center', marginVertical: spacing.sm },
  dateSepText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: { gap: 3 },
  rowLeft: { alignItems: 'flex-start' },
  rowRight: { alignItems: 'flex-end' },
  senderText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: '600', marginBottom: 2, paddingHorizontal: 4, maxWidth: 260 },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: 4,
  },
  bubbleLeft: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  bubbleRight: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  // Signalé : fond clair quel que soit le côté, pour que le texte reste lisible.
  bubbleSignale: { backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.error + '60' },
  bubbleCible: { borderWidth: 2, borderColor: colors.error },
  bubbleSupprime: { opacity: 0.7 },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flagText: { fontSize: typography.sizes.xs, color: colors.errorText, fontWeight: '700' },
  content: { fontSize: typography.sizes.md, lineHeight: 20, color: colors.textPrimary },
  contentRight: { color: colors.white },
  contentSupprime: { fontStyle: 'italic' },
  time: { fontSize: typography.sizes.xs, alignSelf: 'flex-end', color: colors.textMuted },
  timeRight: { color: 'rgba(255,255,255,0.7)' },
  decision: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  emptyText: { fontSize: typography.sizes.md, color: colors.textMuted },
});
