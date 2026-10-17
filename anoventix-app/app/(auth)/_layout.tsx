import AppText from '@/src/components/AppText';
import { useBreakpoint } from '@/src/lib/responsive';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

// Web desktop : écran scindé — panneau de marque à gauche, formulaire dans une
// colonne étroite à droite. Les six écrans d'authentification en héritent sans
// changement ; sur mobile (et natif) seul le Stack est rendu.

const POINTS: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'location-outline', text: 'Des annonces à Conakry et dans tout le pays.' },
  { icon: 'chatbubbles-outline', text: 'Échangez directement avec les annonceurs, par message ou WhatsApp.' },
  { icon: 'add-circle-outline', text: 'Publiez votre bien à vendre, à louer ou en bail en quelques minutes.' },
];

function BrandPanel() {
  return (
    <View style={s.panel}>
      <Pressable onPress={() => router.replace('/(tabs)/explore')} accessibilityRole="link" accessibilityLabel="Retour à l'accueil">
        <AppText style={s.logo}>
          Anovent<AppText style={s.logoAccent}>iX</AppText>
        </AppText>
      </Pressable>

      <View style={s.panelBody}>
        <AppText style={s.headline}>L’immobilier en Guinée, quartier par quartier</AppText>
        <View style={s.points}>
          {POINTS.map((p) => (
            <View key={p.icon} style={s.point}>
              <View style={s.pointIcon}>
                <Ionicons name={p.icon} size={18} color={colors.accentLight} />
              </View>
              <AppText style={s.pointText}>{p.text}</AppText>
            </View>
          ))}
        </View>
      </View>

      <AppText style={s.footer}>© {new Date().getFullYear()} Anoventix</AppText>
    </View>
  );
}

export default function AuthLayout() {
  const { isDesktop, isWide } = useBreakpoint();

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        statusBarStyle: 'dark',
        statusBarBackgroundColor: colors.background,
        animation: isDesktop ? 'fade' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Connexion' }} />
      <Stack.Screen name="register" options={{ title: 'Créer un compte' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Mot de passe oublié' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Nouveau mot de passe' }} />
      <Stack.Screen name="change-password" options={{ title: 'Changer le mot de passe' }} />
      <Stack.Screen name="activate" options={{ title: 'Activation du compte' }} />
    </Stack>
  );

  if (!isDesktop) return stack;

  return (
    <View style={s.split}>
      {isWide ? <BrandPanel /> : null}
      <View style={s.formSide}>
        <View style={s.formColumn}>{stack}</View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  panel: {
    width: '44%',
    maxWidth: 640,
    paddingHorizontal: spacing['4xl'],
    paddingVertical: spacing['3xl'],
    justifyContent: 'space-between',
    backgroundColor: colors.primaryDark,
  },
  logo: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.white },
  logoAccent: { color: colors.accent, fontWeight: '800' },
  panelBody: { gap: spacing.xl, maxWidth: 480 },
  headline: { fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1, color: colors.white },
  points: { gap: spacing.base, marginTop: spacing.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pointText: { flex: 1, fontSize: typography.sizes.md, lineHeight: 23, color: 'rgba(255,255,255,0.85)' },
  footer: { fontSize: typography.sizes.xs, color: 'rgba(255,255,255,0.5)' },
  formSide: { flex: 1, alignItems: 'center' },
  formColumn: { flex: 1, width: '100%', maxWidth: 480 },
});
