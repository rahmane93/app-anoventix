import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ANNONCE_BIENS_MAP } from '@/src/features/publier/constants';
import { champsComposition } from '@/src/lib/bien';
import type { AnnonceFilterParams } from '@/src/types/annonce.types';

export const EMPTY_FILTERS: AnnonceFilterParams = {};

/**
 * Nombre de critères de filtrage actifs (badge du bouton Filtres).
 * Le tri n'est pas un filtre : il ne réduit pas les résultats.
 */
export function countActiveFilters(f: AnnonceFilterParams): number {
  return ([
    f.typeAnnonce,
    f.typeBien,
    f.typeUsage,
    f.prixMin != null || f.prixMax != null ? true : null,
    f.surfaceMin != null || f.surfaceMax != null ? true : null,
    f.nbChambresMin != null ? true : null,
    f.nbPiecesMin != null ? true : null,
    f.region,
    f.prefecture,
    f.commune,
    f.quartier,
  ] as unknown[]).filter(Boolean).length;
}

/**
 * Retire les critères incohérents entre eux :
 *  - type de bien impossible pour la transaction (ex. terrain en bail) ;
 *  - chambres / pièces sur un terrain ou un domaine (vendu ou loué en l'état) ;
 *  - bornes min / max inversées.
 */
export function sanitizeFilters(f: AnnonceFilterParams): AnnonceFilterParams {
  const next = { ...f };
  if (next.typeAnnonce && next.typeBien && !ANNONCE_BIENS_MAP[next.typeAnnonce].includes(next.typeBien)) {
    delete next.typeBien;
  }
  if (next.typeBien) {
    const champs = champsComposition(next.typeBien);
    if (!champs.includes('nbChambres')) delete next.nbChambresMin;
    if (!champs.includes('nbPieces')) delete next.nbPiecesMin;
  }
  if (next.prixMin != null && next.prixMax != null && next.prixMin > next.prixMax) {
    [next.prixMin, next.prixMax] = [next.prixMax, next.prixMin];
  }
  if (next.surfaceMin != null && next.surfaceMax != null && next.surfaceMin > next.surfaceMax) {
    [next.surfaceMin, next.surfaceMax] = [next.surfaceMax, next.surfaceMin];
  }
  return next;
}

export const TYPE_ANNONCE_CHIPS: AnnonceFilterParams['typeAnnonce'][] = [
  'VENTE',
  'LOCATION',
  'BAIL',
] as const;

export const TYPE_ANNONCE_CHIP_ICONS: Record<
  string,
  React.ComponentProps<typeof Ionicons>['name']
> = {
  VENTE: 'pricetag-outline',
  LOCATION: 'key-outline',
  BAIL: 'document-text-outline',
};

export const TYPE_BIEN_CHIPS: AnnonceFilterParams['typeBien'][] = [
  'APPARTEMENT',
  'MAISON',
  'VILLA',
  'TERRAIN',
  'DOMAINE',
  'MAGASIN',
  'BUREAU',
  'ENTREPOT',
  'AUTRE',
] as const;

/** Chambres minimum proposées dans les filtres (« 3+ » = au moins 3). */
export const CHAMBRES_MIN_OPTIONS = [1, 2, 3, 4, 5] as const;

export const SORT_OPTIONS = [
  { label: 'Plus récent', sort: 'dateCreation', direction: 'desc' as const },
  { label: 'Prix croissant', sort: 'prix', direction: 'asc' as const },
  { label: 'Prix décroissant', sort: 'prix', direction: 'desc' as const },
];

export function sortLabel(sort?: string, direction?: 'asc' | 'desc'): string {
  return SORT_OPTIONS.find((o) => o.sort === sort && o.direction === direction)?.label ?? 'Plus récent';
}
