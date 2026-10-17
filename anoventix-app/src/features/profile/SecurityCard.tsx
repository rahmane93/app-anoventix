import { colors, radius, spacing, typography } from '@/src/theme';
import type { UserProfile } from '@/src/types/user.types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';

export function SecurityCard({ profile, onAddDoc }: { profile: UserProfile | null; onAddDoc?: () => void }) {
  const emailOk = true;
  const docOk = profile?.statutPieceIdentite === 'VALIDEE';

  const steps = [
    { key: 'email', label: 'E-mail\nvérifié', done: emailOk },
    { key: 'doc', label: 'Document\nvérifié', done: docOk },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  const docStatut = profile?.statutPieceIdentite ?? null;
  const actions: { label: string; onPress: () => void }[] = [];
  if (!docStatut || docStatut === 'REJETEE') {
    actions.push({ label: "Envoyer ma pièce d'identité", onPress: () => onAddDoc?.() });
  }

  return (
    <View style={secCardStyles.card}>
      <View style={secCardStyles.left}>
        <View style={secCardStyles.stepsRow}>
          {steps.map((step, i) => (
            <React.Fragment key={step.key}>
              <View style={secCardStyles.stepItem}>
                <View style={[secCardStyles.stepDot, step.done && secCardStyles.stepDotDone]}>
                  {step.done && <Ionicons name="checkmark" size={10} color={colors.white} />}
                </View>
                <AppText style={secCardStyles.stepLabel}>{step.label}</AppText>
              </View>
              {i < steps.length - 1 && (
                <View
                  style={[
                    secCardStyles.stepLine,
                    steps[i + 1].done && secCardStyles.stepLineDone,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
        <View style={secCardStyles.track}>
          <View style={[secCardStyles.fill, { width: `${percent}%` as any }]} />
        </View>
        <AppText style={secCardStyles.percent}>{percent}%</AppText>
      </View>

      {actions.length > 0 && <View style={secCardStyles.divider} />}

      {actions.length > 0 && (
        <View style={secCardStyles.right}>
          <AppText style={secCardStyles.actionsTitle}>Actions à faire</AppText>
          {actions.map((a) => (
            <View key={a.label} style={secCardStyles.actionRow}>
              <AppText style={secCardStyles.actionLabel}>{a.label}</AppText>
              <Button
                title="Vérifier"
                variant="secondary"
                size="sm"
                fullWidth={false}
                style={secCardStyles.actionBtn}
                onPress={a.onPress}
                accessibilityLabel={a.label}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const secCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.base,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  left: { flex: 1, gap: spacing.sm },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.successText,
    borderColor: colors.successText,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 9,
    borderRadius: 1,
  },
  stepLineDone: { backgroundColor: colors.successText },
  stepLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  track: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%' as any,
    backgroundColor: colors.successText,
    borderRadius: radius.full,
  },
  percent: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: -spacing.base,
  },
  right: { flex: 1, gap: spacing.sm },
  actionsTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  actionLabel: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  actionBtn: {},
});
