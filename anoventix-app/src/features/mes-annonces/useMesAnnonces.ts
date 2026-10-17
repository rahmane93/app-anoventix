import { useAnnonceStore } from '@/src/stores/annonce.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Logique de l'écran « Mes annonces » : auth, chargement, pull-to-refresh.
 * Extrait pour séparer logique et présentation (revue P0-1/P0-3).
 * Déplacement verbatim — handlers définis avant les `return` anticipés.
 */
export function useMesAnnonces() {
  const { isAuthenticated } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated })));
  const { mesAnnonces, isLoading, isLoadingMoreMesAnnonces, error, loadMesAnnonces, loadMoreMesAnnonces } =
    useAnnonceStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadMesAnnonces();
    }, [isAuthenticated, loadMesAnnonces]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMesAnnonces();
    } finally {
      setRefreshing(false);
    }
  }, [loadMesAnnonces]);

  return {
    isAuthenticated,
    mesAnnonces,
    isLoading,
    isLoadingMore: isLoadingMoreMesAnnonces,
    error,
    loadMesAnnonces,
    loadMore: loadMoreMesAnnonces,
    refreshing,
    onRefresh,
  };
}
