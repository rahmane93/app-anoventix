import AppText from '@/src/components/AppText';
import { appAlert } from '@/src/components/ui/app-alert';
import * as notificationApi from '@/src/api/notification.api';
import { demanderPermissionEtEnregistrer } from '@/src/lib/push';
import { colors, radius, spacing, typography } from '@/src/theme';
import { getErrorMessage } from '@/src/utils/format';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

/**
 * Notifications push du profil (RG-11-09) : « Nouveaux messages » et « Alertes de recherche ». Les emails
 * transactionnels restent obligatoires. Sur le web, il n'y a pas de notification push pour l'instant.
 */
export function NotificationsCard() {
  const [valeurs, setValeurs] = useState<notificationApi.InterrupteursNotifications | null>(null);

  useFocusEffect(
    useCallback(() => {
      notificationApi.getInterrupteurs().then(setValeurs).catch(() => {});
    }, []),
  );

  if (!valeurs) return null;

  const changer = async (patch: Partial<notificationApi.InterrupteursNotifications>) => {
    const suivant = { ...valeurs, ...patch };
    setValeurs(suivant);
    try {
      await notificationApi.setInterrupteurs(suivant);
      // Rallumer un interrupteur est le bon moment pour (re)proposer la permission du système.
      if (Object.values(patch).some(Boolean)) demanderPermissionEtEnregistrer();
    } catch (e) {
      setValeurs(valeurs);
      appAlert('Réglage inchangé', getErrorMessage(e, "Le réglage n'a pas pu être enregistré."));
    }
  };

  return (
    <View style={st.card}>
      <Ligne
        titre="Nouveaux messages"
        detail="Une notification quand un interlocuteur vous écrit, sans le contenu du message."
        valeur={valeurs.messages}
        onChange={(v) => changer({ messages: v })}
      />
      <View style={st.separateur} />
      <Ligne
        titre="Alertes de recherche"
        detail="Une notification au plus par jour et par alerte, avec le nombre de nouvelles annonces."
        valeur={valeurs.alertes}
        onChange={(v) => changer({ alertes: v })}
      />
      {Platform.OS === 'web' ? (
        <AppText style={st.note}>Les notifications push sont disponibles dans l’application Android.</AppText>
      ) : null}
    </View>
  );
}

function Ligne({ titre, detail, valeur, onChange }: { titre: string; detail: string; valeur: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={st.ligne}>
      <View style={st.texte}>
        <AppText style={st.titre}>{titre}</AppText>
        <AppText style={st.detail}>{detail}</AppText>
      </View>
      <Switch value={valeur} onValueChange={onChange} accessibilityLabel={titre} />
    </View>
  );
}

const st = StyleSheet.create({
  // Même gabarit que les autres cartes du profil (menuCard de profile.tsx).
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.md,
    marginHorizontal: spacing.base, marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texte: { flex: 1, gap: 2 },
  titre: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.textPrimary },
  detail: { fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 17 },
  separateur: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  note: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: spacing.sm },
});
