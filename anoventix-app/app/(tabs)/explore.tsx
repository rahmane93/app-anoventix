import { LIST_PERF_PROPS } from '@/src/constants/list';
import { FilterModal } from '@/src/features/explore/FilterModal';
import { sortLabel, TYPE_ANNONCE_CHIPS } from '@/src/features/explore/filters';
import { SKELETON_DATA, SkeletonCard } from '@/src/components/ui/skeleton-card';
import { useZonesActives } from '@/src/features/explore/useZonesActives';
import { useExploreAnnonces } from '@/src/features/explore/useExploreAnnonces';
import { requireLogin } from '@/src/lib/auth-redirect';
import { aDesCriteres, CreerAlerteSheet, criteresDepuisRecherche } from '@/src/features/explore/CreerAlerteSheet';
import { useBreakpoint, useCardGrid, WebContainer } from '@/src/lib/responsive';
import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { useUserStore } from '@/src/stores/user.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS, TYPE_USAGE_LABELS } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    LayoutAnimation,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import BrandText from '@/src/components/BrandText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

// ─── Écran Explorer ───────────────────────────────────────────────────────────
// Logique extraite dans useExploreAnnonces ; cet écran ne fait que composer
// la barre de recherche, le corps de liste et la modale de filtres.

// Puces compactes (≈ 28-34 px) : zone tactile étendue verticalement à ≥ 44 px.
const CHIP_HIT_SLOP = { top: 8, bottom: 8, left: 2, right: 2 };

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  // Web desktop : bandeau d'accueil + grille de cartes (le mobile reste en colonne).
  const { isDesktop } = useBreakpoint();
  const grid = useCardGrid(300, 4);
  const { isAuthenticated, user } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated, user: s.user })));
  const { profile } = useUserStore(useShallow((s) => ({ profile: s.profile })));
  const roleFlags = getRoleFlags(profile?.roles ?? profile?.role ?? user?.roles);
  // Publier = action principale d'une place de marché : visible pour les
  // visiteurs (→ connexion) et les rôles annonceurs, pas pour la modération.
  const canPublish =
    !isAuthenticated ||
    roleFlags.isParticulier || roleFlags.isProfessionnel || roleFlags.isAgentProfessionnel;
  // Pièce d'identité non validée : l'API refusera la publication. On le signale
  // dès le bouton (pastille) plutôt qu'au bout du parcours.
  const verificationRequise =
    isAuthenticated && !!profile && profile.statutPieceIdentite !== 'VALIDEE';
  const {
    inputValue,
    inputRef,
    handleChangeText,
    handleClear,
    handleSubmit,
    query,
    mode,
    activeFilterCount,
    filters,
    filterVisible,
    filterDraft,
    setFilterDraft,
    setFilterVisible,
    handleOpenFilter,
    handleApplyFilter,
    handleRemoveFilter,
    handleResetAll,
    handleSetType,
    handleSetLieu,
    allAnnonces,
    allPage,
    allHasMore,
    isLoadingAll,
    isLoadingMore,
    allError,
    isRefreshing,
    handleRefresh,
    loadAllPage,
    results,
    resultsTotal,
    isResultsLoading,
    isResultsLoadingMore,
    resultsError,
    loadMoreResults,
    retryResults,
    renderCard,
  } = useExploreAnnonces();
  const zones = useZonesActives();

  // ── En-tête compact au défilement ─────────────────────────────────────────────
  // Le logo disparaît dès qu'on descend dans la liste pour laisser la place aux
  // annonces ; il revient en haut de liste. Écart entre les seuils : pas d'oscillation.
  // Rattaché à la liste affichée : une nouvelle liste (recherche ↔ accueil,
  // nouveaux critères) repart du haut, logo visible.
  const listKey = JSON.stringify({ mode, query, filters });
  const [compact, setCompact] = React.useState({ key: '', on: false });
  const headerCompact = compact.key === listKey && compact.on;
  const handleListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = y > 60 ? true : y < 10 ? false : headerCompact;
    if (next !== headerCompact) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCompact({ key: listKey, on: next });
    }
  };

  const publier = () =>
    isAuthenticated ? router.push('/(tabs)/publier') : requireLogin('publier', '/(tabs)/publier');

  // ── Puces des critères actifs (texte + filtres + tri) ────────────────────────
  const fmt = (n: number) => n.toLocaleString('fr-FR');
  const range = (min?: number, max?: number, unit = '') =>
    min != null && max != null ? `${fmt(min)} – ${fmt(max)}${unit}`
      : min != null ? `≥ ${fmt(min)}${unit}` : `≤ ${fmt(max!)}${unit}`;
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.typeAnnonce) activeChips.push({ key: 'ta', label: TYPE_ANNONCE_LABELS[filters.typeAnnonce], onRemove: () => handleRemoveFilter(['typeAnnonce']) });
  if (filters.typeBien) activeChips.push({ key: 'tb', label: TYPE_BIEN_LABELS[filters.typeBien], onRemove: () => handleRemoveFilter(['typeBien']) });
  if (filters.typeUsage) activeChips.push({ key: 'tu', label: `Usage : ${TYPE_USAGE_LABELS[filters.typeUsage]}`, onRemove: () => handleRemoveFilter(['typeUsage']) });
  if (filters.prixMin != null || filters.prixMax != null) activeChips.push({ key: 'px', label: range(filters.prixMin, filters.prixMax, ' GNF'), onRemove: () => handleRemoveFilter(['prixMin', 'prixMax']) });
  if (filters.nbChambresMin != null) activeChips.push({ key: 'ch', label: `${filters.nbChambresMin}+ chambres`, onRemove: () => handleRemoveFilter(['nbChambresMin']) });
  if (filters.nbPiecesMin != null) activeChips.push({ key: 'pc', label: `${filters.nbPiecesMin}+ pièces`, onRemove: () => handleRemoveFilter(['nbPiecesMin']) });
  if (filters.surfaceMin != null || filters.surfaceMax != null) activeChips.push({ key: 'sf', label: range(filters.surfaceMin, filters.surfaceMax, ' m²'), onRemove: () => handleRemoveFilter(['surfaceMin', 'surfaceMax']) });
  // Localisation : une seule puce, la plus précise (retirer la région retire tout).
  const lieu = filters.quartier ?? filters.commune ?? filters.prefecture ?? filters.region;
  if (lieu) activeChips.push({ key: 'loc', label: lieu, onRemove: () => handleRemoveFilter(['region', 'prefecture', 'commune', 'quartier']) });
  if (filters.sort) activeChips.push({ key: 'so', label: `Tri : ${sortLabel(filters.sort, filters.direction)}`, onRemove: () => handleRemoveFilter(['sort', 'direction']) });
  // Type → onglets ; commune seule → sélecteur de zone : pas de puce en double.
  const communeSeule = !!filters.commune && !filters.quartier;
  // Alerte de recherche (DEC-16) : proposée dès qu'une recherche ou un filtre est actif.
  const [alerteOuverte, setAlerteOuverte] = React.useState(false);
  const criteresAlerte = criteresDepuisRecherche(query, filters);
  const alerteProposee = aDesCriteres(criteresAlerte);
  const creerAlerte = () =>
    isAuthenticated ? setAlerteOuverte(true) : requireLogin('alerte', '/(tabs)/explore');
  const visibleChips = activeChips.filter((c) => c.key !== 'ta' && !(c.key === 'loc' && communeSeule));

  // ── Zone affichée en titre (piste « le quartier d'abord ») ──────────────────
  // Grand titre seulement quand une zone est choisie (c'est l'élément fort de
  // l'écran) ; sinon un titre sobre, « Partout » étant déjà visible au-dessus.
  const hasLieu = !!lieu;
  const zoneTitre = lieu ?? (mode === 'results' ? 'Résultats' : 'Dernières annonces');

  const zoneHeader = (sousTitre?: React.ReactNode) => (
    <View style={[styles.zoneHeader, isDesktop && styles.zoneHeaderDesktop]}>
      <AppText
        style={hasLieu ? styles.zoneTitle : styles.zoneTitleSobre}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {zoneTitre}
      </AppText>
      {sousTitre ? <AppText style={styles.zoneSub}>{sousTitre}</AppText> : null}
      <View style={[styles.typeTabs, isDesktop && styles.typeTabsDesktop]} accessibilityRole="tablist">
        {([undefined, ...TYPE_ANNONCE_CHIPS] as const).map((t) => {
          const on = filters.typeAnnonce === t;
          return (
            <TouchableOpacity
              key={t ?? 'tout'}
              style={[styles.typeTab, isDesktop && styles.typeTabDesktop, on && styles.typeTabOn]}
              onPress={() => handleSetType(t)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <AppText style={[styles.typeTabText, on && styles.typeTabTextOn]}>
                {t ? TYPE_ANNONCE_LABELS[t] : 'Tout'}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ── Barre de recherche ────────────────────────────────────────────────────────
  const filterBtnActive = activeFilterCount > 0;
  const SearchBar = (
    <View style={isDesktop ? styles.hero : [styles.searchBarWrap, { paddingTop: insets.top + spacing.sm }]}>
      <WebContainer style={isDesktop ? styles.heroInner : styles.searchBarInner}>
      {isDesktop ? (
        !headerCompact && (
          <View style={styles.heroIntro}>
            <AppText style={styles.heroEyebrow}>Immobilier en Guinée</AppText>
            <AppText style={styles.heroTitle} accessibilityRole="header">
              Trouvez votre prochain chez-vous.
            </AppText>
            <AppText style={styles.heroSub}>
              Maisons, appartements, terrains et bureaux à vendre, à louer ou en bail — à Conakry et dans tout le pays.
            </AppText>
          </View>
        )
      ) : (
        !headerCompact && <BrandText size={30} />
      )}

      {/* Barre de recherche avec filtre intégré */}
      <View style={[styles.searchBar, isDesktop && styles.searchBarHero]}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <AppTextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Quartier, type de bien, référence…"
          placeholderTextColor={colors.placeholder}
          value={inputValue}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Rechercher une annonce"
        />
        {inputValue.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.searchDivider} />
        <TouchableOpacity
          onPress={handleOpenFilter}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={filterBtnActive ? `Filtres, ${activeFilterCount} actif${activeFilterCount > 1 ? 's' : ''}` : 'Filtres'}
          style={[styles.searchFilterBtn, isDesktop && styles.searchFilterBtnHero]}
        >
          <Ionicons name="options-outline" size={20} color={filterBtnActive ? colors.primary : colors.textMuted} />
          {isDesktop && <AppText style={[styles.filterLabel, filterBtnActive && { color: colors.primary }]}>Filtres</AppText>}
          {filterBtnActive && (
            <View style={styles.filterBadge}>
              <AppText style={styles.filterBadgeText}>{activeFilterCount}</AppText>
            </View>
          )}
        </TouchableOpacity>
        {isDesktop && (
          <TouchableOpacity onPress={handleSubmit} style={styles.searchSubmit} accessibilityRole="button" accessibilityLabel="Lancer la recherche">
            <Ionicons name="search" size={18} color={colors.white} />
            <AppText style={styles.searchSubmitText}>Rechercher</AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Zone : on cherche d'abord un quartier. « Partout », les communes de
          Conakry, puis « Autour de moi » (GPS). */}
      {isDesktop ? (
        <View style={[styles.zoneRow, styles.zoneRowWrap]}>
        <TouchableOpacity
          style={[styles.zonePill, isDesktop && styles.zonePillDark, !hasLieu && (isDesktop ? styles.zonePillOnDark : styles.zonePillOn)]}
          onPress={() => handleSetLieu(null)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: !hasLieu }}
        >
          <AppText style={[styles.zonePillText, isDesktop && styles.zonePillTextDark, !hasLieu && (isDesktop ? styles.zonePillTextOnDark : styles.zonePillTextOn)]}>Partout</AppText>
        </TouchableOpacity>
        {zones.map((z) => {
          const on = filters.commune === z.commune && filters.prefecture === z.prefecture && !filters.quartier;
          return (
            <TouchableOpacity
              key={`${z.prefecture}/${z.commune}`}
              style={[styles.zonePill, isDesktop && styles.zonePillDark, on && (isDesktop ? styles.zonePillOnDark : styles.zonePillOn)]}
              // Uniquement les critères de lieu (pas le décompte) dans les filtres.
              onPress={() => handleSetLieu(on ? null : { region: z.region, prefecture: z.prefecture, commune: z.commune })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={
                z.nbAnnonces != null
                  ? `${z.commune}, ${z.nbAnnonces} annonce${z.nbAnnonces > 1 ? 's' : ''}`
                  : z.commune
              }
            >
              <AppText style={[styles.zonePillText, isDesktop && styles.zonePillTextDark, on && (isDesktop ? styles.zonePillTextOnDark : styles.zonePillTextOn)]}>{z.commune}</AppText>
              {z.nbAnnonces != null && (
                <AppText style={[styles.zonePillCount, isDesktop && styles.zonePillCountDark, on && (isDesktop ? styles.zonePillCountOnDark : styles.zonePillCountOn)]}>{z.nbAnnonces}</AppText>
              )}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.zonePill, isDesktop ? styles.nearbyPillDark : styles.nearbyPill]}
          onPress={() => router.push('/proximite')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Voir les annonces autour de moi"
        >
          <Ionicons name="navigate-outline" size={15} color={colors.primary} />
          <AppText style={styles.nearbyPillText}>Autour de moi</AppText>
        </TouchableOpacity>
        </View>
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.zoneRow}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={[styles.zonePill, isDesktop && styles.zonePillDark, !hasLieu && (isDesktop ? styles.zonePillOnDark : styles.zonePillOn)]}
          onPress={() => handleSetLieu(null)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: !hasLieu }}
        >
          <AppText style={[styles.zonePillText, isDesktop && styles.zonePillTextDark, !hasLieu && (isDesktop ? styles.zonePillTextOnDark : styles.zonePillTextOn)]}>Partout</AppText>
        </TouchableOpacity>
        {zones.map((z) => {
          const on = filters.commune === z.commune && filters.prefecture === z.prefecture && !filters.quartier;
          return (
            <TouchableOpacity
              key={`${z.prefecture}/${z.commune}`}
              style={[styles.zonePill, isDesktop && styles.zonePillDark, on && (isDesktop ? styles.zonePillOnDark : styles.zonePillOn)]}
              // Uniquement les critères de lieu (pas le décompte) dans les filtres.
              onPress={() => handleSetLieu(on ? null : { region: z.region, prefecture: z.prefecture, commune: z.commune })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={
                z.nbAnnonces != null
                  ? `${z.commune}, ${z.nbAnnonces} annonce${z.nbAnnonces > 1 ? 's' : ''}`
                  : z.commune
              }
            >
              <AppText style={[styles.zonePillText, isDesktop && styles.zonePillTextDark, on && (isDesktop ? styles.zonePillTextOnDark : styles.zonePillTextOn)]}>{z.commune}</AppText>
              {z.nbAnnonces != null && (
                <AppText style={[styles.zonePillCount, isDesktop && styles.zonePillCountDark, on && (isDesktop ? styles.zonePillCountOnDark : styles.zonePillCountOn)]}>{z.nbAnnonces}</AppText>
              )}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.zonePill, isDesktop ? styles.nearbyPillDark : styles.nearbyPill]}
          onPress={() => router.push('/proximite')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Voir les annonces autour de moi"
        >
          <Ionicons name="navigate-outline" size={15} color={colors.primary} />
          <AppText style={styles.nearbyPillText}>Autour de moi</AppText>
        </TouchableOpacity>
      </ScrollView>
      )}

      {/* Critères actifs (hors type et commune, déjà visibles ailleurs) */}
      {visibleChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeChipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {visibleChips.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.activeChip, isDesktop && styles.activeChipDark]}
              onPress={c.onRemove}
              hitSlop={CHIP_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`Retirer le critère ${c.label}`}
            >
              <AppText style={[styles.activeChipText, isDesktop && styles.activeChipTextDark]}>{c.label}</AppText>
              <Ionicons name="close" size={12} color={isDesktop ? colors.white : colors.primary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.activeChipReset, isDesktop && styles.activeChipResetDark]} onPress={handleResetAll} hitSlop={CHIP_HIT_SLOP} accessibilityRole="button">
            <AppText style={[styles.activeChipResetText, isDesktop && styles.activeChipTextDark]}>Tout effacer</AppText>
          </TouchableOpacity>
        </ScrollView>
      )}
      {alerteProposee && (
        <TouchableOpacity
          style={styles.alerteBtn}
          onPress={creerAlerte}
          hitSlop={CHIP_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Créer une alerte pour cette recherche"
        >
          <Ionicons name="notifications-outline" size={14} color={colors.primary} />
          <AppText style={styles.alerteBtnText}>Créer une alerte</AppText>
        </TouchableOpacity>
      )}
      <CreerAlerteSheet
        visible={alerteOuverte}
        criteres={criteresAlerte}
        nomSuggere={query.trim() || 'Ma recherche'}
        onClose={() => setAlerteOuverte(false)}
      />
      </WebContainer>
    </View>
  );

  const skeleton = (
    <FlatList
      key={grid.key}
      {...grid.listProps}
      data={SKELETON_DATA}
      keyExtractor={(i) => String(i)}
      renderItem={() => grid.wrap(<SkeletonCard />)}
      scrollEnabled={false}
      contentContainerStyle={[styles.listContent, grid.contentStyle]}
    />
  );

  const loadingMoreFooter = (loading: boolean) =>
    loading ? (
      <View style={{ paddingVertical: spacing.md }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : null;

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  );

  // ── Corps ────────────────────────────────────────────────────────────────────
  // Hors liste (chargement, erreur, vide), le titre de zone et les onglets restent
  // visibles pour changer de zone ou de type sans passer par les filtres.
  const withZone = (sousTitre: React.ReactNode, content: React.ReactNode) => (
    <View style={styles.flex}>
      <WebContainer>{zoneHeader(sousTitre)}</WebContainer>
      {content}
    </View>
  );
  const resultsSousTitre = (total: number | null) => (
    <>
      {total != null ? `${fmt(total)} annonce${total > 1 ? 's' : ''}` : 'Recherche…'}
      {query ? <>{' pour '}<AppText style={styles.resultsQuery}>« {query} »</AppText></> : null}
    </>
  );

  const renderBody = () => {
    if (mode === 'results') {
      if (isResultsLoading && results.length === 0) return withZone(resultsSousTitre(null), skeleton);

      if (resultsError && results.length === 0) {
        return withZone(resultsSousTitre(null),
          <View style={styles.stateContainer}>
            <View style={styles.stateIconWrap}><Ionicons name="cloud-offline-outline" size={52} color={colors.textMuted} /></View>
            <AppText style={styles.stateTitle}>Impossible de charger</AppText>
            <AppText style={styles.stateSub}>{resultsError}</AppText>
            <TouchableOpacity style={styles.tipChip} hitSlop={CHIP_HIT_SLOP} onPress={retryResults} activeOpacity={0.85} accessibilityRole="button">
              <AppText style={styles.tipText}>Réessayer</AppText>
            </TouchableOpacity>
          </View>
        );
      }

      if (!isResultsLoading && results.length === 0) {
        // Seule la zone est choisie : on le dit, et on propose d'élargir.
        const zoneSeule = !query && hasLieu && activeChips.every((c) => c.key === 'loc' || c.key === 'ta');
        return withZone(resultsSousTitre(0),
          <View style={styles.stateContainer}>
            <View style={styles.stateIconWrap}><Ionicons name="search-outline" size={52} color={colors.textMuted} /></View>
            <AppText style={styles.stateTitle}>Aucun résultat</AppText>
            <AppText style={styles.stateSub}>
              {query
                ? <>Aucune annonce ne correspond à{'\n'}<AppText style={styles.stateQuery}>« {query} »</AppText>{activeFilterCount > 0 ? ' avec ces filtres.' : '.'}</>
                : zoneSeule
                  ? `Aucune annonce${filters.typeAnnonce ? ` en ${TYPE_ANNONCE_LABELS[filters.typeAnnonce].toLowerCase()}` : ''} à ${zoneTitre} pour le moment.`
                  : 'Aucune annonce ne correspond à vos filtres.'}
            </AppText>
            <View style={styles.tipsRow}>
              {zoneSeule && (
                <TouchableOpacity style={styles.tipChip} hitSlop={CHIP_HIT_SLOP} onPress={() => handleSetLieu(null)} activeOpacity={0.85} accessibilityRole="button">
                  <AppText style={styles.tipText}>Voir partout</AppText>
                </TouchableOpacity>
              )}
              {activeFilterCount > 0 && !zoneSeule && (
                <TouchableOpacity style={styles.tipChip} hitSlop={CHIP_HIT_SLOP} onPress={handleOpenFilter} activeOpacity={0.85} accessibilityRole="button">
                  <AppText style={styles.tipText}>Modifier les filtres</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.tipChip} hitSlop={CHIP_HIT_SLOP} onPress={handleResetAll} activeOpacity={0.85} accessibilityRole="button">
                <AppText style={styles.tipText}>Tout effacer</AppText>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      const total = resultsTotal ?? results.length;
      return (
        <FlatList
          key={grid.key}
          {...LIST_PERF_PROPS}
          {...grid.listProps}
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => grid.wrap(renderCard(item))}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.listContent, grid.contentStyle]}
          refreshControl={refreshControl}
          ListHeaderComponentStyle={isDesktop ? styles.listHeaderDesktop : undefined}
          ListHeaderComponent={zoneHeader(resultsSousTitre(total))}
          onEndReachedThreshold={0.6}
          onEndReached={loadMoreResults}
          ListFooterComponent={loadingMoreFooter(isResultsLoadingMore)}
          showsVerticalScrollIndicator={isDesktop}
          onScroll={handleListScroll}
          scrollEventThrottle={100}
        />
      );
    }

    // Mode par défaut : toutes les annonces
    // Flux par défaut : le titre « Dernières annonces » suffit, pas de sous-titre.
    const recentes = undefined;
    if (isLoadingAll && allAnnonces.length === 0) return withZone(recentes, skeleton);

    if (allError && allAnnonces.length === 0) {
      return withZone(recentes,
        <View style={styles.stateContainer}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="cloud-offline-outline" size={52} color={colors.textMuted} />
          </View>
          <AppText style={styles.stateTitle}>Impossible de charger</AppText>
          <AppText style={styles.stateSub}>{allError}</AppText>
          <TouchableOpacity style={styles.tipChip} hitSlop={CHIP_HIT_SLOP} onPress={() => loadAllPage(0, { replace: true })} activeOpacity={0.85} accessibilityRole="button">
            <AppText style={styles.tipText}>Réessayer</AppText>
          </TouchableOpacity>
        </View>
      );
    }

    if (!isLoadingAll && allAnnonces.length === 0) {
      return withZone(recentes,
        <View style={styles.stateContainer}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="file-tray-outline" size={52} color={colors.textMuted} />
          </View>
          <AppText style={styles.stateTitle}>Aucune annonce</AppText>
          <AppText style={styles.stateSub}>Il n’y a aucune annonce à afficher pour le moment.</AppText>
          {canPublish && (
            <TouchableOpacity style={styles.tipChip} hitSlop={CHIP_HIT_SLOP} onPress={publier} activeOpacity={0.85} accessibilityRole="button">
              <AppText style={styles.tipText}>Publier la première annonce</AppText>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <FlatList
        key={grid.key}
        {...LIST_PERF_PROPS}
        {...grid.listProps}
        data={allAnnonces}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => grid.wrap(renderCard(item))}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.listContent, grid.contentStyle]}
        refreshControl={refreshControl}
        ListHeaderComponentStyle={isDesktop ? styles.listHeaderDesktop : undefined}
        ListHeaderComponent={zoneHeader(recentes)}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (isLoadingMore || isLoadingAll || !allHasMore) return;
          loadAllPage(allPage + 1);
        }}
        ListFooterComponent={loadingMoreFooter(isLoadingMore)}
        showsVerticalScrollIndicator={isDesktop}
        onScroll={handleListScroll}
        scrollEventThrottle={100}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {SearchBar}
      {renderBody()}
      {/* Desktop : « Publier une annonce » est dans la barre du haut. */}
      {canPublish && !isDesktop && (
        <TouchableOpacity
          style={styles.publishFab}
          onPress={publier}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Publier une annonce"
          accessibilityHint={verificationRequise ? "Une pièce d'identité validée est requise avant de publier" : undefined}
        >
          <Ionicons name="add" size={22} color={colors.white} />
          <AppText style={styles.publishFabText}>Publier</AppText>
          {verificationRequise && (
            <View style={styles.publishFabBadge}>
              <Ionicons name="shield-outline" size={11} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>
      )}
      <FilterModal
        visible={filterVisible}
        draft={filterDraft}
        query={query}
        onChange={setFilterDraft}
        onApply={handleApplyFilter}
        onClose={() => setFilterVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  searchBarWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },

  searchBarInner: { gap: spacing.md },

  // ── Bandeau d'accueil (web desktop) ───────────────────────────────────────
  hero: {
    backgroundColor: colors.primaryDark,
    ...({
      backgroundImage:
        'radial-gradient(900px 420px at 88% -10%, rgba(212,160,23,0.28), transparent 60%),' +
        'radial-gradient(700px 380px at -5% 120%, rgba(42,95,168,0.55), transparent 60%),' +
        'linear-gradient(135deg, #0F2444 0%, #1A3C6E 100%)',
    } as object),
  },
  heroInner: { paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.base },
  heroIntro: { gap: spacing.sm, maxWidth: 960 },
  heroEyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.accentLight,
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.1,
    color: colors.white,
  },
  heroSub: { fontSize: typography.sizes.md, lineHeight: 24, color: 'rgba(255,255,255,0.78)' },
  searchBarHero: {
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderColor: 'transparent',
    maxWidth: 900,
    ...({ boxShadow: '0 20px 50px rgba(0,0,0,0.25)' } as object),
  },
  searchFilterBtnHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  filterLabel: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textSecondary },
  searchSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  searchSubmitText: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.white },

  // ── Sélecteur de zone ─────────────────────────────────────────────────────
  zoneRow: { flexDirection: 'row', gap: spacing.sm },
  zoneRowWrap: { flexWrap: 'wrap' },
  zonePillDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.22)' },
  zonePillOnDark: { backgroundColor: colors.accent, borderColor: colors.accent },
  zonePillTextDark: { color: colors.white },
  zonePillTextOnDark: { color: colors.textOnAccent, fontWeight: '800' },
  zonePillCountDark: { color: 'rgba(255,255,255,0.6)' },
  zonePillCountOnDark: { color: 'rgba(26,26,26,0.7)' },
  nearbyPillDark: { backgroundColor: colors.white, borderColor: colors.white },
  zonePill: {
    minHeight: 40,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zonePillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  zonePillText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  zonePillTextOn: { color: colors.white, fontWeight: '700' },
  zonePillCount: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.textMuted },
  zonePillCountOn: { color: colors.primarySurface },
  nearbyPill: { backgroundColor: colors.primarySurface, borderColor: colors.primarySurface },
  nearbyPillText: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.primary },

  // ── Titre de zone + onglets de type ───────────────────────────────────────
  zoneHeader: { paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.base, gap: 4 },
  zoneHeaderDesktop: { paddingHorizontal: 0, paddingTop: spacing.lg, paddingBottom: 0 },
  // La grille ajoute son écart (24) entre l'en-tête et la première rangée :
  // trop large sous les onglets, on le ramène à 16.
  listHeaderDesktop: { marginBottom: -spacing.sm },
  zoneTitle: {
    fontSize: typography.sizes['4xl'],
    lineHeight: 40,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.8,
  },
  zoneTitleSobre: {
    fontSize: typography.sizes.xl,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  zoneSub: { fontSize: typography.sizes.sm, color: colors.textMuted },
  typeTabs: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  typeTab: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  // Souris : pas besoin de la cible tactile de 44 px.
  typeTabsDesktop: { marginTop: 0 },
  typeTabDesktop: { minHeight: 36 },
  typeTabOn: { borderBottomColor: colors.accent },
  typeTabText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textMuted },
  typeTabTextOn: { fontWeight: '800', color: colors.textPrimary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: typography.sizes.md, color: colors.textPrimary, padding: 0 },
  searchDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 },
  searchFilterBtn: { padding: 2, position: 'relative' },
  filterBadge: {
    position: 'absolute',
    top: -7,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  filterBadgeText: { color: colors.white, fontSize: typography.sizes['2xs'], fontWeight: '700', lineHeight: 12 },
  alerteBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    paddingVertical: 4, paddingHorizontal: spacing.sm,
  },
  alerteBtnText: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.primary },
  activeChipsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  activeChipText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: '600' },
  activeChipDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)' },
  activeChipTextDark: { color: colors.white },
  activeChipResetDark: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' },
  activeChipReset: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  activeChipResetText: { fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: '600' },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  stateIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stateTitle: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  stateSub: { fontSize: typography.sizes.md, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  tipsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  tipChip: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  tipText: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.primary },
  // Marge basse : le dernier élément ne passe pas sous le bouton « Publier ».
  listContent: { paddingBottom: 96 },
  resultsQuery: { color: colors.primary, fontWeight: '700' },
  stateQuery: { fontWeight: '600', color: colors.textPrimary },
  publishFab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  publishFabText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
  publishFabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warning,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
