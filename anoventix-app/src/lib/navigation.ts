import { router, type Href } from 'expo-router';

/**
 * Retour arrière sûr : revient à l'écran précédent s'il existe, sinon ouvre
 * `fallback`. Un écran ouvert directement (lien, notification, redirection
 * après connexion) n'a pas d'historique : `router.back()` seul lèverait
 * « The action 'GO_BACK' was not handled by any navigator ».
 */
export function goBackOr(fallback: Href = '/(tabs)/explore') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
