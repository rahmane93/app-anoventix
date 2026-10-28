import AppText from '@/src/components/AppText';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Sheet } from '@/src/components/ui/sheet';
import * as notificationApi from '@/src/api/notification.api';
import type { AlerteRecherche } from '@/src/api/notification.api';
import { useWebContentStyle } from '@/src/lib/responsive';
import { colors, radius, spacing, typography } from '@/src/theme';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS, type TypeAnnonce, type TypeBien } from '@/src/types/annonce.types';
import { formatDate, getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

// ─── Mes alertes (DEC-16, RG-04-22) : renommer, mettre en pause, supprimer ───

function resume(a: AlerteRecherche): string {
  const c = a.criteres;
  const morceaux = [
    c.q,
    c.typeAnnonce ? TYPE_ANNONCE_LABELS[c.typeAnnonce as TypeAnnonce] : null,
    c.typeBien ? TYPE_BIEN_LABELS[c.typeBien as TypeBien] : null,
    c.quartier ?? c.commune ?? c.prefecture ?? c.region,
    c.prixMin != null || c.prixMax != null
      ? `${c.prixMin != null ? c.prixMin.toLocaleString('fr-FR') : '…'} – ${c.prixMax != null ? c.prixMax.toLocaleString('fr-FR') : '…'} GNF`
      : null,
  ].filter(Boolean);
  return morceaux.join(' · ') || 'Toutes les annonces';
}

export default function AlertesScreen() {
  const { ouvrir } = useLocalSearchParams<{ ouvrir?: string }>();
  const [alertes, setAlertes] = useState<AlerteRecherche[]>([]);
  const [chargement, setChargement] = useState(true);
  const colonne = useWebContentStyle('form');
  const [erreur, setErreur] = useState<string | null>(null);
  const [renommage, setRenommage] = useState<AlerteRecherche | null>(null);
  const [nom, setNom] = useState('');

  const ouvrirResultats = useCallback((a: AlerteRecherche) => {
    // Ouverture d'une alerte : elle n'est plus « abandonnée » ; la liste s'affiche avec ses critères.
    notificationApi.signalerOuvertureAlerte(a.id).catch(() => {});
    router.push({ pathname: '/(tabs)/explore', params: { criteres: JSON.stringify(a.criteres) } } as never);
  }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const liste = await notificationApi.getAlertes();
      setAlertes(liste);
      // Arrivée depuis une notification : on ouvre directement l'alerte concernée.
      const cible = ouvrir ? liste.find((a) => String(a.id) === ouvrir) : undefined;
      if (cible) ouvrirResultats(cible);
    } catch (e) {
      setErreur(getErrorMessage(e, 'Impossible de charger vos alertes.'));
    } finally {
      setChargement(false);
    }
  }, [ouvrir, ouvrirResultats]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const remplacer = (a: AlerteRecherche) => setAlertes((l) => l.map((x) => (x.id === a.id ? a : x)));

  const basculer = async (a: AlerteRecherche, active: boolean) => {
    try {
      remplacer(await notificationApi.modifierAlerte(a.id, { active }));
    } catch (e) {
      appAlert('Alerte inchangée', getErrorMessage(e, "L'alerte n'a pas pu être modifiée."));
    }
  };

  const renommer = async () => {
    if (!renommage || !nom.trim()) return;
    try {
      remplacer(await notificationApi.modifierAlerte(renommage.id, { nom: nom.trim() }));
      setRenommage(null);
    } catch (e) {
      appAlert('Alerte inchangée', getErrorMessage(e, "L'alerte n'a pas pu être renommée."));
    }
  };

  const supprimer = (a: AlerteRecherche) =>
    appAlert('Supprimer l’alerte', `Supprimer « ${a.nom} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await notificationApi.supprimerAlerte(a.id);
            setAlertes((l) => l.filter((x) => x.id !== a.id));
          } catch (e) {
            appAlert('Suppression impossible', getErrorMessage(e, "L'alerte n'a pas pu être supprimée."));
          }
        },
      },
    ]);

  return (
    <View style={st.page}>
      <Stack.Screen options={{ title: 'Mes alertes' }} />
      {chargement && alertes.length === 0 ? (
        <ActivityIndicator style={st.centre} color={colors.primary} />
      ) : (
        <FlatList
          data={alertes}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={[st.liste, colonne]}
          ListHeaderComponent={
            <AppText style={st.intro}>
              {alertes.length}/{notificationApi.ALERTES_MAX} alertes. Une notification au plus par alerte et par jour. Créez-en depuis une
              recherche avec « Créer une alerte ».
            </AppText>
          }
          ListEmptyComponent={
            erreur ? <AppText style={st.erreur}>{erreur}</AppText> : <AppText style={st.vide}>Aucune alerte pour le moment.</AppText>
          }
          renderItem={({ item }) => (
            <View style={st.carte}>
              <TouchableOpacity onPress={() => ouvrirResultats(item)} accessibilityRole="button" accessibilityLabel={`Voir les annonces de l'alerte ${item.nom}`}>
                <AppText style={st.nom}>{item.nom}</AppText>
                <AppText style={st.resume}>{resume(item)}</AppText>
                {item.derniereNotification ? (
                  <AppText style={st.meta}>Dernière notification : {formatDate(item.derniereNotification)}</AppText>
                ) : null}
                {!item.active ? <AppText style={st.pause}>En pause</AppText> : null}
              </TouchableOpacity>
              <View style={st.actions}>
                <View style={st.interrupteur}>
                  <AppText style={st.meta}>Active</AppText>
                  <Switch value={item.active} onValueChange={(v) => basculer(item, v)} accessibilityLabel={`Alerte ${item.nom} active`} />
                </View>
                <TouchableOpacity onPress={() => { setRenommage(item); setNom(item.nom); }} accessibilityRole="button" accessibilityLabel="Renommer l'alerte">
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => supprimer(item)} accessibilityRole="button" accessibilityLabel="Supprimer l'alerte">
                  <Ionicons name="trash-outline" size={20} color={colors.errorText} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      <Sheet visible={renommage != null} onRequestClose={() => setRenommage(null)}>
        <View style={st.sheet}>
          <AppText style={st.titreSheet}>Renommer l’alerte</AppText>
          <Input label="Nom" value={nom} onChangeText={setNom} maxLength={80} accessibilityLabel="Nom de l'alerte" />
          <Button title="Enregistrer" fullWidth={false} onPress={renommer} disabled={!nom.trim()} />
        </View>
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  centre: { marginTop: spacing['3xl'] },
  liste: { padding: spacing.base, gap: spacing.sm },
  intro: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm },
  vide: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  erreur: { textAlign: 'center', color: colors.errorText, marginTop: spacing.xl },
  carte: {
    gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  nom: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  resume: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: typography.sizes.xs, color: colors.textMuted },
  pause: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.warningText, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  interrupteur: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginRight: 'auto' },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm,
  },
  titreSheet: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
});
