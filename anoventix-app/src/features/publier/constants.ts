import type {
    DocumentsDisponibles,
    TypeAnnonce,
    TypeBien,
    TypeUsage,
} from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

// ─── Types erreurs ────────────────────────────────────────────────────────────

export type FieldErrors = Record<string, string>;

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// Photos d'abord : c'est ce qui fait vendre, et l'étape la plus longue sur
// un réseau lent. L'aperçu final montre la carte telle qu'elle sera publiée.
export const STEP = { PHOTOS: 0, TYPE: 1, LOCALISATION: 2, DETAILS: 3, APERCU: 4 } as const;
export const STEPS = ['Photos', 'Type', 'Lieu', 'Détails', 'Aperçu'];
export const STEP_ICONS: React.ComponentProps<typeof Ionicons>['name'][] = [
  'camera-outline',
  'home-outline',
  'location-outline',
  'document-text-outline',
  'eye-outline',
];

// Étape où se trouve chaque champ : sert à y ramener l'utilisateur en cas d'erreur.
export const FIELD_STEP: Record<string, number> = {
  medias: STEP.PHOTOS,
  typeAnnonce: STEP.TYPE,
  typeBien: STEP.TYPE,
  typeUsage: STEP.TYPE,
  region: STEP.LOCALISATION,
  prefecture: STEP.LOCALISATION,
  commune: STEP.LOCALISATION,
  quartier: STEP.LOCALISATION,
  localisationId: STEP.LOCALISATION,
  quartierSaisi: STEP.LOCALISATION,
  complementAdresse: STEP.LOCALISATION,
  titre: STEP.DETAILS,
  description: STEP.DETAILS,
  prix: STEP.DETAILS,
  fraisHonoraire: STEP.DETAILS,
  cautionMois: STEP.DETAILS,
  avanceMois: STEP.DETAILS,
  surfaceTotal: STEP.DETAILS,
  nbPieces: STEP.DETAILS,
  nbChambres: STEP.DETAILS,
  nbSallesBain: STEP.DETAILS,
  documentsDisponibles: STEP.DETAILS,
};

export const TYPE_ANNONCES: TypeAnnonce[] = ['VENTE', 'LOCATION', 'BAIL'];
export const TYPE_ANNONCE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  VENTE:    'cash-outline',
  LOCATION: 'key-outline',
  BAIL:     'document-outline',
};

export const TYPE_BIENS: TypeBien[] = ['TERRAIN', 'MAISON', 'VILLA', 'APPARTEMENT', 'MAGASIN', 'BUREAU', 'DOMAINE', 'ENTREPOT', 'AUTRE'];
export const TYPE_BIEN_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  APPARTEMENT: 'business-outline',
  MAISON:      'home-outline',
  VILLA:       'home',
  TERRAIN:     'map-outline',
  DOMAINE:     'leaf-outline',
  MAGASIN:     'storefront-outline',
  BUREAU:      'briefcase-outline',
  ENTREPOT:    'cube-outline',
  AUTRE:       'ellipsis-horizontal',
};
export const TYPE_USAGES: TypeUsage[] = ['HABITATION', 'COMMERCIAL', 'AGRICOLE', 'LOISIR', 'PROFESSIONNEL', 'AUTRE'];
export const DOCUMENTS: DocumentsDisponibles[] = ['TITRE_FONCIER', 'DONATION', 'ACTE_DE_VENTE', 'CERTIFICAT_USAGE_FONCIER', 'AUTRE'];

// ─── Dépendances typeAnnonce → TypeBien autorisés ────────────────────────────────
// Source : docs/specifications/00-SFG-vue-ensemble.md §7.2
export const ANNONCE_BIENS_MAP: Record<TypeAnnonce, TypeBien[]> = {
  VENTE:    ['APPARTEMENT', 'MAISON', 'VILLA', 'TERRAIN', 'DOMAINE', 'MAGASIN', 'BUREAU', 'ENTREPOT', 'AUTRE'],
  LOCATION: ['APPARTEMENT', 'MAISON', 'VILLA', 'TERRAIN', 'MAGASIN', 'BUREAU', 'ENTREPOT', 'AUTRE'],
  BAIL:     ['MAGASIN', 'BUREAU', 'ENTREPOT'],
};

// ─── Dépendances TypeBien → TypeUsage autorisés ─────────────────────────────────
export const BIEN_USAGES_MAP: Record<TypeBien, TypeUsage[]> = {
  APPARTEMENT: ['HABITATION'],
  MAISON:      ['HABITATION'],
  VILLA:       ['HABITATION', 'LOISIR'],
  TERRAIN:     ['HABITATION', 'COMMERCIAL', 'LOISIR', 'PROFESSIONNEL', 'AUTRE'],
  DOMAINE:     ['AGRICOLE', 'LOISIR', 'PROFESSIONNEL', 'AUTRE'],
  MAGASIN:     ['COMMERCIAL'],
  BUREAU:      ['PROFESSIONNEL'],
  ENTREPOT:    ['COMMERCIAL', 'PROFESSIONNEL'],
  AUTRE:       ['AGRICOLE', 'HABITATION', 'COMMERCIAL', 'LOISIR', 'PROFESSIONNEL', 'AUTRE'],
};

export const TYPE_USAGE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  HABITATION:      'home-outline',
  COMMERCIAL:      'storefront-outline',
  AGRICOLE:        'leaf-outline',
  LOISIR:          'football-outline',
  PROFESSIONNEL:   'briefcase-outline',
  AUTRE:           'ellipsis-horizontal',
};

export const DOCUMENTS_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  TITRE_FONCIER:            'ribbon-outline',
  DONATION:                 'gift-outline',
  ACTE_DE_VENTE:            'receipt-outline',
  CERTIFICAT_USAGE_FONCIER: 'shield-checkmark-outline',
  AUTRE:                    'document-outline',
};
