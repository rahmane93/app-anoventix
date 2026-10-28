import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Platform, Share, StyleSheet, View } from 'react-native';

/** Les 8 codes de secours, à copier ou partager (note, gestionnaire de mots de passe…). */
export function CodesSecoursListe({ codes }: { codes: string[] }) {
  const texte = codes.join('\n');

  const copier = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(texte);
      return;
    }
    await Share.share({ message: texte });
  };

  return (
    <View style={s.conteneur}>
      <View style={s.grille} accessibilityLabel="Codes de secours">
        {codes.map((code) => (
          <View key={code} style={s.code}>
            <AppText style={s.codeTexte} selectable>
              {code}
            </AppText>
          </View>
        ))}
      </View>
      <Button
        title={Platform.OS === 'web' ? 'Copier les codes' : 'Copier ou partager'}
        variant="outline"
        onPress={copier}
      />
    </View>
  );
}

const s = StyleSheet.create({
  conteneur: { gap: spacing.base },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  code: {
    width: '48%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
  },
  codeTexte: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
