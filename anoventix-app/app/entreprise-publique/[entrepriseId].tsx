import { annonceHref } from '@/src/lib/annonce-url';
import { goBackOr } from '@/src/lib/navigation';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { buildMediaUrl } from '@/src/api/annonce.api';
import { getEntrepriseProfil } from '@/src/api/entreprise.api';
import AppText from '@/src/components/AppText';
import { SuggestCard } from '@/src/features/explore/SuggestCard';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import type { EntrepriseProfilDTO } from '@/src/types/entreprise.types';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { Button } from '@/src/components/ui/button';
import { useCardGrid } from '@/src/lib/responsive';

export default function EntreprisePubliqueScreen() {
  const { entrepriseId } = useLocalSearchParams<{ entrepriseId: string }>();
  const { width } = useWindowDimensions();
  // Web desktop : grille plus dense, centrée (le mobile garde ses 2 colonnes).
  const grid = useCardGrid(220, 5, 'detail');

  const [entreprise, setEntreprise] = useState<EntrepriseProfilDTO | null>(null);
  const [annonces, setAnnonces] = useState<BienImmo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // Chargement dérivé de l'id déjà chargé (pas de setState synchrone dans l'effet).
  const [chargePour, setChargePour] = useState<string | null>(null);
  const loading = chargePour !== entrepriseId;
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entrepriseId) return;
    getEntrepriseProfil(entrepriseId, 0)
      .then((res) => {
        setError(null);
        setEntreprise(res.entreprise);
        setAnnonces(res.annonces);
        setTotalItems(res.totalItems);
        setPage(res.currentPage ?? 0);
        setTotalPages(res.totalPages ?? 1);
      })
      .catch(() => setError('Impossible de charger cette entreprise.'))
      .finally(() => setChargePour(entrepriseId));
  }, [entrepriseId]);

  const loadMore = useCallback(() => {
    if (!entrepriseId || loading || loadingMore) return;
    if (page >= totalPages - 1) return;
    setLoadingMore(true);
    const next = page + 1;
    getEntrepriseProfil(entrepriseId, next)
      .then((res) => {
        setAnnonces((prev) => [...prev, ...res.annonces]);
        setPage(res.currentPage ?? next);
        setTotalPages(res.totalPages ?? totalPages);
      })
      .catch(() => {
        /* best effort : on garde les annonces déjà chargées */
      })
      .finally(() => setLoadingMore(false));
  }, [entrepriseId, loading, loadingMore, page, totalPages]);

  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Entreprise' }} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !entreprise) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Entreprise' }} />
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <AppText style={s.errorText}>{error ?? 'Entreprise introuvable'}</AppText>
        <Button
          title="Retour"
          variant="outline"
          fullWidth={false}
          style={s.retryBtn}
          onPress={() => goBackOr()}
        />
      </View>
    );
  }

  const photoUri = entreprise.photoProfil ? buildMediaUrl(entreprise.photoProfil) : null;
  const initiales = entreprise.nom
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  // Largeur de chaque carte : 2 colonnes avec marges
  const cardWidth = (width - spacing.base * 2 - spacing.sm) / 2;

  return (
    <FlatList
      {...LIST_PERF_PROPS}
      data={annonces}
      keyExtractor={(item) => String(item.id)}
      key={grid.key}
      numColumns={2}
      columnWrapperStyle={s.row}
      {...grid.listProps}
      contentContainerStyle={[s.list, grid.contentStyle]}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : null
      }
      renderItem={({ item }) => grid.isGrid ? grid.wrap(
        <SuggestCard
          item={item}
          onPress={() => router.push(annonceHref(item))}
          style={{ width: '100%', marginRight: 0 }}
        />
      ) : (
        <SuggestCard
          item={item}
          onPress={() => router.push(annonceHref(item))}
          style={{ width: cardWidth, marginRight: 0 }}
        />
      )}
      ListHeaderComponent={
        <>
          <Stack.Screen options={{ title: entreprise.nom }} />

          {/* ── En-tête entreprise ──────────────────────────────────────── */}
          <View style={s.card}>
            {/* Bordure extérieure (shadow) + clip intérieur séparés pour Android */}
            <View style={s.logoBorder}>
              <View style={s.logoClip}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={s.logo} contentFit="cover" />
                ) : (
                  <AppText style={s.logoInitiales}>{initiales}</AppText>
                )}
              </View>
            </View>

            <AppText style={s.nom}>{entreprise.nom}</AppText>
            {entreprise.verifiee ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel="Agence vérifiée">
                <Ionicons name="shield-checkmark" size={14} color={colors.successText} />
                <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.successText }}>Agence vérifiée</AppText>
              </View>
            ) : null}

            {entreprise.description ? (
              <AppText style={s.description}>{entreprise.description}</AppText>
            ) : null}

            <View style={s.infoGrid}>
              {entreprise.telephone ? (
                <TouchableOpacity
                  style={s.callBtn}
                  onPress={() => Linking.openURL(`tel:${entreprise.telephone}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={13} color={colors.white} />
                  <AppText style={s.callText}>{entreprise.telephone}</AppText>
                </TouchableOpacity>
              ) : null}
              {entreprise.email ? (
                <View style={s.infoItem}>
                  <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
                  <AppText style={s.infoText}>{entreprise.email}</AppText>
                </View>
              ) : null}
              {entreprise.adresse ? (
                <View style={s.infoItem}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <AppText style={s.infoText}>
                    {entreprise.adresse}
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={s.statRow}>
              <View style={s.statItem}>
                <AppText style={s.statValue}>{totalItems}</AppText>
                <AppText style={s.statLabel}>annonce{totalItems !== 1 ? 's' : ''}</AppText>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <AppText style={s.statValue}>{entreprise.nombreAgents}</AppText>
                <AppText style={s.statLabel}>agent{entreprise.nombreAgents !== 1 ? 's' : ''}</AppText>
              </View>
            </View>
          </View>

          {/* ── Section annonces ────────────────────────────────────────── */}
          <View style={s.sectionHeader}>
            <AppText style={s.sectionTitle}>Annonces</AppText>
            <View style={s.sectionBadge}>
              <AppText style={s.sectionBadgeText}>{totalItems}</AppText>
            </View>
          </View>

          {annonces.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="home-outline" size={32} color={colors.border} />
              <AppText style={s.emptyText}>Aucune annonce publiée</AppText>
            </View>
          )}
        </>
      }
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.base,
  },
  errorText: { fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {},

  list: { backgroundColor: colors.background, paddingTop: spacing.sm, paddingBottom: spacing['3xl'] },
  row: { paddingHorizontal: spacing.base, gap: spacing.sm, marginBottom: spacing.sm },

  // Carte entreprise
  card: {
    backgroundColor: colors.white,
    margin: spacing.base,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  // Vue extérieure : porte la bordure colorée (pas de overflow hidden → bordure visible)
  logoBorder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: colors.primarySurface,
    padding: 2,
    backgroundColor: colors.white,
  },
  // Vue intérieure : clip circulaire de l'image
  logoClip: {
    flex: 1,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: '100%', height: '100%' },
  logoInitiales: { fontSize: typography.sizes['2xl'], fontWeight: '800', color: colors.white },
  nom: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  description: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  infoGrid: { width: '100%', gap: spacing.xs },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { fontSize: typography.sizes.sm, color: colors.textMuted, flex: 1 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  callText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.white },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    width: '100%',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: typography.sizes.xs, color: colors.textMuted },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  sectionBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
  sectionBadgeText: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.white },

  // Empty
  empty: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
  emptyText: { fontSize: typography.sizes.md, color: colors.textMuted },
});
