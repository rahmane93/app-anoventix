import { filterAnnonces } from '@/src/api/annonce.api';
import { getLocalisationsByRegion } from '@/src/api/localisation.api';
import { Sheet } from '@/src/components/ui/sheet';
import { REGIONS_GUINEE } from '@/src/stores/annonce.store';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { AnnonceFilterParams, Localisation } from '@/src/types/annonce.types';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANNONCE_BIENS_MAP } from '@/src/features/publier/constants';
import { champsComposition, isBienBati, isLoyerMensuel } from '@/src/lib/bien';
import {
    CHAMBRES_MIN_OPTIONS,
    EMPTY_FILTERS,
    SORT_OPTIONS,
    TYPE_ANNONCE_CHIPS,
    TYPE_BIEN_CHIPS,
    sanitizeFilters,
} from './filters';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';

// Séparateur de milliers « 50 000 000 » pendant la saisie.
const groupDigits = (n?: number) =>
  n == null ? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const parseDigits = (v: string) => {
  const n = parseInt(v.replace(/\D/g, ''), 10);
  return isNaN(n) ? undefined : n;
};

function RangeInputs({
  unit,
  min,
  max,
  onChange,
  placeholders,
}: {
  unit: string;
  min?: number;
  max?: number;
  onChange: (min?: number, max?: number) => void;
  placeholders: [string, string];
}) {
  return (
    <View style={fm.priceRow}>
      <View style={fm.priceField}>
        <AppText style={fm.priceLabel}>Minimum</AppText>
        <AppTextInput
          style={fm.priceInput}
          keyboardType="number-pad"
          placeholder={placeholders[0]}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={`Minimum en ${unit}`}
          value={groupDigits(min)}
          onChangeText={(v) => onChange(parseDigits(v), max)}
        />
      </View>
      <View style={fm.priceSep} />
      <View style={fm.priceField}>
        <AppText style={fm.priceLabel}>Maximum</AppText>
        <AppTextInput
          style={fm.priceInput}
          keyboardType="number-pad"
          placeholder={placeholders[1]}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={`Maximum en ${unit}`}
          value={groupDigits(max)}
          onChangeText={(v) => onChange(min, parseDigits(v))}
        />
      </View>
    </View>
  );
}

export function FilterModal({
  visible,
  draft,
  query,
  onChange,
  onApply,
  onClose,
}: {
  visible: boolean;
  draft: AnnonceFilterParams;
  /** Recherche texte en cours : prise en compte dans le décompte. */
  query: string;
  onChange: (next: AnnonceFilterParams) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<AnnonceFilterParams>) => onChange({ ...draft, ...patch });
  const showChambres = !draft.typeBien || champsComposition(draft.typeBien).includes('nbChambres');
  const [quartierQuery, setQuartierQuery] = useState('');

  // ── Décompte des résultats (bouton « Voir N annonces ») ───────────────────
  // Requête de taille 1 (seul le total est lu), différée pour ne pas solliciter
  // le réseau à chaque frappe dans le budget.
  const [count, setCount] = useState<number | null>(null);
  const countRequestId = useRef(0);
  const draftKey = JSON.stringify(draft);
  useEffect(() => {
    if (!visible) return;
    const requestId = ++countRequestId.current;
    const t = setTimeout(() => {
      // Mêmes critères que ceux appliqués par « Voir les résultats ».
      filterAnnonces({
        ...sanitizeFilters(draft),
        q: query.trim(),
        page: 0,
        size: 1,
      })
        .then((page) => {
          if (requestId === countRequestId.current) {
            setCount(typeof page.totalItems === 'number' ? page.totalItems : null);
          }
        })
        .catch(() => {
          if (requestId === countRequestId.current) setCount(null);
        });
    }, 500);
    return () => clearTimeout(t);
  }, [visible, draftKey, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyTitle =
    count == null
      ? 'Voir les résultats'
      : count === 0
        ? 'Aucune annonce ne correspond'
        : `Voir ${count.toLocaleString('fr-FR')} annonce${count > 1 ? 's' : ''}`;

  // ── Localisation cascade ─────────────────────────────────────────────────
  // Localisations de la dernière région chargée. La liste affichée et l'état
  // « chargement » en sont dérivés : aucun setState synchrone dans l'effet.
  const [loc, setLoc] = useState<{ region: string; list: Localisation[] } | null>(null);
  const locByRegion = useMemo(
    () => (draft.region && loc?.region === draft.region ? loc.list : []),
    [draft.region, loc],
  );
  const isLoadingLoc = visible && !!draft.region && loc?.region !== draft.region;

  // Charge les localisations de la région choisie (à l'ouverture ou au changement).
  useEffect(() => {
    const region = draft.region;
    if (!visible || !region || loc?.region === region) return;
    let annule = false;
    getLocalisationsByRegion(region)
      .then((list) => { if (!annule) setLoc({ region, list: Array.isArray(list) ? list : [] }); })
      .catch(() => { if (!annule) setLoc({ region, list: [] }); });
    return () => { annule = true; };
  }, [visible, draft.region, loc?.region]);

  const prefectures = useMemo(
    () => [...new Set(locByRegion.map((l) => l.prefecture))].sort(),
    [locByRegion],
  );

  const communes = useMemo(
    () => [...new Set(locByRegion.filter((l) => l.prefecture === draft.prefecture).map((l) => l.commune))].sort(),
    [locByRegion, draft.prefecture],
  );

  const quartiers = useMemo(
    () => [...new Set(locByRegion.filter((l) => l.prefecture === draft.prefecture && l.commune === draft.commune).map((l) => l.quartier))].sort(),
    [locByRegion, draft.prefecture, draft.commune],
  );

  const handleRegionSelect = (r: string) => {
    const same = draft.region === r;
    onChange({ ...draft, region: same ? undefined : r, prefecture: undefined, commune: undefined, quartier: undefined });
  };

  return (
    <Sheet visible={visible} onRequestClose={onClose}>
      <View style={fm.sheet}>
          {/* En-tête */}
          <View style={fm.header}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Fermer les filtres"
            >
              <Ionicons name="close-outline" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
            <AppText style={fm.headerTitle} accessibilityRole="header">Filtres</AppText>
            <TouchableOpacity
              onPress={() => onChange(EMPTY_FILTERS)}
              accessibilityRole="button"
              accessibilityLabel="Réinitialiser les filtres"
            >
              <AppText style={fm.resetBtn}>Réinitialiser</AppText>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={fm.body} keyboardShouldPersistTaps="handled">
            {/* Type de transaction */}
            <AppText style={fm.sectionTitle}>Type de transaction</AppText>
            <View style={fm.chipRow}>
              {TYPE_ANNONCE_CHIPS.map((t) => t && (
                <Chip
                  key={t}
                  label={TYPE_ANNONCE_LABELS[t]}
                  selected={draft.typeAnnonce === t}
                  onPress={() => {
                    const typeAnnonce = draft.typeAnnonce === t ? undefined : t;
                    const keepBien =
                      !typeAnnonce || !draft.typeBien || ANNONCE_BIENS_MAP[typeAnnonce].includes(draft.typeBien);
                    set({ typeAnnonce, typeBien: keepBien ? draft.typeBien : undefined });
                  }}
                />
              ))}
            </View>

            {/* Type de bien */}
            <AppText style={fm.sectionTitle}>Type de bien</AppText>
            <View style={fm.chipRow}>
              {TYPE_BIEN_CHIPS.filter(
                (t) => !draft.typeAnnonce || (t && ANNONCE_BIENS_MAP[draft.typeAnnonce].includes(t)),
              ).map((t) => t && (
                <Chip
                  key={t}
                  label={TYPE_BIEN_LABELS[t]}
                  selected={draft.typeBien === t}
                  onPress={() => {
                    const typeBien = draft.typeBien === t ? undefined : t;
                    // Terrain / domaine : les critères de chambres ne s'appliquent pas.
                    const champs = typeBien ? champsComposition(typeBien) : ['nbChambres', 'nbPieces'];
                    set({
                      typeBien,
                      nbChambresMin: champs.includes('nbChambres') ? draft.nbChambresMin : undefined,
                      nbPiecesMin: champs.includes('nbPieces') ? draft.nbPiecesMin : undefined,
                    });
                  }}
                />
              ))}
            </View>

            {/* Budget — loyer mensuel pour location / bail */}
            <AppText style={fm.sectionTitle}>
              {isLoyerMensuel(draft.typeAnnonce) ? 'Loyer mensuel (GNF)' : 'Budget (GNF)'}
            </AppText>
            <RangeInputs
              unit="GNF"
              min={draft.prixMin}
              max={draft.prixMax}
              onChange={(prixMin, prixMax) => set({ prixMin, prixMax })}
              placeholders={
                isLoyerMensuel(draft.typeAnnonce)
                  ? ['ex : 1 000 000', 'ex : 5 000 000']
                  : ['ex : 50 000 000', 'ex : 300 000 000']
              }
            />
            {draft.prixMin != null && draft.prixMax != null && draft.prixMin > draft.prixMax && (
              <AppText style={fm.hint}>Le minimum dépasse le maximum : ils seront inversés.</AppText>
            )}

            {/* Chambres — sans objet pour un terrain / domaine vendu ou loué en l'état */}
            {showChambres && (
              <>
                <AppText style={fm.sectionTitle}>Chambres</AppText>
                <View style={fm.chipRow}>
                  {CHAMBRES_MIN_OPTIONS.map((n) => {
                    const active = draft.nbChambresMin === n;
                    return (
                      <Chip
                        key={n}
                        label={`${n}+`}
                        selected={active}
                        onPress={() => set({ nbChambresMin: active ? undefined : n })}
                        accessibilityLabel={`Au moins ${n} chambre${n > 1 ? 's' : ''}`}
                      />
                    );
                  })}
                </View>
              </>
            )}

            {/* Surface / superficie */}
            <AppText style={fm.sectionTitle}>
              {draft.typeBien && !isBienBati(draft.typeBien) ? 'Superficie (m²)' : 'Surface (m²)'}
            </AppText>
            <RangeInputs
              unit="m²"
              min={draft.surfaceMin}
              max={draft.surfaceMax}
              onChange={(surfaceMin, surfaceMax) => set({ surfaceMin, surfaceMax })}
              placeholders={['ex : 100', 'ex : 1 000']}
            />

            {/* Localisation — cascade région → préfecture → commune → quartier */}
            <AppText style={fm.sectionTitle}>Région</AppText>
            <View style={fm.chipRow}>
              {REGIONS_GUINEE.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  selected={draft.region === r}
                  onPress={() => handleRegionSelect(r)}
                />
              ))}
            </View>

            {isLoadingLoc && (
              <View style={fm.locLoadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText style={fm.locLoadingText}>Chargement des localisations…</AppText>
              </View>
            )}

            {prefectures.length > 0 && (
              <>
                <AppText style={fm.sectionTitle}>Préfecture</AppText>
                <View style={fm.chipRow}>
                  {prefectures.map((p) => (
                    <Chip
                      key={p}
                      label={p}
                      selected={draft.prefecture === p}
                      onPress={() => onChange({ ...draft, prefecture: draft.prefecture === p ? undefined : p, commune: undefined, quartier: undefined })}
                    />
                  ))}
                </View>
              </>
            )}

            {communes.length > 0 && (
              <>
                <AppText style={fm.sectionTitle}>Commune</AppText>
                <View style={fm.chipRow}>
                  {communes.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      selected={draft.commune === c}
                      onPress={() => onChange({ ...draft, commune: draft.commune === c ? undefined : c, quartier: undefined })}
                    />
                  ))}
                </View>
              </>
            )}

            {quartiers.length > 0 && (
              <>
                <AppText style={fm.sectionTitle}>Quartier</AppText>
                {quartiers.length > 12 && (
                  <AppTextInput
                    style={fm.locInput}
                    placeholder="Rechercher un quartier…"
                    placeholderTextColor={colors.placeholder}
                    value={quartierQuery}
                    onChangeText={setQuartierQuery}
                    accessibilityLabel="Rechercher un quartier"
                  />
                )}
                <View style={fm.chipRow}>
                  {quartiers
                    .filter((q) => !quartierQuery.trim() || q.toLowerCase().includes(quartierQuery.trim().toLowerCase()))
                    .map((q) => (
                    <Chip
                      key={q}
                      label={q}
                      selected={draft.quartier === q}
                      onPress={() => onChange({ ...draft, quartier: draft.quartier === q ? undefined : q })}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Trier par */}
            <AppText style={fm.sectionTitle}>Trier par</AppText>
            <View style={fm.chipRow}>
              {SORT_OPTIONS.map((opt) => {
                const active = draft.sort === opt.sort && draft.direction === opt.direction;
                return (
                  <Chip
                    key={`${opt.sort}-${opt.direction}`}
                    label={opt.label}
                    selected={active}
                    onPress={() =>
                      active
                        ? set({ sort: undefined, direction: undefined })
                        : set({ sort: opt.sort, direction: opt.direction })
                    }
                  />
                );
              })}
            </View>
          </ScrollView>

          {/* Pied de page */}
          <View style={[fm.footer, { paddingBottom: Math.max(spacing.base, insets.bottom + spacing.sm) }]}>
            <Button
              title={applyTitle}
              style={fm.applyBtn}
              onPress={onApply}
            />
          </View>
        </View>
    </Sheet>
  );
}

const fm = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '92%',
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  resetBtn: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: '600' },
  hint: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: spacing.xs },
  body: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl, gap: spacing.xs },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  priceField: { flex: 1, gap: 4 },
  priceLabel: { fontSize: typography.sizes.xs, color: colors.textMuted, fontWeight: '500' },
  priceInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  priceSep: { width: 16, height: 1, backgroundColor: colors.border, marginTop: spacing.lg },
  locLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  locLoadingText: { fontSize: typography.sizes.sm, color: colors.textMuted },
  locInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  applyBtn: {},
});
