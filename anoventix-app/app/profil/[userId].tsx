import { annonceHref } from '@/src/lib/annonce-url';
import { goBackOr } from '@/src/lib/navigation';
import { webColumnStyle } from '@/src/lib/responsive';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { buildMediaUrl, vignette } from '@/src/api/annonce.api';

import { getProfilPublic, type ProfilPublic } from '@/src/api/user.api';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS } from '@/src/types/annonce.types';
import { formatPrix } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';

// ─── Mini carte annonce ───────────────────────────────────────────────────────

function AnnonceItem({ item }: { item: BienImmo }) {
  const cover = item.medias?.[0] ? vignette(item.medias[0]) : undefined;
  return (
    <TouchableOpacity
      style={s.annonceCard}
      onPress={() => router.push(annonceHref(item))}
      activeOpacity={0.8}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={s.annonceCover} contentFit="cover" />
      ) : (
        <View style={[s.annonceCover, s.annonceCoverPlaceholder]}>
          <Ionicons name="image-outline" size={24} color={colors.border} />
        </View>
      )}
      <View style={s.annonceBody}>
        <AppText style={s.annonceTitre} numberOfLines={2}>{item.titre}</AppText>
        <AppText style={s.annoncePrix}>{formatPrix(item.prixRevise ?? item.prix)}</AppText>
        <View style={s.annonceMeta}>
          <AppText style={s.annonceTag}>{TYPE_ANNONCE_LABELS[item.typeAnnonce]}</AppText>
          <AppText style={s.annonceDot}>·</AppText>
          <AppText style={s.annonceTag}>{TYPE_BIEN_LABELS[item.typeBien]}</AppText>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

export default function ProfilPublicScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [profil, setProfil] = useState<ProfilPublic | null>(null);
  const [annonces, setAnnonces] = useState<BienImmo[]>([]);
  // Chargement dérivé de l'id déjà chargé (pas de setState synchrone dans l'effet).
  const [chargePour, setChargePour] = useState<string | null>(null);
  const loading = chargePour !== userId;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getProfilPublic(userId)
      .then((p) => {
        setError(null);
        setProfil(p);
        setAnnonces(p.annonces.data);
        // Professionnel ou agent : la page de l'agence remplace le profil (RG-02-39).
        if (p.entrepriseId) router.replace({ pathname: '/entreprise-publique/[entrepriseId]', params: { entrepriseId: p.entrepriseId } });
      })
      .catch(() => setError('Ce profil n’est pas disponible.'))
      .finally(() => setChargePour(userId));
  }, [userId]);

  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Profil', headerBackTitle: '' }} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !profil) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Profil', headerBackTitle: '' }} />
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <AppText style={s.errorText}>{error ?? 'Profil introuvable'}</AppText>
        <Button
          title="Retour"
          variant="outline"
          fullWidth={false}
          style={s.retryBtn}
          onPress={() => goBackOr()}
        />
      </View>
    );
  }

  const displayName = [profil.prenom, profil.initialeNom].filter(Boolean).join(' ') || 'Utilisateur';
  const avatarUri = profil.photoProfil ? buildMediaUrl(profil.photoProfil) : null;
  const initiales = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const memberSince = profil.membreDepuis
    ? new Date(profil.membreDepuis).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <FlatList
      {...LIST_PERF_PROPS}
      data={annonces}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <AnnonceItem item={item} />}
      contentContainerStyle={[s.list, webColumnStyle('form')]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <Stack.Screen
            options={{
              title: displayName ?? 'Profil',
              headerBackTitle: '',
            }}
          />

          {/* Profil */}
          <View style={s.profilCard}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatar} contentFit="cover" />
            ) : (
              <View style={s.avatarPlaceholder}>
                <AppText style={s.avatarInitials}>{initiales}</AppText>
              </View>
            )}
            <AppText style={s.name}>{displayName}</AppText>
            <View style={s.metaRow}>
              <View style={s.badge}>
                <Ionicons name="person-outline" size={12} color={colors.primary} />
                <AppText style={s.badgeText}>Particulier</AppText>
              </View>
              {memberSince ? (
                <>
                  <AppText style={s.dot}>·</AppText>
                  <AppText style={s.since}>Membre depuis {memberSince}</AppText>
                </>
              ) : null}
            </View>
            {profil.identiteVerifiee ? (
              <View style={s.phoneRow} accessibilityLabel="Identité vérifiée">
                <Ionicons name="shield-checkmark" size={14} color={colors.successText} />
                <AppText style={[s.phone, { color: colors.successText, fontWeight: '700' }]}>Identité vérifiée</AppText>
              </View>
            ) : null}
          </View>

          {/* Section annonces */}
          <View style={s.sectionHeader}>
            <AppText style={s.sectionTitle}>Annonces</AppText>
            <AppText style={s.sectionCount}>{annonces.length}</AppText>
          </View>

          {annonces.length === 0 && (
            <View style={s.emptyAnnonces}>
              <Ionicons name="home-outline" size={32} color={colors.border} />
              <AppText style={s.emptyText}>Aucune annonce publiée</AppText>
            </View>
          )}
        </>
      }
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.base,
  },
  errorText: { fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {},

  list: { backgroundColor: colors.background, paddingBottom: spacing['3xl'] },

  // Profil card
  profilCard: {
    backgroundColor: colors.white,
    margin: spacing.base,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: typography.sizes['2xl'], fontWeight: '700', color: colors.white },
  name: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: '600' },
  dot: { color: colors.textMuted, fontSize: typography.sizes.sm },
  since: { fontSize: typography.sizes.sm, color: colors.textMuted },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  phone: { fontSize: typography.sizes.sm, color: colors.textMuted },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  sectionCount: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 24,
    textAlign: 'center',
  },

  // Annonce card
  annonceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  annonceCover: { width: 72, height: 56, borderRadius: radius.md },
  annonceCoverPlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annonceBody: { flex: 1, gap: 3 },
  annonceTitre: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  annoncePrix: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.primary },
  annonceMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  annonceTag: { fontSize: typography.sizes.xs, color: colors.textMuted },
  annonceDot: { fontSize: typography.sizes.xs, color: colors.textMuted },

  // Empty
  emptyAnnonces: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyText: { fontSize: typography.sizes.md, color: colors.textMuted },
});
