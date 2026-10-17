import { toJpegUploads, type UploadFile } from "@/src/lib/images";
import {
  addBienImmoMedias,
  deleteBienImmoMedia,
  getAnnonceById,
} from "@/src/api/annonce.api";
import { champsComposition, type ChampComposition } from "@/src/lib/bien";
import { getRoleFlags } from "@/src/lib/roles";
import { REGIONS_GUINEE, useAnnonceStore } from "@/src/stores/annonce.store";
import { useAuthStore } from "@/src/stores/auth.store";
import { useEntrepriseStore } from "@/src/stores/entreprise.store";
import { useUserStore } from "@/src/stores/user.store";
import type {
  Localisation,
  Media,
  StatutAnnonce,
  TypeAnnonce,
  TypeBien,
  TypeUsage,
} from "@/src/types/annonce.types";
import {
  formatNumericInput,
  getErrorMessage,
  humanizeMediaError,
  parseOptionalNumber,
} from "@/src/utils/format";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ANNONCE_BIENS_MAP,
  BIEN_USAGES_MAP,
  type FieldErrors,
  FIELD_STEP,
  isNonEmpty,
  STEP,
  STEPS,
  TYPE_BIENS,
  TYPE_USAGES,
} from "./constants";
import { appAlert } from '@/src/components/ui/app-alert';
import { useShallow } from 'zustand/react/shallow';

/**
 * Logique du formulaire multi-étapes Publier (création / édition) :
 * cascade type→bien→usage, cascade localisation, pré-remplissage en
 * édition, gestion des photos, validation par étape, soumission.
 * Extrait de l'écran pour séparer logique et présentation (revue P0-1/P0-3).
 *
 * Déplacement verbatim : dans l'écran d'origine tous les handlers/états
 * étaient définis AVANT les `return` anticipés (auth/gate/succès). Aucune
 * restructuration de garde n'est donc nécessaire — comportement identique.
 */
/** Résultat affiché sur l'écran de succès après une création. */
export type PublicationReussie = { id: number; reference: string; statut: StatutAnnonce };

// Brouillon de création (hors photos déjà choisies) : survit à la fermeture de l'app.
const BROUILLON_KEY = "publier:brouillon";

const EMPTY_COMPOSITION: Record<ChampComposition, string> = {
  nbPieces: "",
  nbChambres: "",
  nbSallesBain: "",
};

export function usePublierForm() {
  const { isAuthenticated, user } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated, user: s.user })));
  const { profile } = useUserStore(useShallow((s) => ({ profile: s.profile })));
  const {
    entreprise,
    isLoading: isLoadingEntreprise,
    fetchByUserId: fetchEntrepriseByUserId,
    fetchById: fetchEntrepriseById,
  } = useEntrepriseStore(
    useShallow((s) => ({
      entreprise: s.entreprise,
      isLoading: s.isLoading,
      fetchByUserId: s.fetchByUserId,
      fetchById: s.fetchById,
    })),
  );
  const {
    isLoadingLoc,
    isCreating,
    error,
    loadLocalisationsByRegion,
    createAnnonce,
    updateAnnonce,
    clearError,
  } = useAnnonceStore(
    useShallow((s) => ({
      isLoadingLoc: s.isLoadingLoc,
      isCreating: s.isCreating,
      error: s.error,
      loadLocalisationsByRegion: s.loadLocalisationsByRegion,
      createAnnonce: s.createAnnonce,
      updateAnnonce: s.updateAnnonce,
      clearError: s.clearError,
    })),
  );

  const roles = profile?.roles ?? profile?.role ?? user?.roles;
  const { isProfessionnel, isAgentProfessionnel } = getRoleFlags(roles);
  const effectiveUserId = user?.id ?? profile?.id;
  const profileEntrepriseId = profile?.entrepriseId;

  // Charge l'entreprise si vide, sinon le gate "Entreprise requise" se
  // déclenche à tort quand le PRO ouvre Publier directement.
  useFocusEffect(
    useCallback(() => {
      if (!isProfessionnel || entreprise) return;
      if (profileEntrepriseId) {
        fetchEntrepriseById(profileEntrepriseId);
      } else if (effectiveUserId) {
        fetchEntrepriseByUserId(effectiveUserId);
      }
    }, [
      isProfessionnel,
      entreprise,
      profileEntrepriseId,
      effectiveUserId,
      fetchEntrepriseById,
      fetchEntrepriseByUserId,
    ]),
  );

  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = params?.editId ? Number(params.editId) : null;
  const isEditMode = Number.isFinite(editId) && editId != null;

  const [isPrefilling, setIsPrefilling] = useState(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [existingMedias, setExistingMedias] = useState<Media[]>([]);
  const [isMediaBusy, setIsMediaBusy] = useState(false);

  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState<PublicationReussie | null>(null);
  // Envoi des photos après création : « Envoi photo 2/5 ».
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const shouldResetOnNextFocusRef = useRef(false);
  const prevIsEditModeRef = useRef(isEditMode);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldErrors = () => setFieldErrors({});

  const setFieldError = (field: string, message: string) =>
    setFieldErrors((prev) => ({ ...prev, [field]: message }));

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });

  // Étape 1 — Type
  const [typeAnnonce, setTypeAnnonce] = useState<TypeAnnonce | "">("");
  const [typeBien, setTypeBien] = useState<TypeBien | "">("");
  const [typeUsage, setTypeUsage] = useState<TypeUsage | "">("");

  // Options filtrées selon les dépendances
  const availableBiens = useMemo<TypeBien[]>(
    () => (typeAnnonce ? ANNONCE_BIENS_MAP[typeAnnonce] : TYPE_BIENS),
    [typeAnnonce],
  );

  const availableUsages = useMemo<TypeUsage[]>(
    () => (typeBien ? BIEN_USAGES_MAP[typeBien as TypeBien] : TYPE_USAGES),
    [typeBien],
  );

  // Auto-select si un seul usage possible
  const isUsageAutoSelected = availableUsages.length === 1;

  // Handlers cascadés
  const handleTypeAnnonceChange = (val: TypeAnnonce) => {
    clearFieldErrors();
    setTypeAnnonce(val);
    // Réinitialise typeBien s'il n'est plus autorisé
    const allowedBiens = ANNONCE_BIENS_MAP[val];
    if (typeBien && !allowedBiens.includes(typeBien as TypeBien)) {
      setTypeBien("");
      setTypeUsage("");
    }
  };

  const handleTypeBienChange = (val: TypeBien) => {
    clearFieldErrors();
    setTypeBien(val);
    // Terrain / domaine (vendu ou loué en l'état) ou local sans pièces :
    // on vide les champs de composition qui ne s'appliquent plus.
    const champs = champsComposition(val);
    setComposition((prev) => {
      const next = { ...EMPTY_COMPOSITION };
      champs.forEach((c) => { next[c] = prev[c]; });
      return next;
    });
    // Réinitialise typeUsage s'il n'est plus autorisé, ou auto-sélectionne
    const allowedUsages = BIEN_USAGES_MAP[val];
    if (allowedUsages.length === 1) {
      setTypeUsage(allowedUsages[0]);
    } else if (typeUsage && !allowedUsages.includes(typeUsage as TypeUsage)) {
      setTypeUsage("");
    }
  };

  // Étape 2 — Localisation
  const [region, setRegion] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [localisationId, setLocalisationId] = useState("");
  // Coordonnées GPS optionnelles (carte / position du téléphone).
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Étape 3 — Détails
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [prix, setPrix] = useState("");
  const [fraisHonoraire, setFraisHonoraire] = useState("");
  const [surfaceTotal, setSurfaceTotal] = useState("");
  // Composition (biens bâtis uniquement) — chaînes de saisie.
  const [composition, setComposition] =
    useState<Record<ChampComposition, string>>(EMPTY_COMPOSITION);
  const setCompositionField = (champ: ChampComposition, v: string) => {
    clearFieldError(champ);
    setComposition((prev) => ({ ...prev, [champ]: v.replace(/\D/g, "").slice(0, 3) }));
  };
  const champsCompo = useMemo(() => champsComposition(typeBien), [typeBien]);
  const [complementAdresse, setComplementAdresse] = useState("");
  const [documents, setDocuments] = useState<string>("");

  // Étape 4 — Photos
  const [medias, setMedias] = useState<
    { uri: string; name: string; type: string }[]
  >([]);

  // ── Localisation data ─
  const regions = REGIONS_GUINEE;
  const [locByRegion, setLocByRegion] = useState<Localisation[]>([]);

  // Déclarés après tous les états qu'ils réinitialisent (règle React Compiler).
  const resetCreateForm = useCallback(() => {
    setSuccess(null);
    setUploadProgress(null);
    setStep(0);
    setTypeAnnonce("");
    setTypeBien("");
    setRegion("");
    setPrefecture("");
    setCommune("");
    setQuartier("");
    setLocalisationId("");
    setLatitude(null);
    setLongitude(null);
    setTitre("");
    setDescription("");
    setPrix("");
    setFraisHonoraire("");
    setSurfaceTotal("");
    setComposition(EMPTY_COMPOSITION);
    setComplementAdresse("");
    setTypeUsage("");
    setDocuments("");
    setMedias([]);
    setExistingMedias([]);
    setLocByRegion([]);
    setPrefillError(null);
    clearFieldErrors();
    clearError();
    AsyncStorage.removeItem(BROUILLON_KEY).catch(() => {});
  }, [clearError]);

  // Transition edit → create sans soumission : remet le formulaire à zéro
  useEffect(() => {
    if (prevIsEditModeRef.current && !isEditMode) {
      resetCreateForm();
    }
    prevIsEditModeRef.current = isEditMode;
  }, [isEditMode, resetCreateForm]);

  // ── Brouillon (création uniquement) ─
  // Les champs sont sauvegardés au fil de la saisie ; les photos non, car les
  // fichiers temporaires du sélecteur ne survivent pas toujours à l'app.
  const brouillon = {
    typeAnnonce, typeBien, typeUsage,
    region, prefecture, commune, quartier, localisationId, latitude, longitude, complementAdresse,
    titre, description, prix, fraisHonoraire, surfaceTotal, composition, documents,
  };
  const brouillonJson = JSON.stringify(brouillon);
  const aDuContenu = !!(typeAnnonce || region || titre || description || prix);

  useEffect(() => {
    if (isEditMode || success || !aDuContenu) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(BROUILLON_KEY, brouillonJson).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [isEditMode, success, aDuContenu, brouillonJson]);

  const restaurerBrouillon = async (d: typeof brouillon) => {
    setTypeAnnonce(d.typeAnnonce);
    setTypeBien(d.typeBien);
    setTypeUsage(d.typeUsage);
    setTitre(d.titre);
    setDescription(d.description);
    setPrix(d.prix);
    setFraisHonoraire(d.fraisHonoraire);
    setSurfaceTotal(d.surfaceTotal);
    setComposition({ ...EMPTY_COMPOSITION, ...d.composition });
    setDocuments(d.documents);
    setComplementAdresse(d.complementAdresse);
    setLatitude(d.latitude);
    setLongitude(d.longitude);
    if (d.region) {
      setRegion(d.region);
      setLocByRegion(await loadLocalisationsByRegion(d.region));
      setPrefecture(d.prefecture);
      setCommune(d.commune);
      setQuartier(d.quartier);
      setLocalisationId(d.localisationId);
    }
  };

  const brouillonVerifieRef = useRef(false);
  useEffect(() => {
    if (isEditMode || brouillonVerifieRef.current) return;
    brouillonVerifieRef.current = true;
    AsyncStorage.getItem(BROUILLON_KEY)
      .then((json) => {
        if (!json) return;
        const d = JSON.parse(json) as typeof brouillon;
        appAlert(
          "Reprendre votre annonce ?",
          "Vous aviez commencé une annonce sans la publier. Les photos seront à ajouter de nouveau.",
          [
            { text: "Recommencer", style: "destructive", onPress: () => { AsyncStorage.removeItem(BROUILLON_KEY).catch(() => {}); } },
            { text: "Reprendre", onPress: () => { restaurerBrouillon(d); } },
          ],
        );
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const prefectures = useMemo(
    () =>
      [
        ...new Set(
          (Array.isArray(locByRegion) ? locByRegion : []).map(
            (l) => l.prefecture,
          ),
        ),
      ].sort(),
    [locByRegion],
  );

  const communes = useMemo(
    () =>
      [
        ...new Set(
          (Array.isArray(locByRegion) ? locByRegion : [])
            .filter((l) => l.prefecture === prefecture)
            .map((l) => l.commune),
        ),
      ].sort(),
    [locByRegion, prefecture],
  );

  const quartiers = useMemo(
    () =>
      (Array.isArray(locByRegion) ? locByRegion : [])
        .filter((l) => l.prefecture === prefecture && l.commune === commune)
        .sort((a, b) => a.quartier.localeCompare(b.quartier)),
    [locByRegion, prefecture, commune],
  );

  const handleRegionChange = async (r: string) => {
    clearFieldErrors();
    setRegion(r);
    setPrefecture("");
    setCommune("");
    setQuartier("");
    setLocalisationId("");
    const list = await loadLocalisationsByRegion(r);
    setLocByRegion(list);
  };

  const handlePrefectureChange = (p: string) => {
    clearFieldErrors();
    setPrefecture(p);
    setCommune("");
    setQuartier("");
    setLocalisationId("");
  };

  const handleCommuneChange = (c: string) => {
    clearFieldErrors();
    setCommune(c);
    setQuartier("");
    setLocalisationId("");
  };

  const handleQuartierChange = (loc: Localisation) => {
    clearFieldErrors();
    setQuartier(loc.quartier);
    setLocalisationId(loc.id);
  };

  // ── Pré-remplissage en mode édition ─
  useEffect(() => {
    if (!isEditMode || !editId) return;

    let cancelled = false;
    (async () => {
      try {
        setIsPrefilling(true);
        clearError();
        clearFieldErrors();
        setPrefillError(null);

        const a = await getAnnonceById(editId);
        if (cancelled || !a) return;

        setExistingMedias(a.medias ?? []);

        setTypeAnnonce(a.typeAnnonce ?? "");
        setTypeBien(a.typeBien ?? "");
        setTitre(a.titre ?? "");
        setDescription(a.description ?? "");
        setPrix(a.prix != null ? formatNumericInput(String(a.prix)) : "");
        setFraisHonoraire(
          a.fraisHonoraire != null
            ? formatNumericInput(String(a.fraisHonoraire))
            : "",
        );
        setSurfaceTotal(a.surfaceTotal != null ? String(a.surfaceTotal) : "");
        setComposition({
          nbPieces: a.nbPieces != null ? String(a.nbPieces) : "",
          nbChambres: a.nbChambres != null ? String(a.nbChambres) : "",
          nbSallesBain: a.nbSallesBain != null ? String(a.nbSallesBain) : "",
        });
        setComplementAdresse(a.complementAdresse ?? "");
        setTypeUsage(a.typeUsage ?? "");
        setDocuments(a.documentsDisponibles ?? "");

        // Localisation (si embarquée)
        if (a.localisation?.region) {
          const r = a.localisation.region;
          setRegion(r);
          const list = await loadLocalisationsByRegion(r);
          if (cancelled) return;
          setLocByRegion(list);

          setPrefecture(a.localisation.prefecture ?? "");
          setCommune(a.localisation.commune ?? "");
          setQuartier(a.localisation.quartier ?? "");
        }
        // Le détail d'annonce embarque la localisation mais pas toujours un
        // `localisationId` racine : on retombe sur l'id du quartier embarqué
        // pour que le chip correspondant soit bien pré-sélectionné en édition.
        setLocalisationId(a.localisationId ?? a.localisation?.id ?? "");
        setLatitude(a.latitude ?? null);
        setLongitude(a.longitude ?? null);
      } catch (err) {
        setPrefillError(
          getErrorMessage(err, "Impossible de charger l'annonce."),
        );
      } finally {
        if (!cancelled) setIsPrefilling(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editId]);

  useFocusEffect(
    useCallback(() => {
      if (!isEditMode && shouldResetOnNextFocusRef.current) {
        shouldResetOnNextFocusRef.current = false;
        resetCreateForm();
      }

      return () => {
        if (!isEditMode && success) {
          shouldResetOnNextFocusRef.current = true;
        }
      };
    }, [isEditMode, success, resetCreateForm]),
  );

  // ── Validation au blur (quitter le champ) ─
  const validateTitreOnBlur = () => {
    const t = titre.trim();
    if (!isNonEmpty(t)) {
      setFieldError("titre", "Le titre est obligatoire.");
      return;
    }
    if (t.length < 5 || t.length > 100) {
      setFieldError(
        "titre",
        "Le titre doit contenir entre 5 et 100 caractères.",
      );
      return;
    }
    clearFieldError("titre");
  };

  const validateDescriptionOnBlur = () => {
    const d = description.trim();
    if (!isNonEmpty(d)) {
      setFieldError("description", "La description est obligatoire.");
      return;
    }
    if (d.length < 20 || d.length > 2000) {
      setFieldError(
        "description",
        "La description doit contenir entre 20 et 2000 caractères.",
      );
      return;
    }
    clearFieldError("description");
  };

  // ── Sélection de photos ─
  const refreshAnnonceMedias = async () => {
    if (!isEditMode || !editId) return;
    const a = await getAnnonceById(editId);
    setExistingMedias(a.medias ?? []);
  };

  const pickPhotosForCreate = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const existingCount = existingMedias.length;
    const remaining = Math.max(0, 10 - existingCount - medias.length);
    if (remaining === 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      // iOS : exporter en JPEG plutôt qu'en HEIC (format illisible côté serveur).
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: remaining,
    });

    if (result.canceled || !result.assets) return;

    // JPEG garanti (photos iPhone en HEIC illisibles côté serveur).
    let newFiles: UploadFile[];
    try {
      newFiles = await toJpegUploads(result.assets, { quality: 0.8 });
    } catch {
      appAlert("Photos non ajoutées", "Impossible de préparer cette photo. Réessayez ou choisissez une autre image.");
      return;
    }
    setMedias((prev) => [...prev, ...newFiles].slice(0, 10));
  };

  const pickAndUploadPhotos = async () => {
    if (!isEditMode || !editId) return;
    if (isMediaBusy) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const remaining = Math.max(0, 10 - existingMedias.length);
    if (remaining === 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      // iOS : exporter en JPEG plutôt qu'en HEIC (format illisible côté serveur).
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: remaining,
    });

    if (result.canceled || !result.assets) return;

    try {
      setIsMediaBusy(true);
      setPrefillError(null);
      // JPEG garanti (photos iPhone en HEIC illisibles côté serveur).
      const newFiles = await toJpegUploads(result.assets, { quality: 0.8 });
      await addBienImmoMedias(editId, newFiles);
      await refreshAnnonceMedias();
    } catch (err) {
      setPrefillError(
        humanizeMediaError(err, "Impossible d’ajouter les images."),
      );
      // Best effort: l'opération peut réussir mais la réponse échouer côté backend
      try {
        await refreshAnnonceMedias();
      } catch {
        // ignore
      }
    } finally {
      setIsMediaBusy(false);
    }
  };

  const removeExistingMedia = async (mediaId: number) => {
    if (!isEditMode || !editId) return;
    if (isMediaBusy) return;

    try {
      setIsMediaBusy(true);
      setPrefillError(null);
      await deleteBienImmoMedia(editId, mediaId);
      await refreshAnnonceMedias();
    } catch (err) {
      setPrefillError(
        humanizeMediaError(err, "Impossible de supprimer le média."),
      );
      // Best effort: l'opération peut réussir mais la réponse échouer côté backend
      try {
        await refreshAnnonceMedias();
      } catch {
        // ignore
      }
    } finally {
      setIsMediaBusy(false);
    }
  };

  const removePhoto = (idx: number) => {
    setMedias((prev) => prev.filter((_, i) => i !== idx));
  };

  // La première photo envoyée devient la photo principale de l'annonce.
  const setMainPhoto = (idx: number) => {
    setMedias((prev) => (idx <= 0 || idx >= prev.length ? prev : [prev[idx], ...prev.filter((_, i) => i !== idx)]));
  };

  // ── Validation par étape ─
  const getStepErrors = (stepIndex: number): FieldErrors => {
    const nextErrors: FieldErrors = {};

    if (stepIndex === STEP.PHOTOS) {
      if (medias.length + existingMedias.length === 0)
        nextErrors.medias = "Ajoutez au moins une photo : les annonces sans photo ne sont presque jamais consultées.";
    }

    if (stepIndex === STEP.TYPE) {
      if (!typeAnnonce)
        nextErrors.typeAnnonce = "Le type d'annonce est obligatoire";
      if (!typeBien) nextErrors.typeBien = "Le type de bien est obligatoire";
      if (typeBien && !isUsageAutoSelected && !typeUsage)
        nextErrors.typeUsage = "L'usage du bien est obligatoire";
    }

    if (stepIndex === STEP.LOCALISATION) {
      if (!region) nextErrors.region = "Veuillez sélectionner une région.";
      if (!prefecture)
        nextErrors.prefecture = "Veuillez sélectionner une préfecture.";
      if (!commune) nextErrors.commune = "Veuillez sélectionner une commune.";
      if (!localisationId)
        nextErrors.localisationId = "Le quartier est obligatoire";
    }

    if (stepIndex === STEP.DETAILS) {
      const t = titre.trim();
      const d = description.trim();
      if (!isNonEmpty(t)) nextErrors.titre = "Le titre est obligatoire.";
      if (t.length > 0 && (t.length < 5 || t.length > 100)) {
        nextErrors.titre = "Le titre doit contenir entre 5 et 100 caractères.";
      }
      if (!isNonEmpty(d))
        nextErrors.description = "La description est obligatoire.";
      if (d.length > 0 && (d.length < 20 || d.length > 2000)) {
        nextErrors.description =
          "La description doit contenir entre 20 et 2000 caractères.";
      }

      const prixNumber = parseOptionalNumber(prix);
      if (prixNumber === null) nextErrors.prix = "Le prix est obligatoire";
      else if (prixNumber <= 0)
        nextErrors.prix = "Le prix doit être supérieur à 0";

      const fraisNumber = parseOptionalNumber(fraisHonoraire);
      if (
        fraisHonoraire.trim().length > 0 &&
        (fraisNumber === null || fraisNumber < 0)
      ) {
        nextErrors.fraisHonoraire =
          "Les frais honoraire doit être supérieur ou egal à 0";
      }

      if (!documents.trim()) {
        nextErrors.documentsDisponibles =
          "Vous devez mentionner au moins un document";
      }

      const pieces = parseOptionalNumber(composition.nbPieces);
      const chambres = parseOptionalNumber(composition.nbChambres);
      if (champsCompo.includes("nbPieces") && pieces !== null && pieces < 1) {
        nextErrors.nbPieces = "Au moins 1 pièce.";
      }
      if (
        champsCompo.includes("nbChambres") &&
        pieces !== null && chambres !== null && chambres > pieces
      ) {
        nextErrors.nbChambres = "Ne peut pas dépasser le nombre de pièces.";
      }
    }

    return nextErrors;
  };

  const getAllErrors = (): FieldErrors => {
    return {
      ...getStepErrors(STEP.PHOTOS),
      ...getStepErrors(STEP.TYPE),
      ...getStepErrors(STEP.LOCALISATION),
      ...getStepErrors(STEP.DETAILS),
    };
  };

  const validateStep = (stepIndex: number): boolean => {
    const nextErrors = getStepErrors(stepIndex);
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    clearError();
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) setStep((sv) => sv + 1);
  };

  const handleBack = () => {
    clearError();
    clearFieldErrors();
    if (step > 0) setStep((sv) => sv - 1);
  };

  // Retour direct à une étape déjà validée (indicateur de progression).
  const goToStep = (index: number) => {
    if (index >= step) return;
    clearError();
    clearFieldErrors();
    setStep(index);
  };

  // ── Soumission finale ─
  const handleSubmit = async () => {
    clearError();
    clearFieldErrors();

    // Validation finale avant appel API
    const allErrors = getAllErrors();
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      const firstKey = Object.keys(allErrors)[0];
      if (firstKey && typeof FIELD_STEP[firstKey] === "number")
        setStep(FIELD_STEP[firstKey]);
      return;
    }

    try {
      const prixNumber = parseOptionalNumber(prix);
      const fraisNumber = parseOptionalNumber(fraisHonoraire);

      const basePayload = {
        titre: titre.trim(),
        description: description.trim(),
        prix: prixNumber!,
        typeAnnonce: typeAnnonce as TypeAnnonce,
        typeBien: typeBien as TypeBien,
        localisationId,
        typeUsage: typeUsage || undefined,
        documentsDisponibles: documents.trim() || undefined,
        fraisHonoraire: fraisHonoraire ? (fraisNumber ?? undefined) : undefined,
        surfaceTotal: surfaceTotal ? Number(surfaceTotal) : undefined,
        // Seuls les champs pertinents pour le type de bien sont envoyés
        // (rien pour un terrain ou un domaine vendu/loué en l'état).
        ...Object.fromEntries(
          champsCompo
            .filter((c) => composition[c] !== "")
            .map((c) => [c, Number(composition[c])]),
        ),
        complementAdresse: complementAdresse.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      };

      const annonce =
        isEditMode && editId
          ? await updateAnnonce(editId, basePayload)
          : await createAnnonce({ ...basePayload, medias }, (done, total) =>
              setUploadProgress({ done, total }),
            );

      if (isEditMode) {
        resetCreateForm();
        router.replace("/(tabs)/mes-annonces");
        appAlert("Annonce modifiée", "Vos modifications ont été enregistrées.");
        return;
      }
      // Création : écran de succès (voir l'annonce, partager, en publier une autre).
      AsyncStorage.removeItem(BROUILLON_KEY).catch(() => {});
      setUploadProgress(null);
      setSuccess({ id: annonce.id, reference: annonce.referenceAnnonce, statut: annonce.statutModeration });
    } catch (err) {
      setUploadProgress(null);
      // erreurs dans le store + erreurs champs renvoyées par l'API
      // Le backend peut renvoyer : { message, errors: { field: msg } }
      // On applique ces erreurs sur les champs correspondants.
      const apiErrors: FieldErrors | null | undefined = (
        err as { errors?: FieldErrors | null }
      )?.errors;
      if (apiErrors && typeof apiErrors === "object") {
        setFieldErrors(apiErrors);
        const firstKey = Object.keys(apiErrors)[0];
        if (firstKey) {
          const targetStep = FIELD_STEP[firstKey];
          if (typeof targetStep === "number") setStep(targetStep);
        }
      }
    }
  };

  // L'API exige une pièce d'identité validée pour publier : on le dit dès
  // l'ouverture du formulaire plutôt qu'après les 4 étapes.
  const statutPiece = profile?.statutPieceIdentite ?? null;
  // Frais d'honoraires : pertinents pour les professionnels (ou s'ils sont déjà renseignés).
  const showFrais = isProfessionnel || isAgentProfessionnel || fraisHonoraire.trim() !== "";
  const identiteRequise = !!profile && statutPiece !== "VALIDEE";

  return {
    // garde / écrans d'état
    isAuthenticated,
    identiteRequise,
    statutPiece,
    isProfessionnel,
    entreprise,
    isLoadingEntreprise,
    isEditMode,
    success,
    uploadProgress,
    showFrais,
    resetCreateForm,
    // état global
    step,
    error,
    prefillError,
    isPrefilling,
    isLoadingLoc,
    isCreating,
    fieldErrors,
    clearFieldErrors,
    clearFieldError,
    // étape 1
    typeAnnonce,
    typeBien,
    typeUsage,
    setTypeUsage,
    isUsageAutoSelected,
    availableBiens,
    availableUsages,
    handleTypeAnnonceChange,
    handleTypeBienChange,
    // étape 2
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
    latitude,
    longitude,
    setLatitude,
    setLongitude,
    // étape 3
    titre,
    setTitre,
    description,
    setDescription,
    prix,
    setPrix,
    fraisHonoraire,
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
    // étape 4
    medias,
    existingMedias,
    isMediaBusy,
    pickPhotosForCreate,
    pickAndUploadPhotos,
    removeExistingMedia,
    removePhoto,
    setMainPhoto,
    // navigation
    goToStep,
    handleNext,
    handleBack,
    handleSubmit,
  };
}
