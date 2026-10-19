import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { CodesSecoursListe } from '@/src/features/profile/CodesSecoursListe';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

/**
 * Première connexion avec double authentification : les 8 codes de secours ne sont montrés qu'une
 * fois. La session n'est ouverte qu'après confirmation de leur conservation.
 */
export default function CodesSecoursScreen() {
  const { attente, confirmer } = useAuthStore(
    useShallow((s) => ({ attente: s.codesSecoursARemettre, confirmer: s.confirmerCodesSecours })),
  );
  const [conserves, setConserves] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // Rien à montrer (écran rouvert, app relancée) : retour à la connexion.
  useEffect(() => {
    if (!attente) router.replace('/(auth)/login');
  }, [attente]);

  const continuer = async () => {
    setEnCours(true);
    try {
      await confirmer();
    } finally {
      setEnCours(false);
    }
  };

  if (!attente) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <View style={s.iconWrap}>
            <Ionicons name="key-outline" size={30} color={colors.primary} />
          </View>
          <AppText style={s.title}>Vos codes de secours</AppText>
          <AppText style={s.subtitle}>
            Chaque code ne sert qu’une fois, à la place du code reçu par email, si votre messagerie est
            indisponible. Ils ne seront plus affichés : conservez-les dans un endroit sûr.
          </AppText>
        </View>

        <View style={s.form}>
          <CodesSecoursListe codes={attente.codes} />

          <TouchableOpacity
            style={s.confirmation}
            onPress={() => setConserves((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: conserves }}
          >
            <Ionicons
              name={conserves ? 'checkbox' : 'square-outline'}
              size={24}
              color={conserves ? colors.primary : colors.textMuted}
            />
            <AppText style={s.confirmationTexte}>J’ai conservé mes codes de secours</AppText>
          </TouchableOpacity>

          <Button title="Continuer" onPress={continuer} disabled={!conserves} isLoading={enCours} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
    gap: spacing.base,
  },
  confirmation: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  confirmationTexte: { flex: 1, fontSize: typography.sizes.md, color: colors.textPrimary },
});
