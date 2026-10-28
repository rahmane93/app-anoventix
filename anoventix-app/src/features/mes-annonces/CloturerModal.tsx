import { Sheet } from '@/src/components/ui/sheet';
import { useAnnonceStore } from '@/src/stores/annonce.store';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { MotifCloture, TypeAnnonce } from '@/src/types/annonce.types';
import { MOTIF_CLOTURE_LABELS } from '@/src/types/annonce.types';
import { getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { useShallow } from 'zustand/react/shallow';

export function CloturerModal({
  visible,
  annonceId,
  titre,
  typeAnnonce,
  onClose,
}: {
  visible: boolean;
  annonceId: number;
  titre: string;
  /** Sert à présélectionner le motif le plus probable : une location est « Louée », pas « Vendue ». */
  typeAnnonce?: TypeAnnonce;
  onClose: () => void;
}) {
  const { cloturerAnnonce } = useAnnonceStore(useShallow((s) => ({ cloturerAnnonce: s.cloturerAnnonce })));
  const [motif, setMotif] = React.useState<MotifCloture>(typeAnnonce === 'LOCATION' || typeAnnonce === 'BAIL' ? 'LOUE' : 'VENDU');
  const [loading, setLoading] = React.useState(false);

  const handleCloturer = async () => {
    setLoading(true);
    try {
      await cloturerAnnonce(annonceId, motif);
      // Fermer la feuille avant d'afficher l'alerte (évite le conflit overlay/Alert).
      onClose();
      appAlert('Annonce clôturée', `"${titre}" a été marquée comme ${MOTIF_CLOTURE_LABELS[motif]}.`);
    } catch (err) {
      appAlert("Clôture impossible", getErrorMessage(err, 'Impossible de clôturer cette annonce.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet visible={visible} onRequestClose={onClose}>
      <View style={clotureSt.sheet}>
        <View style={clotureSt.handle} />
        <AppText style={clotureSt.title}>Clôturer l'annonce</AppText>
        <AppText style={clotureSt.subtitle} numberOfLines={2}>{titre}</AppText>
        <AppText style={clotureSt.label}>Motif de clôture</AppText>
        {(['VENDU', 'LOUE', 'RETIRE'] as MotifCloture[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[clotureSt.motifBtn, motif === m && clotureSt.motifBtnSelected]}
            onPress={() => setMotif(m)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={MOTIF_CLOTURE_LABELS[m]}
            accessibilityState={{ selected: motif === m }}
          >
            <AppText style={[clotureSt.motifText, motif === m && clotureSt.motifTextSelected]}>
              {MOTIF_CLOTURE_LABELS[m]}
            </AppText>
            {motif === m && <Ionicons name="checkmark" size={14} color={colors.primary} />}
          </TouchableOpacity>
        ))}
        <View style={clotureSt.actions}>
          <Button
            title="Annuler"
            variant="outline"
            fullWidth={false}
            style={clotureSt.cancelBtn}
            onPress={onClose}
            accessibilityLabel="Annuler"
          />
          <Button
            title="Clôturer"
            fullWidth={false}
            style={clotureSt.confirmBtn}
            leftIcon={<Ionicons name="lock-closed-outline" size={15} color={colors.white} />}
            onPress={handleCloturer}
            isLoading={loading}
            accessibilityLabel="Clôturer l'annonce"
          />
        </View>
      </View>
    </Sheet>
  );
}

const clotureSt = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm,
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: typography.sizes.sm, color: colors.textMuted },
  label: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm },
  motifBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground,
  },
  motifBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  motifText: { fontSize: typography.sizes.md, fontWeight: '500', color: colors.textSecondary },
  motifTextSelected: { color: colors.primary, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { flex: 1 },
  confirmBtn: { flex: 1 },
});
