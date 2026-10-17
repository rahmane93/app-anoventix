import { signalerAnnonce, type MotifSignalement } from '@/src/api/annonce.api';
import { annonceHref, annonceShareUrl } from '@/src/lib/annonce-url';
import { requireLogin } from '@/src/lib/auth-redirect';
import { isBienBati, isLoyerMensuel } from '@/src/lib/bien';
import { getRoleFlags } from '@/src/lib/roles';
import { useAnnonceStore } from '@/src/stores/annonce.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { useFavorisStore } from '@/src/stores/favoris.store';
import { useMessagerieStore } from '@/src/stores/messagerie.store';
import { useUserStore } from '@/src/stores/user.store';
import { TYPE_ANNONCE_LABELS, TYPE_BIEN_LABELS, TYPE_USAGE_LABELS } from '@/src/types/annonce.types';
import { formatPrix, getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Share } from 'react-native';
import { appAlert } from '@/src/components/ui/app-alert';
import { useShallow } from 'zustand/react/shallow';

/**
 * Logique de l'écran détail annonce : chargement, propriété/permissions,
 * signalement, partage, contact.
 * Extrait de l'écran pour séparer logique et présentation (revue P0-1/P0-3).
 *
 * Gardes null : dans l'écran d'origine les handlers étaient définis APRÈS les
 * `return` anticipés (loading/erreur), donc `currentAnnonce` y était garanti
 * non-null. Le hook s'exécutant avant ce garde, chaque handler qui dépend de
 * l'annonce ouvre par `if (!currentAnnonce) return;`. C'est iso-comportement :
 * ces handlers ne sont câblés que sur du JSX rendu uniquement quand l'annonce
 * est chargée — ils n'étaient déjà jamais invoquables avec une annonce nulle.
 */
export const DEFAULT_FIRST_MESSAGE = "Bonjour, l'annonce est-elle encore disponible ?";

export function useAnnonceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentAnnonce, isLoading, error, loadAnnonce, clearCurrentAnnonce, similaires, loadSimilaires } =
    useAnnonceStore();
  const { isAuthenticated, user } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated, user: s.user })));
  const { profile } = useUserStore(useShallow((s) => ({ profile: s.profile })));
  const { favorisIds, toggleFavori, togglingIds, loadFavoris, clearError: clearFavError } = useFavorisStore(useShallow((s) => ({ favorisIds: s.favorisIds, toggleFavori: s.toggleFavori, togglingIds: s.togglingIds, loadFavoris: s.loadFavoris, clearError: s.clearError })));
  const { openOrCreateConversation, creatingConversationForAnnonceId } = useMessagerieStore(useShallow((s) => ({ openOrCreateConversation: s.openOrCreateConversation, creatingConversationForAnnonceId: s.creatingConversationForAnnonceId })));

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [signalerVisible, setSignalerVisible] = useState(false);
  const [selectedMotif, setSelectedMotif] = useState<MotifSignalement | null>(null);
  const [isSignaling, setIsSignaling] = useState(false);
  const [signalSuccess, setSignalSuccess] = useState(false);
  // Prise de contact : premier message modifiable avant envoi.
  const [contactVisible, setContactVisible] = useState(false);

  useEffect(() => {
    if (id) {
      loadAnnonce(id);
    }
    if (isAuthenticated) {
      loadFavoris();
    }
    return () => clearCurrentAnnonce();
    // Déclencheurs volontaires : id + auth uniquement (les fns du store sont stables).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated]);

  // L'URL ne porte plus l'id numérique (publicId) : les similaires attendent l'annonce chargée.
  const annonceId = currentAnnonce?.id;
  useEffect(() => {
    if (annonceId) loadSimilaires(annonceId, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annonceId]);

  // ── Dérivés (null-safe : valides dès que currentAnnonce est chargée) ─────────
  const a = currentAnnonce;
  const sortedMedias = a ? [...a.medias].sort((x, y) => x.ordre - y.ordre) : [];
  // Location et bail commercial : prix mensuel (même règle que les cartes).
  const isLocation = isLoyerMensuel(a?.typeAnnonce);

  const myUserId = user?.id ?? profile?.id ?? null;
  const ownershipKnown = !!myUserId;
  const isOwnAnnonce = ownershipKnown && a ? myUserId === a.userId : false;
  // Modération : consultation seule (ni favori, ni contact, ni signalement).
  const { isStaff } = getRoleFlags(profile?.roles ?? profile?.role ?? user?.roles);

  // Points forts dynamiques
  const pointsForts: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
  }[] = [];
  if (a?.typeUsage) {
    pointsForts.push({
      icon: 'person-outline',
      label: 'Usage',
      value: TYPE_USAGE_LABELS[a.typeUsage],
    });
  }
  if (a && a.surfaceTotal != null) {
    pointsForts.push({
      icon: 'expand-outline',
      label: isBienBati(a.typeBien) ? 'Surface' : 'Superficie',
      value: `${a.surfaceTotal.toLocaleString('fr-FR')} m²`,
    });
  }
  // Composition : sans objet pour un terrain / domaine vendu ou loué en l'état.
  if (a && isBienBati(a.typeBien)) {
    if (a.nbPieces != null) pointsForts.push({ icon: 'grid-outline', label: 'Pièces', value: String(a.nbPieces) });
    if (a.nbChambres != null) pointsForts.push({ icon: 'bed-outline', label: 'Chambres', value: String(a.nbChambres) });
    if (a.nbSallesBain != null) pointsForts.push({ icon: 'water-outline', label: 'Salles de bain', value: String(a.nbSallesBain) });
  }

  const locLabel = a
    ? (a.localisation
        ? [a.localisation.quartier, a.localisation.commune, a.localisation.prefecture].filter(Boolean).join(', ')
        : a.complementAdresse ?? `Réf. ${a.localisationId}`)
    : '';

  // ── Handlers (garde null explicite — cf. en-tête) ────────────────────────────
  const handleToggleFavoris = async () => {
    if (!currentAnnonce) return;
    const a = currentAnnonce;
    if (!isAuthenticated) {
      requireLogin('favori', annonceHref(a));
      return;
    }
    if (isOwnAnnonce) return;
    // Évite les doubles appels : seule la carte concernée est verrouillée
    if (togglingIds.has(a.id)) return;
    clearFavError();
    await toggleFavori(a.id);
  };

  // Les champs texte des feuilles vivent dans leurs composants (une frappe ne
  // re-rend pas tout l'écran) : la valeur est passée au moment de l'envoi.
  const handleSubmitSignalement = async (commentaire: string) => {
    if (!currentAnnonce) return;
    const a = currentAnnonce;
    if (!selectedMotif) return;
    setIsSignaling(true);
    try {
      await signalerAnnonce(a.id, { motif: selectedMotif, commentaire: commentaire.trim() || undefined });
      setSignalSuccess(true);
      setSelectedMotif(null);
      setTimeout(() => {
        setSignalerVisible(false);
        setSignalSuccess(false);
      }, 1800);
    } catch (err) {
      appAlert("Signalement non envoyé", getErrorMessage(err, 'Impossible d\'envoyer le signalement.'));
    } finally {
      setIsSignaling(false);
    }
  };

  const handleShare = async () => {
    if (!currentAnnonce) return;
    const a = currentAnnonce;
    const typeLabel = TYPE_ANNONCE_LABELS[a.typeAnnonce] ?? a.typeAnnonce;
    const bienLabel = a.typeBien ? (TYPE_BIEN_LABELS[a.typeBien] ?? a.typeBien) : '';
    const prixCourant = a.prixRevise ?? a.prix;
    const prixStr = prixCourant ? `${formatPrix(prixCourant)}${isLoyerMensuel(a.typeAnnonce) ? ' / mois' : ''}` : '';
    const localite = [a.localisation?.quartier, a.localisation?.commune, a.localisation?.prefecture, a.localisation?.region].filter(Boolean).join(', ');
    const title = [typeLabel, bienLabel].filter(Boolean).join(' – ');
    const lines: string[] = [
      `🏠 ${title}`,
    ];
    if (a.titre) lines.push(a.titre);
    if (a.referenceAnnonce) lines.push(`🔖 Réf. ${a.referenceAnnonce}`);
    if (prixStr) lines.push(`💰 ${prixStr}`);
    if (localite) lines.push(`📍 ${localite}`);
    if (a.surfaceTotal) lines.push(`📏 ${a.surfaceTotal} m²`);
    // Le lien en dernier : WhatsApp, Facebook… en tirent l'aperçu (photo, titre, prix).
    const url = annonceShareUrl(a);
    const resume = lines.join('\n');

    if (Platform.OS === 'web') {
      await shareOnWeb({ title, text: resume, url });
      return;
    }
    try {
      // Android n'utilise que `message` (d'où le lien dedans) ; iOS utilise aussi `url`.
      await Share.share({ title, message: `${resume}\n\n👉 ${url}`, url });
    } catch {
      // annulé par l’utilisateur
    }
  };

  const handleOpenConversation = async () => {
    if (!currentAnnonce) return;
    const a = currentAnnonce;
    if (!isAuthenticated) {
      requireLogin('message', annonceHref(a));
      return;
    }
    if (isOwnAnnonce) {
      return;
    }
    // Premier message saisi (ou validé) par l'utilisateur avant envoi :
    // rien n'est envoyé à l'annonceur à son insu.
    setContactVisible(true);
  };

  const handleSendFirstMessage = async (texte: string) => {
    if (!currentAnnonce) return;
    const message = texte.trim();
    if (!message) return;
    try {
      const conversation = await openOrCreateConversation({
        annonceId: currentAnnonce.id,
        message,
      });
      setContactVisible(false);
      router.push(`/conversation/${conversation.id}` as any);
    } catch (err) {
      appAlert('Message non envoyé', getErrorMessage(err, "Impossible de contacter l'annonceur. Réessayez."));
    }
  };

  return {
    // état brut (early returns de l'écran)
    id,
    isLoading,
    error,
    currentAnnonce,
    loadAnnonce,
    // dérivés
    sortedMedias,
    isLocation,
    isOwnAnnonce,
    isStaff,
    pointsForts,
    locLabel,
    // stores exposés à la vue
    isAuthenticated,
    favorisIds,
    similaires,
    creatingConversationForAnnonceId,
    // état UI
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
    // handlers
    handleToggleFavoris,
    handleSubmitSignalement,
    handleShare,
    handleOpenConversation,
    handleSendFirstMessage,
  };
}

/** Web : feuille de partage du système quand le navigateur en a une (mobile), sinon copie du lien. */
async function shareOnWeb(data: { title: string; text: string; url: string }) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
    } catch {
      // annulé par l’utilisateur
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(data.url);
    appAlert('Lien copié', "Collez-le dans WhatsApp, Facebook… : l'aperçu de l'annonce s'affichera.");
  } catch {
    appAlert("Lien de l'annonce", data.url);
  }
}
