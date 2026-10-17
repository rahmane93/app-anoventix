import AppText from '@/src/components/AppText';
import { WebContainer, type ContainerSize } from '@/src/lib/responsive';
import { colors, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

// En-tête de page web desktop : remplace l'en-tête natif centré par un titre
// éditorial aligné sur la colonne de contenu, avec un lien « Retour » discret.

export function WebPageHeader({
  title,
  back = false,
  right,
  size = 'page',
}: {
  title?: string;
  /** Affiche le lien « Retour » (écrans empilés). */
  back?: boolean;
  right?: React.ReactNode;
  size?: ContainerSize;
}) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'));

  return (
    <View style={s.band}>
      <WebContainer size={size}>
        {back ? (
          <Pressable onPress={goBack} accessibilityRole="link" style={s.back}>
            {({ hovered }: { hovered?: boolean }) => (
              <>
                <Ionicons name="arrow-back" size={16} color={hovered ? colors.primaryDark : colors.primaryLight} />
                <AppText style={[s.backText, hovered && s.backTextHover]}>Retour</AppText>
              </>
            )}
          </Pressable>
        ) : null}
        <View style={s.row}>
          {title ? (
            <AppText style={s.title} numberOfLines={1} accessibilityRole="header">
              {title}
            </AppText>
          ) : <View />}
          {right ? <View style={s.right}>{right}</View> : null}
        </View>
      </WebContainer>
    </View>
  );
}

const s = StyleSheet.create({
  band: {
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  backText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.primaryLight,
  },
  backTextHover: { color: colors.primaryDark, textDecorationLine: 'underline' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  title: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes['3xl'],
    color: colors.textPrimary,
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
