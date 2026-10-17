import { buildMediaUrl } from '@/src/api/annonce.api';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { Image } from 'expo-image';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { useAuthStore } from '@/src/stores/auth.store';
import { useMessagerieStore } from '@/src/stores/messagerie.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import type { ConversationDTO } from '@/src/types/messagerie.types';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { useShallow } from 'zustand/react/shallow';

// Liste des conversations : écran Messagerie sur mobile, panneau de gauche
// du maître-détail sur le web desktop (conversation active surlignée).

// ─── Skeleton Conversation ──────────────────────────────────────────────────────

function SkeletonConversation() {
  const opacity = useState(() => new Animated.Value(0.4))[0];
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View style={[skStyles.card, { opacity }]}>
      <View style={skStyles.avatar} />
      <View style={skStyles.body}>
        <View style={skStyles.line1} />
        <View style={skStyles.line2} />
        <View style={skStyles.line3} />
      </View>
    </Animated.View>
  );
}
const SKELETON_DATA = [1, 2, 3, 4, 5];
const skStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    backgroundColor: colors.white,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.background },
  body: { flex: 1, gap: spacing.sm },
  line1: { height: 12, width: '60%', backgroundColor: colors.background, borderRadius: 4 },
  line2: { height: 10, width: '40%', backgroundColor: colors.background, borderRadius: 4 },
  line3: { height: 10, width: '80%', backgroundColor: colors.background, borderRadius: 4 },
});

function getMessageDate(fallback?: string | null): string {
  const raw = fallback;
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function ConversationCard({ conversation, active, replace }: {
  conversation: ConversationDTO;
  active: boolean;
  /** Maître-détail : remplace la conversation affichée au lieu d'empiler. */
  replace: boolean;
}) {
  const displayName = conversation.otherParticipantNomComplet || conversation.otherParticipantUsername || 'Conversation';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'C';
  const unreadCount = conversation.unreadCount ?? 0;

  return (
    <TouchableOpacity
      style={[styles.card, active && styles.cardActive]}
      activeOpacity={0.85}
      onPress={() => {
        const href = `/(tabs)/messagerie/${conversation.id}` as const;
        if (replace) router.replace(href);
        else router.push(href);
      }}
      accessibilityState={{ selected: active }}
      accessibilityRole="button"
      accessibilityLabel={`Conversation avec ${displayName}`}
    >
      {conversation.otherParticipantPhotoProfil ? (
        <Image
          source={{ uri: buildMediaUrl(conversation.otherParticipantPhotoProfil) }}
          style={styles.avatar}
          cachePolicy="memory-disk"
          recyclingKey={String(conversation.id)}
        />
      ) : (
        <View style={styles.avatarFallback}>
          <AppText style={styles.avatarText}>{initials}</AppText>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <AppText style={[styles.name, unreadCount > 0 && styles.nameUnread]} numberOfLines={1}>{displayName}</AppText>
          <AppText style={styles.date}>{getMessageDate(conversation.lastMessageAt ?? conversation.updatedAt)}</AppText>
        </View>
        {conversation.annonceTitre ? (
          <AppText style={styles.annonceTitle} numberOfLines={1}>
            {conversation.annonceTitre}
            {conversation.annonceReference ? ` · ${conversation.annonceReference}` : ''}
          </AppText>
        ) : null}
        <View style={styles.cardBottomRow}>
          <AppText style={[styles.preview, unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
            {conversation.lastMessagePreview ?? 'Aucun message'}
          </AppText>
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <AppText style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</AppText>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function ConversationList({ activeId, replace = false }: { activeId?: string | null; replace?: boolean }) {
  const { isAuthenticated } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated })));
  const { conversations, isLoadingConversations, error, loadConversations, clearError } = useMessagerieStore(useShallow((s) => ({ conversations: s.conversations, isLoadingConversations: s.isLoadingConversations, error: s.error, loadConversations: s.loadConversations, clearError: s.clearError })));

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadConversations();
    }, [loadConversations, isAuthenticated]),
  );

  // Conversations sans aucun message (créées puis abandonnées) : masquées.
  // L'état vide se base sur cette liste filtrée, sinon l'écran restait blanc.
  const visibleConversations = conversations.filter(
    (c) => c.lastMessagePreview || (c.unreadCount ?? 0) > 0,
  );

  return (
    <>
      {error ? (
        <View style={styles.bannerWrap}>
          <AlertBanner message={error} variant="error" />
        </View>
      ) : null}

      {isLoadingConversations && conversations.length === 0 ? (
        <FlatList
          data={SKELETON_DATA}
          keyExtractor={(i) => String(i)}
          renderItem={() => <SkeletonConversation />}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      ) : visibleConversations.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} />
          </View>
          <AppText style={styles.emptyTitle}>Aucune conversation</AppText>
          <AppText style={styles.emptySub}>Vos échanges apparaîtront ici quand vous contacterez un annonceur.</AppText>
        </View>
      ) : (
        <FlatList
          {...LIST_PERF_PROPS}
          data={visibleConversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationCard conversation={item} active={String(item.id) === activeId} replace={replace} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingConversations}
              onRefresh={() => {
                clearError();
                loadConversations();
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.base,
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    backgroundColor: colors.white,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    ...shadows.xs,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  nameUnread: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  date: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  annonceTitle: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preview: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  previewUnread: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: typography.sizes['2xs'],
    color: colors.white,
    fontWeight: '800',
  },
});
