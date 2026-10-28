import * as authApi from '@/src/api/auth.api';
import { Button } from '@/src/components/ui/button';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AppText from '@/src/components/AppText';

export default function ActivateScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  // Lien sans jeton : erreur dès l'état initial, sans passer par l'effet.
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : "Lien d'activation invalide ou expiré.");

  useEffect(() => {
    if (!token) return;

    authApi
      .activateAccount(token)
      .then((res) => {
        setMessage(res.message ?? 'Votre compte est maintenant activé.');
        setStatus('success');
      })
      .catch((err: { message?: string }) => {
        setMessage(err?.message ?? "Impossible d'activer le compte. Le lien est peut-être expiré.");
        setStatus('error');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText style={s.loadingText}>Activation en cours…</AppText>
      </View>
    );
  }

  return (
    <View style={s.centered}>
      <View style={s.card}>
        <View style={[s.iconCircle, status === 'success' ? s.iconSuccess : s.iconError]}>
          <Ionicons
            name={status === 'success' ? 'checkmark' : 'close'}
            size={40}
            color={colors.white}
          />
        </View>
        <AppText style={s.title}>
          {status === 'success' ? 'Compte activé !' : 'Activation échouée'}
        </AppText>
        <AppText style={s.subtitle}>{message}</AppText>
        <Button
          title={status === 'success' ? 'Se connecter' : 'Retour à la connexion'}
          variant={status === 'success' ? 'primary' : 'outline'}
          onPress={() => router.replace('/(auth)/login')}
          style={s.btn}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  loadingText: {
    marginTop: spacing.base,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    gap: spacing.md,
    ...shadows.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconSuccess: { backgroundColor: colors.success },
  iconError: { backgroundColor: colors.error },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: { marginTop: spacing.sm },
});
