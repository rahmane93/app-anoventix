import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { apiClient } from '@/src/api/client';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Sheet } from '@/src/components/ui/sheet';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { AdminPage, BlockGap, EmptyState, ErrorBanner, ItemBlock, LoadingState } from '@/src/features/admin/ui';
import { colors, radius, spacing, typography } from '@/src/theme';
import { formatDate, getErrorMessage } from '@/src/utils/format';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

// ─── File « Quartiers demandés » (DEC-22, RG-05-17, RG-10-21) ────────────────

interface Demande {
  id: number;
  nom: string;
  region: string;
  prefecture: string;
  commune: string;
  annonceId: number;
  annonceTitre: string;
  demandeurEmail: string;
  dateDemande: string;
  quartiersProches: { id: string; quartier: string }[];
}

type Action = 'ajouter' | 'rattacher' | 'refuser';

function Carte({ item, onDecide }: { item: Demande; onDecide: () => void }) {
  const [action, setAction] = useState<Action | null>(null);
  const [nom, setNom] = useState(item.nom);
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (chemin: string, corps: object) => {
    setEnCours(true);
    try {
      await apiClient.put(`/api/admin/quartiers-demandes/${item.id}/${chemin}`, corps);
      setAction(null);
      onDecide();
    } catch (e) {
      appAlert('Décision non appliquée', getErrorMessage(e, "La décision n'a pas été enregistrée."));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <ItemBlock>
      <AppText style={st.nom}>{item.nom}</AppText>
      <AppText style={st.meta}>{item.commune} · {item.prefecture} · {item.region}</AppText>
      <TouchableOpacity onPress={() => router.push(`/annonce/${item.annonceId}` as never)} accessibilityRole="link"
        accessibilityLabel={`Voir l'annonce ${item.annonceTitre}`}>
        <AppText style={st.lien} numberOfLines={1}>Annonce : {item.annonceTitre}</AppText>
      </TouchableOpacity>
      <AppText style={st.meta}>Demandé par {item.demandeurEmail} le {formatDate(item.dateDemande)}</AppText>
      {item.quartiersProches.length > 0 ? (
        <View style={st.proches}>
          <AppText style={st.aide}>Quartiers proches par le nom (variante d’orthographe ?)</AppText>
          {item.quartiersProches.map((q) => (
            <Button
              key={q.id}
              title={`Rattacher à « ${q.quartier} »`}
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => envoyer('rattacher', { localisationId: q.id })}
              disabled={enCours}
            />
          ))}
        </View>
      ) : null}
      <View style={st.actions}>
        <Button title="Refuser" variant="dangerOutline" size="sm" fullWidth={false} style={st.flex} onPress={() => setAction('refuser')} disabled={enCours} />
        <Button title="Ajouter" size="sm" fullWidth={false} style={st.flex} onPress={() => setAction('ajouter')} disabled={enCours} />
      </View>
      <Sheet visible={action != null} onRequestClose={() => setAction(null)}>
        <View style={st.sheet}>
          {action === 'ajouter' ? (
            <>
              <AppText style={st.titre}>Ajouter le quartier</AppText>
              <AppText style={st.aide}>Corrigez l’orthographe si besoin. L’annonce y est rattachée aussitôt.</AppText>
              <AppTextInput style={st.input} value={nom} onChangeText={setNom} maxLength={100} accessibilityLabel="Nom du quartier" />
              <Button title="Ajouter à la commune" fullWidth={false} onPress={() => envoyer('ajouter', { nom: nom.trim() })}
                disabled={!nom.trim()} isLoading={enCours} />
            </>
          ) : (
            <>
              <AppText style={st.titre}>Motif du refus</AppText>
              <AppText style={st.aide}>L’annonce reste rattachée à la commune. Le motif est envoyé par email.</AppText>
              <AppTextInput style={st.input} value={motif} onChangeText={setMotif} maxLength={255} multiline numberOfLines={3}
                placeholder="Ex : ce quartier n’existe pas." placeholderTextColor={colors.placeholder} accessibilityLabel="Motif du refus" />
              <Button title="Refuser la demande" variant="danger" fullWidth={false} onPress={() => envoyer('refuser', { motif: motif.trim() })}
                disabled={!motif.trim()} isLoading={enCours} />
            </>
          )}
        </View>
      </Sheet>
    </ItemBlock>
  );
}

export default function QuartiersDemandesScreen() {
  const [liste, setListe] = useState<Demande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await apiClient.get<{ data: Demande[] }>('/api/admin/quartiers-demandes', { params: { page: 0, size: 50 } });
      setListe(res.data.data ?? []);
    } catch (e) {
      setErreur(getErrorMessage(e, 'Impossible de charger les quartiers demandés.'));
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
          keyExtractor={(d) => String(d.id)}
          renderItem={({ item }) => <Carte item={item} onDecide={charger} />}
          ItemSeparatorComponent={BlockGap}
          ListEmptyComponent={(erreur ? null : (
            <EmptyState icon="location-outline" title="Aucun quartier demandé" message="Les quartiers saisis par les annonceurs apparaissent ici." />
          )) ?? undefined}
        />
      )}
    </AdminPage>
  );
}

const st = StyleSheet.create({
  nom: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  lien: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: '600' },
  aide: { fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 17 },
  proches: { gap: spacing.xs, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm,
  },
  titre: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm,
    fontSize: typography.sizes.sm, color: colors.textPrimary, minHeight: 44, backgroundColor: colors.background,
  },
});
