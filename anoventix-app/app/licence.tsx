import { webColumnStyle } from '@/src/lib/responsive';
import { activerLicence } from '@/src/api/licence.api';
import AppText from '@/src/components/AppText';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { useLicenceStore } from '@/src/stores/licence.store';
import { STATUT_LICENCE_LABELS, TYPE_LICENCE_LABELS } from '@/src/types/licence.types';
import { LEGAL_LINKS } from '@/src/constants/legal';
import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { formatDate, formatPrix, getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';

// Premier message pré-rempli : l'admin sait tout de suite quel type de licence préparer.
function buildWhatsAppUrl(telephone: string, typeLabel: string): string {
  const numero = telephone.replace(/\D/g, '').replace(/^00/, '');
  const message = `Bonjour, je souhaite acheter une licence annuelle ${typeLabel} AnoventiX.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

export default function LicenceScreen() {
  const user = useAuthStore((st) => st.user);
  const { isProfessionnel } = getRoleFlags(user?.roles);
  const licence = useLicenceStore((st) => st.licence);
  const loadLicence = useLicenceStore((st) => st.load);
  const setLicence = useLicenceStore((st) => st.setLicence);
  const [isLoading, setIsLoading] = useState(!licence);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cle, setCle] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const l = await loadLicence();
    if (!l) setLoadError('Impossible de charger votre licence.');
    setIsLoading(false);
  }, [loadLicence]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleActiver = async () => {
    if (!cle.trim()) {
      setFeedback({ variant: 'error', message: 'Saisissez votre clé de licence.' });
      return;
    }
    setFeedback(null);
    setIsActivating(true);
    try {
      const l = await activerLicence(cle.trim());
      setLicence(l);
      setCle('');
      setFeedback({ variant: 'success', message: `Licence activée jusqu'au ${formatDate(l.dateFin!)}.` });
    } catch (err) {
      setFeedback({ variant: 'error', message: getErrorMessage(err, "Impossible d'activer cette clé.") });
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!licence) {
    return (
      <View style={s.center}>
        <AlertBanner message={loadError ?? 'Licence indisponible.'} variant="error" />
        <Button title="Réessayer" fullWidth={false} onPress={load} />
      </View>
    );
  }

  const active = licence.statut === 'ACTIVE';
  // Type acheté = type du compte (aucune licence courante avant le premier achat).
  const typeLabel = TYPE_LICENCE_LABELS[isProfessionnel ? 'PROFESSIONNEL' : 'PARTICULIER'].toLowerCase();
  const contact = licence.contactTelephone;
  const enTrop = licence.annoncesActives - licence.annoncesGratuites;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.container, webColumnStyle('form')]}>
      {/* Compte bloqué : ce qui est limité et les deux façons d'en sortir. */}
      {licence.bloque && (
        <View style={[s.card, s.bloqueCard]} accessibilityRole="alert">
          <View style={s.statutRow}>
            <Ionicons name="lock-closed" size={20} color={colors.errorText} />
            <AppText style={s.bloqueTitre}>Compte limité</AppText>
          </View>
          <AppText style={s.bloqueTexte}>
            {licence.partage
              ? `La licence de votre entreprise n'est plus valide et l'entreprise a ${licence.annoncesActives} annonces actives pour ${licence.annoncesGratuites} gratuites. Contactez votre responsable (${licence.compteOwner}) pour la renouveler.`
              : `Vous avez ${licence.annoncesActives} annonces actives pour ${licence.annoncesGratuites} gratuites, sans licence valide.`}
          </AppText>
          <AppText style={s.bloqueTexte}>
            Publier, modifier ou remettre une annonce en ligne est bloqué. Vos annonces restent
            visibles et la messagerie reste disponible.
          </AppText>
          {!licence.partage && (
            <>
              <AppText style={s.bloqueTexte}>
                Pour débloquer : activez une licence ci-dessous, ou clôturez {enTrop} annonce{enTrop > 1 ? 's' : ''}.
              </AppText>
              <Button
                title="Gérer mes annonces"
                variant="secondary"
                leftIcon={<Ionicons name="list-outline" size={18} color={colors.primary} />}
                onPress={() => router.push('/(tabs)/mes-annonces')}
              />
            </>
          )}
        </View>
      )}

      {loadError && <AlertBanner message={loadError} variant="error" />}

      {/* Statut */}
      <View style={s.card}>
        <View style={s.statutRow}>
          <View style={[s.iconWrap, { backgroundColor: active ? colors.successLight : colors.background }]}>
            <Ionicons name="key-outline" size={22} color={active ? colors.successText : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={s.statutLabel}>{STATUT_LICENCE_LABELS[licence.statut]}</AppText>
            {licence.type && (
              <AppText style={s.meta}>Licence {TYPE_LICENCE_LABELS[licence.type].toLowerCase()}</AppText>
            )}
          </View>
        </View>
        {licence.dateFin && (
          <AppText style={s.meta}>
            {active ? 'Valable jusqu’au ' : 'Expirée depuis le '}
            {formatDate(licence.dateFin)}
          </AppText>
        )}
        {licence.partage && licence.compteOwner && (
          <AppText style={s.meta}>Licence de votre entreprise, gérée par {licence.compteOwner}.</AppText>
        )}
        <AppText style={s.hint}>
          {licence.annoncesGratuites} annonces actives sont gratuites. Au-delà, une licence annuelle
          valide est nécessaire pour publier ou remettre une annonce en ligne.
        </AppText>
      </View>

      {/* Achat : paiement hors application, la clé est envoyée par AnoventiX. */}
      {!licence.partage && (
        <View style={s.card}>
          <AppText style={s.cardTitle}>Obtenir une licence</AppText>
          {licence.prix != null && (
            <AppText style={s.prix}>
              {formatPrix(licence.prix)} <AppText style={s.prixSuffix}>/ an</AppText>
            </AppText>
          )}
          <AppText style={s.meta}>
            Contactez AnoventiX pour régler votre licence (Orange Money, MTN MoMo…). Vous recevrez
            une clé à saisir ci-dessous.
          </AppText>
          {contact ? (
            <View style={s.contactRow}>
              <Button
                title="WhatsApp"
                variant="secondary"
                fullWidth={false}
                style={s.contactBtn}
                leftIcon={<Ionicons name="logo-whatsapp" size={18} color={colors.whatsapp} />}
                onPress={() => Linking.openURL(buildWhatsAppUrl(contact, typeLabel))}
                accessibilityLabel="Acheter une licence via WhatsApp"
              />
              <Button
                title="Appeler"
                variant="secondary"
                fullWidth={false}
                style={s.contactBtn}
                leftIcon={<Ionicons name="call-outline" size={18} color={colors.primary} />}
                onPress={() => Linking.openURL(`tel:${contact}`)}
                accessibilityLabel="Appeler AnoventiX pour acheter une licence"
              />
            </View>
          ) : (
            <Button
              title={LEGAL_LINKS.supportEmail}
              variant="secondary"
              leftIcon={<Ionicons name="mail-outline" size={18} color={colors.primary} />}
              onPress={() => Linking.openURL(`mailto:${LEGAL_LINKS.supportEmail}?subject=${encodeURIComponent('Achat de licence AnoventiX')}`)}
              accessibilityLabel="Écrire à AnoventiX pour acheter une licence"
            />
          )}
        </View>
      )}

      {/* Activation (le titulaire uniquement : un agent dépend de son professionnel) */}
      {!licence.partage && (
        <View style={s.card}>
          <AppText style={s.cardTitle}>{active ? 'Renouveler ma licence' : 'Activer une licence'}</AppText>
          {active && (
            <AppText style={s.meta}>La nouvelle année démarrera à la fin de la licence en cours.</AppText>
          )}
          {feedback && <AlertBanner message={feedback.message} variant={feedback.variant} />}
          <Input
            label="Clé de licence"
            placeholder="ANX-XXXX-XXXX-XXXX"
            value={cle}
            onChangeText={(t) => setCle(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button title="Activer" onPress={handleActiver} isLoading={isActivating} />
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.base, gap: spacing.md, paddingBottom: spacing['4xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  statutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statutLabel: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  hint: { fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 18, marginTop: spacing.xs },
  bloqueCard: { borderColor: colors.errorLight, borderWidth: 1, backgroundColor: colors.errorLight },
  bloqueTitre: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.errorText },
  bloqueTexte: { fontSize: typography.sizes.sm, color: colors.errorText, lineHeight: 20 },
  prix: { fontSize: typography.sizes.xl, fontWeight: '800', color: colors.primary },
  prixSuffix: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textMuted },
  contactRow: { flexDirection: 'row', gap: spacing.sm },
  contactBtn: { flex: 1 },
});
