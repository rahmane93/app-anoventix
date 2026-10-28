import { toJpegUpload } from '@/src/lib/images';
import { getRoleFlags, getRoleLabels } from '@/src/lib/roles';
import { useAnnonceStore } from '@/src/stores/annonce.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { useLicenceStore } from '@/src/stores/licence.store';
import { useUserStore } from '@/src/stores/user.store';
import type { TypePieceIdentite } from '@/src/types/user.types';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import { buildPhotoUrl } from './constants';
import { appAlert } from '@/src/components/ui/app-alert';
import * as userApi from '@/src/api/user.api';
import { getErrorMessage } from '@/src/utils/format';
import { useShallow } from 'zustand/react/shallow';

/**
 * Logique de l'écran Profil : profil/annonces/licence, upload photo,
 * soumission pièce d'identité, déconnexion, suppression de compte.
 * Extrait de l'écran pour séparer logique et présentation (revue P0-1/P0-3).
 *
 * Déplacement verbatim : dans l'écran d'origine handlers et dérivés étaient
 * définis AVANT les `return` anticipés (auth / loading) — aucune
 * restructuration de garde nécessaire, comportement identique.
 */
/** « JJ/MM/AAAA » saisi → « AAAA-MM-JJ », ou null si la date n'existe pas. */
function dateExpirationIso(saisie: string): string | null {
  const m = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$/.exec(saisie);
  if (!m) return null;
  const [j, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(a, mo - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null;
  return d.toISOString().slice(0, 10);
}

export function useProfile() {
  const { isAuthenticated, user, token, logout } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated, user: s.user, token: s.token, logout: s.logout })));
  const { mesAnnonces, loadMesAnnonces } = useAnnonceStore(useShallow((s) => ({ mesAnnonces: s.mesAnnonces, loadMesAnnonces: s.loadMesAnnonces })));
  const licence = useLicenceStore((st) => st.licence);
  const loadLicence = useLicenceStore((st) => st.load);
  const { isAdministrateur: _isAdmin, isModerateur: _isModo } = getRoleFlags(user?.roles);
  const isStaffRole = _isAdmin || _isModo;
  const {
    profile,
    isLoading,
    uploadingPiece,
    error,
    fetchProfile,
    uploadPhoto,
    uploadPieceIdentite,
    uploadSelfie,
    deleteAccount,
    isDeletingAccount,
    clearError,
  } = useUserStore(
    useShallow((s) => ({
      profile: s.profile,
      isLoading: s.isLoading,
      uploadingPiece: s.uploadingPiece,
      error: s.error,
      fetchProfile: s.fetchProfile,
      uploadPhoto: s.uploadPhoto,
      uploadPieceIdentite: s.uploadPieceIdentite,
      uploadSelfie: s.uploadSelfie,
      deleteAccount: s.deleteAccount,
      isDeletingAccount: s.isDeletingAccount,
      clearError: s.clearError,
    })),
  );

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<'profil' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pieceFormOpen, setPieceFormOpen] = useState(false);
  const [pieceTypeSel, setPieceTypeSel] = useState<TypePieceIdentite | ''>('');
  const [pieceNumero, setPieceNumero] = useState('');
  const [pieceFile, setPieceFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  // DEC-36 : verso (obligatoire pour la carte d'identité et le permis) et date d'expiration (JJ/MM/AAAA).
  const [versoFile, setVersoFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [pieceExpiration, setPieceExpiration] = useState('');
  // Selfie de vérification (EVO-01) : pris en direct, jamais importé de la galerie.
  const [selfieFile, setSelfieFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [selfieOuvert, setSelfieOuvert] = useState(false);
  // Le selfie capturé complète un dossier existant (seul) au lieu de l'accompagner la pièce.
  const [selfieSeul, setSelfieSeul] = useState(false);
  const [viewingPiece, setViewingPiece] = useState(false);
  // Retour affiché à côté de la section pièce (le formulaire est en bas de page :
  // une bannière en haut resterait hors de vue).
  const [pieceFeedback, setPieceFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const pickAndUploadPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      // iOS : exporter en JPEG plutôt qu'en HEIC (format illisible côté serveur).
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingPhoto('profil');
    clearError();
    try {
      // JPEG garanti (photos iPhone en HEIC illisibles côté serveur).
      let file;
      try {
        file = await toJpegUpload(asset, { baseName: 'profil' });
      } catch {
        appAlert('Photo non mise à jour', 'Impossible de préparer cette photo. Réessayez ou choisissez une autre image.');
        return;
      }
      await uploadPhoto(file, 'profil');
      setSuccessMsg('Photo mise à jour');
    } catch {
      // erreur d'envoi gérée dans le store
    } finally {
      setUploadingPhoto(null);
    }
  };

  const pickPieceFile = (face: 'recto' | 'verso' = 'recto') => choisirFace(face);

  const choisirFace = async (face: 'recto' | 'verso') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      // iOS : exporter en JPEG plutôt qu'en HEIC (format illisible côté serveur).
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      // JPEG garanti (photos iPhone en HEIC illisibles côté serveur) ; qualité
      // haute : le numéro du document doit rester lisible pour la modération.
      const fichier = await toJpegUpload(asset, { quality: 0.9, baseName: face === 'verso' ? 'verso' : 'piece' });
      if (face === 'verso') setVersoFile(fichier);
      else setPieceFile(fichier);
    } catch {
      setPieceFeedback({ variant: 'error', message: "Impossible de préparer cette photo. Réessayez ou choisissez une autre image." });
    }
  };

  const handleSubmitPiece = async () => {
    // Bouton toujours actif : l'appui explique ce qui manque.
    const deuxFaces = pieceTypeSel === 'CARTE_IDENTITE' || pieceTypeSel === 'PERMIS_DE_CONDUIRE';
    const expiration = dateExpirationIso(pieceExpiration);
    const manquants = [
      !pieceTypeSel && 'le type de pièce',
      !pieceNumero.trim() && 'le numéro',
      !expiration && "la date d'expiration (JJ/MM/AAAA)",
      !pieceFile && 'la photo du recto',
      deuxFaces && !versoFile && 'la photo du verso',
      !selfieFile && 'votre selfie',
    ].filter(Boolean);
    if (manquants.length > 0) {
      setPieceFeedback({ variant: 'error', message: `Complétez ${manquants.join(', ')}.` });
      return;
    }
    if (expiration! <= new Date().toISOString().slice(0, 10)) {
      setPieceFeedback({ variant: 'error', message: 'Cette pièce est expirée : envoyez une pièce en cours de validité.' });
      return;
    }
    clearError();
    setSuccessMsg(null);
    setPieceFeedback(null);
    try {
      await uploadPieceIdentite(pieceFile!, versoFile, selfieFile!, pieceTypeSel as TypePieceIdentite,
        pieceNumero.trim(), expiration!);
      setPieceFeedback({
        variant: 'success',
        message: "Dossier envoyé. La modération le vérifie en 72 h au plus, vous serez prévenu par email.",
      });
      setPieceFormOpen(false);
      setPieceFile(null);
      setVersoFile(null);
      setPieceExpiration('');
      setSelfieFile(null);
    } catch (err) {
      // Affichée près du formulaire plutôt qu'en haut de page.
      setPieceFeedback({ variant: 'error', message: getErrorMessage(err, "Pièce d'identité non envoyée. Vérifiez votre connexion puis réessayez.") });
      clearError();
    }
  };

  /** Dossier d'avant le selfie : le selfie capturé part seul (POST /me/selfie). */
  const handleSelfieSeul = async (selfie: { uri: string; name: string; type: string }) => {
    setPieceFeedback(null);
    try {
      await uploadSelfie(selfie);
      setPieceFeedback({ variant: 'success', message: 'Selfie envoyé. La modération vérifie votre dossier.' });
    } catch (err) {
      setPieceFeedback({ variant: 'error', message: getErrorMessage(err, 'Selfie non envoyé. Réessayez.') });
      clearError();
    } finally {
      setSelfieSeul(false);
    }
  };

  /** Selfie pris : joint au dossier en cours de saisie, ou envoyé seul pour un dossier en attente. */
  const onSelfiePris = (selfie: { uri: string; name: string; type: string }) => {
    if (selfieSeul) handleSelfieSeul(selfie);
    else setSelfieFile(selfie);
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchProfile();
        loadMesAnnonces();
        if (!isStaffRole) loadLicence();
      }
    }, [fetchProfile, loadMesAnnonces, loadLicence, isAuthenticated]),
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(tabs)/explore');
  };

  const [exporting, setExporting] = useState(false);

  /** Export RGPD : récupère le JSON et l'ouvre dans la feuille de partage du système. */
  const handleExportDonnees = async () => {
    setExporting(true);
    try {
      const donnees = await userApi.exportMesDonnees();
      await Share.share({
        title: 'Mes données Anoventix',
        message: JSON.stringify(donnees, null, 2),
      });
    } catch (err) {
      appAlert("Export impossible", getErrorMessage(err, "Impossible d'exporter vos données."));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    // Refusé aussi par l'API : un compte de modération ne s'auto-supprime pas.
    if (isStaffRole) return;
    appAlert(
      'Supprimer mon compte',
      'Votre compte et vos annonces seront désactivés immédiatement. '
        + 'Vous pourrez le réactiver en vous reconnectant pendant 30 jours ; '
        + 'passé ce délai, vos données personnelles seront définitivement effacées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer mon compte',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              await logout();
              router.replace('/(tabs)/explore');
            } catch {
              appAlert("Suppression impossible", 'Impossible de supprimer le compte.');
            }
          },
        },
      ],
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSuccessMsg(null);
    clearError();
    try {
      await Promise.all([fetchProfile(), loadMesAnnonces(), ...(!isStaffRole ? [loadLicence()] : [])]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const avatarUri = buildPhotoUrl(profile?.photoProfil ?? null);
  const displayName =
    profile
      ? [profile.prenom, profile.nom].filter(Boolean).join(' ') || profile.email
      : (user?.email ?? '');
  const email = profile?.email ?? user?.email ?? '';
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
  const roleLabels = getRoleLabels(profile?.roles ?? profile?.role ?? user?.roles);
  const roleDisplay = roleLabels[0] || '—';
  const { isAdministrateur, isModerateur, isParticulier, isProfessionnel } = getRoleFlags(profile?.roles ?? profile?.role ?? user?.roles);
  const isModerationRole = isAdministrateur || isModerateur;

  const docStatut = profile?.statutPieceIdentite ?? null;
  return {
    // garde / état
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
    // pièce
    pieceFormOpen,
    setPieceFormOpen,
    pieceTypeSel,
    setPieceTypeSel,
    pieceNumero,
    setPieceNumero,
    pieceFile,
    versoFile,
    pieceExpiration,
    setPieceExpiration,
    selfieFile,
    selfieOuvert,
    setSelfieOuvert,
    selfieSeul,
    setSelfieSeul,
    onSelfiePris,
    viewingPiece,
    setViewingPiece,
    // handlers
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
    // dérivés
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
  };
}
