import type { AnnonceFilterParams } from '../types/annonce.types';

/**
 * Référence d'annonce, telle qu'affichée à l'annonceur et reprise dans le message
 * WhatsApp prérempli : VE-260317-K7QM (format actuel, avec l'année) ou VE-0317-K7QM
 * (annonces plus anciennes). Insensible à la casse et aux espaces autour.
 */
const REFERENCE = /^(VE|LO|BA)-(\d{4}|\d{6})-[A-Z0-9]{4}$/i;

/**
 * Paramètres de recherche pour une saisie libre : une référence part dans
 * le filtre `reference` (recherche exacte), tout le reste dans la recherche plein texte.
 */
export function parametresSaisie(saisie: string): Pick<AnnonceFilterParams, 'q' | 'reference'> {
  const texte = saisie.trim();
  if (REFERENCE.test(texte)) return { reference: texte.toUpperCase() };
  return { q: texte };
}
