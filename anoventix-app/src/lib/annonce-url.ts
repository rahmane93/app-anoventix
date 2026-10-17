/**
 * URLs des fiches annonce : /annonce/<slug>-<publicId>.
 *
 * Le publicId (12 caractères aléatoires) remplace l'id numérique, qui se devinait
 * (/annonce/30 → /annonce/31). Le slug n'est là que pour la lisibilité et le SEO :
 * seule la partie après le dernier tiret sert à retrouver l'annonce. Les anciens liens
 * numériques restent acceptés (écrans qui ne connaissent que l'annonceId, liens déjà partagés).
 */

const WEB_URL = 'https://www.anoventix.com';

type AnnonceRef = { id: number; publicId?: string; slug?: string };

export type AnnonceParam =
  | { kind: 'id'; id: number }
  | { kind: 'publicId'; publicId: string };

export const annonceHref = (annonce: AnnonceRef): `/annonce/${string}` =>
  annonce.publicId
    ? `/annonce/${annonce.slug || 'annonce'}-${annonce.publicId}`
    : `/annonce/${annonce.id}`;

/** Lien absolu à partager : le serveur y ajoute l'aperçu (photo, titre, prix) pour les réseaux sociaux. */
export const annonceShareUrl = (annonce: AnnonceRef): string => WEB_URL + annonceHref(annonce);

export const parseAnnonceParam = (param: string): AnnonceParam =>
  /^\d+$/.test(param)
    ? { kind: 'id', id: Number(param) }
    : { kind: 'publicId', publicId: param.slice(param.lastIndexOf('-') + 1) };
