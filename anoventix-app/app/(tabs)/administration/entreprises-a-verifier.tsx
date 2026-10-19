import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { apiClient, API_BASE_URL } from '@/src/api/client';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Sheet } from '@/src/components/ui/sheet';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { AdminPage, BlockGap, EmptyState, ErrorBanner, ItemBlock, LoadingState } from '@/src/features/admin/ui';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, radius, spacing, typography } from '@/src/theme';
import { getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

// ─── File « Entreprises à vérifier » (DEC-04, RG-10-20) ──────────────────────

interface EntrepriseAVerifier {
  id: string;
  nom: string;
  numeroRCCM: string | null;
  adresse: string | null;
  telephone: string | null;
  annonceurProfessionnelEmail: string | null;
  dateEnvoiVerification: string | null;
}

function Carte({ item, onDecide }: { item: EntrepriseAVerifier; onDecide: () => void }) {
  const token = useAuthStore((s) => s.token);
  const [refusOuvert, setRefusOuvert] = useState(false);
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);
  const justificatif = `${API_BASE_URL}/api/entreprises/${item.id}/justificatif`;

  const decider = async (statut: 'VERIFIEE' | 'REJETEE') => {
    setEnCours(true);
    try {
      await apiClient.put(`/api/admin/entreprises/${item.id}/verification`, {
        statut,
        ...(statut === 'REJETEE' ? { motif: motif.trim() } : {}),
      });
      setRefusOuvert(false);
      onDecide();
    } catch (e) {
      appAlert('Décision non appliquée', getErrorMessage(e, "La décision n'a pas été enregistrée."));
    } finally {
      setEnCours(false);
    }
  };

  const confirmerVerification = () =>
    appAlert('Vérifier cette agence ?', `${item.nom} recevra le badge « Agence vérifiée » et son RCCM sera réservé.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Vérifier', onPress: () => decider('VERIFIEE') },
    ]);

  return (
    <ItemBlock>
      <AppText style={st.nom}>{item.nom}</AppText>
      <AppText style={st.meta}>RCCM : {item.numeroRCCM ?? '—'}</AppText>
      <AppText style={st.meta}>Propriétaire : {item.annonceurProfessionnelEmail ?? '—'}</AppText>
      {item.adresse ? <AppText style={st.meta}>{item.adresse}</AppText> : null}
      <Image source={{ uri: justificatif, headers: { Authorization: `Bearer ${token}` } }} style={st.image} contentFit="contain" />
      <AppText style={st.aide}>
        Contrôlez que le RCCM, la raison sociale et le nom du gérant correspondent à la fiche et à l’identité vérifiée du
        propriétaire.
      </AppText>
      <View style={st.actions}>
        <Button title="Refuser" variant="dangerOutline" size="sm" fullWidth={false} style={st.flex} onPress={() => setRefusOuvert(true)} disabled={enCours} />
        <Button title="Vérifier" size="sm" fullWidth={false} style={st.flex} onPress={confirmerVerification} isLoading={enCours} />
      </View>
      <Sheet visible={refusOuvert} onRequestClose={() => setRefusOuvert(false)}>
        <View style={st.sheet}>
          <AppText style={st.titre}>Motif du refus</AppText>
          <AppText style={st.aide}>Communiqué au propriétaire par email.</AppText>
          <AppTextInput
            style={st.input}
            placeholder="Ex : extrait illisible, RCCM différent de la fiche."
            placeholderTextColor={colors.placeholder}
            value={motif}
            onChangeText={setMotif}
            maxLength={255}
            multiline
            numberOfLines={3}
            accessibilityLabel="Motif du refus"
          />
          <Button title="Refuser la vérification" variant="danger" fullWidth={false} onPress={() => decider('REJETEE')} disabled={!motif.trim()} isLoading={enCours} />
        </View>
      </Sheet>
    </ItemBlock>
  );
}

export default function EntreprisesAVerifierScreen() {
  const [liste, setListe] = useState<EntrepriseAVerifier[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await apiClient.get<{ data: EntrepriseAVerifier[] }>('/api/admin/entreprises/a-verifier', {
        params: { page: 0, size: 50 },
      });
      setListe(res.data.data ?? []);
    } catch (e) {
      setErreur(getErrorMessage(e, 'Impossible de charger les entreprises à vérifier.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  return (
    <AdminPage>
      {erreur ? <ErrorBanner message={erreur} onRetry={charger} /> : null}
      {chargement && liste.length === 0 ? (
        <LoadingState />
      ) : (
        <FlatList
          {...LIST_PERF_PROPS}
          data={liste}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <Carte item={item} onDecide={charger} />}
          ItemSeparatorComponent={BlockGap}
          ListEmptyComponent={erreur ? null : (
            <EmptyState icon="business-outline" title="Aucune entreprise à vérifier" message="Les justificatifs RCCM envoyés apparaissent ici." />
          )}
        />
      )}
    </AdminPage>
  );
}

const st = StyleSheet.create({
  nom: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  image: { width: '100%', height: 220, borderRadius: radius.sm, backgroundColor: colors.background },
  aide: { fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm,
  },
  titre: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm,
    fontSize: typography.sizes.sm, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
});
