import { router, type Href } from 'expo-router';

// ─── Connexion requise → retour au contexte ──────────────────────────────────
// Quand une action exige un compte (favori, message, signalement…), on mémorise
// l'écran d'origine puis on ouvre la connexion avec un message explicatif.
// Après authentification, le layout racine consomme cette destination au lieu
// d'envoyer systématiquement sur l'accueil.

let pendingReturnTo: Href | null = null;

export type LoginReason = 'favori' | 'message' | 'signaler' | 'publier' | 'messagerie' | 'profil' | 'alerte';

export const LOGIN_REASON_MESSAGES: Record<LoginReason, string> = {
  favori: 'Connectez-vous pour enregistrer cette annonce dans vos favoris.',
  message: "Connectez-vous pour écrire à l'annonceur.",
  signaler: 'Connectez-vous pour signaler cette annonce.',
  publier: 'Connectez-vous pour publier une annonce.',
  messagerie: 'Connectez-vous pour accéder à vos conversations.',
  profil: 'Connectez-vous pour accéder à votre profil.',
  alerte: 'Connectez-vous pour créer une alerte de recherche.',
};

/** Ouvre l'écran de connexion en mémorisant l'écran à rouvrir ensuite. */
export function requireLogin(reason: LoginReason, returnTo?: Href) {
  pendingReturnTo = returnTo ?? null;
  router.push({ pathname: '/(auth)/login', params: { raison: reason } });
}

/** Destination post-connexion (consommée une seule fois). */
export function consumeReturnTo(): Href | null {
  const r = pendingReturnTo;
  pendingReturnTo = null;
  return r;
}

export function clearReturnTo() {
  pendingReturnTo = null;
}
