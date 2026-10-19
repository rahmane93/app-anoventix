import AppText from '@/src/components/AppText';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Sheet } from '@/src/components/ui/sheet';
import * as notificationApi from '@/src/api/notification.api';
import { demanderPermissionEtEnregistrer } from '@/src/lib/push';
import { colors, spacing, typography } from '@/src/theme';
import type { AnnonceFilterParams } from '@/src/types/annonce.types';
import { getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

/** Critères d'une alerte : la recherche en cours, sans tri ni référence. */
export function criteresDepuisRecherche(query: string, filters: AnnonceFilterParams): notificationApi.CriteresAlerte {
  const { reference: _r, sort: _s, direction: _d, userId: _u, ...criteres } = filters;
  return { ...criteres, q: query.trim() || null };
}

export const aDesCriteres = (c: notificationApi.CriteresAlerte): boolean =>
  Object.values(c).some((v) => v != null && v !== '');

/** « Créer une alerte » depuis une liste de résultats (DEC-16, RG-04-20) : nom modifiable, 10 alertes au plus. */
export function CreerAlerteSheet({
  visible,
  criteres,
  nomSuggere,
  onClose,
}: {
  visible: boolean;
  criteres: notificationApi.CriteresAlerte;
  nomSuggere: string;
  onClose: () => void;
}) {
  const [nom, setNom] = useState('');
  const [loading, setLoading] = useState(false);

  const creer = async () => {
    setLoading(true);
    try {
      await notificationApi.creerAlerte((nom.trim() || nomSuggere).slice(0, 80), criteres);
      onClose();
      setNom('');
      // Une alerte n'a de sens qu'avec les notifications : on demande la permission maintenant.
      demanderPermissionEtEnregistrer();
      appAlert('Alerte créée', 'Vous serez prévenu par notification des nouvelles annonces qui correspondent. Retrouvez vos alertes dans le profil.');
    } catch (err) {
      appAlert('Alerte non créée', getErrorMessage(err, "L'alerte n'a pas pu être créée."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet visible={visible} onRequestClose={onClose}>
      <View style={st.sheet}>
        <View style={st.handle} />
        <AppText style={st.title}>Créer une alerte</AppText>
        <AppText style={st.hint}>
          Vous recevrez au plus une notification par jour, avec le nombre de nouvelles annonces qui correspondent à cette recherche.
        </AppText>
        <Input
          label="Nom de l’alerte"
          value={nom}
          onChangeText={setNom}
          placeholder={nomSuggere}
          maxLength={80}
          accessibilityLabel="Nom de l'alerte"
        />
        <View style={st.actions}>
          <Button title="Annuler" variant="outline" fullWidth={false} style={st.btn} onPress={onClose} />
          <Button
            title="Créer l’alerte"
            fullWidth={false}
            style={st.btn}
            leftIcon={<Ionicons name="notifications-outline" size={16} color={colors.white} />}
            onPress={creer}
            isLoading={loading}
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
  hint: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: { flex: 1 },
});
