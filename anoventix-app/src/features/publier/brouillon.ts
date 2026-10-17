import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Brouillon de l'assistant de publication, rangé par compte (ECART-56) : sur un
 * appareil partagé, l'utilisateur suivant ne retrouve pas l'annonce commencée
 * (titre, prix, position GPS…) par le précédent.
 */
const PREFIXE = 'publier:brouillon';

export const cleBrouillon = (userId: string) => `${PREFIXE}:${userId}`;

/** À la déconnexion : supprime les brouillons de tous les comptes, ancienne clé partagée comprise. */
export async function effacerBrouillons(): Promise<void> {
  try {
    const cles = await AsyncStorage.getAllKeys();
    const brouillons = cles.filter((c) => c === PREFIXE || c.startsWith(`${PREFIXE}:`));
    if (brouillons.length) await AsyncStorage.multiRemove(brouillons);
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}
