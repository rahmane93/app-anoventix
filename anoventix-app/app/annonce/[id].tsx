import { libelleCautionAvance } from '@/src/lib/bien';
import { annonceHref } from '@/src/lib/annonce-url';
import { goBackOr } from '@/src/lib/navigation';
import { MOTIF_LABELS, type MotifSignalement } from '@/src/api/annonce.api';
import { Button } from '@/src/components/ui/button';
import { IconButton } from '@/src/components/ui/icon-button';
import { Chip } from '@/src/components/ui/chip';
import { LeafletMap } from '@/src/components/ui/LeafletMap';
import { Sheet } from '@/src/components/ui/sheet';
import { AnnonceurCard } from '@/src/features/annonce/AnnonceurCard';
import { ModerationBanner } from '@/src/features/annonce/ModerationBanner';
import { Prix } from '@/src/components/annonce/Prix';
import { PointFort, Section } from '@/src/features/annonce/atoms';
import { DetailSkeleton } from '@/src/features/annonce/DetailSkeleton';
import { DesktopGallery } from '@/src/features/annonce/DesktopGallery';
import { ImageCarousel } from '@/src/features/annonce/ImageCarousel';
import { ImageLightboxModal } from '@/src/features/annonce/ImageLightboxModal';
import { DEFAULT_FIRST_MESSAGE, useAnnonceDetail } from '@/src/features/annonce/useAnnonceDetail';
import { SuggestCard } from '@/src/features/explore/SuggestCard';
import { requireLogin } from '@/src/lib/auth-redirect';
import { useBreakpoint, WebContainer } from '@/src/lib/responsive';
import { colors, radius, shadows, spacing, typeAnnonceColors, typography, webShadow } from '@/src/theme';
import {
    DOCUMENTS_LABELS,
    MOTIF_CLOTURE_LABELS,
    TYPE_ANNONCE_LABELS,
    TYPE_BIEN_LABELS,
} from '@/src/types/annonce.types';
import { formatDate, formatPrix } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    Linking,

    Platform,

    ScrollView,

    StatusBar,

    StyleSheet,

    TouchableOpacity,

    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Construit l'URL d'ouverture dans l'app cartographique native : Apple Maps sur
// iOS, Google Maps (intent geo:) sur Android, Google Maps web ailleurs.
function buildMapsUrl(lat: number, lng: number, label: string): string {
  const q = encodeURIComponent(label);
  return Platform.select({
    ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${q})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  }) as string;
}

// Lien wa.me (app WhatsApp si installée, sinon navigateur) avec un premier
// message qui cite l'annonce, pour que l'annonceur sache de quoi on parle.
function buildWhatsAppUrl(telephone: string, titre: string, reference: string): string {
  const numero = telephone.replace(/\D/g, '').replace(/^00/, '');
  const message = `Bonjour, je suis intéressé(e) par votre annonce « ${titre} » (réf. ${reference}) vue sur AnoventiX.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

// ─── Écran principal ──────────────────────────────────────────────────────────
// Logique extraite dans useAnnonceDetail ; cet écran ne fait que rendre.

// ─── Formulaires des feuilles ─────────────────────────────────────────────────
// Chacun possède son champ texte : une frappe ne re-rend que le formulaire,
// pas la fiche entière (carrousel, carte, annonces similaires).

function SignalementCommentForm({
  canSubmit,
  isLoading,
  onCancel,
  onSubmit,
}: {
  canSubmit: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: (commentaire: string) => void;
}) {
  const [commentaire, setCommentaire] = useState('');
  return (
    <>
      <AppTextInput
        style={s.signalerInput}
        placeholder="Commentaire optionnel (500 caractères max)"
        placeholderTextColor={colors.placeholder}
        value={commentaire}
        onChangeText={(t) => setCommentaire(t.slice(0, 500))}
        multiline
        numberOfLines={3}
      />
      <View style={s.signalerActions}>
        <Button title="Annuler" variant="outline" fullWidth={false} style={s.sheetBtn} onPress={onCancel} />
        <Button
          title="Signaler"
          variant="danger"
          fullWidth={false}
          style={s.sheetBtn}
          onPress={() => onSubmit(commentaire)}
          disabled={!canSubmit}
          isLoading={isLoading}
          accessibilityLabel="Envoyer le signalement"
        />
      </View>
    </>
  );
}

function ContactMessageForm({
  isLoading,
  onCancel,
  onSubmit,
}: {
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: (message: string) => void;
}) {
  const [message, setMessage] = useState(DEFAULT_FIRST_MESSAGE);
  return (
    <>
      <AppTextInput
        style={s.signalerInput}
        value={message}
        onChangeText={(t) => setMessage(t.slice(0, 1000))}
        multiline
        numberOfLines={4}
        autoFocus
        accessibilityLabel="Votre message"
      />
      <View style={s.signalerActions}>
        <Button title="Annuler" variant="outline" fullWidth={false} style={s.sheetBtn} onPress={onCancel} />
        <Button
          title="Envoyer"
          fullWidth={false}
          style={s.sheetBtn}
          onPress={() => onSubmit(message)}
          disabled={!message.trim()}
          isLoading={isLoading}
        />
      </View>
    </>
  );
}

export default function AnnonceDetailScreen() {
  const {
    id,
    isLoading,
    error,
    currentAnnonce,
    loadAnnonce,
    sortedMedias,
    isLocation,
    isOwnAnnonce,
    isStaff,
    pointsForts,
    locLabel,
    isAuthenticated,
    favorisIds,
    similaires,
    creatingConversationForAnnonceId,
    lightboxVisible,
    setLightboxVisible,
    lightboxIndex,
    setLightboxIndex,
    descExpanded,
    setDescExpanded,
    signalerVisible,
    setSignalerVisible,
    selectedMotif,
    setSelectedMotif,
    isSignaling,
    signalSuccess,
    contactVisible,
    setContactVisible,
    handleSendFirstMessage,
    handleToggleFavoris,
    handleSubmitSignalement,
    handleShare,
    handleOpenConversation,
  } = useAnnonceDetail();

  const insets = useSafeAreaInsets();
  // Web desktop : galerie mosaïque + deux colonnes (contenu | carte de contact collante).
  const { isDesktop, isWide } = useBreakpoint();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <DetailSkeleton />
      </>
    );
  }

  // ── Erreur ───────────────────────────────────────────────────────────────────
  if (error || !currentAnnonce) {
    // Le message backend « introuvable avec l'ID : N » expose un identifiant interne
    // et prête à confusion : on affiche un message clair sans ID. Les autres erreurs
    // (réseau…) restent affichées telles quelles.
    const isNotFound = !error || /introuvable|ID\s*:|not\s*found|404/i.test(error);
    const errorTitle = isNotFound ? 'Annonce indisponible' : 'Impossible de charger';
    const errorSub = isNotFound
      ? "Cette annonce n'existe plus ou n'est plus disponible."
      : (error ?? 'Vérifiez votre connexion puis réessayez.');
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <Ionicons
            name={isNotFound ? 'home-outline' : 'cloud-offline-outline'}
            size={52}
            color={colors.textMuted}
          />
          <AppText style={s.errorTitle}>{errorTitle}</AppText>
          <AppText style={s.errorSub}>{errorSub}</AppText>
          {isNotFound ? (
            <Button title="Voir d’autres annonces" fullWidth={false} style={s.retryBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} />
          ) : (
            <>
              <Button
                title="Réessayer"
                fullWidth={false}
                style={s.retryBtn}
                onPress={() => id && loadAnnonce(id)}
              />
              <Button title="Retour" variant="ghost" size="sm" fullWidth={false} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'))} />
            </>
          )}
        </View>
      </>
    );
  }

  const a = currentAnnonce;


  // ── Web desktop ──────────────────────────────────────────────────────────────
  if (isDesktop) {
    const autres = similaires.filter((s2) => s2.id !== a.id).slice(0, 6);
    const openLightbox = (i: number) => { setLightboxIndex(i); setLightboxVisible(true); };
    const isFav = !isOwnAnnonce && isAuthenticated && favorisIds.includes(a.id);
    // Prix + contact : colonne collante (≥ 1200 px) ou juste sous le titre.
    const priceCard = (
      <View style={s.dPriceCard}>
        <Prix prix={a.prix} prixRevise={a.prixRevise} mensuel={isLocation} variant="detail" />
        {libelleCautionAvance(a) ? <AppText style={s.frais}>{libelleCautionAvance(a)}</AppText> : null}
        {a.fraisHonoraire != null && (
          <AppText style={s.frais}>+ {formatPrix(a.fraisHonoraire)} de frais d'honoraires</AppText>
        )}
        <View style={s.dDivider} />
        {isStaff ? (
          <AppText style={s.dHint}>Consultation en tant que modérateur.</AppText>
        ) : isOwnAnnonce ? (
          <Button
            title="Modifier l'annonce"
            leftIcon={<Ionicons name="create-outline" size={20} color={colors.white} />}
            onPress={() => router.push({ pathname: '/(tabs)/publier', params: { editId: String(a.id) } })}
          />
        ) : a.statutModeration === 'CLOTUREE' ? (
          <View style={s.dClosed}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            <AppText style={s.ctaClosedText}>Annonce clôturée — l’annonceur n’accepte plus de demandes.</AppText>
          </View>
        ) : (
          <View style={s.dCtas}>
            <Button
              title="Envoyer un message"
              leftIcon={<Ionicons name="chatbubble-outline" size={20} color={colors.white} />}
              onPress={handleOpenConversation}
              isLoading={creatingConversationForAnnonceId === a.id}
            />
            {!isAuthenticated ? (
              <AppText style={s.contactHint}>Connectez-vous pour contacter l'annonceur.</AppText>
            ) : null}
            {a.annonceur?.telephone ? (
              <View style={s.dCtaRow}>
                <Button
                  title="WhatsApp"
                  variant="outline"
                  fullWidth={false}
                  style={s.dCtaHalf}
                  leftIcon={<Ionicons name="logo-whatsapp" size={18} color={colors.whatsapp} />}
                  onPress={() => Linking.openURL(buildWhatsAppUrl(a.annonceur!.telephone!, a.titre, a.referenceAnnonce))}
                  accessibilityLabel="Contacter l'annonceur sur WhatsApp"
                />
                <Button
                  title="Appeler"
                  variant="outline"
                  fullWidth={false}
                  style={s.dCtaHalf}
                  leftIcon={<Ionicons name="call-outline" size={18} color={colors.primary} />}
                  onPress={() => Linking.openURL(`tel:${a.annonceur!.telephone}`)}
                  accessibilityLabel="Appeler l'annonceur"
                />
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
    return (
      <>
        <Stack.Screen options={{ headerShown: false, title: a.titre }} />
        <ScrollView style={s.scroll} contentContainerStyle={s.desktopScroll}>
          <WebContainer size="detail">
            {/* Fil : retour + actions rapides */}
            <View style={s.dBar}>
              <TouchableOpacity onPress={() => goBackOr()} style={s.dBack} accessibilityRole="link">
                <Ionicons name="arrow-back" size={16} color={colors.primaryLight} />
                <AppText style={s.dBackText}>Retour aux annonces</AppText>
              </TouchableOpacity>
              <View style={s.dActions}>
                <TouchableOpacity onPress={handleShare} style={s.dAction} accessibilityRole="button">
                  <Ionicons name="share-social-outline" size={17} color={colors.textPrimary} />
                  <AppText style={s.dActionText}>Partager</AppText>
                </TouchableOpacity>
                {!isOwnAnnonce && !isStaff && (
                  <TouchableOpacity onPress={handleToggleFavoris} style={s.dAction} accessibilityRole="button" accessibilityState={{ selected: isFav }}>
                    <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={17} color={isFav ? colors.favorite : colors.textPrimary} />
                    <AppText style={s.dActionText}>{isFav ? 'Enregistrée' : 'Enregistrer'}</AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <DesktopGallery medias={sortedMedias} onOpen={openLightbox} />

            <View style={[s.dColumns, !isWide && s.dColumnsStacked]}>
              <View style={s.dMain}>
        {/* ── Titre, prix & localisation ────────────────────────────── */}
        <View style={[s.titleBlock, isDesktop && s.titleBlockDesktop]}>
          {/* Badge type + stats vues/favoris */}
          <View style={s.typeBadgeRow}>
            <View style={[s.typeBadge, { backgroundColor: typeAnnonceColors[a.typeAnnonce].fg }]}>
              <AppText style={s.typeBadgeText}>{TYPE_ANNONCE_LABELS[a.typeAnnonce]}</AppText>
            </View>
            {(a.vueCount != null || a.nbFavoris != null) && (
              <View style={s.statsRow}>
                {a.vueCount != null && (
                  <View style={s.statPill}>
                    <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
                    <AppText style={s.statText}>{a.vueCount}</AppText>
                  </View>
                )}
                {a.nbFavoris != null && (
                  <View style={s.statPill}>
                    <Ionicons name="heart-outline" size={12} color={colors.error} />
                    <AppText style={s.statText}>{a.nbFavoris}</AppText>
                  </View>
                )}
              </View>
            )}
          </View>

          {isOwnAnnonce && <ModerationBanner annonce={a} />}
          {a.statutModeration === 'CLOTUREE' && (
            <View style={s.clotureBanner}>
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
              <AppText style={s.clotureBannerText}>
                Annonce clôturée{a.motifCloture ? ` · ${MOTIF_CLOTURE_LABELS[a.motifCloture]}` : ''}
              </AppText>
            </View>
          )}

          {/* Le quartier d'abord : lieu en tête, quartier en gras */}
          <View style={s.lieuRow}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            {a.localisation?.quartier ? (
              <>
                <AppText style={s.lieuQuartier}>{a.localisation.quartier}</AppText>
                <AppText style={s.lieuReste} numberOfLines={1}>
                  {[a.localisation.commune, a.localisation.prefecture].filter(Boolean).join(', ')}
                </AppText>
              </>
            ) : (
              <AppText style={s.lieuReste} numberOfLines={1}>{locLabel}</AppText>
            )}
            {a.localisation?.typeCommune ? (
              <View style={[s.zoneBadge, a.localisation.typeCommune === 'urbaine' ? s.zoneBadgeUrb : s.zoneBadgeRur]}>
                <AppText style={[s.zoneBadgeText, a.localisation.typeCommune === 'urbaine' ? s.zoneBadgeTextUrb : s.zoneBadgeTextRur]}>
                  {a.localisation.typeCommune === 'urbaine' ? 'Urbaine' : 'Rurale'}
                </AppText>
              </View>
            ) : null}
          </View>

          <AppText style={[s.titre, isDesktop && s.titreDesktop]} accessibilityRole="header">{a.titre}</AppText>

          {!isDesktop && <Prix prix={a.prix} prixRevise={a.prixRevise} mensuel={isLocation} variant="detail" />}
          {!isDesktop && libelleCautionAvance(a) ? <AppText style={s.frais}>{libelleCautionAvance(a)}</AppText> : null}

          {!isDesktop && a.fraisHonoraire != null && (
            <AppText style={s.frais}>+ {formatPrix(a.fraisHonoraire)} de frais d'honoraires</AppText>
          )}

          <AppText style={s.refText}>Réf. {a.referenceAnnonce}</AppText>
        </View>
                {!isWide && priceCard}
        {/* ── Description ───────────────────────────────────────────── */}
        {a.description ? (
          <Section title="Description" icon="document-text-outline">
            <AppText
              style={s.description}
              numberOfLines={descExpanded ? undefined : 4}
            >
              {a.description}
            </AppText>
            {a.description.length > 160 && (
              <TouchableOpacity
                onPress={() => setDescExpanded((v) => !v)}
                style={s.voirPlusBtn}
                activeOpacity={0.7}
              >
                <AppText style={s.voirPlusText}>
                  {descExpanded ? 'Voir moins' : 'Voir plus'}
                </AppText>
                <Ionicons
                  name={descExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </Section>
        ) : null}
        {/* ── Points forts ──────────────────────────────────────────── */}
        {pointsForts.length > 0 && (
          <Section title="Points forts" icon="thumbs-up-outline">
            {Array.from({ length: Math.ceil(pointsForts.length / 3) }, (_, r) =>
              pointsForts.slice(r * 3, r * 3 + 3),
            ).map((row, r) => (
              <React.Fragment key={r}>
                {r > 0 && <View style={s.infoGridDividerH} />}
                <View style={s.pointsRow}>
                  {row.map((p, i) => (
                    <React.Fragment key={p.label}>
                      <PointFort icon={p.icon} label={p.label} value={p.value} />
                      {i < row.length - 1 && <View style={s.vertDiv} />}
                    </React.Fragment>
                  ))}
                  {/* Cellules vides pour garder une grille alignée */}
                  {row.length < 3 && pointsForts.length > 3 &&
                    Array.from({ length: 3 - row.length }, (_, k) => (
                      <React.Fragment key={`pad-${k}`}>
                        <View style={s.vertDiv} />
                        <View style={{ flex: 1 }} />
                      </React.Fragment>
                    ))}
                </View>
              </React.Fragment>
            ))}
          </Section>
        )}
        {/* ── Informations ──────────────────────────────────────────── */}
        <Section title="Informations" icon="information-circle-outline">
          <View style={s.infoGrid}>
            <PointFort icon="pricetag-outline" label="Type" value={TYPE_ANNONCE_LABELS[a.typeAnnonce]} />
            <View style={s.infoGridDividerV} />
            <PointFort icon="home-outline" label="Bien" value={TYPE_BIEN_LABELS[a.typeBien]} />
          </View>
          <View style={s.infoGridDividerH} />
          <View style={s.infoGrid}>
            <PointFort icon="calendar-outline" label="Publiée le" value={formatDate(a.dateCreation)} />
            {/* « Modifiée le » seulement si l'annonce a changé un autre jour que sa publication. */}
            {a.dateModification && formatDate(a.dateModification) !== formatDate(a.dateCreation) ? (
              <>
                <View style={s.infoGridDividerV} />
                <PointFort icon="refresh-outline" label="Modifiée le" value={formatDate(a.dateModification)} />
              </>
            ) : (
              // Garde « Publiée le » aligné sous la colonne de gauche.
              <View style={{ flex: 1 }} />
            )}
          </View>
        </Section>
        {/* ── Documents disponibles ─────────────────────────────────── */}
        {!!a.documentsDisponibles && (
          <Section title="Documents disponibles" icon="shield-checkmark-outline">
            <View style={s.docChipRow}>
              {a.documentsDisponibles.split(',').map((d) => d.trim()).filter(Boolean).map((doc) => (
                <View key={doc} style={s.docChip}>
                  <Ionicons name="document-text-outline" size={13} color={colors.primary} />
                  <AppText style={s.docChipText}>{DOCUMENTS_LABELS[doc as keyof typeof DOCUMENTS_LABELS] ?? doc}</AppText>
                </View>
              ))}
            </View>
          </Section>
        )}
        {/* ── Localisation sur la carte ─────────────────────────────── */}
        {a.latitude != null && a.longitude != null ? (
          <Section title="Localisation" icon="location-outline">
            <LeafletMap
              latitude={a.latitude}
              longitude={a.longitude}
              interactive={false}
              height={200}
              zoom={15}
            />
            <Button
              title="Ouvrir dans Maps"
              variant="secondary"
              size="sm"
              style={s.mapsBtn}
              leftIcon={<Ionicons name="navigate-outline" size={16} color={colors.primary} />}
              onPress={() => Linking.openURL(buildMapsUrl(a.latitude!, a.longitude!, a.titre))}
              accessibilityLabel="Ouvrir l'emplacement dans Maps"
            />
          </Section>
        ) : null}
              </View>

              <View style={[s.dAside, !isWide && s.dAsideStacked]}>
                {isWide && priceCard}
        {/* ── Annonceur ─────────────────────────────────────────────── */}
        {a.annonceur && (
          <AnnonceurCard annonceur={a.annonceur} />
        )}
        {/* ── Signaler ──────────────────────────────────────────────── */}
        {!isOwnAnnonce && !isStaff && (
          <TouchableOpacity
            style={s.signalerLink}
            onPress={() =>
              isAuthenticated ? setSignalerVisible(true) : requireLogin('signaler', annonceHref(a))
            }
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Signaler cette annonce"
          >
            <Ionicons name="flag-outline" size={13} color={colors.textMuted} />
            <AppText style={s.signalerLinkText}>Signaler cette annonce</AppText>
          </TouchableOpacity>
        )}
              </View>
            </View>

            {autres.length > 0 && (
              <View style={s.dSimilaires}>
                <AppText style={s.dSimTitle} accessibilityRole="header">Vous pourriez aimer aussi</AppText>
                <View style={s.dSimGrid}>
                  {autres.map((sim) => (
                    <SuggestCard
                      key={sim.id}
                      item={sim}
                      style={s.dSimCard}
                      onPress={() => router.push(annonceHref(sim))}
                    />
                  ))}
                </View>
              </View>
            )}
          </WebContainer>
        </ScrollView>
      {/* ── Lightbox photos ───────────────────────────────────── */}
      <ImageLightboxModal
        visible={lightboxVisible}
        medias={sortedMedias}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxVisible(false)}
      />

      {/* ── Modal Signalement ─────────────────────────────────── */}
      <Sheet visible={signalerVisible} onRequestClose={() => setSignalerVisible(false)}>
        <View style={[s.signalerSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={s.signalerHandle} />
          <AppText style={s.signalerTitle}>Signaler cette annonce</AppText>
          {signalSuccess ? (
            <View style={s.signalerSuccess}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
              <AppText style={s.signalerSuccessText}>Signalement envoyé, merci !</AppText>
            </View>
          ) : (
            <>
              <AppText style={s.signalerSubtitle}>Choisissez un motif</AppText>
              <View style={s.motifGrid}>
                {(Object.keys(MOTIF_LABELS) as MotifSignalement[]).map((motif) => (
                  <Chip
                    key={motif}
                    label={MOTIF_LABELS[motif]}
                    selected={selectedMotif === motif}
                    onPress={() => setSelectedMotif(motif)}
                    tone="danger"
                  />
                ))}
              </View>
              <SignalementCommentForm
                canSubmit={!!selectedMotif}
                isLoading={isSignaling}
                onCancel={() => setSignalerVisible(false)}
                onSubmit={handleSubmitSignalement}
              />
            </>
          )}
        </View>
      </Sheet>

      {/* ── Premier message à l'annonceur ─────────────────── */}
      <Sheet visible={contactVisible} onRequestClose={() => setContactVisible(false)}>
        <View style={[s.signalerSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={s.signalerHandle} />
          <AppText style={s.signalerTitle}>Contacter l’annonceur</AppText>
          <AppText style={s.signalerSubtitle} numberOfLines={1}>
            À propos de « {a.titre} »
          </AppText>
          {/* Remonté à chaque ouverture : le message repart du texte par défaut. */}
          {contactVisible && (
            <ContactMessageForm
              isLoading={creatingConversationForAnnonceId === a.id}
              onCancel={() => setContactVisible(false)}
              onSubmit={handleSendFirstMessage}
            />
          )}
        </View>
      </Sheet>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: (isStaff ? spacing.xl : 120) + insets.bottom }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      >
        {/* ── Carrousel ─────────────────────────────────────────────── */}
        <ImageCarousel
          medias={sortedMedias}
          onBack={() => goBackOr()}
          onShare={handleShare}
          isFav={!isOwnAnnonce && isAuthenticated && favorisIds.includes(a.id)}
          onFav={isOwnAnnonce ? undefined : handleToggleFavoris}
          onImagePress={(i) => { setLightboxIndex(i); setLightboxVisible(true); }}
        />

        {/* ── Titre, prix & localisation ────────────────────────────── */}
        <View style={[s.titleBlock, isDesktop && s.titleBlockDesktop]}>
          {/* Badge type + stats vues/favoris */}
          <View style={s.typeBadgeRow}>
            <View style={[s.typeBadge, { backgroundColor: typeAnnonceColors[a.typeAnnonce].fg }]}>
              <AppText style={s.typeBadgeText}>{TYPE_ANNONCE_LABELS[a.typeAnnonce]}</AppText>
            </View>
            {(a.vueCount != null || a.nbFavoris != null) && (
              <View style={s.statsRow}>
                {a.vueCount != null && (
                  <View style={s.statPill}>
                    <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
                    <AppText style={s.statText}>{a.vueCount}</AppText>
                  </View>
                )}
                {a.nbFavoris != null && (
                  <View style={s.statPill}>
                    <Ionicons name="heart-outline" size={12} color={colors.error} />
                    <AppText style={s.statText}>{a.nbFavoris}</AppText>
                  </View>
                )}
              </View>
            )}
          </View>

          {isOwnAnnonce && <ModerationBanner annonce={a} />}
          {a.statutModeration === 'CLOTUREE' && (
            <View style={s.clotureBanner}>
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
              <AppText style={s.clotureBannerText}>
                Annonce clôturée{a.motifCloture ? ` · ${MOTIF_CLOTURE_LABELS[a.motifCloture]}` : ''}
              </AppText>
            </View>
          )}

          {/* Le quartier d'abord : lieu en tête, quartier en gras */}
          <View style={s.lieuRow}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            {a.localisation?.quartier ? (
              <>
                <AppText style={s.lieuQuartier}>{a.localisation.quartier}</AppText>
                <AppText style={s.lieuReste} numberOfLines={1}>
                  {[a.localisation.commune, a.localisation.prefecture].filter(Boolean).join(', ')}
                </AppText>
              </>
            ) : (
              <AppText style={s.lieuReste} numberOfLines={1}>{locLabel}</AppText>
            )}
            {a.localisation?.typeCommune ? (
              <View style={[s.zoneBadge, a.localisation.typeCommune === 'urbaine' ? s.zoneBadgeUrb : s.zoneBadgeRur]}>
                <AppText style={[s.zoneBadgeText, a.localisation.typeCommune === 'urbaine' ? s.zoneBadgeTextUrb : s.zoneBadgeTextRur]}>
                  {a.localisation.typeCommune === 'urbaine' ? 'Urbaine' : 'Rurale'}
                </AppText>
              </View>
            ) : null}
          </View>

          <AppText style={[s.titre, isDesktop && s.titreDesktop]} accessibilityRole="header">{a.titre}</AppText>

          {!isDesktop && <Prix prix={a.prix} prixRevise={a.prixRevise} mensuel={isLocation} variant="detail" />}
          {!isDesktop && libelleCautionAvance(a) ? <AppText style={s.frais}>{libelleCautionAvance(a)}</AppText> : null}

          {!isDesktop && a.fraisHonoraire != null && (
            <AppText style={s.frais}>+ {formatPrix(a.fraisHonoraire)} de frais d'honoraires</AppText>
          )}

          <AppText style={s.refText}>Réf. {a.referenceAnnonce}</AppText>
        </View>
        {/* ── Description ───────────────────────────────────────────── */}
        {a.description ? (
          <Section title="Description" icon="document-text-outline">
            <AppText
              style={s.description}
              numberOfLines={descExpanded ? undefined : 4}
            >
              {a.description}
            </AppText>
            {a.description.length > 160 && (
              <TouchableOpacity
                onPress={() => setDescExpanded((v) => !v)}
                style={s.voirPlusBtn}
                activeOpacity={0.7}
              >
                <AppText style={s.voirPlusText}>
                  {descExpanded ? 'Voir moins' : 'Voir plus'}
                </AppText>
                <Ionicons
                  name={descExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </Section>
        ) : null}
        {/* ── Localisation sur la carte ─────────────────────────────── */}
        {a.latitude != null && a.longitude != null ? (
          <Section title="Localisation" icon="location-outline">
            <LeafletMap
              latitude={a.latitude}
              longitude={a.longitude}
              interactive={false}
              height={200}
              zoom={15}
            />
            <Button
              title="Ouvrir dans Maps"
              variant="secondary"
              size="sm"
              style={s.mapsBtn}
              leftIcon={<Ionicons name="navigate-outline" size={16} color={colors.primary} />}
              onPress={() => Linking.openURL(buildMapsUrl(a.latitude!, a.longitude!, a.titre))}
              accessibilityLabel="Ouvrir l'emplacement dans Maps"
            />
          </Section>
        ) : null}
        {/* ── Points forts ──────────────────────────────────────────── */}
        {pointsForts.length > 0 && (
          <Section title="Points forts" icon="thumbs-up-outline">
            {Array.from({ length: Math.ceil(pointsForts.length / 3) }, (_, r) =>
              pointsForts.slice(r * 3, r * 3 + 3),
            ).map((row, r) => (
              <React.Fragment key={r}>
                {r > 0 && <View style={s.infoGridDividerH} />}
                <View style={s.pointsRow}>
                  {row.map((p, i) => (
                    <React.Fragment key={p.label}>
                      <PointFort icon={p.icon} label={p.label} value={p.value} />
                      {i < row.length - 1 && <View style={s.vertDiv} />}
                    </React.Fragment>
                  ))}
                  {/* Cellules vides pour garder une grille alignée */}
                  {row.length < 3 && pointsForts.length > 3 &&
                    Array.from({ length: 3 - row.length }, (_, k) => (
                      <React.Fragment key={`pad-${k}`}>
                        <View style={s.vertDiv} />
                        <View style={{ flex: 1 }} />
                      </React.Fragment>
                    ))}
                </View>
              </React.Fragment>
            ))}
          </Section>
        )}
        {/* ── Documents disponibles ─────────────────────────────────── */}
        {!!a.documentsDisponibles && (
          <Section title="Documents disponibles" icon="shield-checkmark-outline">
            <View style={s.docChipRow}>
              {a.documentsDisponibles.split(',').map((d) => d.trim()).filter(Boolean).map((doc) => (
                <View key={doc} style={s.docChip}>
                  <Ionicons name="document-text-outline" size={13} color={colors.primary} />
                  <AppText style={s.docChipText}>{DOCUMENTS_LABELS[doc as keyof typeof DOCUMENTS_LABELS] ?? doc}</AppText>
                </View>
              ))}
            </View>
          </Section>
        )}
        {/* ── Informations ──────────────────────────────────────────── */}
        <Section title="Informations" icon="information-circle-outline">
          <View style={s.infoGrid}>
            <PointFort icon="pricetag-outline" label="Type" value={TYPE_ANNONCE_LABELS[a.typeAnnonce]} />
            <View style={s.infoGridDividerV} />
            <PointFort icon="home-outline" label="Bien" value={TYPE_BIEN_LABELS[a.typeBien]} />
          </View>
          <View style={s.infoGridDividerH} />
          <View style={s.infoGrid}>
            <PointFort icon="calendar-outline" label="Publiée le" value={formatDate(a.dateCreation)} />
            {/* « Modifiée le » seulement si l'annonce a changé un autre jour que sa publication. */}
            {a.dateModification && formatDate(a.dateModification) !== formatDate(a.dateCreation) ? (
              <>
                <View style={s.infoGridDividerV} />
                <PointFort icon="refresh-outline" label="Modifiée le" value={formatDate(a.dateModification)} />
              </>
            ) : (
              // Garde « Publiée le » aligné sous la colonne de gauche.
              <View style={{ flex: 1 }} />
            )}
          </View>
        </Section>
        {/* ── Annonceur ─────────────────────────────────────────────── */}
        {a.annonceur && (
          <AnnonceurCard annonceur={a.annonceur} />
        )}
        {/* ── Vous pourriez aimer aussi ─────────────────────────────── */}
        {similaires.filter((s2) => s2.id !== a.id).length > 0 && (
          <Section title="Vous pourriez aimer aussi" icon="grid-outline">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.base }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base }}>
                {similaires.filter((s2) => s2.id !== a.id).slice(0, 6).map((sim) => (
                  <SuggestCard
                    key={sim.id}
                    item={sim}
                    onPress={() => router.replace(annonceHref(sim))}
                  />
                ))}
              </View>
            </ScrollView>
          </Section>
        )}
        {/* ── Signaler ──────────────────────────────────────────────── */}
        {!isOwnAnnonce && !isStaff && (
          <TouchableOpacity
            style={s.signalerLink}
            onPress={() =>
              isAuthenticated ? setSignalerVisible(true) : requireLogin('signaler', annonceHref(a))
            }
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Signaler cette annonce"
          >
            <Ionicons name="flag-outline" size={13} color={colors.textMuted} />
            <AppText style={s.signalerLinkText}>Signaler cette annonce</AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Lightbox photos ───────────────────────────────────── */}
      <ImageLightboxModal
        visible={lightboxVisible}
        medias={sortedMedias}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxVisible(false)}
      />

      {/* ── Modal Signalement ─────────────────────────────────── */}
      <Sheet visible={signalerVisible} onRequestClose={() => setSignalerVisible(false)}>
        <View style={[s.signalerSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={s.signalerHandle} />
          <AppText style={s.signalerTitle}>Signaler cette annonce</AppText>
          {signalSuccess ? (
            <View style={s.signalerSuccess}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
              <AppText style={s.signalerSuccessText}>Signalement envoyé, merci !</AppText>
            </View>
          ) : (
            <>
              <AppText style={s.signalerSubtitle}>Choisissez un motif</AppText>
              <View style={s.motifGrid}>
                {(Object.keys(MOTIF_LABELS) as MotifSignalement[]).map((motif) => (
                  <Chip
                    key={motif}
                    label={MOTIF_LABELS[motif]}
                    selected={selectedMotif === motif}
                    onPress={() => setSelectedMotif(motif)}
                    tone="danger"
                  />
                ))}
              </View>
              <SignalementCommentForm
                canSubmit={!!selectedMotif}
                isLoading={isSignaling}
                onCancel={() => setSignalerVisible(false)}
                onSubmit={handleSubmitSignalement}
              />
            </>
          )}
        </View>
      </Sheet>

      {/* ── Premier message à l'annonceur ─────────────────── */}
      <Sheet visible={contactVisible} onRequestClose={() => setContactVisible(false)}>
        <View style={[s.signalerSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={s.signalerHandle} />
          <AppText style={s.signalerTitle}>Contacter l’annonceur</AppText>
          <AppText style={s.signalerSubtitle} numberOfLines={1}>
            À propos de « {a.titre} »
          </AppText>
          {/* Remonté à chaque ouverture : le message repart du texte par défaut. */}
          {contactVisible && (
            <ContactMessageForm
              isLoading={creatingConversationForAnnonceId === a.id}
              onCancel={() => setContactVisible(false)}
              onSubmit={handleSendFirstMessage}
            />
          )}
        </View>
      </Sheet>

      {/* ── Barre d'action fixe (aucune pour la modération) ───────── */}
      {isStaff ? null : isOwnAnnonce ? (
        <View style={[s.cta, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button
            title="Modifier l'annonce"
            fullWidth={false}
            style={s.ctaBtn}
            leftIcon={<Ionicons name="create-outline" size={20} color={colors.white} />}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/publier',
                params: { editId: String(a.id) },
              })
            }
          />
        </View>
      ) : a.statutModeration === 'CLOTUREE' ? (
        <View style={[s.cta, s.ctaClosed, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <AppText style={s.ctaClosedText}>
            Annonce clôturée — l’annonceur n’accepte plus de demandes.
          </AppText>
        </View>
      ) : (
        <View style={[s.cta, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button
            title="Message"
            fullWidth={false}
            style={s.ctaBtn}
            leftIcon={<Ionicons name="chatbubble-outline" size={20} color={colors.white} />}
            onPress={handleOpenConversation}
            isLoading={creatingConversationForAnnonceId === a.id}
            accessibilityLabel="Envoyer un message à l'annonceur"
          />
          {/* Sans numéro, pas de bouton grisé : seul « Message » est proposé.
              WhatsApp / Appeler en icônes carrées : trois libellés ne tiennent
              pas sur un écran de 360 dp. */}
          {a.annonceur?.telephone ? (
            <IconButton
              icon="logo-whatsapp"
              variant="plain"
              size={24}
              color={colors.whatsapp}
              style={s.ctaIconBtn}
              onPress={() => Linking.openURL(buildWhatsAppUrl(a.annonceur!.telephone!, a.titre, a.referenceAnnonce))}
              accessibilityLabel="Contacter l'annonceur sur WhatsApp"
            />
          ) : null}
          {a.annonceur?.telephone ? (
            <IconButton
              icon="call-outline"
              variant="plain"
              size={22}
              color={colors.primary}
              style={s.ctaIconBtn}
              onPress={() => Linking.openURL(`tel:${a.annonceur!.telephone}`)}
              accessibilityLabel="Appeler l'annonceur"
            />
          ) : null}
        </View>
      )}
    </>
  );
}

// ─── Styles globaux ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },

  // ── Web desktop ─────────────────────────────────────────────────────────────
  desktopScroll: { paddingBottom: spacing['5xl'] },
  dBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg },
  dBack: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.xs },
  dBackText: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.primaryLight },
  dActions: { flexDirection: 'row', gap: spacing.sm },
  dAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  dActionText: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, textDecorationLine: 'underline' },
  dColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2xl'], marginTop: spacing['2xl'] },
  dColumnsStacked: { flexDirection: 'column', alignItems: 'stretch' },
  dMain: { flex: 1, minWidth: 0, gap: spacing.base },
  dAside: {
    width: 380,
    gap: spacing.base,
    ...({ position: 'sticky', top: spacing.xl } as object),
  },
  dAsideStacked: { width: '100%', ...({ position: 'relative', top: 0 } as object) },
  dPriceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.xl,
    gap: spacing.md,
    ...({ boxShadow: webShadow.lg } as object),
  },
  dDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
  dHint: { fontSize: typography.sizes.sm, color: colors.textMuted },
  dClosed: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dCtas: { gap: spacing.sm },
  dCtaRow: { flexDirection: 'row', gap: spacing.sm },
  // Visiteur non connecté : les coordonnées de l'annonceur ne sont pas fournies par l'API (DEC-14).
  contactHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  dCtaHalf: { flex: 1, minHeight: 48, paddingHorizontal: spacing.base },
  dSimilaires: { marginTop: spacing['3xl'], gap: spacing.base },
  dSimTitle: { fontSize: typography.sizes['2xl'], fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4 },
  dSimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base },
  dSimCard: { width: `calc((100% - ${spacing.base * 2}px) / 3)` as unknown as number, marginRight: 0 },
  titleBlockDesktop: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    marginBottom: 0,
  },
  titreDesktop: { fontSize: typography.sizes['3xl'], lineHeight: 38, letterSpacing: -0.6 },

  // Bloc titre/prix
  titleBlock: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  clotureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  clotureBannerText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  titre: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 30,
  },
  frais: { fontSize: typography.sizes.sm, color: colors.textMuted },

  lieuRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lieuQuartier: { fontSize: typography.sizes.md, fontWeight: '800', color: colors.primary },
  lieuReste: { fontSize: typography.sizes.md, color: colors.textMuted, flexShrink: 1 },
  zoneBadge: { borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
  zoneBadgeUrb: { backgroundColor: colors.infoLight },
  zoneBadgeRur: { backgroundColor: colors.successLight },
  zoneBadgeText: { fontSize: 11, fontWeight: '700' as const },
  zoneBadgeTextUrb: { color: colors.infoText },
  zoneBadgeTextRur: { color: colors.successText },
  refText: { fontSize: typography.sizes.xs, color: colors.textMuted, letterSpacing: 0.3 },

  // Points forts
  pointsRow: { flexDirection: 'row', alignItems: 'stretch' },
  vertDiv: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },

  // Informations grid
  infoGrid: { flexDirection: 'row', alignItems: 'stretch' },
  infoGridDividerV: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  infoGridDividerH: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },

  // Description
  description: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  voirPlusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  voirPlusText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },

  mapsBtn: { marginTop: spacing.md },

  // Badge type d'annonce + stats
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },

  // États loading/erreur
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.textPrimary },
  errorSub: { fontSize: typography.sizes.md, color: colors.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.xl },

  // CTA bas fixe
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'android' ? 20 : 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  ctaBtn: { flex: 1 },
  ctaIconBtn: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  sheetBtn: { flex: 1 },
  ctaClosed: { alignItems: 'center', gap: spacing.sm },
  ctaClosedText: { flex: 1, fontSize: typography.sizes.sm, color: colors.textSecondary },

  // Signaler
  signalerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing.xl,
    paddingBottom: 100,
  },
  signalerLinkText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  signalerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  signalerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  signalerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  signalerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  docChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySurface,
  },
  docChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  motifGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  signalerInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  signalerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  signalerSuccess: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  signalerSuccessText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.successText,
  },
});

