import React, { useEffect, useState, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useBreakpoint } from '../../lib/responsive';
import { webShadow } from '../../theme';
import { overlayApi } from './overlay-host';

// Bottom sheet animé (slide-up + backdrop) monté via OverlayHost.
// Remplace <Modal animationType="slide"> RN.
// Web desktop : même contenu présenté en dialog centré (pas de bord d'écran bas).

export function Sheet({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(visible);
  const idRef = useRef<number | null>(null);

  // Reste monté pendant l'animation de sortie : s'active dès que visible
  // (mise à jour pendant le rendu, sans effet ni rendu intermédiaire).
  if (visible && !active) setActive(true);

  // Synchronise le contenu dans l'OverlayHost à chaque render
  useEffect(() => {
    if (!active) {
      if (idRef.current != null) {
        overlayApi.unregister(idRef.current);
        idRef.current = null;
      }
      return;
    }
    const node = (
      <SheetBody
        visible={visible}
        onRequestClose={onRequestClose}
        onExited={() => setActive(false)}
      >
        {children}
      </SheetBody>
    );
    if (idRef.current == null) {
      idRef.current = overlayApi.register(node, onRequestClose);
    } else {
      overlayApi.update(idRef.current, node);
    }
  });

  // Cleanup au démontage
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

function SheetBody({
  visible,
  onRequestClose,
  onExited,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  onExited: () => void;
  children: React.ReactNode;
}) {
  const anim = useState(() => new Animated.Value(0))[0];
  const { isDesktop } = useBreakpoint();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) onExited();
    });
  }, [visible]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
      </Animated.View>
      {isDesktop ? (
        <Animated.View
          style={[
            styles.wrapper,
            styles.wrapperCentered,
            {
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.dialog}>{children}</View>
        </Animated.View>
      ) : (
      <Animated.View
        style={[
          styles.wrapper,
          {
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Remonte le contenu au-dessus du clavier (formulaires dans la feuille). */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          {children}
        </KeyboardAvoidingView>
      </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  wrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  wrapperCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  // Le contenu est dessiné pour un bas d'écran (coins hauts arrondis) : le cadre
  // du dialog arrondit les quatre coins et borne la largeur.
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    ...({ boxShadow: webShadow.lg } as object),
  },
});
