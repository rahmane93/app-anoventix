import React, { useEffect, useState } from 'react';
import { AlertButton, Animated, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../AppText';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import { Button } from './button';
import { overlayApi } from './overlay-host';

// ─── Dialogue unifié ──────────────────────────────────────────────────────────
// Remplace Alert.alert (boîte native, différente sur iOS / Android / web et
// hors charte) par un dialogue aux couleurs de l'app, rendu via OverlayHost.
// Même signature qu'Alert.alert : la migration est un simple renommage.
//
//   appAlert('Titre', 'Message', [
//     { text: 'Annuler', style: 'cancel' },
//     { text: 'Supprimer', style: 'destructive', onPress: () => … },
//   ]);

export function appAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const actions: AlertButton[] = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  const cancel = actions.find((b) => b.style === 'cancel');
  let id: number | null = null;

  const close = (button?: AlertButton) => {
    if (id == null) return;
    const current = id;
    id = null;
    // Ferme d'abord (animation de sortie), puis exécute l'action.
    overlayApi.update(current, render(false, () => {
      overlayApi.unregister(current);
      button?.onPress?.();
    }));
  };

  // Retour Android / tap sur le fond : équivaut à « Annuler » s'il existe,
  // ou à l'unique bouton d'un simple message d'information.
  const dismissButton = cancel ?? (actions.length === 1 ? actions[0] : undefined);
  const onRequestClose = () => { if (dismissButton) close(dismissButton); };

  const render = (visible: boolean, onExited?: () => void) => (
    <AlertView
      visible={visible}
      title={title}
      message={message}
      actions={actions}
      onPress={close}
      onBackdrop={onRequestClose}
      onExited={onExited}
    />
  );

  id = overlayApi.register(render(true), onRequestClose);
}

function AlertView({
  visible,
  title,
  message,
  actions,
  onPress,
  onBackdrop,
  onExited,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: AlertButton[];
  onPress: (b: AlertButton) => void;
  onBackdrop: () => void;
  onExited?: () => void;
}) {
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 160, useNativeDriver: true })
      .start(({ finished }) => { if (finished && !visible) onExited?.(); });
    // Déclenché uniquement sur changement de visibilité.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Deux actions côte à côte (annuler à gauche), au-delà en colonne.
  const ordered = [...actions].sort((a, b) => (a.style === 'cancel' ? -1 : b.style === 'cancel' ? 1 : 0));
  const inRow = ordered.length <= 2;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackdrop} accessibilityLabel="Fermer" />
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
        ]}
        accessibilityViewIsModal
        accessibilityRole="alert"
      >
        <AppText style={styles.title} accessibilityRole="header">{title}</AppText>
        {message ? <AppText style={styles.message}>{message}</AppText> : null}
        <View style={[styles.actions, inRow ? styles.actionsRow : styles.actionsCol]}>
          {ordered.map((b, i) => (
            <Button
              key={`${b.text}-${i}`}
              title={b.text ?? 'OK'}
              size="sm"
              variant={b.style === 'destructive' ? 'danger' : b.style === 'cancel' ? 'outline' : 'primary'}
              fullWidth={!inRow}
              style={inRow ? styles.rowBtn : undefined}
              onPress={() => onPress(b)}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  message: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  actionsRow: { flexDirection: 'row' },
  actionsCol: { flexDirection: 'column' },
  rowBtn: { flex: 1 },
});
