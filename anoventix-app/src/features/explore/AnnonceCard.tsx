import { AnnonceMosaic } from '@/src/components/annonce/AnnonceMosaic';
import { Prix } from '@/src/components/annonce/Prix';
import { ROLE_ANNONCEUR_LABELS as ROLE_LABELS } from '@/src/lib/roles';
import { colors, radius, spacing, typography, typeAnnonceColors } from '@/src/theme';
import type { BienImmo } from '@/src/types/annonce.types';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS } from '@/src/types/annonce.types';
import { formatComposition, isLoyerMensuel, libelleCautionAvance } from '@/src/lib/bien';
import { useBreakpoint, useHover } from '@/src/lib/responsive';
import { formatFullLocalisation, formatPrix } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';

const IS_WEB = Platform.OS === 'web';

/**
 * Carte d'annonce du flux (Explorer, favoris, à proximité).
 * Identité « le quartier d'abord » : le lieu ouvre la carte, le prix court
 * (« 4,5 M GNF ») est l'information la plus visible ; carte plate, sans ombre.
 */
export const AnnonceCard = React.memo(function AnnonceCard({
  item,
  isFav,
  isFavBusy,
  isOwner,
  onPress,
  onToggleFav,
  style,
}: {
  item: BienImmo;
  isFav: boolean;
  isFavBusy?: boolean;
  isOwner?: boolean;
  onPress: () => void;
  /** Absent : pas de cœur (ex. compte de modération). */
  onToggleFav?: () => void;
  style?: object;
}) {
  const medias = Array.isArray(item.medias) ? item.medias : [];
  const isMensuel = isLoyerMensuel(item.typeAnnonce);
  const composition = formatComposition(item);
  const canFav = !isOwner && !!onToggleFav;
  // Web desktop : carte de grille (marges portées par la grille), relief au survol.
  const { isDesktop } = useBreakpoint();
  const [hovered, hoverProps] = useHover();

  // Lieu : quartier en avant, commune en second ; sinon ce qui est disponible.
  const quartier = item.localisation?.quartier ?? null;
  const lieuSecondaire = quartier
    ? item.localisation?.commune ?? null
    : formatFullLocalisation(item.localisation) || item.complementAdresse || null;

  const meta = [
    TYPE_BIEN_LABELS[item.typeBien],
    composition.replace(/ · /g, ', '),
    item.surfaceTotal != null ? `${item.surfaceTotal.toLocaleString('fr-FR')} m²` : null,
  ].filter(Boolean).join(', ');

  const a11yLabel = [
    TYPE_ANNONCE_LABELS[item.typeAnnonce],
    item.titre,
    `${formatPrix(item.prixRevise ?? item.prix)}${isMensuel ? ' par mois' : ''}`,
    meta,
    formatFullLocalisation(item.localisation) || item.complementAdresse,
    isFav ? 'dans vos favoris' : null,
  ].filter(Boolean).join(', ');

  const favButton = canFav ? (
          <TouchableOpacity
            style={[cardStyles.favOverlay, IS_WEB && !isDesktop && cardStyles.favOverlayWebCompact]}
            onPress={(e) => { e.stopPropagation(); onToggleFav(); }}
            activeOpacity={0.85}
            disabled={!!isFavBusy}
            accessibilityRole="button"
            accessibilityLabel={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            accessibilityState={{ selected: isFav, disabled: !!isFavBusy, busy: !!isFavBusy }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {isFavBusy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={20}
                color={isFav ? colors.favorite : colors.textPrimary}
              />
            )}
          </TouchableOpacity>
  ) : null;

  return (
    <View {...hoverProps} style={isDesktop ? cardStyles.gridCell : undefined}>
    <TouchableOpacity
      style={[cardStyles.card, isDesktop && cardStyles.cardGrid, isDesktop && hovered && cardStyles.cardHover, style]}
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      // Le cœur est imbriqué dans la carte : VoiceOver/TalkBack ne l'atteignent pas
      // séparément. On l'expose comme action personnalisée de la carte.
      accessibilityActions={canFav ? [{ name: 'favori', label: isFav ? 'Retirer des favoris' : 'Ajouter aux favoris' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'favori' && canFav && !isFavBusy) onToggleFav?.();
      }}
    >
      <AnnonceMosaic medias={item.medias} height={isDesktop ? 210 : 190} recyclingKey={item.id} placeholderIconSize={28}>
        {/* Type d'annonce : pastille blanche, texte à la couleur du type */}
        <View style={cardStyles.badge}>
          <AppText style={[cardStyles.badgeText, { color: typeAnnonceColors[item.typeAnnonce].fg }]}>
            {TYPE_ANNONCE_LABELS[item.typeAnnonce]}
          </AppText>
        </View>

        {medias.length > 1 && (
          <View style={cardStyles.photosCount}>
            <Ionicons name="camera-outline" size={12} color={colors.white} />
            <AppText style={cardStyles.photosCountText}>{medias.length}</AppText>
          </View>
        )}

        {!IS_WEB && favButton}
      </AnnonceMosaic>

      <View style={cardStyles.body}>
        {(quartier || lieuSecondaire) ? (
          <View style={cardStyles.lieuRow}>
            <Ionicons name="location-outline" size={15} color={colors.primary} />
            {quartier ? <AppText style={cardStyles.quartier} numberOfLines={1}>{quartier}</AppText> : null}
            {lieuSecondaire ? (
              <AppText style={cardStyles.commune} numberOfLines={1}>{lieuSecondaire}</AppText>
            ) : null}
          </View>
        ) : null}

        <AppText style={cardStyles.titre} numberOfLines={2}>{item.titre}</AppText>

        <View style={cardStyles.prix}>
          <Prix prix={item.prix} prixRevise={item.prixRevise} mensuel={isMensuel} variant="card" />
          {libelleCautionAvance(item) ? <AppText style={cardStyles.cautionAvance}>{libelleCautionAvance(item)}</AppText> : null}
        </View>

        <View style={cardStyles.metaRow}>
          {meta ? <AppText style={cardStyles.meta} numberOfLines={1}>{meta}</AppText> : <View />}
          {item.annonceur?.role ? (
            <AppText style={cardStyles.role}>{ROLE_LABELS[item.annonceur.role]}</AppText>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
    {/* Web : un <button> ne peut pas en contenir un autre — le cœur est posé
        par-dessus la carte au lieu d'être imbriqué. */}
    {IS_WEB && favButton}
    </View>
  );
});

const cardStyles = StyleSheet.create({
  cautionAvance: { fontSize: 12, color: colors.textSecondary },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  gridCell: { flex: 1 },
  cardGrid: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  cardHover: { borderColor: colors.primary },

  badge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: '800' },
  favOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mobile web : la carte a une marge latérale que le conteneur n'a pas.
  favOverlayWebCompact: { right: spacing.base + spacing.sm },
  photosCount: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(17,24,39,0.6)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  photosCountText: { fontSize: typography.sizes.xs, color: colors.white, fontWeight: '700' },

  body: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.base, gap: 4 },
  lieuRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quartier: { fontSize: typography.sizes.sm, fontWeight: '800', color: colors.primary, flexShrink: 1 },
  commune: { fontSize: typography.sizes.sm, color: colors.textMuted, flexShrink: 1 },
  titre: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  prix: { marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  meta: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  role: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary, flexShrink: 0 },
});
