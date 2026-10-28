import { photoMoyenne } from '@/src/api/annonce.api';
import AppText from '@/src/components/AppText';
import { colors, radius, spacing, typography, webShadow, interactive } from '@/src/theme';
import type { Media } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

// Galerie de la fiche annonce sur le web desktop : une grande photo et jusqu'à
// quatre vignettes (2 × 2). Chaque photo ouvre la visionneuse plein écran.

const HEIGHT = 460;

function Tile({ uri, index, total, onPress, style }: {
  uri: string;
  index: number;
  total: number;
  onPress: (i: number) => void;
  style?: object;
}) {
  return (
    <Pressable
      onPress={() => onPress(index)}
      style={[g.tile, style]}
      accessibilityRole="button"
      accessibilityLabel={`Photo ${index + 1} sur ${total}, agrandir`}
    >
      <ExpoImage
        source={{ uri }}
        style={g.img}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    </Pressable>
  );
}

export function DesktopGallery({
  medias,
  onOpen,
}: {
  medias: Pick<Media, 'id' | 'url' | 'urlMoyenne'>[];
  onOpen: (index: number) => void;
}) {
  const urls = medias.map(photoMoyenne);

  if (urls.length === 0) {
    return (
      <View style={[g.wrap, g.empty]}>
        <Ionicons name="image-outline" size={56} color={colors.textMuted} />
        <AppText style={g.emptyText}>Aucune photo disponible</AppText>
      </View>
    );
  }

  const thumbs = urls.slice(1, 5);

  return (
    <View style={g.wrap}>
      <Tile uri={urls[0]} index={0} total={urls.length} onPress={onOpen} style={thumbs.length ? g.main : g.full} />
      {thumbs.length > 0 && (
        <View style={g.side}>
          {thumbs.map((uri, i) => (
            <Tile
              key={i}
              uri={uri}
              index={i + 1}
              total={urls.length}
              onPress={onOpen}
              // 1 vignette : pleine hauteur ; 2 : empilées ; 3-4 : grille 2 × 2.
              style={thumbs.length === 1 ? g.thumbFull : thumbs.length === 2 ? g.thumbHalf : g.thumbQuarter}
            />
          ))}
        </View>
      )}
      {urls.length > 1 && (
        <Pressable
          onPress={() => onOpen(0)}
          style={({ hovered }: { hovered?: boolean }) => [g.allBtn, hovered && g.allBtnHover]}
          accessibilityRole="button"
        >
          <Ionicons name="grid-outline" size={16} color={colors.textPrimary} />
          <AppText style={g.allText}>Voir les {urls.length} photos</AppText>
        </Pressable>
      )}
    </View>
  );
}

const GAP = 8;

const g = StyleSheet.create({
  wrap: {
    height: HEIGHT,
    flexDirection: 'row',
    gap: GAP,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.photoPlaceholder,
  },
  empty: { alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: spacing.sm },
  emptyText: { fontSize: typography.sizes.md, color: colors.textMuted },
  tile: { overflow: 'hidden', backgroundColor: colors.photoPlaceholder },
  img: { width: '100%', height: '100%' },
  main: { flex: 1.3 },
  full: { flex: 1 },
  side: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  thumbFull: { width: '100%', height: '100%' },
  thumbHalf: { width: '100%', height: (HEIGHT - GAP) / 2 },
  thumbQuarter: { width: `calc(50% - ${GAP / 2}px)` as unknown as number, height: (HEIGHT - GAP) / 2 },
  allBtn: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.textPrimary,
  },
  allBtnHover: { ...({ boxShadow: webShadow.md } as object), backgroundColor: interactive.hoverSurface },
  allText: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary },
});
