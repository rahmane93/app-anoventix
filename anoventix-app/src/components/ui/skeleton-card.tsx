import { colors, radius, shadows, spacing } from '@/src/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/**
 * Carte squelette de chargement (liste d'annonces). Composant partagé —
 * remplace les copies explore / mes-annonces / favoris.
 * `React.memo` : rendu répété dans des FlatList, props vides → memo bénéfique.
 */
export const SkeletonCard = React.memo(function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View style={[skeletonStyles.card, { opacity }]}>
      <View style={skeletonStyles.imageArea} />
      <View style={skeletonStyles.body}>
        <View style={skeletonStyles.line1} />
        <View style={skeletonStyles.line2} />
        <View style={skeletonStyles.line3} />
        <View style={skeletonStyles.lineFooter} />
      </View>
    </Animated.View>
  );
});

export const SKELETON_DATA = [1, 2, 3, 4];

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  imageArea: { width: '100%', height: 170, backgroundColor: colors.background },
  body: { padding: spacing.base, gap: spacing.sm },
  line1: { height: 10, width: '35%', backgroundColor: colors.border, borderRadius: 4 },
  line2: { height: 16, width: '80%', backgroundColor: colors.border, borderRadius: 4 },
  line3: { height: 14, width: '50%', backgroundColor: colors.border, borderRadius: 4 },
  lineFooter: { height: 10, width: '65%', backgroundColor: colors.border, borderRadius: 4, marginTop: 4 },
});
