import { Redirect } from 'expo-router';

/**
 * Point d'entrée racine de l'application.
 * Redirige vers la page publique des annonces.
 * Sans ce fichier, Expo Router choisissait (auth) par ordre alphabétique.
 */
export default function RootIndex() {
  return <Redirect href="/(tabs)/explore" />;
}
