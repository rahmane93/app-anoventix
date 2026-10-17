import { getQuotasPro, setQuotasPro } from '@/src/api/admin.api';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ErrorBanner, LoadingState, Section, webColumn } from '@/src/features/admin/ui';
import { colors, spacing } from '@/src/theme';
import { getErrorMessage } from '@/src/utils/format';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

const chiffres = (t: string) => t.replace(/[^0-9]/g, '');

/** Quotas globaux des comptes pro : s'appliquent à toute entreprise sans valeur propre. */
export default function AdminQuotas() {
  const [agents, setAgents] = useState('');
  const [annonces, setAnnonces] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const charger = async () => {
    setLoadError(null);
    try {
      const q = await getQuotasPro();
      setAgents(String(q.quotaAgents ?? ''));
      setAnnonces(String(q.quotaAnnonces ?? ''));
      setLoaded(true);
    } catch (e) {
      setLoadError(getErrorMessage(e, 'Impossible de charger les quotas.'));
    }
  };

  useFocusEffect(useCallback(() => { charger(); }, []));

  const valide = agents.trim() !== '' && annonces.trim() !== '';

  const enregistrer = async () => {
    if (!valide) return;
    setSaving(true);
    setFeedback(null);
    try {
      const q = await setQuotasPro({ quotaAgents: Number(agents), quotaAnnonces: Number(annonces) });
      setAgents(String(q.quotaAgents));
      setAnnonces(String(q.quotaAnnonces));
      setFeedback({ variant: 'success', message: 'Quotas enregistrés.' });
    } catch (e) {
      setFeedback({ variant: 'error', message: getErrorMessage(e, "Impossible d'enregistrer les quotas.") });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded && !loadError) return <LoadingState />;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.container, webColumn]} keyboardShouldPersistTaps="handled">
      {loadError ? <ErrorBanner message={loadError} onRetry={charger} /> : null}
      <Section
        title="Comptes professionnels"
        padded
        footer="S'applique à toutes les entreprises, sauf celles dont la fiche porte une valeur propre. Une entreprise déjà au-delà garde ses agents et annonces, mais ne peut plus en ajouter."
      >
        {feedback ? <AlertBanner message={feedback.message} variant={feedback.variant} /> : null}
        <Input
          label="Agents maximum par entreprise"
          value={agents}
          onChangeText={(t) => setAgents(chiffres(t))}
          keyboardType="number-pad"
          error={agents.trim() === '' ? 'Requis' : undefined}
        />
        <Input
          label="Annonces actives maximum par entreprise"
          value={annonces}
          onChangeText={(t) => setAnnonces(chiffres(t))}
          keyboardType="number-pad"
          error={annonces.trim() === '' ? 'Requis' : undefined}
        />
        <Button title="Enregistrer" onPress={enregistrer} isLoading={saving} disabled={!valide || !!loadError} />
      </Section>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: spacing['4xl'] },
});
