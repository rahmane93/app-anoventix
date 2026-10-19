import { vignette } from '@/src/api/annonce.api';
import { annonceHref } from '@/src/lib/annonce-url';
import { Image } from 'expo-image';
import { Prix } from '@/src/components/annonce/Prix';
import { useAnnonceStore } from '@/src/stores/annonce.store';
import { estRejetee, getEtatReexamen, getStatutChip } from '@/src/lib/annonce-statut';
import { isLoyerMensuel } from '@/src/lib/bien';
import { colors, radius, shadows, spacing, typography, typeAnnonceColors } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS } from '@/src/types/annonce.types';
import { formatDate, formatFullLocalisation, formatPrix, getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { useBreakpoint } from '@/src/lib/responsive';
import { CloturerModal } from './CloturerModal';
import { ReexamenModal } from './ReexamenModal';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';

export const AnnonceCard = React.memo(function AnnonceCard({
  item,
}: {
  item: BienImmo;
}) {
  const deleteAnnonce = useAnnonceStore((s) => s.deleteAnnonce);
  const reactiverAnnonce = useAnnonceStore((s) => s.reactiverAnnonce);
  const toggleActifAnnonce = useAnnonceStore((s) => s.toggleActifAnnonce);
  const [cloturerOpen, setCloturerOpen] = useState(false);
  const [reexamenOpen, setReexamenOpen] = useState(false);
  // Web desktop : carte de grille (marges portées par la grille).
  const { isDesktop } = useBreakpoint();
  const [deleting, setDeleting] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [togglingVisibilite, setTogglingVisibilite] = useState(false);

  // Expirée = clôture automatique : la réactivation est une prolongation gratuite.
  const isExpiree = item.motifCloture === 'EXPIREE';
  // En ligne côté serveur (publiée, non clôturée) ; « actif » distingue visible / masquée.
  const isPubliee = item.statutModeration === 'PUBLIEE';
  // Masquée : corrigeable puis réexamen (DEC-09). Rejetée : définitif, seule la suppression reste (DEC-10).
  const rejetee = estRejetee(item);
  const etatReexamen = getEtatReexamen(item);

  const handleReactiver = async () => {
    setReactivating(true);
    try {
      await reactiverAnnonce(item.id);
      appAlert(
        isExpiree ? 'Annonce prolongée' : 'Annonce réactivée',
        `"${item.titre}" est de nouveau en ligne.`,
      );
    } catch (err) {
      appAlert("Réactivation impossible", getErrorMessage(err, 'Impossible de réactiver cette annonce.'));
    } finally {
      setReactivating(false);
    }
  };

  const handleToggleVisibilite = async () => {
    setTogglingVisibilite(true);
    try {
      await toggleActifAnnonce(item.id);
    } catch (err) {
      appAlert("Visibilité inchangée", getErrorMessage(err, "Impossible de modifier la visibilité de l'annonce."));
    } finally {
      setTogglingVisibilite(false);
    }
  };

  const medias = Array.isArray(item.medias) ? item.medias : [];
  const m0 = medias[0];
  const isLocation = isLoyerMensuel(item.typeAnnonce);
  const locText =
    formatFullLocalisation(item.localisation) ||
    item.complementAdresse ||
    '';

  const handleDelete = () => {
    appAlert(
      'Supprimer l\'annonce',
      `Voulez-vous supprimer définitivement "${item.titre}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAnnonce(item.id);
            } catch {
              appAlert("Suppression impossible", 'Impossible de supprimer cette annonce.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const statusChip = getStatutChip(item);

  const metaText = [
    item.surfaceTotal != null ? `${item.surfaceTotal} m²` : null,
    locText || null,
    formatDate(item.dateCreation),
  ].filter(Boolean).join('  ·  ');

  const subMetaParts: string[] = [];
  if (item.vueCount != null) subMetaParts.push(`${item.vueCount} vue${item.vueCount !== 1 ? 's' : ''}`);
  if (item.nbFavoris != null) subMetaParts.push(`${item.nbFavoris} favori${item.nbFavoris !== 1 ? 's' : ''}`);
  subMetaParts.push(`Réf ${item.referenceAnnonce}`);
  if (isPubliee && item.actif && item.dateExpiration) {
    subMetaParts.push(`Expire le ${formatDate(item.dateExpiration)}`);
  }

  return (
    <TouchableOpacity
      style={[cardStyles.card, isDesktop && cardStyles.cardGrid]}
      activeOpacity={0.88}
      onPress={() => router.push(annonceHref(item))}
      accessibilityRole="button"
      accessibilityLabel={[TYPE_BIEN_LABELS[item.typeBien], item.titre, formatPrix(item.prixRevise ?? item.prix)].filter(Boolean).join(', ')}
    >
      {/* Haut : miniature + infos essentielles */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.thumb}>
          {m0 ? (
            <Image
              source={{ uri: vignette(m0) }}
              style={cardStyles.thumbImg}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={String(item.id)}
            />
          ) : (
            <View style={[cardStyles.thumbImg, cardStyles.thumbPlaceholder]}>
              <Ionicons name="image-outline" size={26} color={colors.textMuted} />
            </View>
          )}
          <View style={[cardStyles.typeBadge, { backgroundColor: typeAnnonceColors[item.typeAnnonce].fg }]}>
            <AppText style={cardStyles.typeBadgeText}>{TYPE_ANNONCE_LABELS[item.typeAnnonce]}</AppText>
          </View>
          {medias.length > 1 && (
            <View style={cardStyles.photosCount}>
              <Ionicons name="camera-outline" size={11} color="#fff" />
              <AppText style={cardStyles.photosCountText}>{medias.length}</AppText>
            </View>
          )}
        </View>

        <View style={cardStyles.info}>
          <View style={cardStyles.infoHeader}>
            <AppText style={cardStyles.typeBien} numberOfLines={1}>{TYPE_BIEN_LABELS[item.typeBien]}</AppText>
            {statusChip && (
              <View style={[cardStyles.statutBadge, { backgroundColor: statusChip.color }]}>
                <AppText style={cardStyles.statutText} numberOfLines={1}>{statusChip.text}</AppText>
              </View>
            )}
            {item.proprietaireMasque && (
              <View style={[cardStyles.statutBadge, { backgroundColor: colors.errorText }]}>
                <AppText style={cardStyles.statutText} numberOfLines={1}>Masquée (compte)</AppText>
              </View>
            )}
          </View>

          <AppText style={cardStyles.titre} numberOfLines={2}>{item.titre}</AppText>

          <Prix prix={item.prix} prixRevise={item.prixRevise} mensuel={isLocation} variant="small" />

          {metaText ? <AppText style={cardStyles.meta} numberOfLines={1}>{metaText}</AppText> : null}
          <AppText style={cardStyles.subMeta} numberOfLines={1}>{subMetaParts.join('  ·  ')}</AppText>
        </View>
      </View>

      {/* Motif communiqué par la modération (annonce masquée / rejetée) */}
      {(item.statutModeration === 'MASQUEE' || item.statutModeration === 'REJETEE') && (
        <View style={cardStyles.motifBox} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={16} color={colors.errorText} />
          <AppText style={cardStyles.motifText}>
            {item.motifModeration
              ? `Motif de la modération : ${item.motifModeration}`
              : 'Annonce retirée par la modération.'}
            {rejetee ? ' Rejet définitif : vous pouvez seulement supprimer cette annonce.' : ''}
            {etatReexamen === 'EN_COURS' ? ' Réexamen en cours : la modération vous répondra par email.' : ''}
            {etatReexamen === 'EPUISE' ? ' Trois demandes de réexamen déjà faites : contactez le support.' : ''}
          </AppText>
        </View>
      )}

      {/* Actions — proposées selon le statut : on ne clôture pas une annonce qui
          n'est pas en ligne. Compte masqué par l'admin : ni modifier ni remettre en ligne. */}
      <View style={cardStyles.actionsRow}>
        {!item.proprietaireMasque && !rejetee && (
          <Button
            title="Modifier"
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={cardStyles.actionBtn}
            leftIcon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
            onPress={() => router.push({ pathname: '/(tabs)/publier', params: { editId: String(item.id) } })}
            accessibilityLabel="Modifier l'annonce"
          />
        )}
        {etatReexamen !== 'AUCUN' && !item.proprietaireMasque && (
          <Button
            title={etatReexamen === 'EN_COURS' ? 'Réexamen en cours' : 'Demander un réexamen'}
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={cardStyles.actionBtn}
            disabled={etatReexamen !== 'DISPONIBLE'}
            leftIcon={<Ionicons name="refresh-outline" size={16} color={colors.primary} />}
            onPress={() => setReexamenOpen(true)}
            accessibilityLabel={etatReexamen === 'EN_COURS' ? 'Réexamen en cours' : "Demander un réexamen de l'annonce"}
          />
        )}
        {item.statutModeration === 'CLOTUREE' && !item.proprietaireMasque && (
          <Button
            title={isExpiree ? 'Prolonger' : 'Réactiver'}
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={cardStyles.actionBtn}
            leftIcon={<Ionicons name="refresh-outline" size={16} color={colors.primary} />}
            onPress={handleReactiver}
            isLoading={reactivating}
            accessibilityLabel={isExpiree ? "Prolonger l'annonce" : "Réactiver l'annonce"}
          />
        )}
        {isPubliee && (item.actif || !item.proprietaireMasque) && (
          <Button
            title={item.actif ? 'Masquer' : 'Afficher'}
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={cardStyles.actionBtn}
            leftIcon={<Ionicons name={item.actif ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.primary} />}
            onPress={handleToggleVisibilite}
            isLoading={togglingVisibilite}
            accessibilityLabel={item.actif ? "Masquer l'annonce" : "Afficher l'annonce"}
          />
        )}
      </View>
      <View style={cardStyles.actionsRow}>
        {isPubliee && item.actif && (
          <Button
            title="Clôturer"
            variant="outline"
            size="sm"
            fullWidth={false}
            style={cardStyles.actionBtn}
            leftIcon={<Ionicons name="lock-closed-outline" size={16} color={colors.primary} />}
            onPress={() => setCloturerOpen(true)}
            accessibilityLabel="Clôturer l'annonce"
          />
        )}
        <Button
          title="Supprimer"
          variant="dangerOutline"
          size="sm"
          fullWidth={false}
          style={cardStyles.actionBtn}
          leftIcon={<Ionicons name="trash-outline" size={16} color={colors.errorText} />}
          onPress={handleDelete}
          isLoading={deleting}
          accessibilityLabel="Supprimer l'annonce"
        />
      </View>

      <ReexamenModal visible={reexamenOpen} annonceId={item.id} titre={item.titre} onClose={() => setReexamenOpen(false)} />
      <CloturerModal visible={cloturerOpen} annonceId={item.id} titre={item.titre} onClose={() => setCloturerOpen(false)} />
    </TouchableOpacity>
  );
});

const THUMB = 104;

const cardStyles = StyleSheet.create({
  motifBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.errorLight,
  },
  motifText: { flex: 1, fontSize: typography.sizes.sm, color: colors.errorText, lineHeight: 20 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    padding: spacing.sm,
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  cardGrid: { flex: 1, marginHorizontal: 0, marginBottom: 0 },

  // Haut : miniature + infos
  topRow: { flexDirection: 'row', gap: spacing.sm },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
    position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  typeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  photosCount: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photosCountText: { fontSize: 11, color: colors.white, fontWeight: '600' },

  info: { flex: 1, gap: 3 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typeBien: {
    flexShrink: 1,
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statutBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
    maxWidth: '70%',
  },
  statutText: { fontSize: 11, fontWeight: '700', color: colors.white },
  titre: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary, lineHeight: 20 },
  meta: { fontSize: typography.sizes.xs, color: colors.textMuted },
  subMeta: { fontSize: 12, color: colors.textMuted },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: { flex: 1 },
});
