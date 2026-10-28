import { LIST_PERF_PROPS } from '@/src/constants/list';
import { MOTIF_LABELS } from '@/src/api/annonce.api';
import { Sheet } from '@/src/components/ui/sheet';
import { useAdminStore } from '@/src/stores/admin.store';
import { getErrorMessage } from '@/src/utils/format';
import { colors, radius, spacing, typography } from '@/src/theme';
import {
    STATUT_SIGNALEMENT_LABELS,
    type DecisionSignalementRequest,
    type Signalement,
    type StatutSignalement,
} from '@/src/types/admin.types';
import { SIGNALEMENT_TONE } from '@/src/features/admin/status';
import {
    AdminPage,
    BlockGap,
    EmptyState,
    ErrorBanner,
    FilterBar,
    FooterLoader,
    ItemBlock,
    LoadingState,
    ResultCount,
    StatusBadge,
    Toolbar,
} from '@/src/features/admin/ui';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { IconButton } from '@/src/components/ui/icon-button';
import { useShallow } from 'zustand/react/shallow';

// ─── Fiche de décision ────────────────────────────────────────────────────────

type Decision = 'classer' | 'masquer' | 'rejeter' | 'publier';

const DECISIONS: Record<Decision, {
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = {
  classer: {
    label: 'Classer sans suite',
    description: "Signalement infondé : l'annonce reste en ligne.",
    icon: 'checkmark-circle-outline',
  },
  masquer: {
    label: "Masquer l'annonce",
    description: 'Retirée du public temporairement.',
    icon: 'eye-off-outline',
  },
  rejeter: {
    label: "Rejeter l'annonce",
    description: 'Retirée définitivement.',
    icon: 'close-circle-outline',
  },
  publier: {
    label: 'Remettre en ligne',
    description: 'Annule un masquage (un rejet est définitif).',
    icon: 'refresh-circle-outline',
  },
};

const DECISION_API: Record<Decision, DecisionSignalementRequest['decision']> = {
  classer: 'CLASSER',
  masquer: 'MASQUER',
  rejeter: 'REJETER',
  publier: 'REMETTRE_EN_LIGNE',
};

/**
 * Une seule décision, choisie explicitement (aucune option présélectionnée).
 * Signalement en attente : une seule opération côté serveur agit sur l'annonce ET clôture tous ses
 * signalements en attente. Une annonce masquée automatiquement se remet en ligne ou reste
 * masquée / rejetée ; on ne la « classe » pas. Signalement déjà clos : l'annonce reste modérable.
 */
function DecisionSheet({
  visible,
  signalement,
  onClose,
}: {
  visible: boolean;
  signalement: Signalement;
  onClose: () => void;
}) {
  const {
    masquerAnnonce, rejeterAnnonce, publierAnnonce, deciderSignalement,
    moderatingAnnonceIds, traitingSignalementIds,
  } = useAdminStore(
    useShallow((s) => ({
      masquerAnnonce: s.masquerAnnonce,
      rejeterAnnonce: s.rejeterAnnonce,
      publierAnnonce: s.publierAnnonce,
      deciderSignalement: s.deciderSignalement,
      moderatingAnnonceIds: s.moderatingAnnonceIds,
      traitingSignalementIds: s.traitingSignalementIds,
    })),
  );
  const [decision, setDecision] = useState<Decision | null>(null);
  const [texte, setTexte] = useState('');

  const isPending = (signalement.statut ?? 'EN_ATTENTE') === 'EN_ATTENTE';
  const automatique = Boolean(signalement.annonceMasqueeAutomatiquement);
  const options: Decision[] = !isPending
    ? ['masquer', 'rejeter', 'publier']
    : automatique ? ['publier', 'masquer', 'rejeter'] : ['classer', 'masquer', 'rejeter'];
  const isLoading = moderatingAnnonceIds.has(signalement.annonceId) || traitingSignalementIds.has(signalement.id);
  const motifRequis = decision === 'masquer' || decision === 'rejeter';
  const canConfirm = decision != null && (!motifRequis || texte.trim().length > 0);

  const fermer = () => {
    setDecision(null);
    setTexte('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!decision || !canConfirm) return;
    const motif = texte.trim();
    try {
      if (isPending) {
        await deciderSignalement(signalement.id, {
          decision: DECISION_API[decision],
          ...(motifRequis ? { motif } : {}),
          noteAdmin: motifRequis ? null : motif || null,
        });
      } else if (decision === 'masquer') {
        await masquerAnnonce(signalement.annonceId, motif);
      } else if (decision === 'rejeter') {
        await rejeterAnnonce(signalement.annonceId, motif);
      } else {
        await publierAnnonce(signalement.annonceId);
      }
    } catch (e) {
      appAlert('Décision non appliquée', getErrorMessage(e, "La décision n'a pas été enregistrée. Vérifiez votre connexion puis réessayez."));
      return;
    }
    fermer();
  };

  return (
    <Sheet visible={visible} onRequestClose={fermer}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <AppText style={m.title}>{isPending ? 'Décider du signalement' : "Modérer l'annonce"}</AppText>
        <AppText style={m.subtitle} numberOfLines={1}>{signalement.titreAnnonce}</AppText>

        <View style={m.options} accessibilityRole="radiogroup">
          {options.map((d) => {
            const def = DECISIONS[d];
            const selected = decision === d;
            const tone = d === 'masquer' || d === 'rejeter' ? colors.errorText : colors.primary;
            return (
              <TouchableOpacity
                key={d}
                style={[m.option, selected && { borderColor: tone, backgroundColor: tone + '0D' }]}
                onPress={() => setDecision(d)}
                disabled={isLoading}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: isLoading }}
                accessibilityLabel={`${def.label}. ${def.description}`}
              >
                <Ionicons name={def.icon} size={20} color={selected ? tone : colors.textSecondary} />
                <View style={m.optionBody}>
                  <AppText style={[m.optionLabel, selected && { color: tone }]}>{def.label}</AppText>
                  <AppText style={m.optionDesc}>{def.description}</AppText>
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selected ? tone : colors.border}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {decision && decision !== 'publier' ? (
          <>
            <AppText style={m.label}>{motifRequis ? 'Motif (obligatoire)' : 'Note interne (optionnel)'}</AppText>
            <AppText style={m.hint}>
              {motifRequis
                ? `Affiché au propriétaire de l’annonce.${isPending ? ' Le signalement sera marqué comme traité.' : ''}`
                : "Visible uniquement par l'équipe de modération."}
            </AppText>
            <AppTextInput
              style={m.input}
              placeholder={motifRequis ? 'Ex : Photos sans rapport avec le bien proposé' : 'Ex : Annonce conforme, signalement abusif'}
              placeholderTextColor={colors.placeholder}
              value={texte}
              onChangeText={setTexte}
              maxLength={500}
              multiline
              numberOfLines={3}
              accessibilityLabel={motifRequis ? 'Motif de la décision' : 'Note interne'}
            />
          </>
        ) : null}

        <View style={m.actions}>
          <Button
            title="Annuler"
            variant="outline"
            fullWidth={false}
            style={m.btnCancel}
            onPress={fermer}
            disabled={isLoading}
          />
          <Button
            title={decision ? DECISIONS[decision].label : 'Choisir une décision'}
            variant={motifRequis ? 'danger' : 'primary'}
            fullWidth={false}
            style={m.btnConfirm}
            onPress={handleConfirm}
            disabled={!canConfirm}
            isLoading={isLoading}
          />
        </View>
      </View>
    </Sheet>
  );
}

const m = StyleSheet.create({
  hint: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: -2, marginBottom: spacing.xs },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm,
  },
  handle: {
    width: 36, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: typography.sizes.sm, color: colors.textMuted },
  label: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xs },
  options: { gap: spacing.sm, marginTop: spacing.xs },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
  },
  optionBody: { flex: 1, gap: 2 },
  optionLabel: { fontWeight: '700', fontSize: typography.sizes.sm, color: colors.textPrimary },
  optionDesc: { fontSize: typography.sizes.xs, color: colors.textMuted },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.sm, fontSize: typography.sizes.sm, color: colors.textPrimary,
    minHeight: 70, textAlignVertical: 'top', backgroundColor: colors.background,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btnCancel: { flex: 1 },
  btnConfirm: { flex: 2 },
});

// ─── Carte signalement ────────────────────────────────────────────────────────

function SignalementCard({ item }: { item: Signalement }) {
  // Sélecteurs par ligne : une suppression ne re-rend que la carte concernée.
  const deleteSignalement = useAdminStore((s) => s.deleteSignalement);
  const isDeleting = useAdminStore((s) => s.deletingSignalementIds.has(item.id));
  const [decisionOpen, setDecisionOpen] = useState(false);

  const motifLabel = MOTIF_LABELS[item.motif as keyof typeof MOTIF_LABELS] ?? item.motif;
  const statut = item.statut ?? 'EN_ATTENTE';
  const isPending = statut === 'EN_ATTENTE';

  const handleDelete = () => {
    appAlert('Supprimer le signalement', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteSignalement(item.id) },
    ]);
  };

  return (
    <ItemBlock>
      {/* Motif + statut + date */}
      <View style={s.headerRow}>
        <StatusBadge label={motifLabel} tone="danger" icon="flag" />
        {!isPending ? (
          <StatusBadge label={STATUT_SIGNALEMENT_LABELS[statut]} tone={SIGNALEMENT_TONE[statut]} />
        ) : null}
        {isPending && item.annonceMasqueeAutomatiquement ? (
          <StatusBadge label="Masquée automatiquement" tone="warning" icon="alert-circle" />
        ) : null}
        <AppText style={s.date}>
          {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </AppText>
      </View>

      {/* Annonce concernée */}
      <TouchableOpacity
        style={s.annonce}
        onPress={() => router.push(`/annonce/${item.annonceId}` as any)}
        activeOpacity={0.6}
        accessibilityRole="link"
        accessibilityLabel={`Voir l'annonce ${item.titreAnnonce}`}
      >
        <View style={s.annonceBody}>
          <AppText style={s.annonceTitle} numberOfLines={1}>{item.titreAnnonce}</AppText>
          <AppText style={s.annonceRef}>{item.referenceAnnonce}</AppText>
        </View>
        <Ionicons name="open-outline" size={15} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Commentaire du signalant */}
      {item.commentaire ? (
        <AppText style={s.commentaire}>« {item.commentaire} »</AppText>
      ) : null}

      {/* Note de modération */}
      {item.noteAdmin ? (
        <View style={s.note}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textSecondary} />
          <AppText style={s.noteText}>{item.noteAdmin}</AppText>
        </View>
      ) : null}

      <TouchableOpacity
        style={s.reporter}
        onPress={() => router.push(`/(tabs)/administration/users/${item.reporterId}` as any)}
        accessibilityRole="link"
        accessibilityLabel={`Signalé par ${item.reporterUsername ?? 'un utilisateur'}, ouvrir sa fiche`}
      >
        <AppText style={s.reporterLabel}>Signalé par</AppText>
        <AppText style={s.reporterLink} numberOfLines={1}>{item.reporterUsername ?? item.reporterId}</AppText>
      </TouchableOpacity>

      {/* Actions */}
      <View style={s.actions}>
        <Button
          title={isPending ? 'Décider' : "Modérer l'annonce"}
          variant={isPending ? 'primary' : 'outline'}
          size="sm"
          fullWidth={false}
          style={s.actionMain}
          leftIcon={
            <Ionicons
              name={isPending ? 'shield-checkmark-outline' : 'shield-outline'}
              size={15}
              color={isPending ? colors.white : colors.primary}
            />
          }
          onPress={() => setDecisionOpen(true)}
          accessibilityLabel={isPending ? `Décider du signalement sur ${item.titreAnnonce}` : `Modérer l'annonce ${item.titreAnnonce}`}
        />
        <IconButton
          icon="trash-outline"
          variant="plain"
          size={18}
          color={colors.errorText}
          onPress={handleDelete}
          disabled={isDeleting}
          accessibilityLabel="Supprimer le signalement"
        />
      </View>

      <DecisionSheet visible={decisionOpen} signalement={item} onClose={() => setDecisionOpen(false)} />
    </ItemBlock>
  );
}

// ─── Filtres ──────────────────────────────────────────────────────────────────

const FILTERS: { key: StatutSignalement | 'ALL'; label: string }[] = [
  { key: 'EN_ATTENTE', label: 'En attente' },
  { key: 'TRAITE', label: 'Traités' },
  { key: 'IGNORE', label: 'Ignorés' },
  { key: 'ALL', label: 'Tous' },
];

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function AdminSignalements() {
  const {
    signalements,
    signalementsPage,
    signalementsTotalElements,
    isLoadingSignalements,
    signalementsError,
    loadSignalements,
    loadMoreSignalements,
  } = useAdminStore(
    useShallow((s) => ({
      signalements: s.signalements,
      signalementsPage: s.signalementsPage,
      signalementsTotalElements: s.signalementsTotalElements,
      isLoadingSignalements: s.isLoadingSignalements,
      signalementsError: s.signalementsError,
      loadSignalements: s.loadSignalements,
      loadMoreSignalements: s.loadMoreSignalements,
    })),
  );

  // La file de travail (« En attente ») par défaut ; le filtre choisi est
  // conservé quand on revient d'une annonce ou d'un profil.
  const [activeFilter, setActiveFilter] = useState<StatutSignalement | 'ALL'>('EN_ATTENTE');
  const statutFiltre = activeFilter === 'ALL' ? undefined : activeFilter;

  // Recharge à l'affichage et à chaque changement de filtre.
  useFocusEffect(
    useCallback(() => {
      loadSignalements(0, statutFiltre);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter]),
  );

  const firstLoad = isLoadingSignalements && signalementsPage === 0;

  return (
    <AdminPage>
      <Toolbar>
        <FilterBar options={FILTERS} value={activeFilter} onChange={setActiveFilter} />
      </Toolbar>

      {signalementsError ? (
        <ErrorBanner message={signalementsError} onRetry={() => loadSignalements(0, statutFiltre)} />
      ) : null}

      <FlatList
        {...LIST_PERF_PROPS}
        data={signalements}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <SignalementCard item={item} />}
        ItemSeparatorComponent={BlockGap}
        refreshControl={
          <RefreshControl
            refreshing={firstLoad && signalements.length > 0}
            onRefresh={() => loadSignalements(0, statutFiltre)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={(signalements.length > 0 ? (
            <ResultCount>
              {signalementsTotalElements} signalement{signalementsTotalElements !== 1 ? 's' : ''}
              {activeFilter === 'EN_ATTENTE' ? ' à traiter' : ''}
            </ResultCount>
          ) : null) ?? undefined}
        ListEmptyComponent={(firstLoad ? <LoadingState /> : signalementsError ? null : activeFilter === 'EN_ATTENTE' ? (
            <EmptyState icon="checkmark-done-outline" tone="success" title="File vide" message="Aucun signalement en attente." />
          ) : (
            <EmptyState icon="flag-outline" title="Aucun signalement" />
          )) ?? undefined}
        onEndReached={() => loadMoreSignalements(statutFiltre)}
        onEndReachedThreshold={0.3}
        ListFooterComponent={<FooterLoader visible={isLoadingSignalements && signalementsPage > 0} />}
      />
    </AdminPage>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  date: { marginLeft: 'auto', fontSize: typography.sizes.xs, color: colors.textMuted },
  annonce: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  annonceBody: { flex: 1, minWidth: 0 },
  annonceTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.primary },
  annonceRef: { fontSize: typography.sizes.xs, color: colors.textMuted },
  commentaire: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  noteText: { flex: 1, fontSize: typography.sizes.xs, color: colors.textSecondary },
  reporter: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, alignSelf: 'flex-start' },
  reporterLabel: { fontSize: typography.sizes.xs, color: colors.textMuted },
  reporterLink: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: '600', flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionMain: { flex: 1 },
});
