import { getEntrepriseByUserId } from '@/src/api/entreprise.api';
import { colors } from '@/src/theme';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AppText from '@/src/components/AppText';

export default function EntrepriseByUserScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  useEffect(() => {
    if (!userId) return;
    getEntrepriseByUserId(userId)
      .then((entreprise) => {
        router.replace(`/entreprise-publique/${entreprise.id}` as any);
      })
      .catch(() => {
        // stay on this screen to show error
      });
  }, [userId]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Entreprise', headerBackTitle: '' }} />
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText style={{ color: colors.textSecondary, fontSize: 14 }}>Chargement…</AppText>
    </View>
  );
}
