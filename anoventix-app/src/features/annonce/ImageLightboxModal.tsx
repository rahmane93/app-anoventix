import { FullscreenOverlay } from '@/src/components/ui/fullscreen-overlay';
import { colors, radius } from '@/src/theme';
import type { Media } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
    NativeScrollEvent,
    Platform,
    NativeSyntheticEvent,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { STATUS_H, useScreenDims } from './constants';

export function ImageLightboxModal({
  visible,
  medias,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  medias: Pick<Media, 'id' | 'url'>[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<any>(null);
  const { screenW: SCREEN_W, screenH: SCREEN_H } = useScreenDims();

  // À l'ouverture (ou si la photo de départ change) : index remis pendant le
  // rendu ; l'effet ne fait que positionner le défilement.
  const [ouverture, setOuverture] = useState({ visible, initialIndex });
  if (visible !== ouverture.visible || initialIndex !== ouverture.initialIndex) {
    setOuverture({ visible, initialIndex });
    if (visible) setActiveIndex(initialIndex);
  }

  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ x: initialIndex * SCREEN_W, animated: false });
    });
  }, [visible, initialIndex, SCREEN_W]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(idx);
  };

  const goTo = (next: number) => {
    if (next < 0 || next > medias.length - 1) return;
    (listRef.current as ScrollView | null)?.scrollTo({ x: next * SCREEN_W, animated: true });
    setActiveIndex(next);
  };

  // Web : navigation au clavier (← → Échap). Événement d'effet : lit l'index et
  // les callbacks courants sans réabonner l'écouteur à chaque rendu.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goTo(activeIndex - 1);
    else if (e.key === 'ArrowRight') goTo(activeIndex + 1);
    else if (e.key === 'Escape') onClose();
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  return (
    <FullscreenOverlay visible={visible} onRequestClose={onClose}>
      <View style={lb.container}>
        <StatusBar hidden />

        {/* Bouton fermer */}
        <TouchableOpacity
          style={lb.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Compteur */}
        {medias.length > 1 && (
          <View style={lb.counter}>
            <AppText style={lb.counterText}>{activeIndex + 1} / {medias.length}</AppText>
          </View>
        )}

        {/* Images */}
        <ScrollView
          ref={listRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentOffset={{ x: initialIndex * SCREEN_W, y: 0 }}
        >
          {medias.map((m) => (
            <View key={m.id} style={[lb.slide, { width: SCREEN_W, height: SCREEN_H }]}>
              <ExpoImage
                source={{ uri: m.url }}
                style={{ width: SCREEN_W, height: SCREEN_H }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          ))}
        </ScrollView>

        {/* Flèches */}
        {medias.length > 1 && (
          <>
            {activeIndex > 0 && (
              <TouchableOpacity
                style={[lb.arrow, lb.arrowLeft]}
                onPress={() => goTo(activeIndex - 1)}
                accessibilityRole="button"
                accessibilityLabel="Photo précédente"
              >
                <Ionicons name="chevron-back" size={26} color="#fff" />
              </TouchableOpacity>
            )}
            {activeIndex < medias.length - 1 && (
              <TouchableOpacity
                style={[lb.arrow, lb.arrowRight]}
                onPress={() => goTo(activeIndex + 1)}
                accessibilityRole="button"
                accessibilityLabel="Photo suivante"
              >
                <Ionicons name="chevron-forward" size={26} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Indicateurs points */}
        {medias.length > 1 && (
          <View style={lb.dots}>
            {medias.map((_, i) => (
              <View
                key={i}
                style={[lb.dot, i === activeIndex && lb.dotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </FullscreenOverlay>
  );
}

const lb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  slide: { justifyContent: 'center', alignItems: 'center' },
  closeBtn: {
    position: 'absolute',
    top: STATUS_H + 8,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    top: STATUS_H + 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  counterText: { fontSize: 14, fontWeight: '600', color: colors.white },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -26,
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: radius.md,
    zIndex: 10,
  },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  dots: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    zIndex: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: { backgroundColor: colors.white, width: 20 },
});
