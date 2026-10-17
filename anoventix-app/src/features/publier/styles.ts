import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { StyleSheet } from 'react-native';

// StyleSheet partagé par l'écran Publier et ses sous-composants
// (StepIndicator, SelectRow).
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Indicateur étapes
  stepHeader: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleRing: {
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  stepLabel: { fontSize: typography.sizes.xs, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  stepLabelDone: { color: colors.textSecondary },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.track,
    marginHorizontal: spacing.xs,
    marginBottom: 16,
  },
  stepLineActive: { backgroundColor: colors.primary },

  // Bannière fixe (erreurs / chargement) — toujours visible sans scroller
  fixedBanner: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.base, paddingBottom: 100 },

  // Titres
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  sectionHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.base,
    lineHeight: 18,
  },

  // Champ générique
  field: { marginBottom: spacing.base },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  chipError: { borderColor: colors.error },

  // Tuiles de choix (ChoiceTile) : grille 3 colonnes alignée sur la marge du formulaire
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs / 2 },
  tileCell: { width: '33.33%', padding: spacing.xs / 2 },
  tile: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    minHeight: 84,
  },
  tileActive: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySurface },
  tileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconWrapActive: { backgroundColor: colors.white },
  tileLabel: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  tileLabelActive: { color: colors.primary, fontWeight: '700' },
  tileCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  // Select
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  selectBtnError: { borderColor: colors.error },
  selectBtnDisabled: { backgroundColor: colors.background, opacity: 0.5 },
  selectBtnText: { fontSize: typography.sizes.md, color: colors.textPrimary },
  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
    zIndex: 99,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: { backgroundColor: colors.primarySurface },
  dropdownText: { fontSize: typography.sizes.md, color: colors.textPrimary },
  dropdownTextActive: { color: colors.primary, fontWeight: '600' },

  // Quartiers
  quartierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Résumé localisation
  locSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  locSummaryText: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: '600', flex: 1 },

  // GPS / carte
  gpsHint: { fontSize: typography.sizes.xs, color: colors.textMuted, marginBottom: spacing.sm },
  gpsBtnRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  gpsBtnHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  gpsBtnText: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: '700' },
  gpsCoords: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Loading
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base },
  loadingText: { fontSize: typography.sizes.sm, color: colors.textSecondary },

  // Textarea
  textarea: { height: 100, textAlignVertical: 'top', paddingTop: spacing.sm },
  errorText: { marginTop: spacing.xs, fontSize: typography.sizes.xs, color: colors.error },

  // Composition (pièces / chambres / sdb) — biens bâtis uniquement
  compoRow: { flexDirection: 'row', gap: spacing.sm },
  compoCell: { flex: 1 },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySurface,
    marginBottom: spacing.base,
  },
  infoNoteText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.primary,
    lineHeight: 20,
  },

  // Photos
  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  photoPickerBtnDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  photoPickerText: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recapCard: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
    marginBottom: spacing.base,
  },
  recapLabel: { fontSize: typography.sizes.sm, fontWeight: '800', color: colors.primary },
  recapLine: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  photoThumb: {
    width: '47%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26,60,110,0.75)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  photoBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },

  // Footer navigation
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  footerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: { paddingHorizontal: spacing.base },
  nextBtn: { flex: 1 },

  gateContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.base, backgroundColor: colors.background,
  },
  gateIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  gateTitle: {
    fontSize: typography.sizes.xl, fontWeight: '700',
    color: colors.textPrimary, textAlign: 'center',
  },
  gateSub: {
    fontSize: typography.sizes.md, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22,
  },
  gateBtn: { marginTop: spacing.sm },

  // Écran de succès
  successIcon: { backgroundColor: colors.successLight },
  successRef: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
  },
  successRefText: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.primary },

  uploadProgress: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },

  // En-tête : croix de fermeture
  headerCloseBtn: { paddingHorizontal: spacing.base, paddingVertical: 4 },

  // Photos
  photoError: { marginTop: 0, marginBottom: spacing.sm },

  // Recherche de quartier
  quartierSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  quartierSearchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },

  // Détails
  fieldCounter: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  fieldCounterWarn: { color: colors.warningText },
  inputSuffix: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textMuted },
  prixEnLettres: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  subsectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
