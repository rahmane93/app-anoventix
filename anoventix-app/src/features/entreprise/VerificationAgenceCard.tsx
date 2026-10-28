import AppText from '@/src/components/AppText';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { multipartPost } from '@/src/api/multipart';
import { colors, radius, spacing, typography } from '@/src/theme';
import { getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

// ─── Vérification de l'agence (DEC-04, RG-07-23 à RG-07-28) ──────────────────

type StatutVerification = 'NON_VERIFIEE' | 'EN_ATTENTE' | 'VERIFIEE' | 'REJETEE';

interface Props {
  entrepriseId: string;
  statut?: StatutVerification;
  motifRejet?: string | null;
  /** Appelé après un envoi réussi, pour recharger l'entreprise. */
  onEnvoye: () => void;
}

const LIBELLES: Record<StatutVerification, { titre: string; texte: string; icone: React.ComponentProps<typeof Ionicons>['name']; couleur: string }> = {
  NON_VERIFIEE: {
    titre: 'Agence non vérifiée',
    texte: 'Envoyez votre extrait RCCM pour obtenir le badge « Agence vérifiée » sur votre page et vos annonces.',
    icone: 'shield-outline',
    couleur: colors.textSecondary,
  },
  EN_ATTENTE: {
    titre: 'Vérification en cours',
    texte: 'La modération contrôle votre justificatif. Vous recevrez un email avec sa décision.',
    icone: 'time-outline',
    couleur: colors.warningText,
  },
  VERIFIEE: {
    titre: 'Agence vérifiée',
    texte: 'Le badge est affiché. Le nom et le numéro RCCM ne peuvent plus être modifiés sans passer par le support.',
    icone: 'shield-checkmark',
    couleur: colors.successText,
  },
  REJETEE: {
    titre: 'Vérification refusée',
    texte: 'Corrigez ce qui est signalé puis renvoyez un justificatif.',
    icone: 'close-circle-outline',
    couleur: colors.errorText,
  },
};

export function VerificationAgenceCard({ entrepriseId, statut = 'NON_VERIFIEE', motifRejet, onEnvoye }: Props) {
  const [envoi, setEnvoi] = useState(false);
  const info = LIBELLES[statut];
  const peutEnvoyer = statut === 'NON_VERIFIEE' || statut === 'REJETEE';

  const choisirEtEnvoyer = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets[0]) return;
    const f = res.assets[0];
    if (f.size && f.size > 10 * 1024 * 1024) {
      appAlert('Fichier trop volumineux', 'Le justificatif ne peut pas dépasser 10 Mo.');
      return;
    }
    setEnvoi(true);
    try {
      const formData = new FormData();
      formData.append('justificatif', {
        uri: f.uri,
        name: f.name ?? 'rccm',
        type: f.mimeType ?? 'image/jpeg',
      } as never);
      await multipartPost<unknown>(`/api/entreprises/${entrepriseId}/verification`, formData);
      appAlert('Justificatif envoyé', 'La modération va le contrôler. Vous serez prévenu par email.');
      onEnvoye();
    } catch (err) {
      appAlert('Envoi impossible', getErrorMessage(err, "Le justificatif n'a pas pu être envoyé."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <View style={st.card} accessibilityLabel={`Vérification de l'agence : ${info.titre}`}>
      <View style={st.ligne}>
        <Ionicons name={info.icone} size={20} color={info.couleur} />
        <AppText style={[st.titre, { color: info.couleur }]}>{info.titre}</AppText>
      </View>
      {statut === 'REJETEE' && motifRejet ? <AppText style={st.motif}>Motif : {motifRejet}</AppText> : null}
      <AppText style={st.texte}>{info.texte}</AppText>
      {peutEnvoyer ? (
        <Button
          title={statut === 'REJETEE' ? 'Renvoyer un justificatif' : 'Envoyer une photo de mon extrait RCCM'}
          size="sm"
          fullWidth={false}
          isLoading={envoi}
          leftIcon={<Ionicons name="document-attach-outline" size={16} color={colors.white} />}
          onPress={choisirEtEnvoyer}
          accessibilityLabel="Envoyer une photo de l'extrait RCCM"
        />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    gap: spacing.sm, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.white, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titre: { fontSize: typography.sizes.md, fontWeight: '700' },
  motif: { fontSize: typography.sizes.sm, color: colors.errorText },
  texte: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20 },
});
