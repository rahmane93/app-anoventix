import { OverlayHost } from '@/src/components/ui/overlay-host';
import { AppDownloadPrompt } from '@/src/components/web/AppDownloadPrompt';
import { WebPageHeader } from '@/src/components/web/WebPageHeader';
import { WebTopBar } from '@/src/components/web/WebTopBar';
import { useLicenceGate } from '@/src/features/licence/useLicenceGate';
import { consumeReturnTo } from '@/src/lib/auth-redirect';
import { useBreakpoint, type ContainerSize } from '@/src/lib/responsive';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, typography } from '@/src/theme';
import {
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    useFonts,
} from '@expo-google-fonts/nunito';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';

// On garde le splash natif (splash-logo.png) affiché jusqu'au chargement
// des polices uniquement : la validation du token (/me) se fait en arrière-plan,
// la page Explorer étant publique.
SplashScreen.preventAutoHideAsync();

// Web : chaque <Ionicons> monté avant que sa police soit déclarée lance son
// propre Font.loadAsync, sans gestion d'erreur. Sur un réseau lent (> 12 s),
// le délai de fontfaceobserver expire et l'app plante sur « 12000ms timeout
// exceeded ». loadAsync injecte le @font-face de façon synchrone : l'appeler
// ici, avant tout rendu, fait voir la police « chargée » à toutes les icônes ;
// le fichier continue de se télécharger et les glyphes s'affichent à l'arrivée.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Font.loadAsync(Ionicons.font).catch(() => {});
}

// Options partagées pour tous les écrans Stack (hors tabs / auth / admin)
const STACK_HEADER = {
  headerShown: true,
  headerBackTitle: 'Retour',
  headerStyle: { backgroundColor: colors.headerBackground },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontFamily: typography.fonts.bold, fontSize: 17, color: colors.textPrimary },
  headerTitleAlign: 'center' as const,
  statusBarBackgroundColor: colors.headerBackground,
  statusBarStyle: 'dark' as const,
};

// Web desktop : les écrans empilés gardent la barre du haut et reçoivent un
// titre de page aligné sur le contenu, avec un lien « Retour ».
// La largeur suit celle du contenu de l'écran (formulaire ou fiche).
const webStackHeader = (size: ContainerSize) => ({
  headerShown: true,
  header: ({ options }: { options: { title?: string } }) => <WebPageHeader title={options.title} back size={size} />,
});

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);
  const segments = useSegments();
  const { isDesktop } = useBreakpoint();
  const stackHeader = (size: ContainerSize = 'form') => (isDesktop ? webStackHeader(size) : STACK_HEADER);
  useLicenceGate();

  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    // En cas d'échec, on affiche l'app avec les polices système plutôt que de
    // rester bloqué sur le splash.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const onChangePasswordScreen = segments[1] === 'change-password';
    if (isAuthenticated && mustChangePassword && !onChangePasswordScreen) {
      router.replace('/(auth)/change-password');
      return;
    }
    if (isAuthenticated && inAuthGroup && !onChangePasswordScreen) {
      // Retour à l'écran qui a exigé la connexion (fiche annonce…) s'il y en a un :
      // dismissTo dépile les écrans d'auth au lieu d'empiler un doublon.
      const returnTo = consumeReturnTo();
      if (returnTo) router.dismissTo(returnTo);
      else router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, mustChangePassword, segments[0], segments[1]]);

  // La barre web est masquée sur les écrans d'authentification (plein écran de marque).
  const showTopBar = isDesktop && segments[0] !== '(auth)';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {showTopBar ? <WebTopBar /> : null}
      {segments[0] !== '(auth)' ? <AppDownloadPrompt /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          statusBarStyle: 'dark',
          statusBarBackgroundColor: colors.headerBackground,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="annonce/[id]"
          options={{ ...stackHeader('detail') }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ ...stackHeader(), title: 'Mes informations' }}
        />

        <Stack.Screen
          name="mes-signalements"
          options={{ ...stackHeader(), title: 'Mes signalements' }}
        />
        <Stack.Screen name="licence" options={{ ...stackHeader(), title: 'Ma licence' }} />
        <Stack.Screen name="entreprise-publique/[entrepriseId]" options={{ ...stackHeader('detail') }} />
        <Stack.Screen name="profil/[userId]" options={{ ...stackHeader() }} />
        <Stack.Screen name="proximite" options={{ headerShown: false }} />
        <Stack.Screen name="conversation/[conversationId]" options={{ ...stackHeader(), title: 'Conversation' }} />
      </Stack>
      <OverlayHost />
      <StatusBar style="dark" />
    </View>
  );
}
