import AppText from '@/src/components/AppText';
import { getJournalAudit, type EvenementAudit } from '@/src/api/admin.api';
import { Chip } from '@/src/components/ui/chip';
import { colors, radius, spacing, typography } from '@/src/theme';
import { getErrorMessage } from '@/src/utils/format';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

// ─── Journal d'audit ──────────────────────────────────────────────
// Actions de la modération, de l'administration et du système, de la plus récente à la plus ancienne.
// Réservé à l'administrateur (l'API refuse les autres rôles).

const CIBLES = [
  { key: null, label: 'Tout' },
  { key: 'COMPTE', label: 'Comptes' },
  { key: 'ANNONCE', label: 'Annonces' },
  { key: 'SIGNALEMENT', label: 'Signalements' },
  { key: 'MESSAGE', label: 'Messages' },
  { key: 'ENTREPRISE', label: 'Entreprises' },
  { key: 'LICENCE', label: 'Licences' },
  { key: 'LOCALISATION', label: 'Localisations' },
  { key: 'REGLAGE', label: 'Réglages' },
] as const;

/** « COMPTE_STATUT_MODIFIE » → « Compte statut modifié ». */
const libelleAction = (a: string) => {
  const t = a.toLowerCase().replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const TAILLE = 30;

export default function JournalScreen() {
  const [cible, setCible] = useState<string | null>(null);
  const [lignes, setLignes] = useState<EvenementAudit[]>([]);
  const [page, setPage] = useState(0);
  const [fin, setFin] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async (p: number, c: string | null) => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await getJournalAudit({ page: p, size: TAILLE, cibleType: c ?? undefined });
      setLignes((prec) => (p === 0 ? res.data : [...prec, ...res.data]));
      setPage(p);
      setFin(p + 1 >= res.totalPages);
    } catch (e) {
      setErreur(getErrorMessage(e, 'Impossible de charger le journal.'));
    } finally {
      setChargement(false);
    }
  }, []);

  // Changement de filtre : la liste repart de la première page (mise à jour à la réponse).
  useEffect(() => {
    let actif = true;
    getJournalAudit({ page: 0, size: TAILLE, cibleType: cible ?? undefined })
      .then((res) => {
        if (!actif) return;
        setLignes(res.data);
        setPage(0);
        setFin(1 >= res.totalPages);
      })
      .catch((e) => {
        if (actif) setErreur(getErrorMessage(e, 'Impossible de charger le journal.'));
      });
    return () => {
      actif = false;
    };
  }, [cible]);

  return (
    <>
      <Stack.Screen options={{ title: "Journal d'audit" }} />
      <View style={s.filtres}>
        {CIBLES.map((c) => (
          <Chip key={c.label} label={c.label} selected={cible === c.key} onPress={() => setCible(c.key)} />
        ))}
      </View>
      {erreur ? <AppText style={s.erreur}>{erreur}</AppText> : null}
      <FlatList
        data={lignes}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={s.liste}
        refreshControl={
          <RefreshControl refreshing={chargement && page === 0} onRefresh={() => charger(0, cible)}
            colors={[colors.primary]} tintColor={colors.primary} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!chargement && !fin) charger(page + 1, cible);
        }}
        ListFooterComponent={chargement && page > 0 ? <ActivityIndicator color={colors.primary} /> : null}
        ListEmptyComponent={!chargement ? <AppText style={s.vide}>Aucune action enregistrée.</AppText> : null}
        renderItem={({ item }) => (
          <View style={s.carte}>
            <View style={s.entete}>
              <AppText style={s.action}>{libelleAction(item.action)}</AppText>
              <AppText style={s.date}>{new Date(item.date).toLocaleString('fr-FR')}</AppText>
            </View>
            <AppText style={s.meta}>
              {item.acteurLibelle}{item.acteurRole ? ` · ${item.acteurRole.toLowerCase()}` : ''} → {item.cibleType.toLowerCase()} {item.cibleId}
            </AppText>
            {item.motif ? <AppText style={s.motif}>{item.motif}</AppText> : null}
          </View>
        )}
      />
    </>
  );
}

const s = StyleSheet.create({
  filtres: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, padding: spacing.base, paddingBottom: 0 },
  erreur: { color: colors.errorText, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  liste: { padding: spacing.base, gap: spacing.sm },
  vide: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  carte: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.base, gap: 4 },
  entete: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  action: { flex: 1, fontWeight: '700', color: colors.textPrimary },
  date: { fontSize: typography.sizes.xs, color: colors.textMuted },
  meta: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  motif: { fontSize: typography.sizes.sm, color: colors.textPrimary },
});
