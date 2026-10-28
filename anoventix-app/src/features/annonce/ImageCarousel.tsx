import type { ComponentRef } from 'react';
import { photoMoyenne } from '@/src/api/annonce.api';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import type { Media } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { STATUS_H, useScreenDims } from './constants';

export function ImageCarousel({
  medias,
  onBack,
  onShare,
  isFav,
  onFav,
  onImagePress,
}: {
  medias: Pick<Media, 'id' | 'url' | 'urlMoyenne'>[];
  onBack: () => void;
  onShare: () => void;
  isFav: boolean;
  onFav?: () => void;
  onImagePress?: (index: number) => void;
}) {
  const [indexChoisi, setActiveIndex] = useState(0);
  const { screenW: SCREEN_W, imgHeight: IMG_HEIGHT } = useScreenDims();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const urls = medias.map(photoMoyenne);
  // Photo supprimée pendant l'affichage : l'index est ramené dans les bornes
  // par calcul, et l'effet ne fait que recaler le défilement.
  const activeIndex = Math.min(indexChoisi, Math.max(0, urls.length - 1));

  useEffect(() => {
    if (indexChoisi <= urls.length - 1) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, urls.length - 1) * SCREEN_W, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(idx);
  };

  const goTo = (dir: -1 | 1) => {
    const next = Math.min(Math.max(activeIndex + dir, 0), urls.length - 1);
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
    setActiveIndex(next);
  };

  const hasImages = urls.length > 0;

  return (
    <View style={[cs.wrapper, { width: SCREEN_W, height: IMG_HEIGHT }]}>
      {hasImages ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          removeClippedSubviews
        >
          {urls.map((uri, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.95}
              onPress={() => onImagePress?.(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${i + 1} sur ${urls.length}, agrandir`}
            >
              <ExpoImage
                source={{ uri }}
                style={{ width: SCREEN_W, height: IMG_HEIGHT }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={cs.placeholder}>
          <Ionicons name="image-outline" size={64} color={colors.textMuted} />
          <AppText style={cs.placeholderText}>Aucune photo disponible</AppText>
        </View>
      )}

      {/* Flèches de navigation */}
      {hasImages && urls.length > 1 && (
        <>
          <TouchableOpacity
            style={[cs.arrow, cs.arrowLeft]}
            onPress={() => goTo(-1)}
            disabled={activeIndex === 0}
            accessibilityRole="button"
            accessibilityLabel="Photo précédente"
            accessibilityState={{ disabled: activeIndex === 0 }}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={activeIndex === 0 ? 'rgba(255,255,255,0.35)' : colors.white}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[cs.arrow, cs.arrowRight]}
            onPress={() => goTo(1)}
            disabled={activeIndex === urls.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Photo suivante"
            accessibilityState={{ disabled: activeIndex === urls.length - 1 }}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={activeIndex === urls.length - 1 ? 'rgba(255,255,255,0.35)' : colors.white}
            />
          </TouchableOpacity>
        </>
      )}

      {/* Badge bas-gauche : compteur */}
      <View style={cs.badgesRow}>
        {hasImages && urls.length > 1 && (
          <View style={cs.counterBadge}>
            <AppText style={cs.counterText}>
              {activeIndex + 1}/{urls.length}
            </AppText>
          </View>
        )}
      </View>

      {/* Boutons overlay : retour, partage, favori */}
      <View style={[cs.topRow, { top: STATUS_H + 8 }]}>
        <TouchableOpacity
          style={cs.iconBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={cs.topRight}>
          <TouchableOpacity
            style={cs.iconBtn}
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="Partager l'annonce"
          >
            <Ionicons name="share-social-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          {onFav !== undefined && (
            <TouchableOpacity
              style={cs.iconBtn}
              onPress={onFav}
              accessibilityRole="button"
              accessibilityLabel={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              accessibilityState={{ selected: isFav }}
            >
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={20}
                color={isFav ? colors.favorite : colors.textPrimary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  wrapper: { backgroundColor: colors.photoPlaceholder },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderText: { fontSize: typography.sizes.md, color: colors.textMuted },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: radius.md,
  },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  badgesRow: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterText: { fontSize: typography.sizes.sm, color: colors.white, fontWeight: '600' },
  topRow: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRight: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
