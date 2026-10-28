import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { ANDROID_APK_URL } from '@/src/constants/download';
import { useBreakpoint } from '@/src/lib/responsive';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

// ─── Popup « Installer l'application » (web mobile Android) ───────────────────
// Incite les visiteurs sur navigateur Android à passer à l'APK. Absent sur
// desktop (lien dans la barre du haut) et sur iOS (l'APK n'y est pas installable).
// Après fermeture ou téléchargement, pas de nouvelle proposition avant 7 jours.

const DISMISS_KEY = 'anoventix.appPrompt.lastShown';
const RELANCE_MS = 7 * 24 * 60 * 60 * 1000;
/** Laisse la page s'afficher avant de proposer l'application. */
const DELAI_MS = 2000;

function isAndroidBrowser() {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

function recemmentPropose() {
  try {
    const last = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(last) && Date.now() - last < RELANCE_MS;
  } catch {
    return false;
  }
}

function memoriser() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // stockage indisponible : le popup reviendra à la prochaine visite
  }
}

export function AppDownloadPrompt() {
  const { isWeb, isDesktop } = useBreakpoint();
  // Décidé après montage : le web est pré-rendu en statique (output: static),
  // navigator/localStorage n'existent pas au rendu serveur.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isWeb || isDesktop || !isAndroidBrowser() || recemmentPropose()) return;
    const t = setTimeout(() => setVisible(true), DELAI_MS);
    return () => clearTimeout(t);
  }, [isWeb, isDesktop]);

  const fermer = () => {
    memoriser();
    setVisible(false);
  };

  const telecharger = () => {
    memoriser();
    setVisible(false);
    Linking.openURL(ANDROID_APK_URL);
  };

  return (
    <Dialog visible={visible} onRequestClose={fermer} dimColor="rgba(10,25,50,0.55)">
      <View style={s.card} accessibilityRole="alert" accessibilityLabel="Installer l'application Anoventix">
        <Pressable onPress={fermer} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer" style={s.close}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>

        <Image source={require('@/assets/images/icon.png')} style={s.icon} contentFit="cover" />
        <AppText style={s.title}>Anoventix sur votre téléphone</AppText>
        <AppText style={s.text}>
          Installez l'application Android pour chercher un bien, contacter les annonceurs et retrouver vos favoris en un geste.
        </AppText>

        <Button
          title="Télécharger l'application"
          onPress={telecharger}
          leftIcon={<Ionicons name="logo-android" size={18} color={colors.white} />}
          style={s.cta}
        />
        <Button title="Continuer sur le site" variant="ghost" onPress={fermer} />

        <AppText style={s.note}>
          Si Android bloque l'installation, autorisez votre navigateur à installer des applications, puis ouvrez le fichier téléchargé.
        </AppText>
      </View>
    </Dialog>
  );
}

const s = StyleSheet.create({
  card: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  close: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 4 },
  icon: { width: 72, height: 72, borderRadius: radius.lg, marginBottom: spacing.xs },
  title: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  text: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cta: { alignSelf: 'stretch' },
  note: {
    fontSize: typography.sizes.xs,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
