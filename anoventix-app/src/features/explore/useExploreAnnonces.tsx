import type { ComponentRef } from 'react';
import { filterAnnonces, getPublicAnnonces } from '@/src/api/annonce.api';
import { parametresSaisie } from '@/src/lib/recherche';
import { useAnnonceStore } from '@/src/stores/annonce.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { useFavorisStore } from '@/src/stores/favoris.store';
import { useMessagerieStore } from '@/src/stores/messagerie.store';
import type { AnnonceFilterParams, BienImmo } from '@/src/types/annonce.types';
import { getErrorMessage } from '@/src/utils/format';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { FavAnnonceCard } from './FavAnnonceCard';
import { countActiveFilters, sanitizeFilters } from './filters';
import { useShallow } from 'zustand/react/shallow';

const PAGE_SIZE = 20;

/**
 * Logique données + état de l'écran Explorer.
 *
 * Deux modes :
 *  - « all »     : flux public des annonces récentes ;
 *  - « results » : recherche texte ET/OU filtres ET/OU tri, combinés en une
 *                  seule requête paginée (/filter?q=…), avec le total réel.
 *
 * La saisie est conservée quand on revient d'une fiche annonce : seul un
 * effacement explicite (croix, « Tout effacer ») la réinitialise.
 */
export function useExploreAnnonces() {
  const { publicListStale, clearPublicListStale } = useAnnonceStore(useShallow((s) => ({ publicListStale: s.publicListStale, clearPublicListStale: s.clearPublicListStale })));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadFavoris = useFavorisStore((s) => s.loadFavoris);
  const { loadConversations } = useMessagerieStore(useShallow((s) => ({ loadConversations: s.loadConversations })));
  const { q: initialQ, criteres: criteresRecus } = useLocalSearchParams<{ q?: string; criteres?: string }>();

  // ── Recherche texte ───────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState(initialQ?.trim() ? initialQ : '');
  /** Texte réellement recherché (après debounce / validation clavier). */
  const [query, setQuery] = useState(initialQ?.trim() ? initialQ : '');
  // Nouveau ?q= reçu (lien vers l'accueil avec recherche) : recopié pendant le rendu.
  const [qRecu, setQRecu] = useState(initialQ);
  if (initialQ !== qRecu) {
    setQRecu(initialQ);
    if (initialQ?.trim()) { setInputValue(initialQ); setQuery(initialQ); }
  }
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Liste par défaut ──────────────────────────────────────────────────────────
  const [allAnnonces, setAllAnnonces] = useState<BienImmo[]>([]);
  const [allPage, setAllPage] = useState(0);
  const [allHasMore, setAllHasMore] = useState(true);
  // Vrai dès le premier rendu : le premier chargement part de l'effet de montage.
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [allHasLoaded, setAllHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Filtres ───────────────────────────────────────────────────────────────────
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<AnnonceFilterParams>({});
  // Ouverture depuis une alerte de recherche : ses critères deviennent les filtres de la liste (RG-04-21).
  const [criteresAppliques, setCriteresAppliques] = useState<string | undefined>(undefined);
  if (criteresRecus && criteresRecus !== criteresAppliques) {
    setCriteresAppliques(criteresRecus);
    try {
      const { q: texte, ...reste } = JSON.parse(criteresRecus) as AnnonceFilterParams;
      setFilters(Object.fromEntries(Object.entries(reste).filter(([, v]) => v != null && v !== '')) as AnnonceFilterParams);
      setInputValue(texte ?? '');
      setQuery(texte ?? '');
    } catch {
      // Paramètre illisible : la liste reste celle par défaut.
    }
  }
  const [filterDraft, setFilterDraft] = useState<AnnonceFilterParams>({});

  // ── Résultats (recherche + filtres) ───────────────────────────────────────────
  const [results, setResults] = useState<BienImmo[]>([]);
  const [resultsPage, setResultsPage] = useState(0);
  const [resultsHasMore, setResultsHasMore] = useState(true);
  const [resultsTotal, setResultsTotal] = useState<number | null>(null);
  const [isResultsLoading, setIsResultsLoading] = useState(!!initialQ?.trim());
  const [isResultsLoadingMore, setIsResultsLoadingMore] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  // Ignore les réponses obsolètes quand l'utilisateur enchaîne les critères.
  const requestIdRef = useRef(0);

  /** Nombre de critères de filtrage (le tri n'en est pas un). */
  const activeFilterCount = countActiveFilters(filters);
  const hasQuery = query.trim().length > 0;
  const mode: 'all' | 'results' =
    hasQuery || activeFilterCount > 0 || !!filters.sort ? 'results' : 'all';

  // ── Loaders ───────────────────────────────────────────────────────────────────
  // Récupération seule : setState uniquement dans les callbacks, appelable
  // depuis un effet. loadAllPage y ajoute l'indicateur de chargement.
  const fetchAllPage = useCallback((pageToLoad: number, replace: boolean) =>
    getPublicAnnonces(pageToLoad, PAGE_SIZE)
      .then((page) => {
        const data = Array.isArray(page.data) ? page.data : [];
        setAllAnnonces((prev) => {
          if (replace) return data;
          const byId = new Map<number, BienImmo>(prev.map((a) => [a.id, a]));
          data.forEach((a) => byId.set(a.id, a));
          return Array.from(byId.values());
        });
        setAllPage(pageToLoad);
        const tp = typeof page.totalPages === 'number' ? page.totalPages : undefined;
        setAllHasMore(tp != null ? pageToLoad < tp - 1 : data.length >= PAGE_SIZE);
      })
      .catch((e) => {
        setAllError(getErrorMessage(e, 'Impossible de charger les annonces.'));
      })
      .finally(() => {
        setIsLoadingAll(false);
        setIsLoadingMore(false);
        if (replace) setAllHasLoaded(true);
      }), []);

  const loadAllPage = useCallback((pageToLoad: number, opts?: { replace?: boolean }) => {
    const replace = !!opts?.replace;
    if (replace) { setIsLoadingAll(true); setAllError(null); } else setIsLoadingMore(true);
    return fetchAllPage(pageToLoad, replace);
  }, [fetchAllPage]);

  // Même découpage que fetchAllPage / loadAllPage.
  const fetchResultsPage = useCallback((
    f: AnnonceFilterParams,
    q: string,
    pageToLoad: number,
  ) => {
    const replace = pageToLoad === 0;
    const requestId = ++requestIdRef.current;
    return filterAnnonces({ ...f, ...parametresSaisie(q), page: pageToLoad, size: PAGE_SIZE })
      .then((page) => {
        if (requestId !== requestIdRef.current) return;
        const data = Array.isArray(page.data) ? page.data : [];
        setResults((prev) => {
          if (replace) return data;
          const byId = new Map<number, BienImmo>(prev.map((a) => [a.id, a]));
          data.forEach((a) => byId.set(a.id, a));
          return Array.from(byId.values());
        });
        setResultsPage(pageToLoad);
        setResultsTotal(typeof page.totalItems === 'number' ? page.totalItems : null);
        const tp = typeof page.totalPages === 'number' ? page.totalPages : undefined;
        setResultsHasMore(tp != null ? pageToLoad < tp - 1 : data.length >= PAGE_SIZE);
      })
      .catch((e) => {
        if (requestId !== requestIdRef.current) return;
        setResultsError(getErrorMessage(e, 'Impossible de charger les résultats.'));
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsResultsLoading(false);
          setIsResultsLoadingMore(false);
        }
      });
  }, []);

  const loadResultsPage = useCallback((
    f: AnnonceFilterParams,
    q: string,
    pageToLoad: number,
  ) => {
    if (pageToLoad === 0) { setIsResultsLoading(true); setResultsError(null); } else setIsResultsLoadingMore(true);
    return fetchResultsPage(f, q, pageToLoad);
  }, [fetchResultsPage]);

  // Critères modifiés : résultats remis à zéro pendant le rendu (le squelette
  // s'affiche aussitôt), puis l'effet lance la requête.
  const criteriaKey = JSON.stringify({ filters, query: query.trim() });
  const [criteresAffiches, setCriteresAffiches] = useState(criteriaKey);
  if (criteriaKey !== criteresAffiches) {
    setCriteresAffiches(criteriaKey);
    setResults([]);
    setResultsTotal(null);
    setResultsError(null);
    setIsResultsLoading(mode === 'results');
  }
  useEffect(() => {
    if (mode !== 'results') {
      requestIdRef.current++; // annule une requête en vol
      return;
    }
    fetchResultsPage(filters, query.trim(), 0);
  }, [criteriaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreResults = useCallback(() => {
    if (isResultsLoadingMore || isResultsLoading || !resultsHasMore) return;
    loadResultsPage(filters, query.trim(), resultsPage + 1);
  }, [isResultsLoadingMore, isResultsLoading, resultsHasMore, loadResultsPage, filters, query, resultsPage]);

  const retryResults = useCallback(() => {
    loadResultsPage(filters, query.trim(), 0);
  }, [loadResultsPage, filters, query]);

  // ── Effets ────────────────────────────────────────────────────────────────────
  useEffect(() => { fetchAllPage(0, true); }, [fetchAllPage]);
  useEffect(() => { if (isAuthenticated) loadFavoris(); }, [isAuthenticated, loadFavoris]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  useFocusEffect(useCallback(() => {
    if (!isLoadingAll && (!allHasLoaded || publicListStale)) {
      if (publicListStale) clearPublicListStale();
      loadAllPage(0, { replace: true });
    }
    if (isAuthenticated) loadConversations();
  }, [allHasLoaded, isLoadingAll, publicListStale, clearPublicListStale, loadAllPage, isAuthenticated, loadConversations]));

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const tasks: Promise<unknown>[] = [
      mode === 'results' ? loadResultsPage(filters, query.trim(), 0) : loadAllPage(0, { replace: true }),
    ];
    if (isAuthenticated) tasks.push(loadConversations());
    await Promise.all(tasks);
    setIsRefreshing(false);
  }, [mode, loadResultsPage, filters, query, loadAllPage, loadConversations, isAuthenticated]);

  // ── Handlers texte ────────────────────────────────────────────────────────────
  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setQuery(''); return; }
    debounceRef.current = setTimeout(() => setQuery(text.trim()), 500);
  }, []);

  const handleClear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue('');
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(inputValue.trim());
    Keyboard.dismiss();
  }, [inputValue]);

  // ── Handlers filtres ──────────────────────────────────────────────────────────
  const handleOpenFilter = useCallback(() => {
    setFilterDraft(filters);
    setFilterVisible(true);
  }, [filters]);

  const handleApplyFilter = useCallback(() => {
    setFilterVisible(false);
    setFilters(sanitizeFilters(filterDraft));
  }, [filterDraft]);

  const handleRemoveFilter = useCallback((keys: (keyof AnnonceFilterParams)[]) => {
    setFilters((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  /** « Tout effacer » : critères ET texte recherché. */
  const handleResetAll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters({});
    setFilterDraft({});
    setInputValue('');
    setQuery('');
  }, []);

  /** Puce rapide Vente / Location / Bail : ne touche pas aux autres critères. */
  const handleQuickTypeFilter = useCallback((type: AnnonceFilterParams['typeAnnonce']) => {
    setFilters((prev) => sanitizeFilters({
      ...prev,
      typeAnnonce: prev.typeAnnonce === type ? undefined : type,
    }));
  }, []);

  /** Onglets Tout / Vente / Location / Bail : fixe le type (undefined = tout). */
  const handleSetType = useCallback((type: AnnonceFilterParams['typeAnnonce'] | undefined) => {
    setFilters((prev) => sanitizeFilters({ ...prev, typeAnnonce: type }));
  }, []);

  /**
   * Sélecteur de zone (communes de Conakry) : remplace la localisation active,
   * quartier compris. `null` = partout.
   */
  const handleSetLieu = useCallback((lieu: Pick<AnnonceFilterParams, 'region' | 'prefecture' | 'commune'> | null) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next.region;
      delete next.prefecture;
      delete next.commune;
      delete next.quartier;
      return lieu ? { ...next, ...lieu } : next;
    });
  }, []);

  // ── Rendu carte ───────────────────────────────────────────────────────────────
  // Carte reliée aux favoris : l'état favori est lu par carte, pas ici,
  // pour qu'un toggle ne re-rende pas toute la liste.
  const renderCard = useCallback(
    (item: BienImmo) => <FavAnnonceCard item={item} returnTo="/(tabs)/explore" />,
    [],
  );

  return {
    // recherche
    inputValue,
    inputRef,
    handleChangeText,
    handleClear,
    handleSubmit,
    query,
    // mode / filtres
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
    handleQuickTypeFilter,
    handleSetType,
    handleSetLieu,
    // liste "all"
    allAnnonces,
    allPage,
    allHasMore,
    isLoadingAll,
    isLoadingMore,
    allError,
    isRefreshing,
    handleRefresh,
    loadAllPage,
    // résultats
    results,
    resultsTotal,
    isResultsLoading,
    isResultsLoadingMore,
    resultsError,
    loadMoreResults,
    retryResults,
    // rendu
    renderCard,
  };
}
