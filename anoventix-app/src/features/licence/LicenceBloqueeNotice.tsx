import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { useLicenceStore } from '@/src/stores/licence.store';
import { colors, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/**
 * Remplace un écran d'annonceur (publier, tableau de bord) quand le compte est bloqué.
 * Pas de redirection automatique ici : au retour arrière, l'écran reprendrait le focus
 * et renverrait l'utilisateur en boucle vers « Ma licence ».
 */
export function LicenceBloqueeNotice() {
  // Agent : il ne peut ni activer de licence ni gérer celle de l'entreprise.
  const licence = useLicenceStore((st) => st.licence);
  const texte = licence?.partage
    ? `La licence de votre entreprise n'est plus valide. Contactez votre responsable${licence.compteOwner ? ` (${licence.compteOwner})` : ''} pour la renouveler.`
    : 'Vous avez dépassé vos annonces gratuites sans licence valide. Activez une licence ou clôturez des annonces pour retrouver l’accès.';
  return (
    <View style={s.container}>
      <View style={s.icon}>
        <Ionicons name="lock-closed" size={36} color={colors.errorText} />
      </View>
      <AppText style={s.titre}>Compte limité</AppText>
      <AppText style={s.texte}>{texte}</AppText>
      <Button
        title="Voir ma licence"
        fullWidth={false}
        leftIcon={<Ionicons name="key-outline" size={18} color={colors.white} />}
        onPress={() => router.push('/licence')}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titre: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.textPrimary },
  texte: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
