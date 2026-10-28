import AppText from '@/src/components/AppText';
import { getStatsAvancees, type StatsAvancees } from '@/src/api/admin.api';
import { colors, radius, spacing, typography } from '@/src/theme';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS, type TypeAnnonce, type TypeBien } from '@/src/types/annonce.types';
import { getErrorMessage } from '@/src/utils/format';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

// ─── Statistiques avancées de l'administration ────────────────────
// Évolution des annonces sur 12 mois et répartitions (région, type de bien, type d'annonce).

type Ligne = { libelle: string; count: number };

function Barres({ titre, lignes }: { titre: string; lignes: Ligne[] }) {
  const max = Math.max(1, ...lignes.map((l) => l.count));
  return (
    <View style={s.carte}>
      <AppText style={s.titre} accessibilityRole="header">{titre}</AppText>
      {lignes.length === 0 ? (
        <AppText style={s.vide}>Aucune donnée.</AppText>
      ) : (
        lignes.map((l) => (
          <View key={l.libelle} style={s.ligne} accessible accessibilityLabel={`${l.libelle} : ${l.count}`}>
            <AppText style={s.libelle} numberOfLines={1}>{l.libelle}</AppText>
            <View style={s.piste}>
              <View style={[s.barre, { width: `${(l.count / max) * 100}%` }]} />
            </View>
            <AppText style={s.valeur}>{l.count.toLocaleString('fr-FR')}</AppText>
          </View>
        ))
      )}
    </View>
  );
}

const mois = (periode: string): string => {
  const [a, m] = periode.split('-').map(Number);
  if (!a || !m) return periode;
  return new Date(a, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

export default function StatistiquesScreen() {
  const [stats, setStats] = useState<StatsAvancees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setStats(await getStatsAvancees());
    } catch (e) {
      setErreur(getErrorMessage(e, 'Impossible de charger les statistiques.'));
    } finally {
      setChargement(false);
    }
  }, []);

  // Premier chargement : l'état n'est mis à jour qu'à la réponse (pas de setState synchrone dans l'effet).
  useEffect(() => {
    let actif = true;
    getStatsAvancees()
      .then((r) => {
        if (actif) setStats(r);
      })
      .catch((e) => {
        if (actif) setErreur(getErrorMessage(e, 'Impossible de charger les statistiques.'));
      });
    return () => {
      actif = false;
    };
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Statistiques' }} />
      <ScrollView
        contentContainerStyle={s.contenu}
        refreshControl={<RefreshControl refreshing={chargement} onRefresh={charger} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {erreur ? <AppText style={s.erreur}>{erreur}</AppText> : null}
        {!stats && !erreur ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
        {stats ? (
          <>
            <Barres
              titre="Annonces créées (12 mois)"
              lignes={stats.evolutionAnnonces.map((p) => ({ libelle: mois(p.periode), count: p.count }))}
            />
            <Barres
              titre="Annonces en ligne par région"
              lignes={stats.annonceParRegion.map((c) => ({ libelle: c.categorie, count: c.count }))}
            />
            <Barres
              titre="Par type de bien"
              lignes={stats.annonceParTypeBien.map((c) => ({
                libelle: TYPE_BIEN_LABELS[c.categorie as TypeBien] ?? c.categorie,
                count: c.count,
              }))}
            />
            <Barres
              titre="Par type d'annonce"
              lignes={stats.annonceParTypeAnnonce.map((c) => ({
                libelle: TYPE_ANNONCE_LABELS[c.categorie as TypeAnnonce] ?? c.categorie,
                count: c.count,
              }))}
            />
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  contenu: { padding: spacing.base, gap: spacing.base },
  erreur: { color: colors.errorText },
  carte: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.base, gap: spacing.sm },
  titre: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  vide: { color: colors.textMuted },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  libelle: { width: 110, fontSize: typography.sizes.sm, color: colors.textSecondary },
  piste: { flex: 1, height: 10, backgroundColor: colors.background, borderRadius: 5, overflow: 'hidden' },
  barre: { height: 10, backgroundColor: colors.primary, borderRadius: 5 },
  valeur: { width: 48, textAlign: 'right', fontSize: typography.sizes.sm, color: colors.textPrimary },
});
