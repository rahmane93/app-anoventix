import { goBackOr } from '@/src/lib/navigation';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { PasswordChecklist } from '@/src/components/ui/password-checklist';
import { ScreenContainer } from '@/src/components/ui/screen-container';
import { ChangePasswordFormData, changePasswordSchema } from '@/src/lib/validation';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { IconButton } from '@/src/components/ui/icon-button';
import { useShallow } from 'zustand/react/shallow';

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ChangePasswordScreen() {
  const { changePassword, mustChangePassword, logout } = useAuthStore(useShallow((s) => ({ changePassword: s.changePassword, mustChangePassword: s.mustChangePassword, logout: s.logout })));
  const isForced = !!mustChangePassword;

  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setApiError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const message = await changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      setSuccessMessage(message ?? 'Mot de passe modifié avec succès !');
      reset();
      setTimeout(() => {
        if (isForced) {
          router.replace('/(tabs)/explore');
        } else {
          goBackOr('/(tabs)/profile');
        }
      }, 2000);
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number };
      if (error?.status === 400) {
        setApiError('Ancien mot de passe incorrect.');
      } else {
        setApiError(error?.message ?? 'Impossible de modifier le mot de passe. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      {/* En-tête */}
      <View style={styles.header}>
        {!isForced && (
          <IconButton
            icon="arrow-back" style={styles.backBtn}
            onPress={() => goBackOr('/(tabs)/profile')}
            accessibilityLabel="Retour"
          />
        )}
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={36} color={colors.primary} />
        </View>
        <AppText style={styles.title}>
          {isForced ? 'Mot de passe temporaire' : 'Changer mon mot de passe'}
        </AppText>
        <AppText style={styles.subtitle}>
          {isForced
            ? 'Vous devez définir un nouveau mot de passe avant de continuer.'
            : 'Entrez votre mot de passe actuel puis choisissez-en un nouveau'}
        </AppText>
      </View>

      {/* Formulaire */}
      <View style={styles.card}>
        {apiError && <AlertBanner message={apiError} variant="error" />}
        {successMessage && <AlertBanner message={successMessage} variant="success" />}

        {/* Ancien mot de passe */}
        <Controller
          control={control}
          name="oldPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Mot de passe actuel"
              placeholder="Votre mot de passe actuel"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.oldPassword?.message}
              isPassword
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
              label="Confirmer le nouveau mot de passe"
              placeholder="Répétez le nouveau mot de passe"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.confirmPassword?.message}
              isPassword
            />
          )}
        />

        <Button
          title="Modifier le mot de passe"
          onPress={() => handleSubmit(onSubmit)()}
          isLoading={isLoading}
          style={styles.btn}
        />
        {isForced && (
          <Button
            title="Se déconnecter"
            variant="ghost"
            onPress={async () => {
              await logout();
              router.replace('/(tabs)/explore');
            }}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.base,
    ...shadows.sm,
  },
  btn: {
    marginTop: spacing.sm,
  },
});
