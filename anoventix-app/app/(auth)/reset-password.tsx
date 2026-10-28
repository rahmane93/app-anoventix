import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { PasswordChecklist } from '@/src/components/ui/password-checklist';
import { ScreenContainer } from '@/src/components/ui/screen-container';
import { ResetPasswordFormData, resetPasswordSchema } from '@/src/lib/validation';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { IconButton } from '@/src/components/ui/icon-button';
import { useShallow } from 'zustand/react/shallow';

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuthStore(useShallow((s) => ({ resetPassword: s.resetPassword })));
  const params = useLocalSearchParams<{ email?: string }>();

  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: params.email ?? '',
      token: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (params.email) setValue('email', params.email);
  }, [params.email, setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setApiError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const message = await resetPassword({
        email: data.email,
        token: data.token,
        newPassword: data.newPassword,
      });
      setSuccessMessage(message ?? 'Mot de passe réinitialisé avec succès !');
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number };
      if (error?.status === 422) {
        setApiError('Code invalide ou expiré. Demandez un nouveau code.');
      } else {
        setApiError(error?.message ?? 'Échec de la réinitialisation. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      {/* Bouton retour */}
      <IconButton
        icon="arrow-back" style={styles.backBtn}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/forgot-password')}
        accessibilityLabel="Retour"
      />

      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={36} color={colors.primary} />
        </View>
        <AppText style={styles.title}>Nouveau mot de passe</AppText>
        <AppText style={styles.subtitle}>
          Entrez le code reçu par email et choisissez un nouveau mot de passe
        </AppText>
      </View>

      {/* Formulaire */}
      <View style={styles.card}>
        {apiError && <AlertBanner message={apiError} variant="error" />}
        {successMessage && <AlertBanner message={successMessage} variant="success" />}

        {/* Email */}
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

        {/* Token */}
        <Controller
          control={control}
          name="token"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Code de réinitialisation"
              placeholder="Collez le code reçu par email"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.token?.message}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        />

        {/* Nouveau mot de passe */}
        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <>
            <Input
              label="Nouveau mot de passe"
              placeholder="Votre nouveau mot de passe"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.newPassword?.message}
              isPassword
              autoComplete="new-password"
            />
            <PasswordChecklist value={value} />
            </>
          )}
        />

        {/* Confirmation */}
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirmer le mot de passe"
              placeholder="Répétez le nouveau mot de passe"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.confirmPassword?.message}
              isPassword
              autoComplete="new-password"
            />
          )}
        />

        <Button
          title="Réinitialiser le mot de passe"
          onPress={() => handleSubmit(onSubmit)()}
          isLoading={isLoading}
          disabled={Boolean(successMessage)}
        />
      </View>

      {/* Liens */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
          <AppText style={styles.link}>Renvoyer le code</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <AppText style={styles.backLink}>← Retour à la connexion</AppText>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', marginTop: spacing.sm, marginBottom: spacing.xs },
  header: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  link: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  backLink: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});
