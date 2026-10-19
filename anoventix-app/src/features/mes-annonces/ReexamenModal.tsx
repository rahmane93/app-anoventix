import AppText from '@/src/components/AppText';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Sheet } from '@/src/components/ui/sheet';
import { useAnnonceStore } from '@/src/stores/annonce.store';
import { colors, spacing, typography } from '@/src/theme';
import { getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

const MESSAGE_MAX = 500;

/**
 * Demande de réexamen d'une annonce masquée, après correction (DEC-09, RG-03-30).
 * Le message est facultatif ; la modération le lit avec l'historique des modifications.
 */
export function ReexamenModal({
  visible,
  annonceId,
  titre,
  onClose,
}: {
  visible: boolean;
  annonceId: number;
  titre: string;
  onClose: () => void;
}) {
  const { demanderReexamen } = useAnnonceStore(useShallow((s) => ({ demanderReexamen: s.demanderReexamen })));
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleEnvoyer = async () => {
    setLoading(true);
    try {
      await demanderReexamen(annonceId, message);
      onClose();
      setMessage('');
      appAlert('Demande envoyée', 'La modération va réexaminer votre annonce. Vous recevrez un email avec sa décision.');
    } catch (err) {
      appAlert('Demande impossible', getErrorMessage(err, 'Impossible de demander le réexamen de cette annonce.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet visible={visible} onRequestClose={onClose}>
      <View style={st.sheet}>
        <View style={st.handle} />
        <AppText style={st.title}>Demander un réexamen</AppText>
        <AppText style={st.subtitle} numberOfLines={2}>{titre}</AppText>
        <AppText style={st.hint}>
          Vérifiez d’abord que vous avez corrigé ce que la modération a signalé. Vous pouvez faire trois demandes au
          plus pour cette annonce.
        </AppText>
        <Input
          label="Message pour la modération (facultatif)"
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, MESSAGE_MAX))}
          placeholder="Ex. : j’ai retiré le numéro de téléphone de la description."
          multiline
          numberOfLines={4}
          maxLength={MESSAGE_MAX}
          accessibilityLabel="Message pour la modération"
        />
        <AppText style={st.counter}>{message.length}/{MESSAGE_MAX}</AppText>
        <View style={st.actions}>
          <Button title="Annuler" variant="outline" fullWidth={false} style={st.btn} onPress={onClose}
            accessibilityLabel="Annuler" />
          <Button
            title="Envoyer"
            fullWidth={false}
            style={st.btn}
            leftIcon={<Ionicons name="paper-plane-outline" size={15} color={colors.white} />}
            onPress={handleEnvoyer}
            isLoading={loading}
            accessibilityLabel="Envoyer la demande de réexamen"
          />
        </View>
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm,
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: typography.sizes.sm, color: colors.textMuted },
  hint: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20 },
  counter: { fontSize: typography.sizes.xs, color: colors.textMuted, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: { flex: 1 },
});
