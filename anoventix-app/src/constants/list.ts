/**
 * Props de performance par défaut pour les FlatList sur listes longues.
 * À spreader sur la FlatList : `<FlatList {...LIST_PERF_PROPS} ... />`.
 *
 * - `removeClippedSubviews` : déchargement des vues hors écran (gros gain Android).
 * - `initialNumToRender` : nombre d'items rendus au premier paint.
 * - `maxToRenderPerBatch` / `windowSize` : limitent le travail par frame.
 *
 * `as const` préserve l'inférence des littéraux sans imposer un type générique
 * (qui ferait fuiter `unknown` sur le type d'item de la FlatList cible).
 */
export const LIST_PERF_PROPS = {
  removeClippedSubviews: true,
  initialNumToRender: 8,
  maxToRenderPerBatch: 10,
  windowSize: 7,
} as const;
