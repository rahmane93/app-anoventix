import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { apiClient } from '@/src/api/client';
import { ANDROID_APK_URL } from '@/src/constants/download';
import { comparerVersions } from '@/src/lib/version';
import { colors, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

// Version minimale exigée par l'API (RG-12-21) : une app plus ancienne est bloquée sur cet écran jusqu'à la mise
// à jour. Le site web est toujours à jour : pas de contrôle. Une API injoignable ne bloque jamais l'app.

type Exigence = { versionMinimale: string; urlMiseAJour?: string };

export function MiseAJourRequise() {
  const [exigence, setExigence] = useState<Exigence | null>(null);
  const version = Constants.expoConfig?.version ?? '0.0.0';

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let actif = true;
    apiClient
      .get<Exigence>('/api/app/version')
      .then((r) => {
        if (actif && comparerVersions(version, r.data.versionMinimale) < 0) setExigence(r.data);
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [version]);

  if (!exigence) return null;
  return (
    <View style={s.fond} accessibilityViewIsModal>
      <Ionicons name="cloud-download-outline" size={56} color={colors.primary} />
      <AppText style={s.titre} accessibilityRole="header">Mise à jour requise</AppText>
      <AppText style={s.texte}>
        Cette version de l’application ({version}) n’est plus prise en charge. Installez la version{' '}
        {exigence.versionMinimale} ou plus récente pour continuer.
      </AppText>
      <Button title="Mettre à jour" onPress={() => Linking.openURL(exigence.urlMiseAJour || ANDROID_APK_URL)} />
    </View>
  );
}

const s = StyleSheet.create({
  fond: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
    zIndex: 1000,
  },
  titre: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  texte: { fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
