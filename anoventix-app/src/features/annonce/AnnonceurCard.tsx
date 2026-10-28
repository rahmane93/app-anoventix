import { Image } from 'expo-image';
import { buildMediaUrl } from '@/src/api/annonce.api';
import { getEntrepriseProfil } from '@/src/api/entreprise.api';
import { useBreakpoint } from '@/src/lib/responsive';
import { ROLE_ANNONCEUR_COLORS as ROLE_COLORS, ROLE_ANNONCEUR_LABELS as ROLE_LABELS } from '@/src/lib/roles';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import type { Annonceur } from '@/src/types/annonce.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';

export function AnnonceurCard({ annonceur }: { annonceur: Annonceur }) {
  const isPro =
    annonceur.role === 'PROFESSIONNEL' || annonceur.role === 'AGENT_PROFESSIONNEL';

  const [entrepriseNom, setEntrepriseNom] = useState<string | null>(
    annonceur.entrepriseNom ?? null,
  );

  useEffect(() => {
    if (isPro && annonceur.entrepriseId && !annonceur.entrepriseNom) {
      getEntrepriseProfil(annonceur.entrepriseId)
        .then((res) => setEntrepriseNom(res.entreprise.nom))
        .catch(() => {});
    }
  }, [annonceur.entrepriseId, isPro, annonceur.entrepriseNom]);

  const nom = [annonceur.prenom, annonceur.nom].filter(Boolean).join(' ') || annonceur.email || '';
  const initiales = nom
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const handlePress = () => {
    if (isPro && annonceur.entrepriseId) {
      router.push(`/entreprise-publique/${annonceur.entrepriseId}` as any);
    } else if (!isPro && annonceur.id) {
      router.push(`/profil/${annonceur.id}` as any);
    }
  };

  const canNavigate = isPro ? !!annonceur.entrepriseId : !!annonceur.id;
  // Web desktop : carte de la colonne latérale (sans marge d'écran).
  const { isDesktop } = useBreakpoint();

  return (
    <View style={[ac.card, isDesktop && ac.cardDesktop]}>
      <View style={ac.header}>
        <Ionicons name="person-circle-outline" size={17} color={colors.primary} />
        <AppText style={ac.title}>Annonceur</AppText>
      </View>
      <View style={ac.row}>
        {annonceur.photoProfil ? (
          <Image source={{ uri: buildMediaUrl(annonceur.photoProfil) }} style={ac.avatar} />
        ) : (
          <View style={ac.avatarPlaceholder}>
            <AppText style={ac.avatarInitials}>{initiales}</AppText>
          </View>
        )}
        <View style={ac.info}>
          <View style={ac.nameRow}>
            <AppText style={ac.name}>{nom}</AppText>
            {annonceur.role ? (
              <View style={[ac.roleBadge, { backgroundColor: ROLE_COLORS[annonceur.role] + '18', borderColor: ROLE_COLORS[annonceur.role] + '60' }]}>
                <AppText style={[ac.roleText, { color: ROLE_COLORS[annonceur.role] }]}>
                  {ROLE_LABELS[annonceur.role]}
                </AppText>
              </View>
            ) : null}
          </View>
          {isPro && entrepriseNom ? (
            <View style={ac.entrepriseRow}>
              <Ionicons name="business-outline" size={12} color={colors.textMuted} />
              <AppText style={ac.entreprise}>{entrepriseNom}</AppText>
              {annonceur.agenceVerifiee ? (
                <View style={ac.verifiee} accessibilityLabel="Agence vérifiée">
                  <Ionicons name="shield-checkmark" size={12} color={colors.successText} />
                  <AppText style={ac.verifieeTexte}>Agence vérifiée</AppText>
                </View>
              ) : null}
            </View>
          ) : null}
          {annonceur.telephone ? (
            <TouchableOpacity
              style={ac.phoneRow}
              onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${annonceur.telephone}`); }}
            >
              <Ionicons name="call-outline" size={13} color={colors.primary} />
              <AppText style={ac.phone}>{annonceur.telephone}</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {canNavigate && (
        <>
          <View style={ac.divider} />
          <TouchableOpacity style={ac.seeMoreRow} onPress={handlePress} activeOpacity={0.7}>
            <Ionicons name="grid-outline" size={14} color={colors.primary} />
            <AppText style={ac.seeMoreText}>
              {isPro
                ? `Voir les annonces de ${entrepriseNom ?? 'cette entreprise'}`
                : `Voir les annonces de ${nom || 'ce vendeur'}`}
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const ac = StyleSheet.create({
  verifiee: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 6 },
  verifieeTexte: { fontSize: 12, fontWeight: '700', color: colors.successText },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    padding: spacing.base,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardDesktop: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.none,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.white },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  roleText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  entrepriseRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  entreprise: { fontSize: typography.sizes.sm, color: colors.textMuted },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  phone: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginTop: spacing.md },
  seeMoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  seeMoreText: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: '600', flex: 1 },
});
