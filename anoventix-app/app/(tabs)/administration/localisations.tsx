import { LIST_PERF_PROPS } from '@/src/constants/list';
import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { getErrorMessage } from '@/src/utils/format';
import { Sheet } from '@/src/components/ui/sheet';
import { useAdminStore } from '@/src/stores/admin.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import {
    AdminPage,
    EmptyState,
    ErrorBanner,
    IconTile,
    ListRow,
    LoadingState,
    MetaText,
    ResultCount,
    RowSeparator,
    Toolbar,
} from '@/src/features/admin/ui';
import { IconButton } from '@/src/components/ui/icon-button';
import type { Localisation } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect } from 'expo-router';
import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { useUserStore } from '@/src/stores/user.store';
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { useShallow } from 'zustand/react/shallow';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_COMMUNE_OPTIONS = ['urbaine', 'rurale'] as const;
type TypeCommune = typeof TYPE_COMMUNE_OPTIONS[number];


// ─── Picker modal ─────────────────────────────────────────────────────────────

function PickerModal({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.box}>
          <View style={pm.header}>
            <AppText style={pm.title}>{title}</AppText>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={pm.searchWrap}>
            <Ionicons name="search-outline" size={15} color={colors.textMuted} />
            <AppTextInput
              style={pm.searchInput}
              value={q}
              onChangeText={setQ}
              placeholder="Rechercher…"
              placeholderTextColor={colors.placeholder}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(i) => i}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[pm.item, item === value && pm.itemActive]}
                onPress={() => { onSelect(item); setQ(''); onClose(); }}
              >
                <AppText style={[pm.itemText, item === value && pm.itemTextActive]}>{item}</AppText>
                {item === value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <AppText style={pm.empty}>Aucun résultat</AppText>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Champ picker réutilisable ────────────────────────────────────────────────

function PickerField({
  label,
  value,
  placeholder,
  options,
  onSelect,
  disabled = false,
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (v: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={pf.wrap}>
      <AppText style={pf.label}>{label}</AppText>
      <TouchableOpacity
        style={[pf.btn, disabled && pf.disabled, !!error && pf.btnError]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.8}
      >
        <AppText style={[pf.btnText, !value && pf.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={disabled ? colors.textMuted : colors.textSecondary} />
      </TouchableOpacity>
      {!!error && <AppText style={pf.error}>{error}</AppText>}
      <PickerModal
        visible={open}
        title={label}
        options={options}
        value={value}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

// ─── Formulaire ajout/modification ───────────────────────────────────────────

type FormState = {
  region: string; prefecture: string; commune: string; quartier: string; typeCommune: TypeCommune | '';
  /** Point de référence (facultatif), saisi en degrés décimaux. */
  latitude: string; longitude: string;
};
const EMPTY: FormState = { region: '', prefecture: '', commune: '', quartier: '', typeCommune: '', latitude: '', longitude: '' };

const lireCoordonnee = (v: string): number | null => {
  const n = Number(v.replace(',', '.').trim());
  return v.trim() === '' || Number.isNaN(n) ? null : n;
};

function LocalisationForm({
  visible,
  editing,
  localisations,
  onClose,
}: {
  visible: boolean;
  editing: Localisation | null;
  localisations: Localisation[];
  onClose: () => void;
}) {
  const { saveLocalisation, savingLocalisation } = useAdminStore(useShallow((s) => ({ saveLocalisation: s.saveLocalisation, savingLocalisation: s.savingLocalisation })));
  // Formulaire recréé à chaque ouverture (clé fournie par le parent) : l'état
  // initial vient directement de la localisation éditée, sans effet de remise à zéro.
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          region: editing.region, prefecture: editing.prefecture, commune: editing.commune, quartier: editing.quartier,
          typeCommune: (editing.typeCommune as TypeCommune) ?? '',
          latitude: editing.latitude != null ? String(editing.latitude) : '',
          longitude: editing.longitude != null ? String(editing.longitude) : '',
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === 'region') { next.prefecture = ''; next.commune = ''; }
      if (field === 'prefecture') { next.commune = ''; }
      return next;
    });

  const regions = useMemo(() => [...new Set(localisations.map((l) => l.region))].sort(), [localisations]);
  const prefectures = useMemo(
    () => form.region ? [...new Set(localisations.filter((l) => l.region === form.region).map((l) => l.prefecture))].sort() : [],
    [localisations, form.region],
  );
  const communes = useMemo(
    () => form.prefecture ? [...new Set(localisations.filter((l) => l.region === form.region && l.prefecture === form.prefecture).map((l) => l.commune))].sort() : [],
    [localisations, form.region, form.prefecture],
  );

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.region) e.region = 'Requis';
    if (!form.prefecture) e.prefecture = 'Requis';
    if (!form.commune) e.commune = 'Requis';
    if (!form.quartier.trim()) e.quartier = 'Requis';
    if (!form.typeCommune) e.typeCommune = 'Requis';
    const lat = lireCoordonnee(form.latitude);
    const lng = lireCoordonnee(form.longitude);
    if (form.latitude.trim() && (lat == null || lat < -90 || lat > 90)) e.latitude = 'Latitude entre -90 et 90';
    if (form.longitude.trim() && (lng == null || lng < -180 || lng > 180)) e.longitude = 'Longitude entre -180 et 180';
    if ((lat == null) !== (lng == null) && !e.latitude && !e.longitude) e.longitude = 'Indiquez les deux, ou aucune';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await saveLocalisation(
        {
          region: form.region, prefecture: form.prefecture, commune: form.commune, quartier: form.quartier.trim(),
          typeCommune: form.typeCommune || undefined,
          latitude: lireCoordonnee(form.latitude), longitude: lireCoordonnee(form.longitude),
        },
        editing?.id,
      );
      onClose();
    } catch (e) {
      // Doublon refusé par l'API : son message nomme le quartier existant.
      appAlert("Localisation non enregistrée", getErrorMessage(e, 'Impossible de sauvegarder la localisation.'));
    }
  };

  return (
    <Sheet visible={visible} onRequestClose={onClose}>
      <View style={ff.sheet}>
        <View style={ff.handle} />
        <AppText style={ff.title}>{editing ? 'Modifier la localisation' : 'Ajouter un quartier'}</AppText>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <PickerField label="Région" value={form.region} placeholder="Sélectionner…" options={regions} onSelect={set('region')} error={errors.region} />
          <PickerField label="Préfecture" value={form.prefecture} placeholder={form.region ? 'Sélectionner…' : 'Choisir une région d\'abord'} options={prefectures} onSelect={set('prefecture')} disabled={!form.region} error={errors.prefecture} />
          <PickerField label="Commune" value={form.commune} placeholder={form.prefecture ? 'Sélectionner…' : 'Choisir une préfecture d\'abord'} options={communes} onSelect={set('commune')} disabled={!form.prefecture} error={errors.commune} />

          <View style={pf.wrap}>
            <AppText style={pf.label}>Quartier</AppText>
            <AppTextInput
              style={[pf.btn, errors.quartier && pf.btnError, { flex: 0, paddingVertical: 12 }]}
              value={form.quartier}
              onChangeText={set('quartier')}
              placeholder="Nom du quartier"
              placeholderTextColor={colors.placeholder}
              editable={!!form.commune}
              autoCapitalize="words"
            />
            {errors.quartier ? <AppText style={pf.error}>{errors.quartier}</AppText> : null}
          </View>

          <View style={pf.wrap}>
            <AppText style={pf.label}>Point de référence (facultatif)</AppText>
            <AppText style={ff.hint}>Centre la carte quand un annonceur choisit ce quartier. Degrés décimaux, ex. 9.6412 / -13.5784.</AppText>
            <View style={ff.typeRow}>
              <AppTextInput
                style={[pf.btn, errors.latitude && pf.btnError, { flex: 1, paddingVertical: 12 }]}
                value={form.latitude}
                onChangeText={set('latitude')}
                placeholder="Latitude"
                placeholderTextColor={colors.placeholder}
                keyboardType="numbers-and-punctuation"
              />
              <AppTextInput
                style={[pf.btn, errors.longitude && pf.btnError, { flex: 1, paddingVertical: 12 }]}
                value={form.longitude}
                onChangeText={set('longitude')}
                placeholder="Longitude"
                placeholderTextColor={colors.placeholder}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            {errors.latitude || errors.longitude ? (
              <AppText style={pf.error}>{errors.latitude ?? errors.longitude}</AppText>
            ) : null}
          </View>

          <View style={pf.wrap}>
            <AppText style={pf.label}>Type de commune</AppText>
            <View style={ff.typeRow}>
              {TYPE_COMMUNE_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[ff.typeChip, form.typeCommune === t && ff.typeChipActive]}
                  onPress={() => set('typeCommune')(t)}
                >
                  <Ionicons
                    name={t === 'urbaine' ? 'business-outline' : 'leaf-outline'}
                    size={16}
                    color={form.typeCommune === t ? colors.primary : colors.textSecondary}
                  />
                  <AppText style={[ff.typeChipText, form.typeCommune === t && ff.typeChipTextActive]}>
                    {t === 'urbaine' ? 'Urbaine' : 'Rurale'}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            {errors.typeCommune ? <AppText style={pf.error}>{errors.typeCommune}</AppText> : null}
          </View>

          <View style={ff.actions}>
            <Button
              title="Annuler"
              variant="outline"
              fullWidth={false}
              style={ff.cancelBtn}
              onPress={onClose}
              disabled={savingLocalisation}
            />
            <Button
              title={editing ? 'Modifier' : 'Ajouter'}
              fullWidth={false}
              style={ff.saveBtn}
              onPress={handleSave}
              isLoading={savingLocalisation}
            />
          </View>
        </ScrollView>
      </View>
    </Sheet>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

// Le référentiel ne s'écrit que par un administrateur (ECART-45) : le modérateur n'a pas cet écran.
export default function LocalisationsScreen() {
  const user = useAuthStore((st) => st.user);
  const profile = useUserStore((st) => st.profile);
  const { isAdministrateur } = getRoleFlags(profile?.roles ?? profile?.role ?? user?.roles);
  if (!isAdministrateur) return <Redirect href="/(tabs)/administration" />;
  return <LocalisationsContenu />;
}

function LocalisationsContenu() {
  const {
    localisations,
    localisationsTotalItems,
    isLoadingLocalisations,
    localisationsError,
    loadLocalisations,
    deleteLocalisationAdmin,
    deletingLocalisationIds,
  } = useAdminStore(
    useShallow((s) => ({
      localisations: s.localisations,
      localisationsTotalItems: s.localisationsTotalItems,
      isLoadingLocalisations: s.isLoadingLocalisations,
      localisationsError: s.localisationsError,
      loadLocalisations: s.loadLocalisations,
      deleteLocalisationAdmin: s.deleteLocalisationAdmin,
      deletingLocalisationIds: s.deletingLocalisationIds,
    })),
  );

  const [filterPrefecture, setFilterPrefecture] = useState('');
  const [filterCommune, setFilterCommune] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<Localisation | null>(null);
  // Nouvelle clé à chaque ouverture : le formulaire repart de l'élément édité.
  const [formKey, setFormKey] = useState(0);
  const openForm = (item: Localisation | null) => {
    setEditing(item);
    setFormKey((k) => k + 1);
    setSheetVisible(true);
  };

  useFocusEffect(useCallback(() => { loadLocalisations(); }, [loadLocalisations]));

  // Options de filtres
  const prefectureOptions = useMemo(
    () => [...new Set(localisations.map((l) => l.prefecture))].sort(),
    [localisations],
  );
  const communeOptions = useMemo(
    () => {
      const src = filterPrefecture ? localisations.filter((l) => l.prefecture === filterPrefecture) : localisations;
      return [...new Set(src.map((l) => l.commune))].sort();
    },
    [localisations, filterPrefecture],
  );

  const filtered = useMemo(() => {
    let src = localisations;
    if (filterPrefecture) src = src.filter((l) => l.prefecture === filterPrefecture);
    if (filterCommune) src = src.filter((l) => l.commune === filterCommune);
    return src;
  }, [localisations, filterPrefecture, filterCommune]);

  const hasFilter = !!(filterPrefecture || filterCommune);

  const resetFilters = () => { setFilterPrefecture(''); setFilterCommune(''); };
  const setPrefecture = (v: string) => { setFilterPrefecture(v); setFilterCommune(''); };

  const handleDelete = (item: Localisation) => {
    appAlert(
      'Supprimer',
      `Supprimer « ${item.quartier} » (${item.commune}) ?\n\nL'opération échouera si des annonces y sont associées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocalisationAdmin(item.id);
            } catch {
              appAlert("Suppression impossible", 'Impossible de supprimer : des annonces sont peut-être associées à ce quartier.');
            }
          },
        },
      ],
    );
  };

  return (
    <AdminPage>
      <Toolbar>
        <View style={s.toolbarRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll} keyboardShouldPersistTaps="handled">
            <FilterChip label="Préfecture" value={filterPrefecture} options={prefectureOptions} onSelect={setPrefecture} onClear={() => setPrefecture('')} />
            <FilterChip label="Commune" value={filterCommune} options={communeOptions} onSelect={setFilterCommune} onClear={() => setFilterCommune('')} />
            {hasFilter && (
              <TouchableOpacity style={s.resetBtn} onPress={resetFilters} accessibilityRole="button">
                <AppText style={s.resetText}>Effacer</AppText>
              </TouchableOpacity>
            )}
          </ScrollView>
          <Button
            title="Ajouter"
            size="sm"
            fullWidth={false}
            style={s.addBtn}
            leftIcon={<Ionicons name="add" size={16} color={colors.white} />}
            onPress={() => openForm(null)}
            accessibilityLabel="Ajouter une localisation"
          />
        </View>
      </Toolbar>

      {localisationsError ? <ErrorBanner message={localisationsError} onRetry={loadLocalisations} /> : null}

      <FlatList
        {...LIST_PERF_PROPS}
        data={filtered}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={RowSeparator}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingLocalisations && localisations.length > 0}
            onRefresh={loadLocalisations}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          localisations.length > 0 ? (
            <ResultCount>
              {hasFilter
                ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} sur ${localisationsTotalItems}`
                : `${localisationsTotalItems} localisation${localisationsTotalItems > 1 ? 's' : ''}`}
            </ResultCount>
          ) : null
        }
        renderItem={({ item }) => {
          const deleting = deletingLocalisationIds.has(item.id);
          return (
            <ListRow
              leading={<IconTile icon={item.typeCommune === 'rurale' ? 'leaf-outline' : 'business-outline'} tone="neutral" />}
              title={item.quartier}
              subtitle={`${item.region} › ${item.prefecture} › ${item.commune}`}
              meta={item.typeCommune ? (
                <MetaText>{item.typeCommune === 'urbaine' ? 'Commune urbaine' : 'Commune rurale'}</MetaText>
              ) : null}
              chevron={false}
              trailing={
                <View style={s.rowActions}>
                  <IconButton
                    icon="pencil-outline"
                    variant="plain"
                    size={18}
                    color={colors.primary}
                    onPress={() => openForm(item)}
                    accessibilityLabel={`Modifier ${item.quartier}`}
                  />
                  <IconButton
                    icon="trash-outline"
                    variant="plain"
                    size={18}
                    color={colors.errorText}
                    onPress={() => handleDelete(item)}
                    disabled={deleting}
                    style={deleting ? s.busy : undefined}
                    accessibilityLabel={`Supprimer ${item.quartier}`}
                  />
                </View>
              }
            />
          );
        }}
        ListEmptyComponent={
          isLoadingLocalisations ? <LoadingState /> : localisationsError ? null : (
            <EmptyState
              icon="location-outline"
              title={hasFilter ? 'Aucun résultat' : 'Aucune localisation'}
              message={hasFilter ? 'Aucun quartier ne correspond à ces filtres.' : undefined}
            />
          )
        }
      />

      {/* ── Formulaire ───────────────────────────────────────────────────── */}
      <LocalisationForm
        key={formKey}
        visible={sheetVisible}
        editing={editing}
        localisations={localisations}
        onClose={() => setSheetVisible(false)}
      />
    </AdminPage>
  );
}

// ─── Filtre chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  value,
  options,
  onSelect,
  onClear,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[fc.chip, value && fc.chipActive]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        <AppText style={[fc.chipText, value && fc.chipTextActive]} numberOfLines={1}>
          {value || label}
        </AppText>
        {value
          ? <TouchableOpacity onPress={onClear} hitSlop={6}><Ionicons name="close-circle" size={14} color={colors.primary} /></TouchableOpacity>
          : <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
        }
      </TouchableOpacity>
      <PickerModal
        visible={open}
        title={label}
        options={options}
        value={value}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  toolbarRow: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.base },
  filterScroll: { paddingHorizontal: spacing.base, gap: spacing.xs, alignItems: 'center' },
  resetBtn: { justifyContent: 'center', minHeight: 32, paddingHorizontal: spacing.sm },
  resetText: { fontSize: typography.sizes.xs, color: colors.errorText, fontWeight: '700' },
  addBtn: { flexShrink: 0 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  busy: { opacity: 0.4 },
});

// PickerField
const pf = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inputBackground,
  },
  btnError: { borderColor: colors.error },
  disabled: { opacity: 0.4, backgroundColor: colors.background },
  btnText: { flex: 1, fontSize: typography.sizes.md, color: colors.textPrimary },
  placeholder: { color: colors.placeholder },
  error: { fontSize: typography.sizes.xs, color: colors.errorText, marginTop: 4 },
});

// Form (Sheet)
const ff = StyleSheet.create({
  hint: { fontSize: typography.sizes.xs, color: colors.textMuted, marginBottom: 6 },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.base, paddingBottom: spacing['4xl'], maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  typeRow: { flexDirection: 'row', gap: spacing.md },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.inputBackground,
  },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeChipText: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});

// FilterChip
const fc = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    maxWidth: 130,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  chipText: { fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: '500', flexShrink: 1 },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
});

// PickerModal
const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  box: { width: '100%', backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', ...shadows.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  title: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, paddingHorizontal: spacing.md, height: 40, backgroundColor: colors.inputBackground, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: typography.sizes.sm, color: colors.textPrimary },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  itemActive: { backgroundColor: colors.primarySurface },
  itemText: { fontSize: typography.sizes.md, color: colors.textPrimary },
  itemTextActive: { color: colors.primary, fontWeight: '600' },
  empty: { textAlign: 'center', padding: spacing.xl, color: colors.textMuted },
});
