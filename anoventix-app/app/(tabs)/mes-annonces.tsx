import { LIST_PERF_PROPS } from '@/src/constants/list';
import { useCardGrid } from '@/src/lib/responsive';
import { AnnonceCard } from '@/src/features/mes-annonces/AnnonceCard';
import { AnnoncesMasqueesNotice } from '@/src/features/mes-annonces/AnnoncesMasqueesNotice';
import { useUserStore } from '@/src/stores/user.store';
import { EmptyState } from '@/src/features/mes-annonces/EmptyState';
import { SKELETON_DATA, SkeletonCard } from '@/src/components/ui/skeleton-card';
import { useMesAnnonces } from '@/src/features/mes-annonces/useMesAnnonces';
import { colors, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,

    FlatList,

    RefreshControl,

    StyleSheet,

    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';

// ─── Écran Principal ──────────────────────────────────────────────────────────
// Logique extraite dans useMesAnnonces ; cet écran ne fait que rendre.

export default function MesAnnoncesScreen() {
  // Web desktop : grille de cartes centrée (mobile inchangé).
  const grid = useCardGrid(460, 2, 'detail');
  const {
    isAuthenticated,
    mesAnnonces,
    isLoading,
    isLoadingMore,
    error,
    loadMesAnnonces,
    loadMore,
    refreshing,
    onRefresh,
  } = useMesAnnonces();
  // Masquage système : profil chargé à la connexion, complété par le drapeau des annonces
  // (plus récent si l'admin a agi pendant la session).
  const profile = useUserStore((st) => st.profile);
  const annoncesMasquees = !!profile?.annoncesMasquees || mesAnnonces.some((a) => a.proprietaireMasque);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // ── Loading initial ──────────────────────────────────────────────────────────
  if (isLoading && mesAnnonces.length === 0) {
    return (
      <FlatList
        data={SKELETON_DATA}
        keyExtractor={(i) => String(i)}
        renderItem={() => <SkeletonCard />}
        scrollEnabled={false}
        contentContainerStyle={[styles.listContent, { backgroundColor: colors.background }]}
      />
    );
  }

  // ── Erreur ───────────────────────────────────────────────────────────────────
  if (error && mesAnnonces.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
        <AppText style={styles.errorTitle}>Impossible de charger</AppText>
        <AppText style={styles.errorSub}>{error}</AppText>
        <Button
          title="Réessayer"
          fullWidth={false}
          style={styles.retryBtn}
          onPress={loadMesAnnonces}
          accessibilityLabel="Réessayer"
        />
      </View>
    );
  }

  return (
    <FlatList
      key={grid.key}
      {...LIST_PERF_PROPS}
      {...grid.listProps}
      data={mesAnnonces}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => grid.wrap(
        <AnnonceCard
          item={item}
        />
      )}
      contentContainerStyle={[
        styles.listContent,
        mesAnnonces.length === 0 && styles.listEmpty,
        grid.contentStyle,
      ]}
      ListHeaderComponent={
        <>
          {annoncesMasquees && <AnnoncesMasqueesNotice motif={profile?.motifMasquageAnnonces} />}
          {mesAnnonces.length > 0 ? (
            <View style={styles.header}>
              <AppText style={styles.count}>
                {mesAnnonces.length} annonce{mesAnnonces.length > 1 ? 's' : ''}
              </AppText>
              {!annoncesMasquees && (
                <Button
                  title="Nouvelle annonce"
                  size="sm"
                  fullWidth={false}
                  style={styles.publishBtn}
                  leftIcon={<Ionicons name="add-circle" size={18} color={colors.white} />}
                  onPress={() => router.push('/(tabs)/publier')}
                  accessibilityLabel="Publier une nouvelle annonce"
                />
              )}
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={<EmptyState />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={(isLoadingMore ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : null) ?? undefined}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorSub: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: { marginTop: spacing.sm },
  listContent: {
    paddingTop: spacing.base,
    paddingBottom: spacing['4xl'],
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  listEmpty: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  count: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  publishBtn: {},
});
