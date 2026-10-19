import AppText from '@/src/components/AppText';
import { regenererCodesSecours } from '@/src/api/auth.api';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { CodesSecoursListe } from '@/src/features/profile/CodesSecoursListe';
import { colors, radius, spacing, typography } from '@/src/theme';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

/**
 * Codes de secours du staff (double authentification) : en générer de nouveaux annule les précédents.
 * Le mot de passe est redemandé : une session volée ne peut pas en créer.
 */
export default function RegenererCodesSecoursScreen() {
  const [motDePasse, setMotDePasse] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const generer = async () => {
    if (!motDePasse) {
      setErreur('Saisissez votre mot de passe.');
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      setCodes(await regenererCodesSecours(motDePasse));
      setMotDePasse('');
    } catch (err: unknown) {
      setErreur((err as { message?: string })?.message ?? 'Impossible de générer de nouveaux codes. Réessayez.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={s.contenu} keyboardShouldPersistTaps="handled">
      {codes ? (
        <>
          <AlertBanner
            variant="info"
            message="Voici vos nouveaux codes. Les précédents ne fonctionnent plus. Ils ne seront plus affichés : conservez-les dans un endroit sûr."
          />
          <CodesSecoursListe codes={codes} />
        </>
      ) : (
        <>
          <AppText style={s.texte}>
            Les codes de secours remplacent le code reçu par email quand votre messagerie est indisponible. Chaque
            code ne sert qu’une fois. En générer de nouveaux annule tous les codes actuels.
          </AppText>
          {erreur ? <AlertBanner message={erreur} variant="error" /> : null}
          <Input
            label="Mot de passe"
            placeholder="Votre mot de passe"
            value={motDePasse}
            onChangeText={setMotDePasse}
            isPassword
            autoComplete="password"
            onSubmitEditing={generer}
          />
          <Button title="Générer de nouveaux codes" onPress={generer} isLoading={enCours} />
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  contenu: { padding: spacing.base, gap: spacing.base, maxWidth: 560, width: '100%', alignSelf: 'center' },
  texte: { fontSize: typography.sizes.md, color: colors.textSecondary, lineHeight: 22, borderRadius: radius.md },
});
