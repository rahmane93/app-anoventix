import { Image } from 'expo-image';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useBreakpoint } from '@/src/lib/responsive';
import { LOGIN_REASON_MESSAGES, clearReturnTo, type LoginReason } from '@/src/lib/auth-redirect';
import { SigninFormData, signinSchema } from '@/src/lib/validation';
import { useAuthStore } from '@/src/stores/auth.store';
import { estVerificationRequise } from '@/src/types/auth.types';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import BrandText from '@/src/components/BrandText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/src/components/ui/icon-button';
import { useShallow } from 'zustand/react/shallow';

export default function LoginScreen() {
  const { signin, reactivate, resendActivation } = useAuthStore(useShallow((s) => ({ signin: s.signin, reactivate: s.reactivate, resendActivation: s.resendActivation })));
  const { isWide } = useBreakpoint();
  const { raison } = useLocalSearchParams<{ raison?: LoginReason }>();
  const reasonMessage = raison ? LOGIN_REASON_MESSAGES[raison] : undefined;
  const [apiError, setApiError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Action proposée selon la réponse du serveur : renvoi du lien d'activation, ou
  // réactivation d'un compte dont la suppression est encore réversible.
  const [actionCompte, setActionCompte] = useState<'renvoi' | 'reactivation' | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onRenvoyerLien = async () => {
    const identifier = getValues('identifier').trim();
    if (!identifier.includes('@')) {
      setApiError('Saisissez votre adresse email pour recevoir un nouveau lien.');
      return;
    }
    setIsActionLoading(true);
    setApiError(null);
    try {
      setInfoMessage(await resendActivation(identifier));
      setActionCompte(null);
    } catch (err: unknown) {
      setApiError((err as { message?: string })?.message ?? 'Impossible de renvoyer le lien. Réessayez.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const onReactiverCompte = async () => {
    setIsActionLoading(true);
    setApiError(null);
    try {
      // Session ouverte directement : la navigation suit comme après un signin.
      await reactivate(getValues());
    } catch (err: unknown) {
      setApiError((err as { message?: string })?.message ?? 'Impossible de réactiver le compte. Réessayez.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const onSubmit = async (data: SigninFormData) => {
    setApiError(null);
    setInfoMessage(null);
    setActionCompte(null);
    setIsLoading(true);
    try {
      // La navigation post-connexion (retour à l'écran d'origine ou accueil)
      // est gérée par le layout racine dès que la session est active.
      const resultat = await signin(data);
      // Modérateur ou administrateur : pas de session avant le code reçu par email.
      if (estVerificationRequise(resultat)) router.push('/(auth)/verification');
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number };
      if (error?.status === 403) {
        // Le backend renvoie un message distinct selon le statut (non activé /
        // en cours de suppression / suspendu / désactivé). « Non activé » et « en cours
        // de suppression » sont informatifs et proposent une action ; les autres sont
        // des erreurs. (Attention : « désactivé » contient aussi « activ ».)
        const backendMsg = error?.message?.trim();
        if (backendMsg && /en cours de suppression/i.test(backendMsg)) {
          setInfoMessage(backendMsg);
          setActionCompte('reactivation');
        } else if (backendMsg && /n'est pas activ/i.test(backendMsg)) {
          setInfoMessage(backendMsg);
          setActionCompte('renvoi');
        } else if (backendMsg) {
          setApiError(backendMsg);
        } else {
          setInfoMessage(
            'Votre compte n\'est pas encore activé.\n' +
            'Vérifiez votre boîte mail et cliquez sur le lien d\'activation reçu lors de votre inscription.',
          );
        }
      } else if (error?.status === 401) {
        setApiError('Email/téléphone ou mot de passe incorrect.');
      } else {
        setApiError(error?.message ?? 'Impossible de se connecter. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Fermer : revient à l'écran précédent sans se connecter */}
          <IconButton
            icon="close" style={s.closeBtn}
            onPress={() => {
              clearReturnTo();
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/explore');
            }}
            accessibilityLabel="Fermer"
          />

          {/* Logo + branding */}
          <View style={s.header}>
            <Image
              source={require('@/assets/images/splash-logo.png')}
              style={s.logo}
            />
            <BrandText size={30} />
            {/* Le panneau de marque (web large) porte déjà cette accroche. */}
            {!isWide ? <AppText style={s.tagline}>L’immobilier en Guinée, quartier par quartier</AppText> : null}
          </View>

          {/* Formulaire */}
          <View style={s.form}>
            {reasonMessage && !infoMessage && !apiError && (
              <AlertBanner message={reasonMessage} variant="info" />
            )}
            {infoMessage && <AlertBanner message={infoMessage} variant="info" />}
            {apiError && <AlertBanner message={apiError} variant="error" />}
            {actionCompte && (
              <Button
                title={actionCompte === 'renvoi' ? 'Renvoyer le lien d\'activation' : 'Réactiver mon compte'}
                variant="secondary"
                onPress={actionCompte === 'renvoi' ? onRenvoyerLien : onReactiverCompte}
                isLoading={isActionLoading}
              />
            )}

            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email ou téléphone"
                  placeholder="nom@exemple.com ou +224 6XX XX XX XX"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.identifier?.message}
                  // « + » en premier caractère : c'est un numéro, clavier téléphone.
                  // (Sur le clavier email, les chiffres sont peu accessibles.)
                  keyboardType={value.startsWith('+') ? 'phone-pad' : 'email-address'}
                  autoComplete="username"
                  textContentType="username"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mot de passe"
                  placeholder="Votre mot de passe"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                  isPassword
                  autoComplete="password"
                />
              )}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={s.forgotBtn}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              accessibilityRole="link"
            >
              <AppText style={s.forgotText}>Mot de passe oublié ?</AppText>
            </TouchableOpacity>

            <Button title="Se connecter" onPress={() => handleSubmit(onSubmit)()} isLoading={isLoading} />
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <View style={s.footerRow}>
              <AppText style={s.footerText}>Pas encore de compte ? </AppText>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                accessibilityRole="link"
              >
                <AppText style={s.footerLink}>S'inscrire</AppText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => { clearReturnTo(); router.replace('/(tabs)/explore'); }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="link"
            >
              <AppText style={s.browseLink}>Parcourir sans connexion</AppText>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },

  closeBtn: { position: 'absolute', top: spacing.sm, right: spacing.base, zIndex: 1 },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  tagline: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  // Form
  form: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  forgotText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: '500',
  },

  // Footer
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: '700',
  },
  browseLink: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
