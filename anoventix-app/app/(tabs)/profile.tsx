import { annonceHref } from '@/src/lib/annonce-url';
import { useBreakpoint, webColumnStyle } from '@/src/lib/responsive';
import { API_BASE_URL } from '@/src/api/client';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Dialog } from '@/src/components/ui/dialog';
import { Chip } from '@/src/components/ui/chip';
import { Input } from '@/src/components/ui/input';
import {
    AVATAR_SIZE,
    BANNER_HEIGHT,
    PIECES,
} from '@/src/features/profile/constants';
import { MenuRow, PieceStatusBadge, secStyles } from '@/src/features/profile/MenuRow';
import { OwnerAnnonceMiniCard } from '@/src/features/profile/OwnerAnnonceMiniCard';
import { SecurityCard } from '@/src/features/profile/SecurityCard';
import { useProfile } from '@/src/features/profile/useProfile';
import { colors, layout, radius, spacing, typography } from '@/src/theme';
import { STATUT_LICENCE_LABELS } from '@/src/types/licence.types';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LEGAL_LINKS } from '@/src/constants/legal';
import Constants from 'expo-constants';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';

/**
 * Aperçu de la pièce d'identité (image protégée par le token). En cas d'échec
 * (réseau, session, format non image), on l'explique au lieu d'un cadre vide.
 * Monté à chaque ouverture du dialogue : l'état d'erreur repart à zéro.
 */
function PieceApercu({ uri, token }: { uri: string; token: string | null }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  return (
    <View style={styles.modalImage}>
      {status !== 'error' ? (
        <Image
          source={{ uri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          cachePolicy="none"
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
          accessibilityLabel="Pièce d'identité"
        />
      ) : null}
      {status === 'loading' && <ActivityIndicator color={colors.primary} />}
      {status === 'error' && (
        <View style={styles.modalError}>
          <Ionicons name="document-outline" size={32} color={colors.textMuted} />
          <AppText style={styles.modalErrorText}>
            Aperçu indisponible. Vérifiez votre connexion puis rouvrez le document.
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
// Logique extraite dans useProfile ; cet écran ne fait que rendre.


// Web ≥ 1200 px : deux colonnes (identité et menu | sécurité et compte).
// Ailleurs, aucun conteneur ajouté : l'ordre et les mesures restent identiques.
function Column({ on, style, children }: { on: boolean; style: object; children: React.ReactNode }) {
  return on ? <View style={style}>{children}</View> : <>{children}</>;
}

export default function ProfileScreen() {
  const {
    isAuthenticated,
    isLoading,
    profile,
    token,
    error,
    successMsg,
    uploadingPhoto,
    uploadingPiece,
    isRefreshing,
    mesAnnonces,
    licence,
    pieceFormOpen,
    setPieceFormOpen,
    pieceTypeSel,
    setPieceTypeSel,
    pieceNumero,
    setPieceNumero,
    pieceFile,
    viewingPiece,
    setViewingPiece,
    pickAndUploadPhoto,
    pickPieceFile,
    handleSubmitPiece,
    pieceFeedback,
    handleLogout,
    handleDeleteAccount,
    handleExportDonnees,
    exporting,
    isDeletingAccount,
    handleRefresh,
    avatarUri,
    displayName,
    email,
    memberSince,
    roleLabels,
    roleDisplay,
    isModerationRole,
    isParticulier,
    isProfessionnel,
    docStatut,
  } = useProfile();

  // Arrivée depuis un blocage « pièce d'identité requise » (?section=piece) :
  // défile jusqu'à la section et ouvre le formulaire d'envoi si besoin.
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [pieceSectionY, setPieceSectionY] = useState<number | null>(null);
  const { isDesktop, isWide } = useBreakpoint();
  useEffect(() => {
    if (section !== 'piece' || pieceSectionY == null) return;
    if (!docStatut || docStatut === 'REJETEE') setPieceFormOpen(true);
    scrollRef.current?.scrollTo({ y: Math.max(0, pieceSectionY - spacing.base), animated: true });
    router.setParams({ section: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, pieceSectionY]);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isLoading && !profile) {
    return (
      <View style={styles.loadingFull}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        isDesktop && webColumnStyle(isWide ? 'detail' : 'form'),
        isDesktop && styles.scrollContentDesktop,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Bannières ─────────────────────────────────────────────────── */}
      {(error || successMsg) && (
        <View style={styles.bannerArea}>
          {error ? <AlertBanner message={error} variant="error" /> : null}
          {successMsg ? <AlertBanner message={successMsg} variant="success" /> : null}
        </View>
      )}

      <Column on={isWide} style={styles.cols}>
      <Column on={isWide} style={styles.colMain}>
      {/* ── Héro : bannière + avatar ───────────────────────────────────── */}
      <View style={styles.heroContainer}>
        <View style={styles.bannerWrap}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.bannerImage}
              contentFit="cover"
              blurRadius={20}
            />
          ) : null}
          <View style={styles.bannerOverlay} />
        </View>
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            style={styles.avatarRing}
            onPress={pickAndUploadPhoto}
            disabled={uploadingPhoto !== null}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Modifier la photo de profil"
            accessibilityState={{ disabled: uploadingPhoto !== null, busy: uploadingPhoto !== null }}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <AppText style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</AppText>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingPhoto === 'profil' ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="pencil" size={11} color={colors.white} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Carte identité ────────────────────────────────────────────── */}
      <View style={styles.identityCard}>
        <AppText style={styles.displayName}>{displayName}</AppText>
        {roleLabels.length > 0 && (
          <View style={styles.roleBadge}>
            <AppText style={styles.roleText}>{roleDisplay}</AppText>
          </View>
        )}
        <AppText style={styles.memberSince}>Membre depuis : {memberSince}</AppText>
        {(profile?.telephone || email) ? (
          <View style={styles.contactRow}>
            {profile?.telephone ? (
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                <AppText style={styles.contactText}>{profile.telephone}</AppText>
              </View>
            ) : null}
            {email ? (
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
                <AppText style={styles.contactText} numberOfLines={1}>{email}</AppText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* ── Mes Annonces (PARTICULIER et PROFESSIONNEL) */}
      {(isParticulier || isProfessionnel) && (
        <>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>Mes annonces</AppText>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/mes-annonces')}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="link"
              accessibilityLabel="Gérer mes annonces"
            >
              <AppText style={styles.sectionLink}>Gérer</AppText>
            </TouchableOpacity>
          </View>

          {mesAnnonces.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.annoncesList}
            >
              {mesAnnonces.slice(0, 5).map((a) => (
                <OwnerAnnonceMiniCard
                  key={a.id}
                  item={a}
                  onPress={() => router.push(annonceHref(a))}
                />
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={styles.annoncesEmpty}
              onPress={() => router.push('/(tabs)/publier')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <AppText style={styles.annoncesEmptyText}>Publier ma première annonce</AppText>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── Menu principal ────────────────────────────────────────────── */}
      <View style={styles.menuCard}>

        <MenuRow
          iconName="create-outline"
          label="Mettre à jour mes informations"
          onPress={() => router.push('/edit-profile')}
        />
        <MenuRow
          iconName="lock-closed-outline"
          label="Changer mon mot de passe"
          onPress={() => router.push('/(auth)/change-password')}
        />
        {isModerationRole && (
          <MenuRow
            iconName="key-outline"
            label="Codes de secours (double authentification)"
            onPress={() => router.push('/regenerer-codes-secours')}
          />
        )}
        {!isModerationRole && (
          <MenuRow
            iconName="flag-outline"
            label="Mes signalements"
            onPress={() => router.push('/mes-signalements')}
          />
        )}
        {/* Visible seulement une fois le mode licence activé par l'administrateur. */}
        {licence?.modeActif && (isParticulier || isProfessionnel) && (
          <MenuRow
            iconName="key-outline"
            label="Ma licence"
            onPress={() => router.push('/licence')}
            trailing={
              <AppText
                style={[
                  styles.menuTrailingText,
                  {
                    color: licence.bloque
                      ? colors.errorText
                      : licence.statut === 'ACTIVE' ? colors.successText : colors.textMuted,
                  },
                ]}
              >
                {licence.bloque ? 'Compte limité' : STATUT_LICENCE_LABELS[licence.statut]}
              </AppText>
            }
          />
        )}
      </View>

      </Column>
      <Column on={isWide} style={styles.colSide}>
      {/* ── Niveau de sécurité (pas pour la modération) ───────────────── */}
      {!isModerationRole && (
        <>
          <AppText
            style={secStyles.sectionLabel}
            onLayout={(e) => setPieceSectionY(e.nativeEvent.layout.y)}
          >
            Niveau de sécurité
          </AppText>
          <SecurityCard profile={profile} onAddDoc={() => { setPieceFormOpen(true); }} />
          {pieceFeedback?.variant === 'success' && (
            <View style={styles.pieceFeedback}>
              <AlertBanner message={pieceFeedback.message} variant="success" />
            </View>
          )}

          {/* Infos pièce soumise */}
          {docStatut && (
            <View style={styles.pieceInfoCard}>
              <PieceStatusBadge statut={docStatut} />
              {docStatut === 'REJETEE' && profile?.motifRejetPieceIdentite && (
                <View style={styles.rejectMotifBox}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                  <AppText style={styles.rejectMotifText}>{profile.motifRejetPieceIdentite}</AppText>
                </View>
              )}
              {profile?.typePieceIdentite && (
                <View style={styles.pieceInfoRow}>
                  <View style={styles.pieceInfoItem}>
                    <AppText style={styles.pieceInfoLabel}>Type</AppText>
                    <AppText style={styles.pieceInfoValue}>{PIECES.find((p) => p.value === profile.typePieceIdentite)?.label ?? profile.typePieceIdentite}</AppText>
                  </View>
                  <View style={styles.pieceInfoItem}>
                    <AppText style={styles.pieceInfoLabel}>Numéro</AppText>
                    <AppText style={styles.pieceInfoValue}>{profile.numeroPieceIdentite}</AppText>
                  </View>
                </View>
              )}
              {profile?.typePieceIdentite && (
                <Button
                  title="Voir le document"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  style={styles.pieceViewBtn}
                  leftIcon={<Ionicons name="eye-outline" size={16} color={colors.primary} />}
                  onPress={() => setViewingPiece(true)}
                  accessibilityLabel="Voir le document"
                />
              )}
            </View>
          )}

          {/* ── Formulaire pièce d'identité ───────────────────────────────── */}
          {pieceFormOpen && (!docStatut || docStatut === 'REJETEE') && (
            <>
              <AppText style={secStyles.sectionLabel}>Ma pièce d'identité</AppText>
              <View style={styles.formCard}>
                <AppText style={styles.fieldLabel}>Type de pièce</AppText>
                <View style={styles.pieceRow}>
                  {PIECES.map((p) => (
                    <Chip
                      key={p.value}
                      label={p.label}
                      selected={pieceTypeSel === p.value}
                      onPress={() => setPieceTypeSel(p.value)}
                    />
                  ))}
                </View>
                <Input
                  label="Numéro"
                  placeholder="Numéro sur le document"
                  value={pieceNumero}
                  onChangeText={setPieceNumero}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.filePicker} onPress={pickPieceFile} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Choisir une photo du document">
                  <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
                  <AppText style={styles.filePickerText} numberOfLines={1}>
                    {pieceFile ? pieceFile.name : 'Choisir une photo du document…'}
                  </AppText>
                  {pieceFile && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                </TouchableOpacity>
              </View>
              <Button
                title="Envoyer ma pièce d'identité"
                style={styles.saveBtn}
                onPress={handleSubmitPiece}
                isLoading={uploadingPiece}
              />
              {pieceFeedback?.variant === 'error' && (
                <View style={styles.pieceFeedback}>
                  <AlertBanner message={pieceFeedback.message} variant="error" />
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* ── Aide & informations ───────────────────────────────────────── */}
      <AppText style={secStyles.sectionLabel}>Aide et informations</AppText>
      <View style={styles.menuCard}>
        <MenuRow
          iconName="help-buoy-outline"
          label="Contacter le support"
          onPress={() => Linking.openURL(`mailto:${LEGAL_LINKS.supportEmail}`)}
        />
        <MenuRow
          iconName="document-text-outline"
          label="Conditions d’utilisation"
          onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.cgu)}
        />
        <MenuRow
          iconName="shield-outline"
          label="Politique de confidentialité"
          onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.confidentialite)}
        />
        <MenuRow
          iconName="information-circle-outline"
          label="Mentions légales"
          onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.mentionsLegales)}
        />
        <MenuRow
          iconName="download-outline"
          label={exporting ? 'Export en cours…' : 'Exporter mes données'}
          onPress={() => { if (!exporting) handleExportDonnees(); }}
        />
      </View>

      {/* ── Compte : actions sensibles, en dernier ───────────────────── */}
      <View style={[styles.menuCard, styles.accountCard]}>
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Se déconnecter">
          <View style={secStyles.menuIconWrap}>
            <Ionicons name="log-out-outline" size={18} color={colors.primary} />
          </View>
          <AppText style={styles.logoutText}>Se déconnecter</AppText>
        </TouchableOpacity>
      </View>
      {/* Un compte de modération ne peut pas se supprimer lui-même. */}
      {!isModerationRole && (
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Supprimer mon compte"
          accessibilityState={{ disabled: isDeletingAccount, busy: isDeletingAccount }}
        >
          {isDeletingAccount ? (
            <ActivityIndicator size="small" color={colors.errorText} />
          ) : (
            <AppText style={styles.deleteAccountText}>Supprimer mon compte</AppText>
          )}
        </TouchableOpacity>
      )}
      <AppText style={styles.versionText}>
        AnoventiX · version {Constants.expoConfig?.version ?? '—'}
      </AppText>
      </Column>
      </Column>

      {/* ── Modal visualisation pièce ────────────────────────────────── */}
      <Dialog
        visible={viewingPiece}
        onRequestClose={() => setViewingPiece(false)}
        dimColor="rgba(0,0,0,0.85)"
      >
        <View style={styles.modalCard}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setViewingPiece(false)}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          {profile?.typePieceIdentite && viewingPiece ? (
            <PieceApercu
              uri={`${API_BASE_URL}/api/users/${profile.id}/piece-identite?v=${encodeURIComponent(profile.numeroPieceIdentite ?? '')}`}
              token={token}
            />
          ) : null}
          <AppText style={styles.modalCaption}>
            {PIECES.find((p) => p.value === profile?.typePieceIdentite)?.label ?? profile?.typePieceIdentite} · {profile?.numeroPieceIdentite}
          </AppText>
        </View>
      </Dialog>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 48 },
  scrollContentDesktop: { paddingHorizontal: layout.gutter - 16 },
  cols: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  colMain: { flex: 1.15, minWidth: 0 },
  colSide: { flex: 1, minWidth: 0, paddingTop: 8 },
  loadingFull: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerArea: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    gap: spacing.sm,
  },

  // Héro
  heroContainer: {
    position: 'relative',
    marginBottom: AVATAR_SIZE / 2 + spacing.md,
  },
  bannerWrap: {
    height: BANNER_HEIGHT,
    backgroundColor: colors.headerBackground,
    overflow: 'hidden',
  },
  bannerImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26,60,110,0.15)',
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -(AVATAR_SIZE / 2 + spacing.md),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  avatarRing: {
    position: 'relative',
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700' as const,
    color: colors.white,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  // Identité
  identityCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  displayName: {
    fontSize: typography.sizes.xl,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  roleBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700' as const,
    color: colors.white,
    letterSpacing: 0.3,
  },
  memberSince: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    maxWidth: 180,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  sectionLink: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: '600' as const,
  },

  // Annonces
  annoncesList: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  annoncesEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  annoncesEmptyText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: '600' as const,
  },

  // Menu card
  menuCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  menuTrailingText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600' as const,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  logoutText: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: '600' as const,
  },
  accountCard: { marginTop: spacing.lg },
  deleteAccountBtn: { alignSelf: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.base, marginTop: spacing.sm },
  deleteAccountText: { fontSize: typography.sizes.sm, color: colors.errorText, fontWeight: '600' as const, textDecorationLine: 'underline' },
  versionText: { textAlign: 'center', fontSize: typography.sizes.xs, color: colors.textMuted, marginBottom: spacing.xl },

  // Formulaires
  formCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  saveBtn: { marginHorizontal: spacing.base, marginBottom: spacing.sm },
  pieceFeedback: { marginHorizontal: spacing.base, marginBottom: spacing.sm },
  pieceRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  filePicker: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.inputBackground,
  },
  filePickerText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },

  // Pièce info card
  pieceInfoCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pieceInfoRow: {
    flexDirection: 'row' as const,
    gap: spacing.md,
  },
  pieceInfoItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  pieceInfoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  pieceInfoValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: '600' as const,
  },
  pieceViewBtn: { alignSelf: 'flex-start' as const },
  rejectMotifBox: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rejectMotifText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.error,
    lineHeight: 18,
  },
  modalCard: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    paddingBottom: spacing.base,
  },
  modalClose: {
    alignSelf: 'flex-end' as const,
    padding: spacing.md,
  },
  modalImage: {
    width: '100%',
    height: 380,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalError: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  modalErrorText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
  modalCaption: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
});
