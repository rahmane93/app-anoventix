import { colors, radius, spacing } from '@/src/theme';
import React from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { useScreenDims } from './constants';

export function DetailSkeleton() {
  const { screenW: SCREEN_W, imgHeight: IMG_HEIGHT } = useScreenDims();
  const opacity = React.useState(() => new Animated.Value(0.4))[0];
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  const b = (w: DimensionValue, h: number, r = 6) => (
    <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: colors.border, opacity }} />
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Image placeholder */}
      <Animated.View style={{ width: SCREEN_W, height: IMG_HEIGHT, backgroundColor: colors.border, opacity }} />
      {/* Bloc titre */}
      <View style={{ backgroundColor: colors.white, padding: spacing.base, gap: spacing.sm, marginBottom: spacing.md }}>
        {b('40%', 10)}
        {b('75%', 20, 4)}
        {b('55%', 26, 4)}
        {b('45%', 10)}
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
        {b('60%', 10)}
      </View>
      {/* Description */}
      <View style={{ backgroundColor: colors.white, borderRadius: radius.lg, marginHorizontal: spacing.base, marginBottom: spacing.md, padding: spacing.base, gap: spacing.sm }}>
        {b('35%', 12)}
        {b('100%', 10)}
        {b('90%', 10)}
        {b('70%', 10)}
      </View>
      {/* Points forts */}
      <View style={{ backgroundColor: colors.white, borderRadius: radius.lg, marginHorizontal: spacing.base, marginBottom: spacing.md, padding: spacing.base, gap: spacing.sm }}>
        {b('40%', 12)}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {b('30%', 40, radius.md)}
          {b('30%', 40, radius.md)}
          {b('30%', 40, radius.md)}
        </View>
      </View>
    </View>
  );
}
