import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { StyleSheet } from 'react-native';

// StyleSheet partagé par l'écran Entreprise et ses sous-composants
// (SectionLabel, InfoRow, AgentCard).
export const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, gap: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base },
  loadingText: { fontSize: typography.sizes.sm, color: colors.textSecondary },

  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.base,
    ...shadows.sm,
  },

  btnTop: { marginTop: spacing.xs },

  // ── En-tête vide ──────────────────────────────────────────────────────────
  emptyHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.base,
  },

  // ── En-tête entreprise ────────────────────────────────────────────────────
  entrepriseHeader: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.md,
    ...shadows.sm,
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  entrepriseHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  entreprisePhotoWrap: {
    position: 'relative',
    width: 60,
    height: 60,
    flexShrink: 0,
  },
  entreprisePhoto: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
  },
  entreprisePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrepriseIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrepriseNom: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  entrepriseProp: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  entrepriseDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  entrepriseInfoList: {
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  entrepriseStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  entrepriseStat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  entrepriseStatValue: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.primary,
  },
  entrepriseStatLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  entrepriseStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  editBtn: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySurface,
    flexShrink: 0,
  },
  /** En-tête de la FlatList : reprend l'espacement vertical de `content`. */
  headerStack: { gap: spacing.sm },
  annoncesRow: { gap: spacing.sm },

  // ── Infos lecture ─────────────────────────────────────────────────────────
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoIcon: { marginTop: 2 },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  emptyInfo: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ── Agents ────────────────────────────────────────────────────────────────
  agentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.base,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  inviteNote: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    padding: spacing.base,
    lineHeight: 18,
  },
  emptyAgents: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.base,
  },
  emptyAgentsText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  agentsList: { gap: spacing.sm },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.base,
    ...shadows.sm,
  },
  agentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  agentInitials: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  agentName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  agentEmail: { fontSize: typography.sizes.xs, color: colors.textMuted },
  agentPhone: { fontSize: typography.sizes.xs, color: colors.textMuted },
  agentStatutRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  agentStatutDot: { width: 6, height: 6, borderRadius: 3 },
  agentStatut: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  agentActions: {
    gap: spacing.xs,
    flexShrink: 0,
  },
  agentActionBtn: {
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  agentToggleBtn: {
    borderColor: colors.border,
  },
  agentActionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  agentRemoveBtn: {
    borderColor: `${colors.error}55`,
    backgroundColor: `${colors.error}12`,
  },
});
