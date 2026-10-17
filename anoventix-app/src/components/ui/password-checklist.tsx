import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../AppText';
import { PASSWORD_CHECKS } from '../../lib/validation';
import { colors, spacing, typography } from '../../theme';

/** Règles du mot de passe cochées au fil de la saisie (même source que la validation). */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <View style={styles.list} accessibilityLabel="Règles du mot de passe">
      {PASSWORD_CHECKS.map((c) => {
        const ok = c.test(value);
        return (
          <View key={c.label} style={styles.row} accessibilityState={{ checked: ok }}>
            <Ionicons
              name={ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={ok ? colors.success : colors.placeholder}
            />
            <AppText style={[styles.text, ok && styles.textOk]}>{c.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: -spacing.xs, marginBottom: spacing.md, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: typography.sizes.xs, color: colors.textMuted },
  textOk: { color: colors.successText },
});
