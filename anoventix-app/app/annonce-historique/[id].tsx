import AppText from '@/src/components/AppText';
import { getHistoriqueAnnonce, type HistoriqueAnnonce } from '@/src/api/annonce.api';
import { useWebContentStyle } from '@/src/lib/responsive';
import { colors, radius, spacing, typography } from '@/src/theme';
import { formatDate, getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

// ─── Historique des modifications d'une annonce ───────────────────
// Ouvert par le propriétaire (« Mes annonces ») et par la modération (liste des annonces).

const CHAMPS: Record<string, string> = {
  titre: 'Titre',
  description: 'Description',
  prix: 'Prix',
  statutModeration: 'Statut',
  raison: 'Motif de la modération',
  reexamen: 'Demande de réexamen',
  actif: 'Visibilité',
  motifCloture: 'Clôture',
};

const STATUTS: Record<string, string> = {
  PUBLIEE: 'En ligne',
  MASQUEE: 'Masquée',
  REJETEE: 'Rejetée',
  CLOTUREE: 'Clôturée',
  DESACTIVEE: 'Supprimée',
};

const valeur = (champ: string, v: string | null): string => {
  if (v == null || v === '') return '—';
  if (champ === 'statutModeration') return STATUTS[v] ?? v;
  if (champ === 'prix') {
    const n = Number(v);
    return Number.isNaN(n) ? v : `${n.toLocaleString('fr-FR')} GNF`;
  }
  return v.length > 160 ? `${v.slice(0, 160)}…` : v;
};

export default function HistoriqueAnnonceScreen() {
  const { id, titre } = useLocalSearchParams<{ id: string; titre?: string }>();
  const [lignes, setLignes] = useState<HistoriqueAnnonce[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const colonne = useWebContentStyle('form');

  useEffect(() => {
    let actif = true;
    getHistoriqueAnnonce(Number(id))
      .then((h) => {
        if (actif) setLignes([...h].sort((a, b) => (a.dateModification < b.dateModification ? 1 : -1)));
      })
      .catch((e) => {
        if (actif) setErreur(getErrorMessage(e, "Impossible de charger l'historique."));
      });
    return () => {
      actif = false;
    };
  }, [id]);

  return (
    <>
      <Stack.Screen options={{ title: 'Historique' }} />
      {erreur ? (
        <View style={s.centre}>
          <AppText style={s.erreur}>{erreur}</AppText>
        </View>
      ) : lignes == null ? (
        <View style={s.centre}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={lignes}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={[s.liste, colonne]}
          ListHeaderComponent={(titre ? <AppText style={s.titre} numberOfLines={2}>{titre}</AppText> : null) ?? undefined}
          ListEmptyComponent={
            <View style={s.centre}>
              <Ionicons name="time-outline" size={36} color={colors.textMuted} />
              <AppText style={s.vide}>Aucune modification enregistrée.</AppText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.carte}>
              <View style={s.entete}>
                <AppText style={s.champ}>{CHAMPS[item.champ] ?? item.champ}</AppText>
                <AppText style={s.date}>{formatDate(item.dateModification)}</AppText>
              </View>
              <AppText style={s.avant}>{valeur(item.champ, item.ancienneValeur)}</AppText>
              <View style={s.fleche}>
                <Ionicons name="arrow-down" size={14} color={colors.textMuted} />
              </View>
              <AppText style={s.apres}>{valeur(item.champ, item.nouvelleValeur)}</AppText>
              <AppText style={s.auteur}>par {item.modifiePar ?? '—'}</AppText>
            </View>
          )}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  erreur: { color: colors.errorText, textAlign: 'center' },
  liste: { padding: spacing.base, gap: spacing.sm },
  titre: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  vide: { color: colors.textSecondary },
  carte: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.base, gap: 4 },
  entete: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  champ: { fontWeight: '700', color: colors.textPrimary },
  date: { fontSize: typography.sizes.xs, color: colors.textMuted },
  avant: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  fleche: { alignItems: 'flex-start' },
  apres: { color: colors.textPrimary },
  auteur: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 2 },
});
