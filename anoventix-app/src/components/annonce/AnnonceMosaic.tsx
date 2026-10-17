import { buildMediaUrl } from '@/src/api/annonce.api';
import { colors, radius } from '@/src/theme';
import type { Media } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Mosaïque de photos d'une annonce, commune à toutes les cartes :
 *  - 0 ou 1 photo : pleine largeur (placeholder si aucune) ;
 *  - 2 photos     : côte à côte ;
 *  - 3 et plus    : une grande à gauche, deux empilées à droite.
 *
 * `children` est rendu par-dessus (badges, bouton favori…), positionné en absolu
 * par l'appelant.
 */
export function AnnonceMosaic({
  medias,
  height,
  recyclingKey,
  placeholderIconSize = 24,
  style,
  children,
}: {
  medias: Media[] | null | undefined;
  height: number;
  /** Identifiant stable (id d'annonce) : évite d'afficher l'ancienne image d'une cellule recyclée. */
  recyclingKey?: string | number;
  placeholderIconSize?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const urls = (Array.isArray(medias) ? medias : [])
    .map((m) => (m?.url ? buildMediaUrl(m.url) : ''))
    .filter(Boolean)
    .slice(0, 3);
  const key = recyclingKey != null ? String(recyclingKey) : undefined;

  const photo = (uri: string, i: number) => (
    <Image
      source={{ uri }}
      style={styles.image}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={key ? `${key}-${i}` : undefined}
      transition={120}
      accessible={false}
    />
  );

  return (
    <View style={[styles.grid, { height }, style]}>
      {urls.length <= 1 && (
        <View style={styles.cell}>
          {urls[0] ? photo(urls[0], 0) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="image-outline" size={placeholderIconSize} color={colors.border} />
            </View>
          )}
        </View>
      )}

      {urls.length === 2 && (
        <>
          <View style={styles.cell}>{photo(urls[0], 0)}</View>
          <View style={styles.cell}>{photo(urls[1], 1)}</View>
        </>
      )}

      {urls.length >= 3 && (
        <>
          <View style={styles.cell}>{photo(urls[0], 0)}</View>
          <View style={styles.column}>
            <View style={styles.cell}>{photo(urls[1], 1)}</View>
            <View style={styles.cell}>{photo(urls[2], 2)}</View>
          </View>
        </>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    position: 'relative',
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    backgroundColor: colors.background,
  },
  column: { flex: 1, gap: 2 },
  cell: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  image: { width: '100%', height: '100%' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.divider,
  },
});
