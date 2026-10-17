import { annonceHref } from '@/src/lib/annonce-url';
import { requireLogin } from '@/src/lib/auth-redirect';
import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { useFavorisStore } from '@/src/stores/favoris.store';
import type { BienImmo } from '@/src/types/annonce.types';
import type { Href } from 'expo-router';
import { router } from 'expo-router';
import React from 'react';
import { AnnonceCard } from './AnnonceCard';

/**
 * Carte d'annonce reliée aux favoris : chaque carte s'abonne à SON état
 * (favori / en cours), si bien qu'un toggle ne re-rend que la carte concernée
 * au lieu de toute la liste.
 */
export const FavAnnonceCard = React.memo(function FavAnnonceCard({
  item,
  returnTo,
}: {
  item: BienImmo;
  /** Écran de retour après connexion (tap sur le cœur en invité). */
  returnTo: Href;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const isStaff = useAuthStore((s) => getRoleFlags(s.user?.roles).isStaff);
  const isFav = useFavorisStore((s) => s.favorisIds.includes(item.id));
  const isFavBusy = useFavorisStore((s) => s.togglingIds.has(item.id));
  const toggleFavori = useFavorisStore((s) => s.toggleFavori);

  const isOwner = isAuthenticated && !!userId && item.annonceur?.id === userId;

  return (
    <AnnonceCard
      item={item}
      isFav={isFav}
      isFavBusy={isFavBusy}
      isOwner={isOwner}
      onPress={() => router.push(annonceHref(item))}
      onToggleFav={isStaff ? undefined : () => {
        if (!isAuthenticated) { requireLogin('favori', returnTo); return; }
        if (isOwner) return;
        toggleFavori(item.id);
      }}
    />
  );
});
