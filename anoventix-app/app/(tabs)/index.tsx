import { Redirect } from 'expo-router';

/**
 * L'onglet par défaut redirige vers la page publique des annonces.
 * La configuration des tabs dans _layout.tsx masque cet onglet (href: null).
 */
export default function IndexRedirect() {
  return <Redirect href="/(tabs)/explore" />;
}
