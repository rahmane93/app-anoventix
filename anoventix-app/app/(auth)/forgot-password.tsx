import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ForgotPasswordFormData, forgotPasswordSchema } from '@/src/lib/validation';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/src/components/ui/icon-button';
import { useShallow } from 'zustand/react/shallow';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuthStore(useShallow((s) => ({ forgotPassword: s.forgotPassword })));
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setApiError(null);
    setIsLoading(true);
    try {
      await forgotPassword({ email: data.email });
      router.push({ pathname: '/(auth)/reset-password', params: { email: data.email } });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setApiError(error?.message ?? 'Impossible d\'envoyer l\'email. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Navbar fixe en haut */}
        <View style={s.navbar}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}
            accessibilityLabel="Retour"
          />
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icône + titre */}
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Ionicons name="lock-closed-outline" size={30} color={colors.primary} />
            </View>
            <AppText style={s.title}>Mot de passe oublié ?</AppText>
            <AppText style={s.subtitle}>
              Entrez votre adresse email : nous vous enverrons un code de vérification, valable 15 minutes.
            </AppText>
          </View>

          {/* Formulaire */}
          <View style={s.form}>
            {apiError && <AlertBanner message={apiError} variant="error" />}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Adresse email"
                  placeholder="nom@exemple.com"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoComplete="email"
                />
              )}
            />

            <Button title="Recevoir le code" onPress={() => handleSubmit(onSubmit)()} isLoading={isLoading} />
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <AppText style={s.footerText}>Vous vous souvenez ?</AppText>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}>
              <AppText style={s.footerLink}>Se connecter</AppText>
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

  navbar: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
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
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

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

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
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
});
