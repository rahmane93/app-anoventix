import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Sheet } from '@/src/components/ui/sheet';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import {
    AdminPage,
    BlockGap,
    EmptyState,
    ErrorBanner,
    FooterLoader,
    ItemBlock,
    LoadingState,
    ResultCount,
    StatusBadge,
} from '@/src/features/admin/ui';
import { annonceHref } from '@/src/lib/annonce-url';
import { useAdminStore } from '@/src/stores/admin.store';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { AdminAnnonce } from '@/src/types/admin.types';
import { formatDate, getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

// ─── File « Réexamens » (DEC-09, RG-09-31) ───────────────────────────────────
// Annonces masquées dont le propriétaire a demandé un réexamen, de la plus ancienne à la plus récente.

type Decision = 'publier' | 'maintenir' | 'rejeter';

const DECISIONS: Record<Decision, { label: string; description: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  publier: {
    label: 'Remettre en ligne',
    description: 'L’annonce corrigée redevient visible, pour 180 jours.',
    icon: 'refresh-circle-outline',
  },
  maintenir: {
    label: 'Maintenir le masquage',
    description: 'Nouveau motif obligatoire : l’annonce reste corrigeable.',
    icon: 'eye-off-outline',
  },
  rejeter: {
    label: 'Rejeter définitivement',
    description: 'Réservé aux infractions graves : plus de correction possible.',
    icon: 'close-circle-outline',
  },
};

function DecisionSheet({ annonce, visible, onClose }: { annonce: AdminAnnonce; visible: boolean; onClose: () => void }) {
  const { masquerAnnonce, rejeterAnnonce, publierAnnonce, loadReexamens, moderating } = useAdminStore(
    useShallow((s) => ({
      masquerAnnonce: s.masquerAnnonce,
      rejeterAnnonce: s.rejeterAnnonce,
      publierAnnonce: s.publierAnnonce,
      loadReexamens: s.loadReexamens,
      moderating: s.moderatingAnnonceIds.has(annonce.id),
    })),
  );
  const [decision, setDecision] = useState<Decision | null>(null);
  const [motif, setMotif] = useState('');
  const motifRequis = decision === 'maintenir' || decision === 'rejeter';
  const canConfirm = decision != null && (!motifRequis || motif.trim().length > 0);

  const fermer = () => {
    setDecision(null);
    setMotif('');
    onClose();
  };

  const confirmer = async () => {
    if (!decision || !canConfirm) return;
    try {
      if (decision === 'publier') await publierAnnonce(annonce.id);
      else if (decision === 'maintenir') await masquerAnnonce(annonce.id, motif.trim());
      else await rejeterAnnonce(annonce.id, motif.trim());
    } catch (e) {
      appAlert('Décision non appliquée', getErrorMessage(e, "La décision n'a pas été enregistrée."));
      return;
    }
    fermer();
    await loadReexamens(0);
  };

  return (
    <Sheet visible={visible} onRequestClose={fermer}>
      <View style={st.sheet}>
        <View style={st.handle} />
        <AppText style={st.title}>Décider du réexamen</AppText>
        <AppText style={st.subtitle} numberOfLines={1}>{annonce.titre}</AppText>
        <View style={st.options} accessibilityRole="radiogroup">
          {(Object.keys(DECISIONS) as Decision[]).map((d) => {
            const def = DECISIONS[d];
            const selected = decision === d;
            const tone = d === 'publier' ? colors.primary : colors.errorText;
            return (
              <TouchableOpacity
                key={d}
                style={[st.option, selected && { borderColor: tone, backgroundColor: tone + '0D' }]}
                onPress={() => setDecision(d)}
                disabled={moderating}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: moderating }}
                accessibilityLabel={`${def.label}. ${def.description}`}
              >
                <Ionicons name={def.icon} size={20} color={selected ? tone : colors.textSecondary} />
                <View style={st.optionBody}>
                  <AppText style={[st.optionLabel, selected && { color: tone }]}>{def.label}</AppText>
                  <AppText style={st.optionDesc}>{def.description}</AppText>
                </View>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} color={selected ? tone : colors.border} />
              </TouchableOpacity>
            );
          })}
        </View>
        {motifRequis ? (
          <>
            <AppText style={st.label}>Motif (obligatoire)</AppText>
            <AppText style={st.hint}>Affiché au propriétaire de l’annonce et envoyé par email.</AppText>
            <AppTextInput
              style={st.input}
              placeholder="Ex : Les photos ne correspondent toujours pas au bien."
              placeholderTextColor={colors.placeholder}
              value={motif}
              onChangeText={setMotif}
              maxLength={500}
              multiline
              numberOfLines={3}
              accessibilityLabel="Motif de la décision"
            />
          </>
        ) : null}
        <View style={st.actions}>
          <Button title="Annuler" variant="outline" fullWidth={false} style={st.btnCancel} onPress={fermer} disabled={moderating} />
          <Button
            title={decision ? DECISIONS[decision].label : 'Choisir une décision'}
            variant={motifRequis ? 'danger' : 'primary'}
            fullWidth={false}
            style={st.btnConfirm}
            onPress={confirmer}
            disabled={!canConfirm}
            isLoading={moderating}
          />
        </View>
      </View>
    </Sheet>
  );
}

function ReexamenItem({ item }: { item: AdminAnnonce }) {
  const [open, setOpen] = useState(false);
  const nb = item.nbReexamens ?? 1;
  return (
    <ItemBlock>
      <View style={st.headerRow}>
        <StatusBadge label={`Demande ${nb} sur 3`} tone="warning" icon="refresh-circle" />
        {item.masquageAutomatique ? <StatusBadge label="Masquée automatiquement" tone="warning" /> : null}
        {item.dateReexamen ? <AppText style={st.date}>{formatDate(item.dateReexamen)}</AppText> : null}
      </View>
      <TouchableOpacity
        style={st.annonce}
        onPress={() => router.push(annonceHref(item as never))}
        activeOpacity={0.6}
        accessibilityRole="link"
        accessibilityLabel={`Voir l'annonce ${item.titre}`}
      >
        <View style={st.annonceBody}>
          <AppText style={st.annonceTitle} numberOfLines={1}>{item.titre}</AppText>
          <AppText style={st.annonceRef}>{item.referenceAnnonce}{item.proprietaireNom ? ` · ${item.proprietaireNom}` : ''}</AppText>
        </View>
        <Ionicons name="open-outline" size={15} color={colors.textMuted} />
      </TouchableOpacity>
      {item.motifModeration ? (
        <View style={st.bloc}>
          <AppText style={st.blocLabel}>Motif du masquage</AppText>
          <AppText style={st.blocText}>{item.motifModeration}</AppText>
        </View>
      ) : null}
      <View style={st.bloc}>
        <AppText style={st.blocLabel}>Message du propriétaire</AppText>
        <AppText style={st.blocText}>{item.messageReexamen ? `« ${item.messageReexamen} »` : 'Aucun message.'}</AppText>
      </View>
      <Button
        title="Décider"
        size="sm"
        fullWidth={false}
        leftIcon={<Ionicons name="shield-checkmark-outline" size={16} color={colors.white} />}
        onPress={() => setOpen(true)}
        accessibilityLabel={`Décider du réexamen de ${item.titre}`}
      />
      <DecisionSheet annonce={item} visible={open} onClose={() => setOpen(false)} />
    </ItemBlock>
  );
}

export default function ReexamensScreen() {
  const { reexamens, page, totalPages, total, isLoading, error, loadReexamens } = useAdminStore(
    useShallow((s) => ({
      reexamens: s.reexamens,
      page: s.reexamensPage,
      totalPages: s.reexamensTotalPages,
      total: s.reexamensTotalElements,
      isLoading: s.isLoadingReexamens,
      error: s.reexamensError,
      loadReexamens: s.loadReexamens,
    })),
  );

  useFocusEffect(useCallback(() => { loadReexamens(0); }, [loadReexamens]));

  const loadMore = () => {
    if (!isLoading && page < totalPages - 1) loadReexamens(page + 1);
  };

  return (
    <AdminPage>
      {error ? <ErrorBanner message={error} onRetry={() => loadReexamens(0)} /> : null}
      {isLoading && reexamens.length === 0 ? (
        <LoadingState />
      ) : (
        <FlatList
          {...LIST_PERF_PROPS}
          data={reexamens}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ReexamenItem item={item} />}
          ItemSeparatorComponent={BlockGap}
          ListHeaderComponent={reexamens.length > 0 ? <ResultCount>{total} demande{total > 1 ? 's' : ''} de réexamen</ResultCount> : null}
          ListEmptyComponent={
            error ? null : (
              <EmptyState icon="refresh-circle-outline" title="Aucune demande de réexamen" message="Les annonces corrigées par leur propriétaire apparaissent ici." />
            )
          }
          ListFooterComponent={<FooterLoader visible={isLoading && reexamens.length > 0} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={isLoading && reexamens.length > 0} onRefresh={() => loadReexamens(0)} />}
        />
      )}
    </AdminPage>
  );
}

const st = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  date: { marginLeft: 'auto', fontSize: typography.sizes.xs, color: colors.textMuted },
  annonce: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  annonceBody: { flex: 1, gap: 2 },
  annonceTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  annonceRef: { fontSize: typography.sizes.xs, color: colors.textMuted },
  bloc: { gap: 2, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.background },
  blocLabel: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary },
  blocText: { fontSize: typography.sizes.sm, color: colors.textPrimary, lineHeight: 20 },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm,
  },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: typography.sizes.sm, color: colors.textMuted },
  label: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xs },
  hint: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: -2, marginBottom: spacing.xs },
  options: { gap: spacing.sm, marginTop: spacing.xs },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
  },
  optionBody: { flex: 1, gap: 2 },
  optionLabel: { fontWeight: '700', fontSize: typography.sizes.sm, color: colors.textPrimary },
  optionDesc: { fontSize: typography.sizes.xs, color: colors.textMuted },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm,
    fontSize: typography.sizes.sm, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btnCancel: { flex: 1 },
  btnConfirm: { flex: 2 },
});
