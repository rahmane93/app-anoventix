import {
    desactiverEntreprise,
    getAdminEntrepriseById,
    getQuotasPro,
    reactiverEntreprise,
    setQuotasEntreprise,
} from '@/src/api/admin.api';
import { buildMediaUrl } from '@/src/api/annonce.api';
import { getEntrepriseAgents } from '@/src/api/entreprise.api';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { AdminEntreprise, QuotasPro, StatutUtilisateur } from '@/src/types/admin.types';
import { STATUT_USER_LABELS } from '@/src/types/admin.types';
import type { AgentDTO } from '@/src/types/entreprise.types';
import { USER_STATUT_TONE, quotaTone } from '@/src/features/admin/status';
import {
    Avatar,
    ErrorState,
    FieldRow,
    ListRow,
    LoadingState,
    RowSeparator,
    Section,
    StatusBadge,
    TONES,
    webColumn,
} from '@/src/features/admin/ui';
import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { useUserStore } from '@/src/stores/user.store';
import { getErrorMessage } from '@/src/utils/format';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { useShallow } from 'zustand/react/shallow';

function formatDateLongue(raw: string): string {
  return new Date(raw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function ouvrirFiche(userId: string) {
  router.push(`/(tabs)/administration/users/${userId}` as any);
}

function QuotaBar({ used, total, label, personnalise }: { used: number; total: number; label: string; personnalise?: boolean }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const tone = quotaTone(used, total);
  const color = tone === 'neutral' ? colors.primary : TONES[tone].dot;
  return (
    <View style={s.quota}>
      <View style={s.quotaHeader}>
        <View style={s.quotaTitle}>
          <AppText style={s.quotaLabel}>{label}</AppText>
          <AppText style={s.quotaSource}>{personnalise ? 'Valeur propre à l’entreprise' : 'Valeur globale'}</AppText>
        </View>
        <AppText style={[s.quotaCount, tone !== 'neutral' && { color: TONES[tone].fg }]}>{used} / {total}</AppText>
      </View>
      <View style={s.quotaTrack}>
        <View style={[s.quotaFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Champ vide = valeur globale. */
const versQuota = (t: string): number | null => (t.trim() ? Number(t) : null);
const chiffres = (t: string) => t.replace(/[^0-9]/g, '');

function QuotasModal({
  visible,
  entreprise,
  onClose,
  onSaved,
}: {
  visible: boolean;
  entreprise: AdminEntreprise;
  onClose: () => void;
  onSaved: (e: AdminEntreprise) => void;
}) {
  const [agents, setAgents] = useState(entreprise.quotaAgentsPersonnalise ? String(entreprise.quotaAgents) : '');
  const [annonces, setAnnonces] = useState(entreprise.quotaAnnoncesPersonnalise ? String(entreprise.quotaAnnonces) : '');
  const [globaux, setGlobaux] = useState<QuotasPro | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) getQuotasPro().then(setGlobaux).catch(() => setGlobaux(null));
  }, [visible]);

  const enregistrer = async (quotas: QuotasPro) => {
    setSaving(true);
    try {
      onSaved(await setQuotasEntreprise(entreprise.id, quotas));
      onClose();
    } catch (e) {
      appAlert("Quotas non modifiés", getErrorMessage(e, 'Impossible de modifier les quotas.'));
    } finally {
      setSaving(false);
    }
  };

  const globale = (v?: number | null) => (v != null ? `Valeur globale (${v})` : 'Valeur globale');

  return (
    <Dialog visible={visible} onRequestClose={onClose} dimColor="rgba(0,0,0,0.5)">
      <View style={s.modalBox}>
        <AppText style={s.modalTitle}>Quotas de {entreprise.nom}</AppText>
        <AppText style={s.modalSub}>Laissez un champ vide pour appliquer la valeur globale.</AppText>
        <Input
          label="Agents maximum"
          placeholder={globale(globaux?.quotaAgents)}
          value={agents}
          onChangeText={(t) => setAgents(chiffres(t))}
          keyboardType="number-pad"
        />
        <Input
          label="Annonces actives maximum"
          placeholder={globale(globaux?.quotaAnnonces)}
          value={annonces}
          onChangeText={(t) => setAnnonces(chiffres(t))}
          keyboardType="number-pad"
        />
        <Button
          title="Enregistrer"
          onPress={() => enregistrer({ quotaAgents: versQuota(agents), quotaAnnonces: versQuota(annonces) })}
          isLoading={saving}
        />
        <Button title="Annuler" variant="ghost" onPress={onClose} disabled={saving} />
      </View>
    </Dialog>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EntrepriseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Données et erreur rattachées à l'id chargé : le chargement en est dérivé
  // (pas de setState synchrone dans l'effet) et un changement d'id repart à zéro.
  const [data, setData] = useState<{ id: string; entreprise: AdminEntreprise; agents: AgentDTO[] } | null>(null);
  const [loadError, setLoadError] = useState<{ id: string; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quotasOpen, setQuotasOpen] = useState(false);
  const [changingStatut, setChangingStatut] = useState(false);
  const { user } = useAuthStore(useShallow((s) => ({ user: s.user })));
  const { profile } = useUserStore(useShallow((s) => ({ profile: s.profile })));
  const { isAdministrateur: isAdmin } = getRoleFlags(profile?.roles ?? profile?.role ?? user?.roles);

  const entreprise = data?.id === id ? data.entreprise : null;
  const agents = data?.id === id ? data.agents : [];
  const error = loadError?.id === id ? loadError.message : null;
  const isLoading = !entreprise && !error;

  // setState uniquement dans les callbacks de la promesse (jamais de façon synchrone).
  const fetchData = () =>
    Promise.all([
      getAdminEntrepriseById(id),
      getEntrepriseAgents(id).catch(() => [] as AgentDTO[]),
    ])
      .then(([ent, agentsList]) => {
        setData({ id, entreprise: ent, agents: agentsList });
        setLoadError(null);
      })
      .catch(() => {
        setLoadError({ id, message: "Impossible de charger les informations de l'entreprise." });
      })
      .finally(() => setIsRefreshing(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [id]);

  if (isLoading) return <View style={s.page}><LoadingState /></View>;

  if (error || !entreprise) {
    return (
      <View style={s.page}>
        <ErrorState message={error ?? 'Entreprise introuvable.'} onRetry={() => { setLoadError(null); fetchData(); }} />
      </View>
    );
  }

  // Désactivation confirmée (effet immédiat pour le propriétaire et ses agents) ;
  // réactivation directe. On recharge ensuite la fiche pour afficher l'état réel.
  const appliquerStatut = async (activer: boolean) => {
    setChangingStatut(true);
    try {
      if (activer) await reactiverEntreprise(entreprise.id);
      else await desactiverEntreprise(entreprise.id);
      await fetchData();
      appAlert(activer ? 'Entreprise réactivée' : 'Entreprise désactivée',
        activer
          ? `${entreprise.nom} est de nouveau active.`
          : `${entreprise.nom} est désactivée. Vous pourrez la réactiver depuis cette fiche.`);
    } catch (e) {
      appAlert(activer ? 'Réactivation impossible' : 'Désactivation impossible',
        getErrorMessage(e, activer ? "L'entreprise n'a pas été réactivée." : "L'entreprise n'a pas été désactivée."));
    } finally {
      setChangingStatut(false);
    }
  };
  const confirmerDesactivation = () =>
    appAlert(
      `Désactiver ${entreprise.nom} ?`,
      "L'entreprise ne sera plus active pour son propriétaire et ses agents. Vous pourrez la réactiver à tout moment.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Désactiver', style: 'destructive', onPress: () => appliquerStatut(false) },
      ],
    );

  const agentsUsed = entreprise.quotaAgents - entreprise.agentsRestants;
  const annoncesUsed = entreprise.quotaAnnonces - entreprise.annoncesRestantes;
  const photoUri = entreprise.photoProfil ? buildMediaUrl(entreprise.photoProfil) : null;

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={[s.content, webColumn]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { setIsRefreshing(true); fetchData(); }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* En-tête */}
      <View style={s.header}>
        <Avatar name={entreprise.nom} uri={photoUri} size={56} />
        <View style={s.headerBody}>
          <AppText style={s.headerNom}>{entreprise.nom}</AppText>
          <StatusBadge label={entreprise.active ? 'Active' : 'Inactive'} tone={entreprise.active ? 'success' : 'danger'} />
        </View>
      </View>
      {entreprise.description ? (
        <AppText style={s.description}>{entreprise.description}</AppText>
      ) : null}

      <Section title="Propriétaire">
        <ListRow
          leading={<Avatar name={entreprise.annonceurProfessionnelUsername} />}
          title={entreprise.annonceurProfessionnelUsername}
          subtitle={entreprise.annonceurProfessionnelEmail}
          onPress={() => ouvrirFiche(entreprise.annonceurProfessionnelId)}
          accessibilityLabel={`Propriétaire ${entreprise.annonceurProfessionnelUsername}, ouvrir sa fiche`}
        />
      </Section>

      <Section title="Coordonnées">
        <FieldRow label="Téléphone" value={entreprise.telephone}
          onPress={entreprise.telephone ? () => Linking.openURL(`tel:${entreprise.telephone}`) : undefined} />
        <FieldRow label="Email" value={entreprise.email}
          onPress={entreprise.email ? () => Linking.openURL(`mailto:${entreprise.email}`) : undefined} />
        <FieldRow label="Site web" value={entreprise.siteWeb}
          onPress={entreprise.siteWeb ? () => Linking.openURL(entreprise.siteWeb!) : undefined} />
        <FieldRow label="Adresse" value={entreprise.adresse} />
        <FieldRow label="Ville" value={[entreprise.ville, entreprise.pays].filter(Boolean).join(', ')} />
        <FieldRow label="RCCM" value={entreprise.numeroRCCM} />
        <FieldRow label="Créée le" value={formatDateLongue(entreprise.dateCreation)}
          last={!entreprise.dateModification} />
        {entreprise.dateModification ? (
          <FieldRow label="Modifiée le" value={formatDateLongue(entreprise.dateModification)} last />
        ) : null}
      </Section>

      <Section
        title="Quotas"
        padded
        trailing={isAdmin ? (
          <TouchableOpacity onPress={() => setQuotasOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Modifier les quotas de l'entreprise">
            <AppText style={s.sectionAction}>Modifier</AppText>
          </TouchableOpacity>
        ) : undefined}
      >
        <QuotaBar used={annoncesUsed} total={entreprise.quotaAnnonces} label="Annonces actives"
          personnalise={entreprise.quotaAnnoncesPersonnalise} />
        <QuotaBar used={agentsUsed} total={entreprise.quotaAgents} label="Agents"
          personnalise={entreprise.quotaAgentsPersonnalise} />
      </Section>

      <Section title={`Agents (${agents.length})`}>
        {agents.length === 0 ? (
          <AppText style={s.vide}>Aucun agent enregistré.</AppText>
        ) : (
          agents.map((agent, i) => {
            const fullName = [agent.prenom, agent.nom].filter(Boolean).join(' ') || agent.email;
            const statut = agent.statut as StatutUtilisateur;
            return (
              <View key={agent.id}>
                {i > 0 && <RowSeparator />}
                <ListRow
                  leading={<Avatar name={fullName} />}
                  title={fullName}
                  subtitle={agent.email}
                  trailing={
                    <StatusBadge
                      label={STATUT_USER_LABELS[statut] ?? agent.statut}
                      tone={USER_STATUT_TONE[statut] ?? 'neutral'}
                    />
                  }
                  onPress={() => ouvrirFiche(agent.id)}
                />
              </View>
            );
          })
        )}
      </Section>

      {isAdmin ? (
        <Section
          title="Statut du compte"
          padded
          footer={entreprise.active
            ? "La désactivation suspend l'entreprise ; elle reste réactivable."
            : "Entreprise désactivée par son propriétaire ou par un administrateur."}
        >
          {entreprise.active ? (
            <Button
              title="Désactiver l'entreprise"
              variant="dangerOutline"
              onPress={confirmerDesactivation}
              isLoading={changingStatut}
            />
          ) : (
            <Button
              title="Réactiver l'entreprise"
              onPress={() => appliquerStatut(true)}
              isLoading={changingStatut}
            />
          )}
        </Section>
      ) : null}

      {isAdmin ? (
        <QuotasModal
          key={quotasOpen ? 'ouverte' : 'fermee'}
          visible={quotasOpen}
          entreprise={entreprise}
          onClose={() => setQuotasOpen(false)}
          onSaved={(e) => setData((d) => (d ? { ...d, entreprise: e } : d))}
        />
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing['4xl'] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBody: { flex: 1, gap: 4 },
  headerNom: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.textPrimary },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  vide: { fontSize: typography.sizes.sm, color: colors.textMuted, padding: spacing.base },
  quota: { gap: 6 },
  quotaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  quotaTitle: { gap: 1 },
  quotaSource: { fontSize: typography.sizes.xs, color: colors.textMuted },
  sectionAction: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.primary },
  modalBox: { width: '88%', maxWidth: 420, backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  modalSub: { fontSize: typography.sizes.sm, color: colors.textMuted },
  quotaLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  quotaCount: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary },
  quotaTrack: { height: 6, backgroundColor: colors.track, borderRadius: radius.full, overflow: 'hidden' },
  quotaFill: { height: '100%', borderRadius: radius.full },
});
