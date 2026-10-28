import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';

export function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <Ionicons name="home-outline" size={52} color={colors.textMuted} />
      </View>
      <AppText style={emptyStyles.title}>Aucune annonce publiée</AppText>
      <AppText style={emptyStyles.subtitle}>
        Vous n'avez pas encore publié d'annonce.{'\n'}
        Commencez à vendre ou louer votre bien !
      </AppText>
      <TouchableOpacity
        style={emptyStyles.btn}
        onPress={() => router.push('/(tabs)/publier')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Publier une annonce"
      >
        <Ionicons name="add" size={20} color={colors.white} />
        <AppText style={emptyStyles.btnText}>Publier une annonce</AppText>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  btnText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.white,
  },
});
