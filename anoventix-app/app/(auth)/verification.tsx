import AppText from '@/src/components/AppText';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { IconButton } from '@/src/components/ui/icon-button';
import { Input } from '@/src/components/ui/input';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

/** Délai avant de pouvoir redemander un code (l'API limite à 3 renvois par 15 minutes). */
const DELAI_RENVOI_SECONDES = 30;

/**
 * Double authentification des modérateurs et administrateurs : le mot de passe a été accepté, un code
 * est parti par email. Un code de secours (XXXX-XXXX) est accepté à sa place si l'email est indisponible.
 */
export default function VerificationScreen() {
  const { verification, codesSecoursARemettre, verifierCode, renvoyerCode, annulerVerification } = useAuthStore(
    useShallow((s) => ({
      verification: s.verification,
      codesSecoursARemettre: s.codesSecoursARemettre,
      verifierCode: s.verifierCode,
      renvoyerCode: s.renvoyerCode,
      annulerVerification: s.annulerVerification,
    })),
  );
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [secondesAvantRenvoi, setSecondesAvantRenvoi] = useState(DELAI_RENVOI_SECONDES);

  // Pas de vérification en cours (écran rouvert, app relancée) : retour à la connexion.
  useEffect(() => {
    if (!verification && !codesSecoursARemettre) router.replace('/(auth)/login');
  }, [verification, codesSecoursARemettre]);

  // Première connexion : les codes de secours sont montrés avant d'entrer dans l'app.
  useEffect(() => {
    if (codesSecoursARemettre) router.replace('/(auth)/codes-secours');
  }, [codesSecoursARemettre]);

  useEffect(() => {
    if (secondesAvantRenvoi <= 0) return;
    const t = setTimeout(() => setSecondesAvantRenvoi((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondesAvantRenvoi]);

  const retourConnexion = () => {
    annulerVerification();
    router.replace('/(auth)/login');
  };

  const valider = async () => {
    if (!code.trim()) {
      setErreur('Saisissez le code reçu par email.');
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      // Succès : la session s'ouvre et le layout racine quitte l'écran d'authentification.
      await verifierCode(code);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? 'Vérification impossible. Réessayez.';
      setErreur(message);
      // Code épuisé ou expiré : un nouveau mot de passe est nécessaire.
      if (/reconnectez-vous/i.test(message)) setCode('');
    } finally {
      setEnCours(false);
    }
  };

  const renvoyer = async () => {
    setErreur(null);
    setInfo(null);
    try {
      await renvoyerCode();
      setCode('');
      setSecondesAvantRenvoi(DELAI_RENVOI_SECONDES);
      setInfo('Un nouveau code vient d’être envoyé. Le précédent n’est plus valable.');
    } catch (err: unknown) {
      setErreur((err as { message?: string })?.message ?? 'Impossible de renvoyer le code. Réessayez plus tard.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.navbar}>
          <IconButton icon="arrow-back" onPress={retourConnexion} accessibilityLabel="Retour à la connexion" />
        </View>

        <ScrollView style={s.flex} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
            </View>
            <AppText style={s.title}>Vérification en deux étapes</AppText>
            <AppText style={s.subtitle}>
              {verification?.message ?? 'Un code de vérification vous a été envoyé par email.'} Il est valable{' '}
              {Math.round((verification?.expireDansSecondes ?? 600) / 60)} minutes.
            </AppText>
          </View>

          <View style={s.form}>
            {erreur ? <AlertBanner message={erreur} variant="error" /> : null}
            {info ? <AlertBanner message={info} variant="info" /> : null}

            <Input
              label="Code de vérification"
              placeholder="123456"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={20}
              onSubmitEditing={valider}
              accessibilityLabel="Code de vérification"
            />
            <AppText style={s.aide}>
              Pas d’accès à votre email ? Saisissez un de vos codes de secours (format ABCD-EFGH).
            </AppText>

            <Button title="Vérifier" onPress={valider} isLoading={enCours} />
          </View>

          <View style={s.footer}>
            <TouchableOpacity onPress={renvoyer} disabled={secondesAvantRenvoi > 0} accessibilityRole="button">
              <AppText style={[s.footerLink, secondesAvantRenvoi > 0 && s.footerLinkInactif]}>
                {secondesAvantRenvoi > 0 ? `Renvoyer le code (${secondesAvantRenvoi} s)` : 'Renvoyer le code'}
              </AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  navbar: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.base, paddingBottom: spacing['3xl'], justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing['2xl'], paddingHorizontal: spacing.sm, gap: spacing.md },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '20',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: { fontSize: typography.sizes.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  form: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  aide: { fontSize: typography.sizes.sm, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerLink: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: '700' },
  footerLinkInactif: { color: colors.textMuted, fontWeight: '500' },
});
