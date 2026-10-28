import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { ReexamenModal } from '@/src/features/mes-annonces/ReexamenModal';
import { getEtatReexamen } from '@/src/lib/annonce-statut';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Bandeau du propriétaire sur une annonce retirée par la modération : motif, et ce qu'il peut faire
 * (corriger puis demander un réexamen si elle est masquée ; plus rien si elle est rejetée, DEC-09/10).
 */
export function ModerationBanner({ annonce }: { annonce: BienImmo }) {
  const [reexamenOpen, setReexamenOpen] = useState(false);
  if (annonce.statutModeration !== 'MASQUEE' && annonce.statutModeration !== 'REJETEE') return null;

  const rejetee = annonce.statutModeration === 'REJETEE';
  const etat = getEtatReexamen(annonce);

  return (
    <View style={st.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={colors.errorText} />
      <View style={{ flex: 1 }}>
        <AppText style={st.title}>
          {rejetee ? 'Annonce rejetée par la modération' : 'Annonce masquée par la modération'}
        </AppText>
        {annonce.motifModeration ? <AppText style={st.text}>Motif : {annonce.motifModeration}</AppText> : null}
        <AppText style={st.hint}>
          {rejetee
            ? 'Elle n’est plus visible et ne peut pas être remise en ligne : vous pouvez seulement la supprimer.'
            : etat === 'EN_COURS'
              ? 'Réexamen en cours : la modération vous répondra par email.'
              : etat === 'EPUISE'
                ? 'Vous avez utilisé vos trois demandes de réexamen : contactez le support.'
                : 'Elle n’est plus visible. Corrigez-la, puis demandez un réexamen.'}
        </AppText>
        {etat === 'DISPONIBLE' && (
          <Button
            title="Demander un réexamen"
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={st.action}
            leftIcon={<Ionicons name="refresh-outline" size={16} color={colors.primary} />}
            onPress={() => setReexamenOpen(true)}
            accessibilityLabel="Demander un réexamen de l'annonce"
          />
        )}
      </View>
      {!rejetee && (
        <ReexamenModal
          visible={reexamenOpen}
          annonceId={annonce.id}
          titre={annonce.titre}
          onClose={() => setReexamenOpen(false)}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.errorLight,
  },
  title: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.errorText },
  text: { fontSize: typography.sizes.sm, color: colors.textPrimary, marginTop: 2, lineHeight: 20 },
  hint: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: 4 },
  action: { marginTop: spacing.sm, alignSelf: 'flex-start' },
});
