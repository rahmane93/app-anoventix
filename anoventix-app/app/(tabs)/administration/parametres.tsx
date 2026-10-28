import AppText from '@/src/components/AppText';
import { getParametres, setParametres } from '@/src/api/admin.api';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { colors, radius, spacing, typography } from '@/src/theme';
import { getErrorMessage } from '@/src/utils/format';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

// ─── Paramètres de la modération (RG-10-19, DEC-11) ──────────────────────────
// Seuil de masquage automatique : nombre de signalements « arnaque / fraude » de signaleurs distincts
// qui masquent une annonce en attendant la décision. 0 désactive le masquage automatique.

export default function ParametresScreen() {
  const [seuil, setSeuil] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    let actif = true;
    getParametres()
      .then((p) => {
        if (actif) setSeuil(String(p.seuilMasquageAuto));
      })
      .catch((e) => {
        if (actif) setErreur(getErrorMessage(e, 'Impossible de charger les paramètres.'));
      });
    return () => {
      actif = false;
    };
  }, []);

  const valeur = seuil != null && /^\d{1,2}$/.test(seuil.trim()) ? Number(seuil.trim()) : null;
  const valide = valeur != null && valeur <= 50;

  const enregistrer = async () => {
    if (!valide) return;
    setEnregistrement(true);
    try {
      const p = await setParametres({ seuilMasquageAuto: valeur! });
      setSeuil(String(p.seuilMasquageAuto));
      appAlert('Paramètres enregistrés', p.seuilMasquageAuto === 0
        ? 'Le masquage automatique est désactivé.'
        : `Une annonce est masquée dès ${p.seuilMasquageAuto} signalements « arnaque / fraude ».`);
    } catch (e) {
      appAlert('Paramètres non enregistrés', getErrorMessage(e, "Le réglage n'a pas été enregistré."));
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Paramètres' }} />
      <ScrollView contentContainerStyle={s.contenu}>
        {erreur ? <AppText style={s.erreur}>{erreur}</AppText> : null}
        {seuil == null && !erreur ? <ActivityIndicator color={colors.primary} /> : null}
        {seuil != null ? (
          <View style={s.carte}>
            <AppText style={s.titre}>Masquage automatique</AppText>
            <AppText style={s.aide}>
              Nombre de signalements « arnaque / fraude », venant de comptes différents, qui masquent une annonce en
              attendant la décision de la modération. 0 désactive le masquage automatique.
            </AppText>
            <Input
              label="Seuil (0 à 50)"
              value={seuil}
              onChangeText={setSeuil}
              keyboardType="number-pad"
              error={valide ? undefined : 'Nombre entre 0 et 50'}
            />
            <Button title="Enregistrer" onPress={enregistrer} disabled={!valide} isLoading={enregistrement} />
          </View>
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
  aide: { fontSize: typography.sizes.sm, color: colors.textSecondary },
});
