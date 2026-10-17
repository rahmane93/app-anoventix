import type { Localisation } from '../types/annonce.types';

/**
 * Formate un prix en Francs Guinéens (GNF), toujours en montant complet
 * avec séparateurs de milliers. Ex : "1 500 000 000 GNF".
 */
export function formatPrix(prix: number): string {
  return prix.toLocaleString('fr-FR') + ' GNF';
}

/**
 * Prix court pour les cartes : « 4,5 M GNF », « 2,8 Md GNF », « 850 000 GNF ».
 * Deux décimales au plus, sans zéros inutiles. Le montant complet reste
 * affiché sur la fiche et lu par le lecteur d'écran.
 */
export function formatPrixCompact(prix: number): string {
  const unites: [number, string][] = [[1e9, 'Md'], [1e6, 'M']];
  for (const [valeur, suffixe] of unites) {
    if (Math.abs(prix) >= valeur) {
      const q = Math.round((prix / valeur) * 100) / 100;
      return `${q.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${suffixe} GNF`;
    }
  }
  return formatPrix(prix);
}

/**
 * Formate une date ISO en date lisible fr-FR.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate l'affichage d'une localisation : quartier, commune, préfecture.
 */
export function formatFullLocalisation(
  loc?: Partial<Pick<Localisation, 'quartier' | 'commune' | 'prefecture'>> | null,
): string {
  const parts = [loc?.quartier, loc?.commune, loc?.prefecture].filter(Boolean) as string[];
  return parts.join(', ');
}

// ─── Utilitaires numériques (saisie formulaire) ───────────────────────────────

/**
 * Supprime tout caractère non numérique d'une chaîne.
 */
export function sanitizeNumericInput(value: string): string {
  return value.replace(/\D+/g, '');
}

/**
 * Formate un nombre saisi en séparant les milliers par des espaces.
 * Ex : "1200000" → "1 200 000"
 */
export function formatNumericInput(value: string): string {
  const digits = sanitizeNumericInput(value);
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

/**
 * Parse une valeur saisie (potentiellement formatée) en nombre.
 * Retourne `null` si la valeur est vide ou invalide.
 */
export function parseOptionalNumber(value: string): number | null {
  const digits = sanitizeNumericInput(value);
  if (!digits) return null; // vide, espaces, ou aucune chiffre → null (pas 0)
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/**
 * Montant en toutes lettres abrégé, pour relire un prix sans compter les zéros :
 * 250 000 000 → « 250 millions », 1 500 000 000 → « 1,5 milliard ».
 * Retourne `null` sous le million (déjà lisible tel quel).
 */
export function formatMontantAbrege(n: number): string | null {
  const unites: [number, string, string][] = [
    [1e9, 'milliard', 'milliards'],
    [1e6, 'million', 'millions'],
  ];
  for (const [valeur, singulier, pluriel] of unites) {
    if (n >= valeur) {
      const q = Math.round((n / valeur) * 100) / 100;
      return `${q.toLocaleString('fr-FR')} ${q < 2 ? singulier : pluriel}`;
    }
  }
  return null;
}

// ─── Utilitaires d'erreurs API ────────────────────────────────────────────────

/**
 * Extrait un message d'erreur lisible depuis une erreur inconnue.
 * Compatible avec les erreurs normalisées par l'intercepteur Axios
 * (`{ message, status, raw, errors }`) ou n'importe quel autre throw.
 */
export function getErrorMessage(
  err: unknown,
  fallback = "L'opération n'a pas abouti. Vérifiez votre connexion puis réessayez.",
): string {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (e.isNetworkError === true) {
      const msg = e.message;
      return typeof msg === 'string' && msg.trim().length > 0
        ? msg
        : 'Pas de connexion Internet. Vérifiez votre réseau et réessayez.';
    }
    if (e.status === 413 || String(e.message ?? '').includes('413') || String(e.message ?? '').toLowerCase().includes('request entity too large')) {
      return "Une ou plusieurs photos sont trop volumineuses. Essayez de réduire leur taille ou d'en choisir d'autres.";
    }
    if ('message' in e) {
      const msg = e.message;
      if (typeof msg === 'string' && msg.trim().length > 0) {
        // Erreurs réseau brutes (fetch RN / axios sans réponse) → message clair.
        if (/network request failed|network error|failed to fetch/i.test(msg)) {
          return 'Pas de connexion Internet. Vérifiez votre réseau et réessayez.';
        }
        return msg;
      }
    }
  }
  return fallback;
}

/**
 * Détecte les erreurs Hibernate de lazy-loading renvoyées par le backend.
 * Dans ce cas, l'action a peut-être réussi mais la réponse est corrompue.
 */
export function isHibernateLazyError(err: unknown): boolean {
  const msg = getErrorMessage(err, '').toLowerCase();
  return (
    msg.includes('failed to lazily initialize') ||
    msg.includes('could not initialize proxy') ||
    (msg.includes('lazy') && msg.includes('no session'))
  );
}

/**
 * Retourne un message d'erreur adapté pour les opérations sur les médias,
 * en détectant les erreurs Hibernate de lazy-loading.
 */
export function humanizeMediaError(err: unknown, fallback: string): string {
  if (isHibernateLazyError(err)) {
    return "Erreur serveur lors du chargement des médias. L'action a peut-être été appliquée. Rafraîchissez l'annonce ou réessayez.";
  }
  const status = (err as any)?.status;
  if (status === 413) {
    return "Une ou plusieurs photos sont trop volumineuses. Essayez de réduire leur taille ou d'en choisir d'autres.";
  }
  return getErrorMessage(err, fallback);
}

