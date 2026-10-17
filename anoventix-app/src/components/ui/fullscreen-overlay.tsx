import React, { useEffect, useState, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { overlayApi } from './overlay-host';

// Overlay plein écran (fade in/out) monté via OverlayHost.
// Remplace <Modal animationType="fade"> RN pour la lightbox photo.

export function FullscreenOverlay({
  visible,
  onRequestClose,
  backgroundColor = '#000',
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  backgroundColor?: string;
  children: React.ReactNode;
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
      <OverlayBody
        visible={visible}
        backgroundColor={backgroundColor}
        onExited={() => setActive(false)}
      >
        {children}
      </OverlayBody>
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

function OverlayBody({
  visible,
  backgroundColor,
  onExited,
  children,
}: {
  visible: boolean;
  backgroundColor: string;
  onExited: () => void;
  children: React.ReactNode;
}) {
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) onExited();
    });
  }, [visible]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor, opacity: anim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
}
