import { annonceHref } from '@/src/lib/annonce-url';
import { SKELETON_DATA, SkeletonCard } from '@/src/components/ui/skeleton-card';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { useCardGrid } from '@/src/lib/responsive';
import { AnnonceCard } from '@/src/features/explore/AnnonceCard';
import { useAuthStore } from '@/src/stores/auth.store';
import { useFavorisStore } from '@/src/stores/favoris.store';
import { colors, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import {
    FlatList,

    RefreshControl,

    StyleSheet,

    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { useShallow } from 'zustand/react/shallow';

// ─── Écran Favoris ────────────────────────────────────────────────────────────

export default function FavorisScreen() {
  // Web desktop : grille de cartes centrée (mobile inchangé).
  const grid = useCardGrid(300, 4);
  const { favoris, isLoading, error, loadFavoris, removeFavori } = useFavorisStore(useShallow((s) => ({ favoris: s.favoris, isLoading: s.isLoading, error: s.error, loadFavoris: s.loadFavoris, removeFavori: s.removeFavori })));
  const { isAuthenticated, user } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated, user: s.user })));

  // ── Hooks (doivent tous être AVANT tout early return) ────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadFavoris();
    }, [loadFavoris, isAuthenticated]),
  );

  const handleRemove = useCallback(async (id: number) => {
    await removeFavori(id);
  }, [removeFavori]);

  // ── Guards auth ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // ── Loading initial ──────────────────────────────────────────────────────────
  if (isLoading && favoris.length === 0) {
    return (
      <FlatList
        data={SKELETON_DATA}
        keyExtractor={(i) => String(i)}
        renderItem={() => <SkeletonCard />}
        scrollEnabled={false}
        contentContainerStyle={{ paddingTop: spacing.md, backgroundColor: colors.background }}
        style={{ backgroundColor: colors.background }}
      />
    );
  }

  // ── Erreur ───────────────────────────────────────────────────────────────────
  if (error && favoris.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
        <AppText style={styles.errorText}>{error}</AppText>
        <Button
          title="Réessayer"
          fullWidth={false}
          style={styles.retryBtn}
          onPress={loadFavoris}
        />
      </View>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!isLoading && favoris.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="heart-outline" size={52} color={colors.textMuted} />
        </View>
        <AppText style={styles.emptyTitle}>Aucun favori</AppText>
        <AppText style={styles.emptySub}>
          Les annonces que vous aimez apparaîtront ici.{'\n'}
          Explorez et ajoutez des biens à vos favoris !
        </AppText>
        <Button
          title="Explorer les annonces"
          fullWidth={false}
          style={styles.exploreBtn}
          leftIcon={<Ionicons name="search-outline" size={18} color={colors.white} />}
          onPress={() => router.push('/(tabs)/explore')}
        />
      </View>
    );
  }

  // ── Liste ────────────────────────────────────────────────────────────────────
  return (
    <FlatList
      key={grid.key}
      {...LIST_PERF_PROPS}
      {...grid.listProps}
      data={favoris}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => grid.wrap(
        <AnnonceCard
          item={item}
          isFav={true}
          isOwner={!!user?.id && item.annonceur?.id === user.id}
          onPress={() => router.push(annonceHref(item))}
          onToggleFav={() => handleRemove(item.id)}
        />
      )}
      contentContainerStyle={[styles.listContent, grid.contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={loadFavoris}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={[styles.listHeader, grid.isGrid && { paddingHorizontal: 0, paddingBottom: 0 }]}>
          <AppText style={styles.listCount}>
            {favoris.length} favori{favoris.length > 1 ? 's' : ''}
          </AppText>
        </View>
      }
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: { fontSize: typography.sizes.md, color: colors.error, textAlign: 'center' },
  retryBtn: { marginTop: spacing.sm },

  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: typography.sizes.md, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  exploreBtn: { marginTop: spacing.md },

  listContent: { paddingTop: spacing.md, paddingBottom: spacing['4xl'] },
  listHeader: { paddingHorizontal: spacing.base, paddingBottom: spacing.md },
  listCount: { fontSize: typography.sizes.md, color: colors.textSecondary, fontWeight: '500' },
});
