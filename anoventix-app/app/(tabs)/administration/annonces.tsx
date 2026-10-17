import { annonceHref } from '@/src/lib/annonce-url';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { buildMediaUrl } from '@/src/api/annonce.api';
import { useAdminStore } from '@/src/stores/admin.store';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { AdminAnnonce } from '@/src/types/admin.types';
import { MOTIF_CLOTURE_LABELS, STATUT_ANNONCE_LABELS, TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS, type StatutAnnonce, type TypeAnnonce } from '@/src/types/annonce.types';
import { ANNONCE_TONE } from '@/src/features/admin/status';
import {
    AdminPage,
    BlockGap,
    EmptyState,
    ErrorBanner,
    FilterBar,
    FooterLoader,
    ItemBlock,
    LoadingState,
    ResultCount,
    SearchField,
    StatusBadge,
    Toolbar,
} from '@/src/features/admin/ui';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { formatDate, formatPrix } from '@/src/utils/format';
import { appAlert } from '@/src/components/ui/app-alert';
import { useShallow } from 'zustand/react/shallow';

// ─── Bloc annonce ─────────────────────────────────────────────────────────────

function AnnonceItem({ item }: { item: AdminAnnonce }) {
  // Sélecteurs par ligne : un toggle ne re-rend que la ligne concernée.
  const toggleAnnonceActif = useAdminStore((s) => s.toggleAnnonceActif);
  const isToggling = useAdminStore((s) => s.togglingAnnonceIds.has(item.id));

  const medias = Array.isArray(item.medias) ? item.medias : [];
  const photo = medias[0]?.url ? buildMediaUrl(medias[0].url) : null;
  const loc = [item.localisation?.quartier, item.localisation?.commune].filter(Boolean).join(', ');
  const typeAnnonce = item.typeAnnonce ?? item.typeTransaction;
  const typeLabel = typeAnnonce ? TYPE_ANNONCE_LABELS[typeAnnonce as TypeAnnonce] ?? typeAnnonce : null;
  const typeBien = (TYPE_BIEN_LABELS as Record<string, string>)[item.typeBien] ?? item.typeBien;
  const statutLabel = item.statutModeration === 'CLOTUREE' && item.motifCloture
    ? `Clôturée · ${MOTIF_CLOTURE_LABELS[item.motifCloture]}`
    : STATUT_ANNONCE_LABELS[item.statutModeration];

  const handleToggle = () => {
    appAlert(
      item.actif ? 'Désactiver l\'annonce' : 'Activer l\'annonce',
      `${item.actif ? 'Désactiver' : 'Activer'} "${item.titre}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: item.actif ? 'Désactiver' : 'Activer',
          style: item.actif ? 'destructive' : 'default',
          onPress: () => toggleAnnonceActif(item.id),
        },
      ],
    );
  };

  return (
    <ItemBlock>
      <TouchableOpacity
        style={s.main}
        onPress={() => router.push(annonceHref(item))}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`${item.titre}, ${statutLabel}`}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={s.thumb} contentFit="cover" />
        ) : (
          <View style={[s.thumb, s.thumbEmpty]}>
            <Ionicons name="home-outline" size={22} color={colors.placeholder} />
          </View>
        )}
        <View style={s.body}>
          <AppText style={s.kicker} numberOfLines={1}>
            {[typeLabel, typeBien, `Réf. ${item.referenceAnnonce}`].filter(Boolean).join(' · ')}
          </AppText>
          <AppText style={s.titre} numberOfLines={2}>{item.titre}</AppText>
          <AppText style={s.prix}>{formatPrix(item.prix)}</AppText>
          <AppText style={s.meta} numberOfLines={1}>
            {[loc, `${item.vueCount} vues`, formatDate(item.dateCreation)].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      </TouchableOpacity>

      {/* État : modération, activation, masquage du compte */}
      <View style={s.badges}>
        <StatusBadge label={statutLabel} tone={ANNONCE_TONE[item.statutModeration]} />
        {!item.actif ? <StatusBadge label="Inactive" tone="neutral" icon="eye-off-outline" /> : null}
        {item.proprietaireMasque ? <StatusBadge label="Compte masqué" tone="danger" icon="eye-off-outline" /> : null}
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={s.owner}
          onPress={() => router.push(`/(tabs)/administration/users/${item.proprietaireId}` as any)}
          accessibilityRole="link"
          accessibilityLabel={`Propriétaire ${item.proprietaireNom ?? item.proprietaireEmail ?? ''}, ouvrir sa fiche`}
        >
          <Ionicons name="person-outline" size={13} color={colors.textMuted} />
          <AppText style={s.ownerLink} numberOfLines={1}>{item.proprietaireNom ?? item.proprietaireEmail ?? item.proprietaireId}</AppText>
        </TouchableOpacity>
        <Button
          title={item.actif ? 'Désactiver' : 'Activer'}
          variant={item.actif ? 'dangerOutline' : 'outline'}
          size="sm"
          fullWidth={false}
          onPress={handleToggle}
          isLoading={isToggling}
          accessibilityLabel={`${item.actif ? 'Désactiver' : 'Activer'} l'annonce ${item.titre}`}
        />
      </View>
    </ItemBlock>
  );
}

// ─── Écran annonces ───────────────────────────────────────────────────────────

const FILTERS: { key: 'ALL' | StatutAnnonce; label: string }[] = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'PUBLIEE', label: 'Publiées' },
  { key: 'MASQUEE', label: 'Masquées' },
  { key: 'REJETEE', label: 'Rejetées' },
  { key: 'CLOTUREE', label: 'Clôturées' },
  { key: 'DESACTIVEE', label: 'Désactivées' },
];

export default function AdminAnnonces() {
  const {
    annonces,
    annoncesPage,
    annoncesTotalItems,
    isLoadingAnnonces,
    annoncesError,
    loadAnnonces,
    loadMoreAnnonces,
  } = useAdminStore(
    useShallow((s) => ({
      annonces: s.annonces,
      annoncesPage: s.annoncesPage,
      annoncesTotalItems: s.annoncesTotalItems,
      isLoadingAnnonces: s.isLoadingAnnonces,
      annoncesError: s.annoncesError,
      loadAnnonces: s.loadAnnonces,
      loadMoreAnnonces: s.loadMoreAnnonces,
    })),
  );
  // Depuis la fiche d'un utilisateur : recherche pré-remplie avec son email.
  const { q: qParam } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(qParam ?? '');
  const [filter, setFilter] = useState<'ALL' | StatutAnnonce>('ALL');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  // Recherche et statut sont appliqués par l'API : toutes les annonces sont
  // couvertes, pas seulement les pages déjà chargées.
  const filtre = { statut: filter === 'ALL' ? undefined : filter, q: search.trim() };

  useFocusEffect(
    useCallback(() => {
      loadAnnonces(0, filtre);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]),
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadAnnonces(0, filtre), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const firstLoad = isLoadingAnnonces && annoncesPage === 0;

  return (
    <AdminPage>
      <Toolbar>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Titre, référence, propriétaire…"
          accessibilityLabel="Rechercher une annonce"
          loading={firstLoad && annonces.length > 0}
        />
        <FilterBar options={FILTERS} value={filter} onChange={setFilter} />
      </Toolbar>

      {annoncesError ? <ErrorBanner message={annoncesError} onRetry={() => loadAnnonces(0, filtre)} /> : null}

      <FlatList
        {...LIST_PERF_PROPS}
        data={annonces}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => <AnnonceItem item={item} />}
        ItemSeparatorComponent={BlockGap}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => loadAnnonces(0, filtre)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          annonces.length > 0 ? (
            <ResultCount>{annoncesTotalItems} annonce{annoncesTotalItems > 1 ? 's' : ''}</ResultCount>
          ) : null
        }
        ListEmptyComponent={
          firstLoad ? <LoadingState /> : annoncesError ? null : (
            <EmptyState
              icon="home-outline"
              title="Aucune annonce"
              message={search.trim() ? `Aucun résultat pour « ${search.trim()} ».` : undefined}
            />
          )
        }
        onEndReached={() => loadMoreAnnonces()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={<FooterLoader visible={isLoadingAnnonces && annoncesPage > 0} />}
      />
    </AdminPage>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  main: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 76, height: 76, borderRadius: radius.sm, backgroundColor: colors.background },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 1 },
  kicker: { fontSize: typography.sizes.xs, color: colors.textMuted },
  titre: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, lineHeight: 19 },
  prix: { fontSize: typography.sizes.sm, fontWeight: '800', color: colors.primary },
  meta: { fontSize: typography.sizes.xs, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  owner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  ownerLink: { flexShrink: 1, fontSize: typography.sizes.xs, color: colors.primary, fontWeight: '600' },
});
