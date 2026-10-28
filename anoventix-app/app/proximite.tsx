import { goBackOr } from '@/src/lib/navigation';
import { useBreakpoint, useCardGrid, WebContainer } from '@/src/lib/responsive';
import { WebPageHeader } from '@/src/components/web/WebPageHeader';
import AppText from '@/src/components/AppText';
import { FavAnnonceCard } from '@/src/features/explore/FavAnnonceCard';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { TYPE_ANNONCE_CHIP_ICONS, TYPE_ANNONCE_CHIPS } from '@/src/features/explore/filters';
import { useAnnonceStore } from '@/src/stores/annonce.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { useFavorisStore } from '@/src/stores/favoris.store';
import { TYPE_ANNONCE_LABELS, type TypeAnnonce } from '@/src/types/annonce.types';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/src/components/ui/button';

const RAYONS = [2, 5, 10, 25, 50];

type Phase = 'locating' | 'denied' | 'error' | 'ok';

export default function ProximiteScreen() {
  const insets = useSafeAreaInsets();
  // Web desktop : titre de page, filtres sur une ligne et grille de cartes.
  const { isDesktop } = useBreakpoint();
  const grid = useCardGrid(300, 4);
  const nearbyResults = useAnnonceStore((s) => s.nearbyResults);
  const loadNearby = useAnnonceStore((s) => s.loadNearby);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadFavoris = useFavorisStore((s) => s.loadFavoris);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [rayon, setRayon] = useState(10);
  const [typeFilter, setTypeFilter] = useState<TypeAnnonce | null>(null);
  const [phase, setPhase] = useState<Phase>('locating');
  const [fetching, setFetching] = useState(false);

  const fetchNearby = useCallback(
    async (c: { lat: number; lng: number }, r: number, type: TypeAnnonce | null = typeFilter) => {
      setFetching(true);
      try {
        // Le filtre par type est appliqué par l'API avant la pagination.
        await loadNearby({ lat: c.lat, lng: c.lng, rayon: r, typeAnnonce: type ?? undefined });
      } finally {
        setFetching(false);
      }
    },
    [loadNearby, typeFilter],
  );

  // setState uniquement dans les callbacks : appelable depuis l'effet initial.
  const locate = useCallback(
    () =>
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status !== 'granted') {
          setPhase('denied');
          return;
        }
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          .then((pos) => {
            const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCoords(c);
            setPhase('ok');
            return fetchNearby(c, rayon);
          })
          .catch(() => setPhase('error'));
      }),
    [fetchNearby, rayon],
  );

  const locateAndFetch = () => {
    setPhase('locating');
    locate();
  };

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (isAuthenticated) loadFavoris(); }, [isAuthenticated, loadFavoris]);

  const onSelectRayon = (r: number) => {
    setRayon(r);
    if (coords) fetchNearby(coords, r);
  };

  const results = nearbyResults;

  const choisirType = (t: TypeAnnonce | null) => {
    setTypeFilter(t);
    if (coords) fetchNearby(coords, rayon, t);
  };

  // ── Header custom (flèche retour + titre) ─────────────────────────────────────
  const Header = isDesktop ? (
    <WebPageHeader title="À proximité" back />
  ) : (
    <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
      <TouchableOpacity
        onPress={() => goBackOr()}
        style={s.backBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </TouchableOpacity>
      <AppText style={s.headerTitle}>À proximité</AppText>
      <View style={s.backBtn} />
    </View>
  );

  // ── Section filtres (type d'annonce + rayon) ──────────────────────────────────
  const Filters = (
    <View style={[s.filters, isDesktop && s.filtersDesktop]}>
      <WebContainer style={isDesktop ? s.filtersInner : undefined}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.typeRow, isDesktop && { paddingHorizontal: 0 }]}
      >
        <TouchableOpacity
          style={[s.typeChip, typeFilter === null && s.typeChipActive]}
          onPress={() => choisirType(null)}
          activeOpacity={0.8}
        >
          <AppText style={[s.typeChipText, typeFilter === null && s.typeChipTextActive]}>Tous</AppText>
        </TouchableOpacity>
        {TYPE_ANNONCE_CHIPS.map((t) => {
          const active = typeFilter === t;
          return (
            <TouchableOpacity
              key={t}
              style={[s.typeChip, active && s.typeChipActive]}
              onPress={() => choisirType(active ? null : t!)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={TYPE_ANNONCE_CHIP_ICONS[t!]}
                size={13}
                color={active ? colors.primary : colors.textSecondary}
              />
              <AppText style={[s.typeChipText, active && s.typeChipTextActive]}>
                {TYPE_ANNONCE_LABELS[t!]}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[s.rayonRow, isDesktop && s.rayonRowDesktop]}>
        {RAYONS.map((r) => {
          const active = r === rayon;
          return (
            <TouchableOpacity
              key={r}
              style={[s.rayonChip, active && s.rayonChipActive]}
              onPress={() => onSelectRayon(r)}
              activeOpacity={0.8}
            >
              <AppText style={[s.rayonChipText, active && s.rayonChipTextActive]}>{r} km</AppText>
            </TouchableOpacity>
          );
        })}
      </View>
      </WebContainer>
    </View>
  );

  // ── États bloquants ──────────────────────────────────────────────────────────
  if (phase === 'locating') {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <AppText style={s.muted}>Localisation en cours…</AppText>
        </View>
      </View>
    );
  }

  if (phase === 'denied' || phase === 'error') {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}>
          <Ionicons
            name={phase === 'denied' ? 'location-outline' : 'cloud-offline-outline'}
            size={48}
            color={colors.error}
          />
          <AppText style={s.errorTitle}>
            {phase === 'denied' ? 'Localisation désactivée' : 'Erreur de localisation'}
          </AppText>
          <AppText style={s.muted}>
            {phase === 'denied'
              ? "Autorisez l'accès à votre position pour voir les annonces proches."
              : 'Impossible de récupérer votre position. Réessayez.'}
          </AppText>
          <Button
            title="Réessayer"
            fullWidth={false}
            style={s.retryBtn}
            onPress={locateAndFetch}
          />
        </View>
      </View>
    );
  }

  // ── Résultats ────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {Header}
      {Filters}
      <FlatList
        key={grid.key}
        {...LIST_PERF_PROPS}
        {...grid.listProps}
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[s.list, grid.contentStyle]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => grid.wrap(
          <FavAnnonceCard item={item} returnTo="/proximite" />
        )}
        ListHeaderComponent={(fetching ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : null) ?? undefined}
        ListEmptyComponent={(fetching ? null : (
            <View style={s.empty}>
              <Ionicons name="map-outline" size={40} color={colors.border} />
              <AppText style={s.muted}>
                {typeFilter
                  ? `Aucune annonce « ${TYPE_ANNONCE_LABELS[typeFilter]} » dans ce rayon.`
                  : 'Aucune annonce localisée dans ce rayon.'}
              </AppText>
            </View>
          )) ?? undefined}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // En-tête
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.headerBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  muted: { fontSize: typography.sizes.md, color: colors.textMuted, textAlign: 'center' },
  errorTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  retryBtn: { marginTop: spacing.sm },

  list: { backgroundColor: colors.background, paddingTop: spacing.sm, paddingBottom: spacing['3xl'] },

  // Filtres
  filters: {
    backgroundColor: colors.headerBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeChipText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: colors.primary, fontWeight: '700' },
  filtersDesktop: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  filtersInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xl },
  rayonRowDesktop: { paddingHorizontal: 0, minWidth: 360 },
  rayonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  rayonChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  rayonChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  rayonChipText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textSecondary },
  rayonChipTextActive: { color: colors.primary, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
});
