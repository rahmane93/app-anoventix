import AppText from '@/src/components/AppText';
import { accepterInvitation } from '@/src/api/auth.api';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { PasswordChecklist } from '@/src/components/ui/password-checklist';
import { InvitationFormData, invitationSchema } from '@/src/lib/validation';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Invitation d'un agent : le lien reçu par email (www.anoventix.com/invitation?token=…) ouvre cet
 * écran. L'agent choisit son mot de passe ; le lien ne sert qu'une fois.
 */
export default function InvitationScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [erreur, setErreur] = useState<string | null>(
    token ? null : 'Ce lien d’invitation est incomplet. Utilisez le lien reçu par email.',
  );
  const [termine, setTermine] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const valider = async (data: InvitationFormData) => {
    if (!token) return;
    setErreur(null);
    setEnCours(true);
    try {
      await accepterInvitation(token, data.password);
      setTermine(true);
    } catch (err: unknown) {
      setErreur((err as { message?: string })?.message ?? 'Impossible d’enregistrer votre mot de passe. Réessayez.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.flex} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Ionicons name={termine ? 'checkmark-circle-outline' : 'mail-open-outline'} size={30} color={colors.primary} />
            </View>
            <AppText style={s.title}>{termine ? 'Compte activé' : 'Bienvenue sur AnoventiX'}</AppText>
            <AppText style={s.subtitle}>
              {termine
                ? 'Votre mot de passe est enregistré. Vous pouvez maintenant vous connecter.'
                : 'Choisissez votre mot de passe pour activer votre compte d’agent.'}
            </AppText>
          </View>

          <View style={s.form}>
            {erreur ? <AlertBanner message={erreur} variant="error" /> : null}

            {termine ? (
              <Button title="Se connecter" onPress={() => router.replace('/(auth)/login')} />
            ) : (
              <>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Mot de passe"
                      placeholder="Choisissez un mot de passe"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.password?.message}
                      isPassword
                      autoComplete="new-password"
                    />
                  )}
                />
                <PasswordChecklist value={password} />
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Confirmer le mot de passe"
                      placeholder="Saisissez-le à nouveau"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.confirmPassword?.message}
                      isPassword
                      autoComplete="new-password"
                    />
                  )}
                />
                <Button title="Activer mon compte" onPress={handleSubmit(valider)} isLoading={enCours} disabled={!token} />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.base, paddingVertical: spacing['3xl'], justifyContent: 'center' },
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
});
