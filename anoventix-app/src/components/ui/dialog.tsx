import React, { useEffect, useState, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { overlayApi } from './overlay-host';

// Dialogue centré (fade + backdrop dim) monté via OverlayHost.
// Remplace <Modal animationType="fade"> RN pour les dialogues centrés.

export function Dialog({
  visible,
  onRequestClose,
  children,
  dimColor = 'rgba(0,0,0,0.45)',
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  dimColor?: string;
}) {
  const [active, setActive] = useState(visible);
  const idRef = useRef<number | null>(null);

  // Reste monté pendant l'animation de sortie : s'active dès que visible
  // (mise à jour pendant le rendu, sans effet ni rendu intermédiaire).
  if (visible && !active) setActive(true);

  useEffect(() => {
    if (!active) {
      if (idRef.current != null) {
        overlayApi.unregister(idRef.current);
        idRef.current = null;
      }
      return;
    }
    const node = (
      <DialogBody
        visible={visible}
        dimColor={dimColor}
        onRequestClose={onRequestClose}
        onExited={() => setActive(false)}
      >
        {children}
      </DialogBody>
    );
    if (idRef.current == null) {
      idRef.current = overlayApi.register(node, onRequestClose);
    } else {
      overlayApi.update(idRef.current, node);
    }
  });

  useEffect(
    () => () => {
      if (idRef.current != null) {
        overlayApi.unregister(idRef.current);
        idRef.current = null;
      }
    },
    [],
  );

  return null;
}

function DialogBody({
  visible,
  dimColor,
  onRequestClose,
  onExited,
  children,
}: {
  visible: boolean;
  dimColor: string;
  onRequestClose: () => void;
  onExited: () => void;
  children: React.ReactNode;
}) {
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) onExited();
    });
  }, [visible]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.center,
        { backgroundColor: dimColor, opacity: anim },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
      {/* Pleine largeur : les largeurs en % des dialogues (« 90% ») se calculent
          par rapport à l'écran, pas par rapport à leur propre contenu. */}
      <View pointerEvents="box-none" style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
});
