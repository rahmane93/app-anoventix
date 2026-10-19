import { annonceHref } from '@/src/lib/annonce-url';
import { useBreakpoint, webColumnStyle } from '@/src/lib/responsive';
import { Image } from 'expo-image';
import AppText from "@/src/components/AppText";
import { AlertBanner } from "@/src/components/ui/alert-banner";
import { Button } from "@/src/components/ui/button";
import { Chip } from '@/src/components/ui/chip';
import { Input } from "@/src/components/ui/input";
import { ChoiceTile } from "@/src/features/publier/ChoiceTile";
import {
  DOCUMENTS,
  DOCUMENTS_ICONS,
  STEP,
  STEPS,
  TYPE_ANNONCE_ICONS,
  TYPE_ANNONCES,
  TYPE_BIEN_ICONS,
  TYPE_USAGE_ICONS,
} from "@/src/features/publier/constants";
import { SelectRow } from "@/src/features/publier/SelectRow";
import { StepIndicator } from "@/src/features/publier/StepIndicator";
import { s } from "@/src/features/publier/styles";
import { usePublierForm } from "@/src/features/publier/usePublierForm";
import { LicenceBloqueeNotice } from "@/src/features/licence/LicenceBloqueeNotice";
import { AnnoncesMasqueesNotice } from "@/src/features/mes-annonces/AnnoncesMasqueesNotice";
import { useLicenceStore } from "@/src/stores/licence.store";
import { useUserStore } from "@/src/stores/user.store";
import { colors, layout, spacing } from "@/src/theme";
import {
  DOCUMENTS_LABELS,
  TYPE_ANNONCE_LABELS,
  TYPE_BIEN_LABELS,
  TYPE_USAGE_LABELS,
} from "@/src/types/annonce.types";
import { LeafletMap } from "@/src/components/ui/LeafletMap";
import { MapPickerModal } from "@/src/components/ui/MapPickerModal";
import { formatMontantAbrege, formatNumericInput, parseOptionalNumber } from "@/src/utils/format";
import { isBienBati, isLoyerMensuel, prixLabel, surfaceLabel } from "@/src/lib/bien";
import { getCurrentCoords } from "@/src/utils/location";
import { Ionicons } from "@expo/vector-icons";
import { AnnonceCard } from "@/src/features/explore/AnnonceCard";
import type { BienImmo } from "@/src/types/annonce.types";
import { Redirect, router, useFocusEffect, useNavigation } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { appAlert } from '@/src/components/ui/app-alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Hauteur minimale du champ description (≈ 3 lignes).
const DESC_MIN_HEIGHT = 80;

// ─── Écran principal ──────────────────────────────────────────────────────────
// Logique extraite dans usePublierForm ; cet écran ne fait que rendre.

export default function PublierScreen() {
  const {
    isAuthenticated,
    identiteRequise,
    statutPiece,
    isProfessionnel,
    entreprise,
    isLoadingEntreprise,
    isEditMode,
    resetCreateForm,
    success,
    uploadProgress,
    showFrais,
    step,
    error,
    prefillError,
    isPrefilling,
    isLoadingLoc,
    isCreating,
    fieldErrors,
    clearFieldError,
    typeAnnonce,
    typeBien,
    typeUsage,
    setTypeUsage,
    isUsageAutoSelected,
    availableBiens,
    availableUsages,
    handleTypeAnnonceChange,
    handleTypeBienChange,
    region,
    prefecture,
    commune,
    quartier,
    localisationId,
    regions,
    prefectures,
    communes,
    quartiers,
    handleRegionChange,
    handlePrefectureChange,
    handleCommuneChange,
    handleQuartierChange,
    quartierAbsent,
    quartierSaisi,
    setQuartierSaisi,
    choisirQuartierAbsent,
    chargementAutreQuartier,
    latitude,
    centreCarte,
    longitude,
    setLatitude,
    setLongitude,
    titre,
    setTitre,
    description,
    setDescription,
    prix,
    setPrix,
    fraisHonoraire,
    cautionMois,
    setCautionMois,
    avanceMois,
    setAvanceMois,
    setFraisHonoraire,
    surfaceTotal,
    setSurfaceTotal,
    composition,
    setCompositionField,
    champsCompo,
    complementAdresse,
    setComplementAdresse,
    documents,
    setDocuments,
    validateTitreOnBlur,
    validateDescriptionOnBlur,
    medias,
    existingMedias,
    isMediaBusy,
    pickPhotosForCreate,
    pickAndUploadPhotos,
    removeExistingMedia,
    deplacerMediaExistant,
    removePhoto,
    setMainPhoto,
    goToStep,
    handleNext,
    handleBack,
    handleSubmit,
  } = usePublierForm();

  // Barre d'onglets masquée : le pied de page gère lui-même la zone système du bas.
  const insets = useSafeAreaInsets();

  // Hauteur auto-ajustée du champ description (≈ 3 lignes par défaut, grandit avec le texte).
  const [descHeight, setDescHeight] = React.useState(DESC_MIN_HEIGHT);

  // À chaque changement d'étape, on remonte en haut du formulaire ;
  // c'est ensuite à l'utilisateur de scroller pour voir la suite.
  const scrollRef = React.useRef<ScrollView>(null);
  // Web desktop : parcours dans une colonne centrée de 720 px ; les bandeaux
  // (étapes, pied d'actions) restent pleine largeur avec un contenu aligné.
  const { isDesktop, width: winWidth } = useBreakpoint();
  const bandPadding = isDesktop ? { paddingHorizontal: Math.max(spacing.base, (winWidth - layout.maxWidth.form) / 2 + spacing.base) } : undefined;
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  // Focus automatique sur le titre à l'arrivée sur l'étape Détails.
  const titreRef = React.useRef<TextInput>(null);
  React.useEffect(() => {
    if (step === STEP.DETAILS) {
      const t = setTimeout(() => titreRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Après le choix du type de bien, amène « Usage » (obligatoire) à l'écran.
  const [usageY, setUsageY] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (step !== STEP.TYPE || !typeBien || isUsageAutoSelected || usageY == null) return;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y: usageY - spacing.base, animated: true }), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeBien, usageY]);

  // Carte GPS (localisation précise de l'annonce).
  const [mapModalOpen, setMapModalOpen] = React.useState(false);
  const [locatingGps, setLocatingGps] = React.useState(false);

  const handleUseMyLocation = async () => {
    setLocatingGps(true);
    try {
      const res = await getCurrentCoords();
      if (res === "denied") {
        appAlert(
          "Permission refusée",
          "Autorisez l'accès à la localisation pour positionner votre annonce.",
        );
        return;
      }
      if (!res) {
        appAlert("Position introuvable", "Impossible de récupérer votre position. Réessayez.");
        return;
      }
      setLatitude(res.latitude);
      setLongitude(res.longitude);
    } finally {
      setLocatingGps(false);
    }
  };

  // Annulation de la création / modification avec confirmation.
  const handleCancel = () => {
    appAlert(
      isEditMode ? "Annuler la modification" : "Annuler la publication",
      "Les informations saisies ne seront pas enregistrées. Voulez-vous vraiment quitter ?",
      [
        { text: "Continuer l'édition", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: () => {
            // Vide le cache de création/modification puis redirige vers mes annonces.
            resetCreateForm();
            // Retour à l'écran d'origine (fiche, profil, entreprise…) plutôt
            // qu'un onglet « Mes annonces » masqué pour la plupart des rôles.
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/explore");
          },
        },
      ],
    );
  };

  // Retour matériel Android : revient à l'étape précédente, puis demande
  // confirmation avant de quitter (évite de perdre la saisie d'un geste).
  // Compte bloqué (licence requise) : écran dédié au lieu du formulaire. Rafraîchi au
  // focus pour les comptes concernés (licence déjà chargée par la garde globale).
  const licenceBloquee = useLicenceStore((st) => st.licence?.bloque ?? false);
  useFocusEffect(
    React.useCallback(() => {
      if (useLicenceStore.getState().licence) useLicenceStore.getState().load();
    }, []),
  );

  // Annonces du compte masquées par l'administrateur : publication et modification suspendues.
  const annoncesMasquees = useUserStore((st) => st.profile?.annoncesMasquees ?? false);
  const motifMasquage = useUserStore((st) => st.profile?.motifMasquageAnnonces ?? null);

  const formVisible =
    isAuthenticated &&
    !licenceBloquee &&
    !annoncesMasquees &&
    !(identiteRequise && !isEditMode) &&
    !(isProfessionnel && !entreprise && !isEditMode) &&
    !success;
  useFocusEffect(
    React.useCallback(() => {
      if (!formVisible) return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step > 0) handleBack();
        else handleCancel();
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formVisible, step]),
  );

  // En-tête : titre explicite et croix pour quitter (remplace « Annuler » en
  // bas d'écran, qui alourdissait le pied de page).
  const navigation = useNavigation();
  React.useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? "Modifier l'annonce" : "Publier une annonce",
      headerLeft: () =>
        formVisible && !success ? (
          <TouchableOpacity
            onPress={handleCancel}
            style={s.headerCloseBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? "Annuler la modification" : "Annuler la publication"}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, isEditMode, formVisible, success]);

  // Recherche dans les quartiers (une commune de Conakry en compte des dizaines).
  // La saisie est rattachée à la commune : changer de commune la vide d'office.
  const [recherche, setRecherche] = React.useState({ commune: "", texte: "" });
  const quartierQuery = recherche.commune === commune ? recherche.texte : "";
  // Sans accents ni majuscules : « Kaloum » trouve « kaloum », « Dixinn » trouve « dixinn ».
  const normaliser = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const quartiersFiltres = quartierQuery.trim()
    ? quartiers.filter((q) => normaliser(q.quartier).includes(normaliser(quartierQuery.trim())))
    : quartiers;

  const prixNombreAvant = parseOptionalNumber(prix);
  // Carte d'aperçu : mêmes composants que l'Accueil, alimentés par le formulaire.
  const quartierChoisi = quartiers.find((q) => q.id === localisationId);
  const apercu = {
    id: 0,
    referenceAnnonce: "",
    titre: titre.trim(),
    prix: prixNombreAvant ?? 0,
    prixRevise: null,
    typeAnnonce: typeAnnonce || "VENTE",
    typeBien: typeBien || "APPARTEMENT",
    surfaceTotal: surfaceTotal ? Number(surfaceTotal) : null,
    nbPieces: composition.nbPieces ? Number(composition.nbPieces) : null,
    nbChambres: composition.nbChambres ? Number(composition.nbChambres) : null,
    nbSallesBain: composition.nbSallesBain ? Number(composition.nbSallesBain) : null,
    localisation: quartierChoisi ?? { quartier, commune, prefecture },
    complementAdresse,
    medias: [
      ...existingMedias,
      ...medias.map((m, i) => ({ id: -1 - i, url: m.uri, ordre: existingMedias.length + i })),
    ],
    annonceur: null,
    dateCreation: new Date().toISOString(),
  } as unknown as BienImmo;

  // Aide de lecture du prix : « 250 millions GNF ».
  const prixNombre = prixNombreAvant;
  const prixEnLettres = prixNombre ? formatMontantAbrege(prixNombre) : null;

  // ── Garde auth ─────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (annoncesMasquees && !success) {
    return <AnnoncesMasqueesNotice motif={motifMasquage} pleinEcran />;
  }

  if (licenceBloquee && !success) {
    return <LicenceBloqueeNotice />;
  }

  // ── Succès de création ─────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={s.gateContainer}>
        <View style={[s.gateIcon, s.successIcon]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        </View>
        {/* Pas de modération préalable : une annonce créée est en ligne aussitôt (DEC-11). */}
        <AppText style={s.gateTitle}>Annonce publiée</AppText>
        <AppText style={s.gateSub}>Elle est en ligne et visible par tous.</AppText>
        <View style={s.successRef}>
          <AppText style={s.successRefText}>Référence : {success.reference}</AppText>
        </View>
        <Button
          title="Voir mon annonce"
          leftIcon={<Ionicons name="eye-outline" size={18} color={colors.white} />}
          onPress={() => router.replace(annonceHref(success))}
          style={s.gateBtn}
        />
        <Button
          title="Publier une autre annonce"
          variant="outline"
          onPress={resetCreateForm}
          style={s.gateBtn}
        />
        <Button
          title="Retour à l'accueil"
          variant="ghost"
          size="sm"
          onPress={() => {
            resetCreateForm();
            router.replace("/(tabs)/explore");
          }}
        />
      </View>
    );
  }

  // ── Spinner pendant le chargement de l'entreprise pour éviter un flash du gate ─
  if (isProfessionnel && !entreprise && !isEditMode && isLoadingEntreprise) {
    return (
      <View style={s.gateContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Gate : pièce d'identité non validée (exigée par l'API pour publier) ─────
  if (identiteRequise && !isEditMode) {
    const gate =
      statutPiece === "EN_ATTENTE"
        ? {
            icon: "hourglass-outline" as const,
            title: "Vérification en cours",
            sub: "Votre pièce d’identité est en cours de vérification. Vous pourrez publier dès sa validation.",
            cta: "Voir mon profil",
          }
        : statutPiece === "REJETEE"
          ? {
              icon: "alert-circle-outline" as const,
              title: "Pièce d’identité refusée",
              sub: "Votre document n’a pas été accepté. Soumettez-en un nouveau depuis votre profil pour pouvoir publier.",
              cta: "Envoyer ma pièce d’identité",
            }
          : {
              icon: "shield-checkmark-outline" as const,
              title: "Vérifiez votre identité",
              sub: "Pour la sécurité des acheteurs et locataires, une pièce d’identité validée est nécessaire avant de publier.",
              cta: "Envoyer ma pièce d’identité",
            };
    return (
      <View style={s.gateContainer}>
        <View style={s.gateIcon}>
          <Ionicons name={gate.icon} size={44} color={colors.primary} />
        </View>
        <AppText style={s.gateTitle}>{gate.title}</AppText>
        <AppText style={s.gateSub}>{gate.sub}</AppText>
        <Button
          title={gate.cta}
          onPress={() => router.push({ pathname: "/(tabs)/profile", params: { section: "piece" } })}
          fullWidth={false}
          style={s.gateBtn}
        />
      </View>
    );
  }

  // ── Gate : professionnel sans entreprise (sauf en mode édition) ─────────────
  if (isProfessionnel && !entreprise && !isEditMode) {
    return (
      <View style={s.gateContainer}>
        <View style={s.gateIcon}>
          <Ionicons name="business-outline" size={44} color={colors.primary} />
        </View>
        <AppText style={s.gateTitle}>Entreprise requise</AppText>
        <AppText style={s.gateSub}>
          Vous devez créer votre entreprise avant de pouvoir publier une
          annonce.
        </AppText>
        <Button
          title="Créer mon entreprise"
          leftIcon={<Ionicons name="add-circle-outline" size={18} color={colors.white} />}
          onPress={() => router.push("/(tabs)/entreprise")}
          fullWidth={false}
          style={s.gateBtn}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Indicateur d'étapes ── */}
      <View style={[s.stepHeader, bandPadding]}>
        <StepIndicator current={step} onStepPress={goToStep} />
      </View>

      {(error || prefillError || isPrefilling) && (
        <View style={[s.fixedBanner, webColumnStyle('form')]}>
          {isPrefilling && (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText style={s.loadingText}>Chargement de l’annonce…</AppText>
            </View>
          )}
          {prefillError && (
            <AlertBanner message={prefillError} variant="error" />
          )}
          {error && <AlertBanner message={error} variant="error" />}
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, webColumnStyle('form')]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════ Photos (en premier : c'est ce qui fait vendre) ═══════════ */}
        {step === STEP.PHOTOS && (
          <View>
            <AppText style={s.sectionTitle}>Ajoutez des photos</AppText>
            {isEditMode ? (
              <AppText style={s.sectionHint}>
                Maximum 10 photos. Attention : les ajouts et suppressions de
                photos sont enregistrés tout de suite, sans attendre « Enregistrer ».
              </AppText>
            ) : (
              <AppText style={s.sectionHint}>
                Au moins 1 photo, 10 maximum. La première est la photo
                principale : touchez-en une autre pour la mettre en avant.
              </AppText>
            )}

            <TouchableOpacity
              style={[
                s.photoPickerBtn,
                isMediaBusy && s.photoPickerBtnDisabled,
              ]}
              onPress={isEditMode ? pickAndUploadPhotos : pickPhotosForCreate}
              disabled={isMediaBusy}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ajouter des photos"
              accessibilityState={{ disabled: isMediaBusy, busy: isMediaBusy }}
            >
              <Ionicons
                name="images-outline"
                size={22}
                color={isMediaBusy ? colors.textMuted : colors.primary}
              />
              <AppText
                style={[
                  s.photoPickerText,
                  isMediaBusy && { color: colors.textMuted },
                ]}
              >
                {isEditMode
                  ? `Ajouter des photos (${existingMedias.length}/10)`
                  : medias.length === 0
                    ? "Choisir des photos"
                    : `Ajouter des photos (${medias.length}/10)`}
              </AppText>
              {isMediaBusy ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : null}
            </TouchableOpacity>
            {!!fieldErrors.medias && (
              <AppText style={[s.errorText, s.photoError]}>{fieldErrors.medias}</AppText>
            )}

            {(existingMedias.length > 0 || medias.length > 0) && (
              <View style={s.photoGrid}>
                {existingMedias.map((m, i) => (
                  <View key={`existing-${m.id}`} style={s.photoThumb}>
                    <TouchableOpacity
                      style={s.photoImg}
                      activeOpacity={0.85}
                      disabled={isMediaBusy || existingMedias.length <= 1}
                      onPress={() =>
                        appAlert("Photo " + (i + 1) + " sur " + existingMedias.length, undefined, [
                          ...(i > 0
                            ? [
                                { text: "Définir comme photo principale", onPress: () => deplacerMediaExistant(i, 0) },
                                { text: "Déplacer vers la gauche", onPress: () => deplacerMediaExistant(i, i - 1) },
                              ]
                            : []),
                          ...(i < existingMedias.length - 1
                            ? [{ text: "Déplacer vers la droite", onPress: () => deplacerMediaExistant(i, i + 1) }]
                            : []),
                          { text: "Annuler", style: "cancel" as const },
                        ])
                      }
                      accessibilityRole="button"
                      accessibilityLabel={i === 0 ? "Photo principale, changer l’ordre" : "Changer l’ordre de cette photo"}
                    >
                      <Image source={{ uri: m.url }} style={s.photoImg} />
                    </TouchableOpacity>
                    {i === 0 && medias.length === 0 && (
                      <View style={s.photoBadge}>
                        <AppText style={s.photoBadgeText}>Principale</AppText>
                      </View>
                    )}
                    <TouchableOpacity
                      style={s.photoRemove}
                      onPress={() =>
                        existingMedias.length <= 1
                          ? appAlert(
                              "Dernière photo",
                              "Une annonce doit garder au moins une photo. Ajoutez-en une autre avant de supprimer celle-ci.",
                            )
                          : appAlert("Supprimer cette photo ?", "Elle sera retirée de l’annonce.", [
                              { text: "Annuler", style: "cancel" },
                              { text: "Supprimer", style: "destructive", onPress: () => removeExistingMedia(m.id) },
                            ])
                      }
                      disabled={isMediaBusy}
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer cette photo"
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                {medias.map((m, i) => (
                  <View key={m.uri} style={s.photoThumb}>
                    <TouchableOpacity
                      style={s.photoImg}
                      activeOpacity={0.85}
                      onPress={() => setMainPhoto(i)}
                      disabled={i === 0}
                      accessibilityRole="button"
                      accessibilityLabel={i === 0 ? "Photo principale" : "Définir comme photo principale"}
                    >
                      <Image source={{ uri: m.uri }} style={s.photoImg} />
                    </TouchableOpacity>
                    {i === 0 && existingMedias.length === 0 && (
                      <View style={s.photoBadge}>
                        <AppText style={s.photoBadgeText}>Principale</AppText>
                      </View>
                    )}
                    <TouchableOpacity
                      style={s.photoRemove}
                      onPress={() => removePhoto(i)}
                      accessibilityRole="button"
                      accessibilityLabel="Retirer cette photo"
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {/* ═══════════ Type ═══════════ */}
        {step === STEP.TYPE && (
          <View>
            <AppText style={s.sectionTitle}>Quel type d’annonce ?</AppText>

            <View style={s.field}>
              <AppText style={s.groupTitle}>Type de transaction</AppText>
              <View style={s.tileGrid}>
                {TYPE_ANNONCES.map((opt) => (
                  <View key={opt} style={s.tileCell}>
                    <ChoiceTile
                      icon={TYPE_ANNONCE_ICONS[opt]}
                      label={TYPE_ANNONCE_LABELS[opt]}
                      selected={typeAnnonce === opt}
                      onPress={() => handleTypeAnnonceChange(opt)}
                      hasError={!!fieldErrors.typeAnnonce}
                    />
                  </View>
                ))}
              </View>
              {!!fieldErrors.typeAnnonce && (
                <AppText style={s.errorText}>{fieldErrors.typeAnnonce}</AppText>
              )}
            </View>

            <View style={s.field}>
              <AppText style={s.groupTitle}>Type de bien</AppText>
              <View style={s.tileGrid}>
                {availableBiens.map((opt) => (
                  <View key={opt} style={s.tileCell}>
                    <ChoiceTile
                      icon={TYPE_BIEN_ICONS[opt]}
                      label={TYPE_BIEN_LABELS[opt]}
                      selected={typeBien === opt}
                      onPress={() => handleTypeBienChange(opt)}
                      hasError={!!fieldErrors.typeBien}
                    />
                  </View>
                ))}
              </View>
              {!!fieldErrors.typeBien && (
                <AppText style={s.errorText}>{fieldErrors.typeBien}</AppText>
              )}
            </View>

            {/* Usage du bien — apparaît dès qu’un type de bien est sélectionné.
                Un seul usage possible : simple mention, pas de tuile inerte. */}
            {!!typeBien && (
              <View style={s.field} onLayout={(e) => setUsageY(e.nativeEvent.layout.y)}>
                <AppText style={s.groupTitle}>Usage du bien</AppText>
                {isUsageAutoSelected && !!typeUsage ? (
                  <View style={s.locSummary}>
                    <Ionicons name={TYPE_USAGE_ICONS[typeUsage]} size={14} color={colors.primary} />
                    <AppText style={s.locSummaryText}>{TYPE_USAGE_LABELS[typeUsage]}</AppText>
                  </View>
                ) : (
                  <View style={s.tileGrid}>
                    {availableUsages.map((opt) => (
                      <View key={opt} style={s.tileCell}>
                        <ChoiceTile
                          icon={TYPE_USAGE_ICONS[opt]}
                          label={TYPE_USAGE_LABELS[opt]}
                          selected={typeUsage === opt}
                          onPress={() => {
                            clearFieldError("typeUsage");
                            setTypeUsage(opt);
                          }}
                          hasError={!!fieldErrors.typeUsage}
                        />
                      </View>
                    ))}
                  </View>
                )}
                {!!fieldErrors.typeUsage && (
                  <AppText style={s.errorText}>{fieldErrors.typeUsage}</AppText>
                )}
              </View>
            )}
          </View>
        )}

        {/* ═══════════ Localisation ═══════════ */}
        {step === STEP.LOCALISATION && (
          <View>
            <AppText style={s.sectionTitle}>Où se trouve le bien ?</AppText>

            {isLoadingLoc && (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText style={s.loadingText}>
                  Chargement des localisations…
                </AppText>
              </View>
            )}

            <SelectRow
              label="Région"
              value={region}
              placeholder="Sélectionnez une région"
              options={regions}
              onSelect={handleRegionChange}
              error={fieldErrors.region}
            />

            <SelectRow
              label="Préfecture"
              value={prefecture}
              placeholder="Sélectionnez une préfecture"
              options={prefectures}
              onSelect={handlePrefectureChange}
              disabled={!region}
              error={fieldErrors.prefecture}
            />

            <SelectRow
              label="Commune"
              value={commune}
              placeholder="Sélectionnez une commune"
              options={communes}
              onSelect={handleCommuneChange}
              disabled={!prefecture}
              error={fieldErrors.commune}
            />

            {/* Quartier — liste de cartes cliquables */}
            {commune ? (
              <View style={s.field}>
                <AppText style={s.fieldLabel}>Quartier</AppText>
                {quartiers.length > 8 && (
                  <View style={s.quartierSearch}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                      style={s.quartierSearchInput}
                      placeholder="Rechercher un quartier"
                      placeholderTextColor={colors.placeholder}
                      value={quartierQuery}
                      onChangeText={(texte) => setRecherche({ commune, texte })}
                      autoCorrect={false}
                      accessibilityLabel="Rechercher un quartier"
                    />
                  </View>
                )}
                {quartiersFiltres.length === 0 && (
                  <AppText style={s.gpsHint}>Aucun quartier ne correspond à « {quartierQuery} ».</AppText>
                )}
                <View style={s.quartierGrid}>
                  {quartiersFiltres.map((loc) => (
                    <Chip
                      key={loc.id}
                      label={loc.quartier}
                      selected={localisationId === loc.id}
                      onPress={() => handleQuartierChange(loc)}
                    />
                  ))}
                  {/* Quartier absent de la liste (DEC-22) : publié sur la commune, ajouté ensuite par l'équipe. */}
                  <Chip
                    label={chargementAutreQuartier ? "Chargement…" : "Mon quartier n'est pas dans la liste"}
                    selected={quartierAbsent}
                    onPress={choisirQuartierAbsent}
                  />
                </View>
                {quartierAbsent && (
                  <>
                    <Input
                      label="Nom de votre quartier"
                      placeholder="Ex : Kipé Centre"
                      value={quartierSaisi}
                      onChangeText={(v) => {
                        clearFieldError("quartierSaisi");
                        setQuartierSaisi(v.slice(0, 100));
                      }}
                      maxLength={100}
                      error={fieldErrors.quartierSaisi}
                    />
                    <AppText style={s.gpsHint}>
                      Votre annonce sera publiée sur la commune de {commune}. Nous ajouterons votre quartier à la liste et il
                      s’affichera ensuite sur votre annonce.
                    </AppText>
                  </>
                )}
                {!!fieldErrors.localisationId && (
                  <AppText style={s.errorText}>
                    {fieldErrors.localisationId}
                  </AppText>
                )}
              </View>
            ) : null}

            {/* Résumé localisation sélectionnée */}
            {localisationId ? (
              <View style={s.locSummary}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <AppText style={s.locSummaryText}>
                  {quartierAbsent ? `${commune}, ${prefecture}` : `${quartier}, ${commune}, ${prefecture}`}
                </AppText>
              </View>
            ) : null}

            <Input
              label="Complément d'adresse (optionnel)"
              placeholder="Ex : Près du marché central"
              value={complementAdresse}
              onChangeText={setComplementAdresse}
              autoCapitalize="sentences"
            />

            {/* Position GPS précise (optionnel) */}
            <View style={s.field}>
              <AppText style={s.fieldLabel}>Position sur la carte (optionnel)</AppText>
              <AppText style={s.gpsHint}>
                Indiquez l'emplacement précis du bien sur la carte.
              </AppText>
              <View style={s.gpsBtnRow}>
                <TouchableOpacity
                  style={s.gpsBtnHalf}
                  onPress={() => setMapModalOpen(true)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Choisir la position sur la carte (plein écran)"
                >
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <AppText style={s.gpsBtnText}>Choisir sur la carte</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.gpsBtnHalf}
                  onPress={handleUseMyLocation}
                  disabled={locatingGps}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Utiliser ma position actuelle"
                >
                  {locatingGps ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="locate-outline" size={18} color={colors.primary} />
                  )}
                  <AppText style={s.gpsBtnText}>{locatingGps ? "…" : "Ma position"}</AppText>
                </TouchableOpacity>
              </View>
              {latitude != null && longitude != null ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setMapModalOpen(true)}>
                  <LeafletMap
                    latitude={latitude}
                    longitude={longitude}
                    interactive={false}
                    height={170}
                    zoom={15}
                  />
                  <AppText style={s.gpsCoords}>
                    {latitude.toFixed(5)}, {longitude.toFixed(5)} · Toucher pour ajuster
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* ═══════════ Détails ═══════════ */}
        {step === STEP.DETAILS && (
          <View>
            <AppText style={s.sectionTitle}>Informations du bien</AppText>

            {!!typeBien && !isBienBati(typeBien) && (
              <View style={s.infoNote}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <AppText style={s.infoNoteText}>
                  {TYPE_BIEN_LABELS[typeBien]} non bâti, {typeAnnonce === "VENTE" ? "vendu" : "loué"} en
                  l’état : indiquez sa superficie et les documents disponibles.
                </AppText>
              </View>
            )}

            <Input
              ref={titreRef}
              label="Titre de l'annonce *"
              placeholder="Ex : Belle villa avec jardin"
              value={titre}
              onChangeText={(v) => {
                clearFieldError("titre");
                setTitre(v);
              }}
              onBlur={validateTitreOnBlur}
              autoCapitalize="sentences"
              error={fieldErrors.titre}
            />
            <Input
              label="Description *"
              placeholder="État, atouts, proximité (école, marché, route)…"
              value={description}
              onChangeText={(v) => {
                clearFieldError("description");
                setDescription(v);
              }}
              onBlur={validateDescriptionOnBlur}
              multiline
              onContentSizeChange={(e) =>
                setDescHeight(Math.max(DESC_MIN_HEIGHT, e.nativeEvent.contentSize.height))
              }
              style={[s.textarea, { height: descHeight }]}
              autoCapitalize="sentences"
              error={fieldErrors.description}
            />
            <AppText style={[s.fieldCounter, description.trim().length > 0 && description.trim().length < 20 && s.fieldCounterWarn]}>
              {description.trim().length < 20
                ? `${description.trim().length}/20 caractères minimum`
                : `${description.trim().length}/2000`}
            </AppText>
            <Input
              label={`${prixLabel(typeAnnonce)} *`}
              placeholder={typeAnnonce === "VENTE" ? "Ex : 250 000 000" : "Ex : 2 500 000"}
              value={prix}
              onChangeText={(v) => {
                clearFieldError("prix");
                setPrix(formatNumericInput(v));
              }}
              keyboardType="numeric"
              rightIcon={<AppText style={s.inputSuffix}>GNF</AppText>}
              error={fieldErrors.prix}
            />
            {prixEnLettres && !fieldErrors.prix ? (
              <AppText style={s.prixEnLettres}>
                Soit {prixEnLettres} GNF{isLoyerMensuel(typeAnnonce) ? " par mois" : ""}
              </AppText>
            ) : null}
            {showFrais && (
            <Input
              label="Frais d'honoraires (GNF)"
              placeholder="Optionnel"
              value={fraisHonoraire}
              onChangeText={(v) => {
                clearFieldError("fraisHonoraire");
                setFraisHonoraire(formatNumericInput(v));
              }}
              keyboardType="numeric"
              error={fieldErrors.fraisHonoraire}
            />
            )}

            {isLoyerMensuel(typeAnnonce) && (
              <>
                <Input
                  label="Caution (mois de loyer)"
                  placeholder="Optionnel, de 0 à 12"
                  value={cautionMois}
                  onChangeText={(v) => {
                    clearFieldError("cautionMois");
                    setCautionMois(v.replace(/[^0-9]/g, "").slice(0, 2));
                  }}
                  keyboardType="numeric"
                  error={fieldErrors.cautionMois}
                />
                <Input
                  label="Avance (mois de loyer)"
                  placeholder="Optionnel, de 0 à 24"
                  value={avanceMois}
                  onChangeText={(v) => {
                    clearFieldError("avanceMois");
                    setAvanceMois(v.replace(/[^0-9]/g, "").slice(0, 2));
                  }}
                  keyboardType="numeric"
                  error={fieldErrors.avanceMois}
                />
              </>
            )}

            <AppText style={s.subsectionTitle}>Caractéristiques</AppText>
            <Input
              label={surfaceLabel(typeBien)}
              placeholder="Ex : 500"
              value={surfaceTotal}
              onChangeText={(v) => setSurfaceTotal(v.replace(/[^0-9.,]/g, "").replace(",", "."))}
              keyboardType="numeric"
            />
            {champsCompo.length > 0 && (
              <View style={s.compoRow}>
                {champsCompo.map((champ) => (
                  <View key={champ} style={s.compoCell}>
                    <Input
                      label={
                        champ === "nbPieces" ? "Pièces" : champ === "nbChambres" ? "Chambres" : "Salles de bain"
                      }
                      placeholder="—"
                      value={composition[champ]}
                      onChangeText={(v) => setCompositionField(champ, v)}
                      keyboardType="number-pad"
                      maxLength={3}
                      error={fieldErrors[champ]}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Documents disponibles — grille icônes (multi-sélection) */}
            <View style={s.field}>
              <AppText style={s.groupTitle}>Documents disponibles</AppText>
              <View style={s.tileGrid}>
                {DOCUMENTS.map((opt) => {
                  const parts = documents ? documents.split(", ") : [];
                  const isActive = parts.includes(opt);
                  return (
                    <View key={opt} style={s.tileCell}>
                      <ChoiceTile
                        icon={DOCUMENTS_ICONS[opt]}
                        label={DOCUMENTS_LABELS[opt]}
                        selected={isActive}
                        multiple
                        hasError={!!fieldErrors.documentsDisponibles}
                        onPress={() => {
                          clearFieldError("documentsDisponibles");
                          setDocuments(
                            isActive
                              ? parts.filter((d) => d !== opt).join(", ")
                              : [...parts, opt].join(", "),
                          );
                        }}
                      />
                    </View>
                  );
                })}
              </View>
              {!!fieldErrors.documentsDisponibles && (
                <AppText style={s.errorText}>
                  {fieldErrors.documentsDisponibles}
                </AppText>
              )}
            </View>
          </View>
        )}

        {/* ═══════════ Aperçu ═══════════ */}
        {step === STEP.APERCU && (
          <View>
            <AppText style={s.sectionTitle}>Vérifiez votre annonce</AppText>
            <AppText style={s.sectionHint}>
              Voici comment elle apparaîtra dans les résultats. Touchez une étape
              en haut pour corriger.
            </AppText>
            <AnnonceCard
              item={apercu}
              isFav={false}
              isOwner
              onPress={() => {}}
              onToggleFav={() => {}}
              style={{ marginHorizontal: 0 }}
            />
            <View style={s.recapCard}>
              <AppText style={s.recapLabel}>Description</AppText>
              <AppText style={s.recapLine} numberOfLines={4}>{description.trim()}</AppText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Navigation bas ── */}
      <View style={[s.footer, { paddingBottom: spacing.sm + insets.bottom }, bandPadding]}>
        {/* Réseau lent : on montre où en est l'envoi des photos. */}
        {uploadProgress && uploadProgress.total > 0 ? (
          <AppText style={s.uploadProgress}>
            {uploadProgress.done < uploadProgress.total
              ? `Envoi de la photo ${uploadProgress.done + 1} sur ${uploadProgress.total}…`
              : "Finalisation…"}
          </AppText>
        ) : null}
        <View style={s.footerBtns}>
          {step > 0 && (
            <Button
              title="Retour"
              variant="ghost"
              fullWidth={false}
              style={s.backBtn}
              leftIcon={<Ionicons name="arrow-back" size={18} color={colors.primary} />}
              onPress={handleBack}
            />
          )}

          {/* « Suivant » reste actif : l'appui affiche les champs à corriger
              plutôt qu'un bouton grisé sans explication. */}
          {step < STEPS.length - 1 ? (
            <Button
              title="Suivant"
              fullWidth={false}
              style={s.nextBtn}
              rightIcon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
              onPress={handleNext}
            />
          ) : (
            <Button
              title={isEditMode ? "Enregistrer" : "Publier l'annonce"}
              fullWidth={false}
              style={s.nextBtn}
              rightIcon={<Ionicons name="checkmark" size={18} color={colors.white} />}
              onPress={handleSubmit}
              isLoading={isCreating}
            />
          )}
        </View>
      </View>

      <MapPickerModal
        visible={mapModalOpen}
        latitude={latitude}
        longitude={longitude}
        centre={centreCarte}
        onClose={() => setMapModalOpen(false)}
        onConfirm={({ latitude: la, longitude: ln }) => {
          setLatitude(la);
          setLongitude(ln);
        }}
      />
    </KeyboardAvoidingView>
  );
}
