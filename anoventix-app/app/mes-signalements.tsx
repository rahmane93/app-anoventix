import { webColumnStyle } from '@/src/lib/responsive';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { getMesSignalements, MOTIF_LABELS, retirerSignalement, type UserSignalement } from '@/src/api/annonce.api';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';

// ─── Carte signalement utilisateur ───────────────────────────────────────────

function SignalementCard({
  item,
  onRetire,
}: {
  item: UserSignalement;
  onRetire: (id: number) => void;
}) {
  const motifLabel = MOTIF_LABELS[item.motif] ?? item.motif;
  const dateStr = new Date(item.date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.motifBadge}>
          <Ionicons name="flag" size={12} color={colors.error} />
          <AppText style={s.motifText} numberOfLines={1}>{motifLabel}</AppText>
        </View>
        {item.annule ? (
          <View style={s.annuleBadge}>
            <AppText style={s.annuleText}>Annulé</AppText>
          </View>
        ) : null}
        <AppText style={s.date}>{dateStr}</AppText>
      </View>

      <TouchableOpacity
        style={s.annonceRow}
        onPress={() => router.push(`/annonce/${item.annonceId}` as any)}
        activeOpacity={0.75}
      >
        <Ionicons name="home-outline" size={14} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText style={s.annonceTitle} numberOfLines={1}>{item.titreAnnonce}</AppText>
          <AppText style={s.annonceRef}>{item.referenceAnnonce}</AppText>
        </View>
        <Ionicons name="open-outline" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      {item.commentaire ? (
        <View style={s.commentaire}>
          <AppText style={s.commentaireText}>{item.commentaire}</AppText>
        </View>
      ) : null}

      {!item.annule && (
        <Button
          title="Retirer ce signalement"
          variant="outline"
          size="sm"
          fullWidth={false}
          style={s.retireBtn}
          leftIcon={<Ionicons name="close-circle-outline" size={15} color={colors.primary} />}
          onPress={() => onRetire(item.annonceId)}
        />
      )}
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

export default function MesSignalementsScreen() {
  const [signalements, setSignalements] = useState<UserSignalement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // setState uniquement dans les callbacks de la promesse : appelable depuis l'effet.
  const fetchSignalements = useCallback(
    () =>
      getMesSignalements(0, 50)
        .then((res) => {
          setSignalements(res.data);
          setTotalElements(res.totalItems);
        })
        .catch(() => setError('Impossible de charger vos signalements.'))
        .finally(() => {
          setIsLoading(false);
          setIsRefreshing(false);
        }),
    [],
  );

  const load = (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    return fetchSignalements();
  };

  useEffect(() => { fetchSignalements(); }, [fetchSignalements]);

  const handleRetire = (annonceId: number) => {
    appAlert(
      'Retirer le signalement',
      'Voulez-vous annuler ce signalement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await retirerSignalement(annonceId);
              setSignalements((prev) =>
                prev.map((sg) =>
                  sg.annonceId === annonceId ? { ...sg, annule: true } : sg,
                ),
              );
            } catch {
              appAlert("Signalement non retiré", 'Impossible de retirer ce signalement.');
            }
          },
        },
      ],
    );
  };

  if (isLoading && signalements.length === 0) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
        <AppText style={s.errorText}>{error}</AppText>
        <Button
          title="Réessayer"
          fullWidth={false}
          style={s.retryBtn}
          onPress={() => load()}
        />
      </View>
    );
  }

  return (
    <FlatList
      {...LIST_PERF_PROPS}
      data={signalements}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <SignalementCard item={item} onRetire={handleRetire} />
      )}
      style={s.root}
      contentContainerStyle={[s.list, webColumnStyle('form')]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => load(true)}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={(signalements.length > 0 ? (
          <View style={s.listHeader}>
            <Ionicons name="flag-outline" size={15} color={colors.textMuted} />
            <AppText style={s.listHeaderText}>
              {totalElements} signalement{totalElements !== 1 ? 's' : ''}
            </AppText>
          </View>
        ) : null) ?? undefined}
      ListEmptyComponent={
        <View style={s.center}>
          <Ionicons name="flag-outline" size={52} color={colors.border} />
          <AppText style={s.emptyTitle}>Aucun signalement</AppText>
          <AppText style={s.emptySubtitle}>
            Vous n'avez signalé aucune annonce pour l'instant.
          </AppText>
        </View>
      }
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing['3xl'], paddingTop: spacing.sm },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  listHeaderText: { fontSize: typography.sizes.sm, color: colors.textMuted, fontWeight: '600' },
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    marginBottom: spacing.md, padding: spacing.base, gap: spacing.sm,
    ...shadows.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  motifBadge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.errorLight, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full, marginRight: spacing.sm,
  },
  motifText: { fontSize: typography.sizes.xs, color: colors.error, fontWeight: '600', flex: 1 },
  date: { fontSize: typography.sizes.xs, color: colors.textMuted },
  annuleBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full,
    backgroundColor: colors.textMuted + '1A', marginRight: spacing.sm,
  },
  annuleText: { fontSize: typography.sizes.xs, color: colors.textMuted, fontWeight: '700' },
  annonceRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, padding: spacing.sm, borderRadius: radius.md,
  },
  annonceTitle: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.primary },
  annonceRef: { fontSize: typography.sizes.xs, color: colors.textMuted },
  commentaire: {
    backgroundColor: colors.background, padding: spacing.sm, borderRadius: radius.md,
    borderLeftWidth: 3, borderLeftColor: colors.border,
  },
  commentaireText: { fontSize: typography.sizes.sm, color: colors.textSecondary, fontStyle: 'italic' },
  retireBtn: {},
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md, marginTop: spacing['3xl'],
  },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  emptySubtitle: { fontSize: typography.sizes.md, color: colors.textMuted, textAlign: 'center' },
  errorText: { fontSize: typography.sizes.md, color: colors.textMuted, textAlign: 'center' },
  retryBtn: {},
});
