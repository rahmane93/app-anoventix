import { goBackOr } from '@/src/lib/navigation';
import { afficherAnnoncesUtilisateur, masquerAnnoncesUtilisateur } from '@/src/api/admin.api';
import { API_BASE_URL } from '@/src/api/client';
import { Dialog } from '@/src/components/ui/dialog';
import { FullscreenOverlay } from '@/src/components/ui/fullscreen-overlay';
import { getRoleFlags, getRoleLabel } from '@/src/lib/roles';
import { getErrorMessage } from '@/src/utils/format';
import { useAdminStore } from '@/src/stores/admin.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { useUserStore } from '@/src/stores/user.store';
import { colors, radius, spacing, typography } from '@/src/theme';
import {
    NIVEAU_AVERTISSEMENT_LABELS,
    STATUT_PIECE_LABELS,
    STATUT_USER_LABELS,
    TYPE_PIECE_LABELS,
    type Avertissement,
    type StatutUtilisateur,
} from '@/src/types/admin.types';
import { NIVEAU_TONE, PIECE_TONE, USER_STATUT_TONE } from '@/src/features/admin/status';
import {
    Avatar,
    ErrorBanner,
    ErrorState,
    FieldRow,
    ListRow,
    LoadingState,
    RowSeparator,
    Section,
    StatusBadge,
    TONES,
    webColumn,
} from '@/src/features/admin/ui';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { useShallow } from 'zustand/react/shallow';

// Motif posé par l'API sur un compte anonymisé (CompteSuppressionService.MOTIF_ANONYMISE).
const COMPTE_ANONYMISE = 'Compte anonymisé (RGPD)';

// ─── Constantes ───────────────────────────────────────────────────────────────

// Rôles assignables via l'API (sans ADMINISTRATEUR — interdit par le backend).
// Un compte n'a qu'un rôle : la liste se lit comme un choix exclusif.
const ASSIGNABLE_ROLES: { key: string; label: string; description: string }[] = [
  { key: 'MODERATEUR', label: 'Modérateur', description: 'Accès à l’administration' },
  { key: 'PROFESSIONNEL', label: 'Professionnel', description: 'Crée une entreprise et invite des agents' },
  { key: 'AGENT_PROFESSIONNEL', label: 'Agent professionnel', description: 'Publie au nom d’une entreprise' },
];

// Ce qu'implique l'attribution d'un rôle (affiché avant confirmation).
const ROLE_CONSEQUENCES: Record<string, string> = {
  MODERATEUR: "aura accès à l'administration : modération des annonces, signalements, pièces d'identité et comptes utilisateurs.",
  PROFESSIONNEL: 'pourra créer une entreprise, inviter des agents et publier au nom de celle-ci.',
};

// Motifs de rejet les plus fréquents : un appui remplit le champ.
const MOTIFS_REJET_PIECE = [
  'Document illisible',
  'Document expiré',
  'Nom différent de celui du compte',
  'Document incomplet ou recadré',
  // Selfie de vérification (RG-02-30) : le nouvel envoi contient toujours la pièce ET le selfie.
  'Selfie flou ou trop sombre',
  'Visage non visible ou couvert',
  'Pièce non visible sur le selfie',
  'Le visage ne correspond pas à la pièce',
  'Photo d’écran ou photo d’une photo',
];

// Ce que la modération contrôle avant de valider un dossier (RG-02-29).
const CONTROLES_DOSSIER = [
  'Le visage du selfie correspond à la photo de la pièce.',
  'La pièce tenue est bien celle envoyée (même type, même apparence).',
  'Le nom de la pièce correspond à celui du compte.',
  'Le selfie n’est pas une photo d’écran ou la photo d’une photo.',
];

// ─── Modale de rejet pièce ────────────────────────────────────────────────────

function RejetModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (motif: string) => void;
}) {
  const [motif, setMotif] = useState('');
  return (
    <Dialog visible={visible} onRequestClose={onClose} dimColor="rgba(0,0,0,0.5)">
      <View style={s.modalBox}>
        <AppText style={s.modalTitle}>Motif de rejet</AppText>
        <AppText style={s.modalSub}>Expliquez pourquoi la pièce est rejetée.</AppText>
        <View style={s.motifRow}>
          {MOTIFS_REJET_PIECE.map((m) => (
            <Chip key={m} label={m} selected={motif === m} onPress={() => setMotif(m)} tone="danger" />
          ))}
        </View>
        <AppTextInput
          style={s.modalInput}
          placeholder="Ex: Document illisible, expiré..."
          placeholderTextColor={colors.placeholder}
          value={motif}
          onChangeText={setMotif}
          multiline
          numberOfLines={3}
          maxLength={255}
        />
        <View style={s.modalActions}>
          <Button
            title="Annuler"
            variant="outline"
            fullWidth={false}
            style={s.modalBtnCancel}
            onPress={onClose}
          />
          <Button
            title="Rejeter"
            variant="danger"
            fullWidth={false}
            style={s.modalBtnConfirm}
            onPress={() => motif.trim() && onConfirm(motif.trim())}
            disabled={!motif.trim()}
          />
        </View>
      </View>
    </Dialog>
  );
}

// ─── Modale émettre avertissement ─────────────────────────────────────────────

function AvertissementModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (motif: string) => void;
}) {
  const [motif, setMotif] = useState('');
  return (
    <Dialog visible={visible} onRequestClose={onClose} dimColor="rgba(0,0,0,0.5)">
      <View style={s.modalBox}>
        <AppText style={s.modalTitle}>Émettre un avertissement</AppText>
        <AppText style={s.modalSub}>Décrivez le motif de cet avertissement.</AppText>
        <AppTextInput
          style={s.modalInput}
          placeholder="Ex: Comportement inapproprié dans les messages..."
          placeholderTextColor={colors.placeholder}
          value={motif}
          onChangeText={setMotif}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
        <View style={s.modalActions}>
          <Button
            title="Annuler"
            variant="outline"
            fullWidth={false}
            style={s.modalBtnCancel}
            onPress={onClose}
          />
          <Button
            title="Émettre"
            variant="danger"
            fullWidth={false}
            style={s.modalBtnWarn}
            onPress={() => {
              if (motif.trim()) {
                onConfirm(motif.trim());
                setMotif('');
              }
            }}
            disabled={!motif.trim()}
          />
        </View>
      </View>
    </Dialog>
  );
}

// ─── Modale masquage de toutes les annonces ───────────────────────────────────

const MOTIFS_MASQUAGE = [
  'Fraude suspectée',
  'Annonces non conformes',
  'Compte en cours de vérification',
];

function MasquageModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (motif: string) => void;
}) {
  const [motif, setMotif] = useState('');
  return (
    <Dialog visible={visible} onRequestClose={onClose} dimColor="rgba(0,0,0,0.5)">
      <View style={s.modalBox}>
        <AppText style={s.modalTitle}>Masquer toutes ses annonces</AppText>
        <AppText style={s.modalSub}>
          Toutes ses annonces seront retirées du public, sans être modifiées. Il ne pourra plus publier ni modifier jusqu'au réaffichage. Le motif lui est communiqué.
        </AppText>
        <View style={s.motifRow}>
          {MOTIFS_MASQUAGE.map((m) => (
            <Chip key={m} label={m} selected={motif === m} onPress={() => setMotif(m)} tone="danger" />
          ))}
        </View>
        <AppTextInput
          style={s.modalInput}
          placeholder="Motif communiqué au propriétaire"
          placeholderTextColor={colors.placeholder}
          value={motif}
          onChangeText={setMotif}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <View style={s.modalActions}>
          <Button
            title="Annuler"
            variant="outline"
            fullWidth={false}
            style={s.modalBtnCancel}
            onPress={onClose}
          />
          <Button
            title="Masquer"
            variant="danger"
            fullWidth={false}
            style={s.modalBtnConfirm}
            onPress={() => {
              if (motif.trim()) {
                onConfirm(motif.trim());
                setMotif('');
              }
            }}
            disabled={!motif.trim()}
          />
        </View>
      </View>
    </Dialog>
  );
}

// ─── Modale suspension / désactivation ────────────────────────────────────────

const MOTIFS_STATUT = [
  'Fraude avérée',
  'Usurpation d’identité',
  'Avertissements répétés',
  'Comportement abusif',
];

// Effets vérifiés côté API (AuthServiceImpl) : aucun des deux statuts ne permet
// de se connecter, et seul un compte désactivé par l'utilisateur lui-même est réactivable par lui.
const STATUT_CONSEQUENCES: Record<'SUSPENDU' | 'INACTIF', string> = {
  SUSPENDU: 'Il ne pourra plus se connecter tant que le compte n’est pas réactivé.',
  INACTIF: 'Il ne pourra plus se connecter ni réactiver le compte lui-même.',
};

function StatutModal({
  statut,
  onClose,
  onConfirm,
}: {
  /** Statut demandé ; `null` = modale fermée. */
  statut: 'SUSPENDU' | 'INACTIF' | null;
  onClose: () => void;
  onConfirm: (statut: 'SUSPENDU' | 'INACTIF', motif: string) => void;
}) {
  const [motif, setMotif] = useState('');
  const fermer = () => {
    setMotif('');
    onClose();
  };
  const libelle = statut === 'INACTIF' ? 'Désactiver' : 'Suspendre';
  return (
    <Dialog visible={statut != null} onRequestClose={fermer} dimColor="rgba(0,0,0,0.5)">
      <View style={s.modalBox}>
        <AppText style={s.modalTitle}>{libelle} le compte</AppText>
        {statut ? <AppText style={s.modalSub}>{STATUT_CONSEQUENCES[statut]}</AppText> : null}
        <AppText style={s.modalSub}>Le motif est conservé dans la fiche, visible par l’équipe de modération.</AppText>
        <View style={s.motifRow}>
          {MOTIFS_STATUT.map((m) => (
            <Chip key={m} label={m} selected={motif === m} onPress={() => setMotif(m)} tone="danger" />
          ))}
        </View>
        <AppTextInput
          style={s.modalInput}
          placeholder="Motif (obligatoire)"
          placeholderTextColor={colors.placeholder}
          value={motif}
          onChangeText={setMotif}
          multiline
          numberOfLines={3}
          maxLength={500}
          accessibilityLabel="Motif du changement de statut"
        />
        <View style={s.modalActions}>
          <Button
            title="Annuler"
            variant="outline"
            fullWidth={false}
            style={s.modalBtnCancel}
            onPress={fermer}
          />
          <Button
            title={libelle}
            variant="danger"
            fullWidth={false}
            style={s.modalBtnConfirm}
            onPress={() => {
              if (statut && motif.trim()) {
                onConfirm(statut, motif.trim());
                setMotif('');
              }
            }}
            disabled={!motif.trim()}
          />
        </View>
      </View>
    </Dialog>
  );
}

// ─── Ligne avertissement ──────────────────────────────────────────────────────

function formatAvertDate(raw: string): string {
  // Le backend renvoie une précision nanoseconde (9 chiffres) que JS ne supporte pas.
  // On tronque à la milliseconde (3 chiffres) avant de parser.
  const normalized = raw.replace(/(\.\d{3})\d+/, '$1');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function AvertissementRow({ item }: { item: Avertissement }) {
  return (
    <View style={s.avertRow}>
      <View style={s.avertTop}>
        <StatusBadge label={NIVEAU_AVERTISSEMENT_LABELS[item.niveau] ?? item.niveau} tone={NIVEAU_TONE[item.niveau] ?? 'warning'} />
        {item.suspenduAutomatiquement ? (
          <StatusBadge label="Suspension automatique" tone="danger" icon="warning-outline" />
        ) : null}
      </View>
      <AppText style={s.avertMotif}>{item.motif}</AppText>
      <AppText style={s.avertMeta}>par {item.emitPar} · {formatAvertDate(item.date)}</AppText>
    </View>
  );
}

// ─── Écran détail utilisateur ─────────────────────────────────────────────────

export default function AdminUserDetail() {
  // from=pieces : ouvert depuis la file des pièces d'identité, on y revient après décision.
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const retourFileSiBesoin = () => {
    if (from === 'pieces' && router.canGoBack()) router.back();
  };
  const { user: authUser, token } = useAuthStore(useShallow((s) => ({ user: s.user, token: s.token })));
  const {
    currentUser, isLoadingUser, usersError, loadUserById,
    changeUserStatut, changePieceIdentiteStatut,
    avertissements, isLoadingAvertissements, avertissementsError, loadAvertissements, emettrAvertissement,
    octroiRole, revoquerRole, supprimerCompte,
  } = useAdminStore(
    useShallow((s) => ({
      currentUser: s.currentUser,
      isLoadingUser: s.isLoadingUser,
      usersError: s.usersError,
      loadUserById: s.loadUserById,
      changeUserStatut: s.changeUserStatut,
      changePieceIdentiteStatut: s.changePieceIdentiteStatut,
      avertissements: s.avertissements,
      isLoadingAvertissements: s.isLoadingAvertissements,
      avertissementsError: s.avertissementsError,
      loadAvertissements: s.loadAvertissements,
      emettrAvertissement: s.emettrAvertissement,
      octroiRole: s.octroiRole,
      revoquerRole: s.revoquerRole,
      supprimerCompte: s.supprimerCompte,
    })),
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [rejetModalVisible, setRejetModalVisible] = useState(false);
  const [avertModalVisible, setAvertModalVisible] = useState(false);
  const [masquageModalVisible, setMasquageModalVisible] = useState(false);
  const [statutModal, setStatutModal] = useState<'SUSPENDU' | 'INACTIF' | null>(null);
  const [annoncesLoading, setAnnoncesLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [viewingPiece, setViewingPiece] = useState(false);
  const [viewingSelfie, setViewingSelfie] = useState(false);

  const { profile } = useUserStore(useShallow((s) => ({ profile: s.profile })));
  // Même source de rôles que le layout d'administration.
  const { isAdministrateur: isAdmin } = getRoleFlags(profile?.roles ?? profile?.role ?? authUser?.roles);
  // Un modérateur ne peut agir ni sur un admin ni sur un autre modérateur
  const targetIsPrivileged =
    currentUser?.role === 'ADMINISTRATEUR' || currentUser?.role === 'MODERATEUR';
  const canActOnUser = isAdmin || !targetIsPrivileged;
  // Suppression réservée à l'administrateur, jamais sur soi-même ni sur un autre admin.
  const canDeleteAccount =
    isAdmin &&
    !!currentUser &&
    currentUser.role !== 'ADMINISTRATEUR' &&
    currentUser.id !== authUser?.id &&
    currentUser.motifStatut !== COMPTE_ANONYMISE;
  const [deleting, setDeleting] = useState(false);

  const handleSupprimerCompte = () => {
    if (!currentUser) return;
    const estPro = currentUser.role === 'PROFESSIONNEL';
    appAlert(
      'Supprimer ce compte ?',
      (estPro
        ? "Le compte, son entreprise et tous ses agents seront supprimés. "
        : 'Le compte sera supprimé. ')
        + "Annonces, photos, favoris et données personnelles seront effacés immédiatement. "
        + "Les messages sont conservés de façon anonyme.\n\nCette action est irréversible.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await supprimerCompte(currentUser.id);
              goBackOr('/(tabs)/administration/users');
              appAlert('Compte supprimé', estPro
                ? "Le compte, son entreprise et ses agents ont été supprimés."
                : 'Le compte a été supprimé.');
            } catch (e) {
              appAlert("Suppression impossible", getErrorMessage(e, 'Suppression impossible'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (id) {
      loadUserById(id);
      loadAvertissements(id);
    }
  }, [id, loadAvertissements, loadUserById]);

  const appliquerStatut = async (statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF', motif?: string) => {
    if (!currentUser) return;
    setActionLoading(true);
    try {
      await changeUserStatut(currentUser.id, { statut, motif: motif ?? null });
    } catch (e) {
      appAlert("Statut non modifié", getErrorMessage(e, "Le statut du compte n'a pas été modifié."));
    } finally {
      setActionLoading(false);
    }
  };

  // Sanction (suspension, désactivation) : motif obligatoire, comme l'avertissement
  // et le masquage. La réactivation efface le motif.
  const handleChangeStatut = (statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF') => {
    if (!currentUser || !canActOnUser) return;
    if (statut !== 'ACTIF') {
      setStatutModal(statut);
      return;
    }
    appAlert(
      'Réactiver le compte ?',
      'Il pourra de nouveau se connecter. Le motif de la sanction sera effacé.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réactiver', onPress: () => appliquerStatut('ACTIF') },
      ],
    );
  };

  const handleValidePiece = () => {
    if (!currentUser || !canActOnUser) return;
    appAlert('Confirmer', "Valider cette pièce d'identité ?", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Valider',
        onPress: async () => {
          setActionLoading(true);
          try {
            await changePieceIdentiteStatut(currentUser.id, { statut: 'VALIDEE' });
            retourFileSiBesoin();
          } catch (e) {
            appAlert("Pièce non validée", getErrorMessage(e, "La pièce d'identité n'a pas été validée."));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleRejetPiece = async (motif: string) => {
    if (!currentUser) return;
    setRejetModalVisible(false);
    setActionLoading(true);
    try {
      await changePieceIdentiteStatut(currentUser.id, { statut: 'REJETEE', motifRejet: motif });
      retourFileSiBesoin();
    } catch (e) {
      appAlert("Pièce non rejetée", getErrorMessage(e, "La pièce d'identité n'a pas été rejetée."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmettrAvertissement = async (motif: string) => {
    if (!currentUser) return;
    setAvertModalVisible(false);
    try {
      await emettrAvertissement(currentUser.id, { motif });
      appAlert('Avertissement émis', "L'utilisateur a été averti.");
    } catch (e) {
      appAlert("Avertissement non envoyé", getErrorMessage(e, 'Impossible d\'émettre l\'avertissement'));
    }
  };

  const handleMasquerAnnonces = async (motif: string) => {
    if (!currentUser) return;
    setMasquageModalVisible(false);
    setAnnoncesLoading(true);
    try {
      const message = await masquerAnnoncesUtilisateur(currentUser.id, motif);
      await loadUserById(currentUser.id);
      appAlert('Annonces masquées', message);
    } catch (e) {
      appAlert("Annonces non masquées", getErrorMessage(e, 'Impossible de masquer ses annonces'));
    } finally {
      setAnnoncesLoading(false);
    }
  };

  const handleAfficherAnnonces = () => {
    if (!currentUser) return;
    appAlert(
      'Réafficher ses annonces ?',
      'Chaque annonce retrouve sa visibilité d\'avant le masquage (celles qu\'il avait masquées ou clôturées restent hors ligne). Il pourra de nouveau publier et modifier.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réafficher',
          onPress: async () => {
            setAnnoncesLoading(true);
            try {
              const message = await afficherAnnoncesUtilisateur(currentUser.id);
              await loadUserById(currentUser.id);
              appAlert('Annonces réaffichées', message);
            } catch (e) {
              appAlert("Annonces non réaffichées", getErrorMessage(e, 'Impossible de réafficher ses annonces'));
            } finally {
              setAnnoncesLoading(false);
            }
          },
        },
      ],
    );
  };

  // Changer un rôle modifie les droits d'accès : jamais sur un simple appui.
  const handleToggleRole = (roleKey: string, hasRole: boolean) => {
    if (!currentUser || !isAdmin) return;
    const nom = [currentUser.prenom, currentUser.nom].filter(Boolean).join(' ') || currentUser.email;
    const libelle = ASSIGNABLE_ROLES.find((r) => r.key === roleKey)?.label ?? roleKey;
    const consequence = ROLE_CONSEQUENCES[roleKey];
    appAlert(
      hasRole ? `Retirer le rôle ${libelle} ?` : `Attribuer le rôle ${libelle} ?`,
      hasRole
        ? `${nom} perdra les droits associés à ce rôle.`
        : `${nom}${consequence ? ` ${consequence}` : ' recevra les droits associés à ce rôle.'}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: hasRole ? 'Retirer' : 'Attribuer',
          style: hasRole || roleKey === 'MODERATEUR' ? 'destructive' : 'default',
          onPress: async () => {
            setRoleLoading(roleKey);
            try {
              if (hasRole) {
                await revoquerRole(currentUser.id, roleKey);
              } else {
                await octroiRole(currentUser.id, roleKey);
              }
            } catch (e) {
              appAlert("Rôle non modifié", getErrorMessage(e, "Le rôle n'a pas été modifié."));
            } finally {
              setRoleLoading(null);
            }
          },
        },
      ],
    );
  };

  if (isLoadingUser) return <View style={s.page}><LoadingState /></View>;

  if (usersError || !currentUser) {
    return (
      <View style={s.page}>
        <ErrorState message={usersError ?? 'Utilisateur introuvable.'} onRetry={() => id && loadUserById(id)} />
      </View>
    );
  }

  const u = currentUser;
  const statut = u.statut as StatutUtilisateur;
  const fullName = [u.prenom, u.nom].filter(Boolean).join(' ') || u.email;
  const roleLabel = u.role ? getRoleLabel(`ROLE_${u.role}`) : null;

  // Pièce en attente : c'est l'action attendue, elle passe en tête de page.
  const pieceEnAttente = u.statutPieceIdentite === 'EN_ATTENTE';
  const pieceUri = `${API_BASE_URL}/api/users/${u.id}/piece-identite?v=${encodeURIComponent(u.numeroPieceIdentite ?? '')}`;
  const selfieUri = `${API_BASE_URL}/api/users/${u.id}/selfie?v=${encodeURIComponent(u.dateEnvoiVerification ?? '')}`;
  const selfieFourni = Boolean(u.selfieFourni);
  const dossierComplet = selfieFourni;
  const pieceSection = u.typePieceIdentite ? (
    <Section title="Pièce d'identité">
      {/* Nom déclaré à côté du document : comparaison directe. */}
      <FieldRow label="Nom déclaré" value={fullName} />
      <FieldRow label="Type" value={TYPE_PIECE_LABELS[u.typePieceIdentite]} />
      <FieldRow label="Numéro" value={u.numeroPieceIdentite} />
      <FieldRow
        label="Statut"
        value={<StatusBadge label={STATUT_PIECE_LABELS[u.statutPieceIdentite!]} tone={PIECE_TONE[u.statutPieceIdentite!]} />}
        last={!u.motifRejetPieceIdentite}
      />
      <FieldRow label="Motif du rejet" value={u.motifRejetPieceIdentite} last />
      {u.dateEnvoiVerification ? (
        <FieldRow label="Envoyé le" value={new Date(u.dateEnvoiVerification).toLocaleString('fr-FR')} />
      ) : null}
      {!selfieFourni ? (
        <FieldRow label="Selfie" value={<StatusBadge label="Selfie manquant" tone="warning" icon="alert-circle" />} />
      ) : null}
      <View style={s.pieceBody}>
        {/* Pièce et selfie côte à côte, avec zoom : comparaison directe (RG-02-29). */}
        <View style={s.pieceDuo}>
          <TouchableOpacity
            style={s.flex}
            onPress={() => setViewingPiece(true)}
            activeOpacity={0.85}
            accessibilityRole="imagebutton"
            accessibilityLabel="Agrandir la pièce d'identité"
          >
            <AppText style={s.pieceLegende}>Pièce</AppText>
            <Image
              source={{ uri: pieceUri, headers: { Authorization: `Bearer ${token}` } }}
              style={s.pieceImage}
              contentFit="contain"
            />
            <View style={s.pieceImageOverlay}>
              <Ionicons name="expand-outline" size={16} color={colors.white} />
              <AppText style={s.pieceImageOverlayText}>Agrandir</AppText>
            </View>
          </TouchableOpacity>
          {selfieFourni ? (
            <TouchableOpacity
              style={s.flex}
              onPress={() => setViewingSelfie(true)}
              activeOpacity={0.85}
              accessibilityRole="imagebutton"
              accessibilityLabel="Agrandir le selfie"
            >
              <AppText style={s.pieceLegende}>Selfie</AppText>
              <Image
                source={{ uri: selfieUri, headers: { Authorization: `Bearer ${token}` } }}
                style={s.pieceImage}
                contentFit="contain"
              />
              <View style={s.pieceImageOverlay}>
                <Ionicons name="expand-outline" size={16} color={colors.white} />
                <AppText style={s.pieceImageOverlayText}>Agrandir</AppText>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
        {canActOnUser && pieceEnAttente ? (
          <View style={s.controles}>
            <AppText style={s.controlesTitre}>À vérifier avant de valider</AppText>
            {CONTROLES_DOSSIER.map((c) => (
              <View key={c} style={s.controle}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.textSecondary} />
                <AppText style={s.controleTexte}>{c}</AppText>
              </View>
            ))}
          </View>
        ) : null}
        {canActOnUser && pieceEnAttente ? (
          <View style={s.twoButtons}>
            <Button
              title="Rejeter"
              variant="dangerOutline"
              size="sm"
              fullWidth={false}
              style={s.flex}
              leftIcon={<Ionicons name="close-circle-outline" size={16} color={colors.errorText} />}
              onPress={() => setRejetModalVisible(true)}
              disabled={actionLoading}
            />
            <Button
              title="Valider"
              size="sm"
              fullWidth={false}
              style={s.flex}
              leftIcon={<Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />}
              onPress={handleValidePiece}
              disabled={!dossierComplet}
              isLoading={actionLoading}
            />
          </View>
        ) : null}
      </View>
    </Section>
  ) : null;

  return (
    <>
      <RejetModal
        visible={rejetModalVisible}
        onClose={() => setRejetModalVisible(false)}
        onConfirm={handleRejetPiece}
      />
      <AvertissementModal
        visible={avertModalVisible}
        onClose={() => setAvertModalVisible(false)}
        onConfirm={handleEmettrAvertissement}
      />
      <MasquageModal
        visible={masquageModalVisible}
        onClose={() => setMasquageModalVisible(false)}
        onConfirm={handleMasquerAnnonces}
      />
      <StatutModal
        statut={statutModal}
        onClose={() => setStatutModal(null)}
        onConfirm={(statut, motif) => {
          setStatutModal(null);
          appliquerStatut(statut, motif);
        }}
      />
      <ScrollView style={s.page} contentContainerStyle={[s.content, webColumn]}>

        {/* En-tête : identité et état du compte */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <Avatar name={fullName} size={56} />
            <View style={s.headerBody}>
              <AppText style={s.fullName} numberOfLines={2}>{fullName}</AppText>
              <AppText style={s.email} numberOfLines={1} selectable>{u.email}</AppText>
            </View>
          </View>
          <View style={s.badges}>
            <StatusBadge label={STATUT_USER_LABELS[statut]} tone={USER_STATUT_TONE[statut]} />
            {roleLabel ? <StatusBadge label={roleLabel} tone="primary" /> : null}
            {u.nbAvertissements > 0 ? (
              <StatusBadge
                label={`${u.nbAvertissements} avertissement${u.nbAvertissements > 1 ? 's' : ''}`}
                tone="warning"
                icon="warning-outline"
              />
            ) : null}
          </View>
          {statut !== 'ACTIF' && u.motifStatut ? (
            <AppText style={s.motifStatut}>Motif : {u.motifStatut}</AppText>
          ) : null}
        </View>

        {!canActOnUser ? (
          <View style={s.lockNotice}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.warningText} />
            <AppText style={s.lockText}>Lecture seule : action réservée à l’administrateur.</AppText>
          </View>
        ) : null}

        {pieceEnAttente && pieceSection}

        {/* Statut : choix exclusif, la sanction passe par une modale avec motif */}
        {canActOnUser && (
          <Section title="Statut du compte" padded>
            <View style={s.segmented} accessibilityRole="radiogroup">
              {(['ACTIF', 'SUSPENDU', 'INACTIF'] as const).map((st) => {
                const selected = u.statut === st;
                const tone = TONES[USER_STATUT_TONE[st]];
                return (
                  <TouchableOpacity
                    key={st}
                    style={[s.segment, selected && { backgroundColor: colors.white, borderColor: tone.dot }]}
                    onPress={() => !selected && handleChangeStatut(st)}
                    disabled={selected || actionLoading}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: actionLoading }}
                  >
                    {selected ? <View style={[s.segmentDot, { backgroundColor: tone.dot }]} /> : null}
                    <AppText style={[s.segmentText, selected && { color: tone.fg, fontWeight: '700' }]}>
                      {STATUT_USER_LABELS[st]}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            {actionLoading ? <ActivityIndicator color={colors.primary} /> : null}
          </Section>
        )}

        {/* Rôle (admin uniquement) : un seul rôle par compte */}
        {isAdmin && (
          <Section title="Rôle" footer="Appuyez sur un rôle pour l'attribuer ; sur le rôle actuel pour le retirer.">
            {ASSIGNABLE_ROLES.map(({ key, label, description }, i) => {
              const has = u.role === key;
              const isLoading = roleLoading === key;
              return (
                <View key={key}>
                  {i > 0 && <RowSeparator inset={spacing.base} />}
                  <TouchableOpacity
                    style={s.roleRow}
                    onPress={() => handleToggleRole(key, has)}
                    disabled={isLoading}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: has, busy: isLoading }}
                    accessibilityLabel={`${label}, ${description}`}
                  >
                    <View style={s.flex}>
                      <AppText style={[s.roleLabel, has && s.roleLabelActive]}>{label}</AppText>
                      <AppText style={s.roleDesc}>{description}</AppText>
                    </View>
                    {isLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons
                        name={has ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={has ? colors.primary : colors.placeholder}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </Section>
        )}

        <Section title="Informations">
          <FieldRow label="Téléphone" value={u.telephone} />
          <FieldRow label="Type" value={u.type} />
          <FieldRow label="Entreprise" value={u.entrepriseNom} />
          <FieldRow label="Compte parent" value={u.parentUsername} />
          <FieldRow
            label="Créé le"
            value={new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            last
          />
        </Section>

        {!pieceEnAttente && pieceSection}

        <Section
          title={`Avertissements (${u.nbAvertissements})`}
          trailing={
            <TouchableOpacity onPress={() => setAvertModalVisible(true)} hitSlop={8} accessibilityRole="button">
              <AppText style={s.sectionAction}>Émettre</AppText>
            </TouchableOpacity>
          }
        >
          {isLoadingAvertissements ? (
            <ActivityIndicator color={colors.primary} style={s.inlineLoader} />
          ) : avertissementsError ? (
            // Ne pas afficher « aucun avertissement » quand la liste n'a pas pu être chargée.
            <ErrorBanner message={avertissementsError} onRetry={() => id && loadAvertissements(id)} />
          ) : (avertissements ?? []).length === 0 ? (
            <AppText style={s.vide}>Aucun avertissement enregistré.</AppText>
          ) : (
            (avertissements ?? []).map((a, i) => (
              <View key={a.id}>
                {i > 0 && <RowSeparator inset={spacing.base} />}
                <AvertissementRow item={a} />
              </View>
            ))
          )}
        </Section>

        <Section title="Annonces">
          <ListRow
            leading={<Ionicons name="home-outline" size={18} color={colors.primary} />}
            title="Voir ses annonces"
            onPress={() => router.push({ pathname: '/(tabs)/administration/annonces', params: { q: u.email } } as any)}
          />
          {/* Masquage système (admin uniquement) : ce compte seul, pas son entreprise.
              Les annonces ne sont pas modifiées, seul le drapeau du compte change. */}
          {isAdmin && u.role !== 'ADMINISTRATEUR' ? (
            <View style={s.masquage}>
              {u.annoncesMasquees ? (
                <View style={s.masqueNotice}>
                  <StatusBadge label="Masquées par la modération" tone="danger" icon="eye-off-outline" />
                  <AppText style={s.masqueText}>
                    {[
                      u.dateMasquageAnnonces ? `Depuis le ${formatAvertDate(u.dateMasquageAnnonces)}` : null,
                      u.motifMasquageAnnonces,
                    ].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
              ) : null}
              <Button
                title={u.annoncesMasquees ? 'Réafficher ses annonces' : 'Masquer toutes ses annonces'}
                variant={u.annoncesMasquees ? 'secondary' : 'dangerOutline'}
                size="sm"
                leftIcon={
                  <Ionicons
                    name={u.annoncesMasquees ? 'eye-outline' : 'eye-off-outline'}
                    size={16}
                    color={u.annoncesMasquees ? colors.primary : colors.errorText}
                  />
                }
                onPress={u.annoncesMasquees ? handleAfficherAnnonces : () => setMasquageModalVisible(true)}
                isLoading={annoncesLoading}
              />
              {u.role === 'PROFESSIONNEL' ? (
                <AppText style={s.hint}>Les annonces de ses agents ne sont pas concernées.</AppText>
              ) : null}
            </View>
          ) : null}
        </Section>

        {/* Zone sensible : suppression définitive du compte (administrateur) */}
        {canDeleteAccount && (
          <Section
            title="Zone sensible"
            padded
            footer={currentUser?.role === 'PROFESSIONNEL'
              ? 'Supprime le compte, son entreprise et tous ses agents, avec leurs annonces et photos.'
              : 'Supprime le compte avec ses annonces, photos et favoris.'}
          >
            <Button
              title="Supprimer le compte"
              variant="dangerOutline"
              size="sm"
              leftIcon={<Ionicons name="trash-outline" size={16} color={colors.errorText} />}
              onPress={handleSupprimerCompte}
              isLoading={deleting}
            />
          </Section>
        )}

      </ScrollView>

      {/* ── Visualisation du selfie ── */}
      <FullscreenOverlay
        visible={viewingSelfie}
        onRequestClose={() => setViewingSelfie(false)}
        backgroundColor="rgba(0,0,0,0.92)"
      >
        <View style={s.pieceModal}>
          <TouchableOpacity style={s.pieceModalClose} onPress={() => setViewingSelfie(false)} accessibilityRole="button" accessibilityLabel="Fermer le selfie">
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <Image
            source={{ uri: selfieUri, headers: { Authorization: `Bearer ${token}` } }}
            style={s.pieceModalImage}
            contentFit="contain"
          />
        </View>
      </FullscreenOverlay>

      {/* ── Visualisation pièce d'identité ── */}
      <FullscreenOverlay
        visible={viewingPiece}
        onRequestClose={() => setViewingPiece(false)}
        backgroundColor="rgba(0,0,0,0.92)"
      >
        <View style={s.pieceModal}>
          <TouchableOpacity style={s.pieceModalClose} onPress={() => setViewingPiece(false)} accessibilityRole="button" accessibilityLabel="Fermer le document">
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <Image
            source={{ uri: pieceUri, headers: { Authorization: `Bearer ${token}` } }}
            style={s.pieceModalImage}
            contentFit="contain"
          />
        </View>
      </FullscreenOverlay>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing['4xl'] },
  flex: { flex: 1 },

  // En-tête
  header: {
    gap: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerBody: { flex: 1, gap: 2 },
  fullName: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.textPrimary },
  email: { fontSize: typography.sizes.sm, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  motifStatut: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warningLight,
  },
  lockText: { flex: 1, fontSize: typography.sizes.xs, color: colors.warningText, fontWeight: '600' },

  // Statut (contrôle segmenté)
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: radius.sm - 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentDot: { width: 8, height: 8, borderRadius: 4 },
  segmentText: { fontSize: typography.sizes.sm, color: colors.textSecondary, fontWeight: '600' },

  // Rôle
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  roleLabel: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  roleLabelActive: { color: colors.primary, fontWeight: '800' },
  roleDesc: { fontSize: typography.sizes.xs, color: colors.textMuted },

  // Pièce d'identité
  pieceBody: { padding: spacing.base, gap: spacing.md },
  pieceDuo: { flexDirection: 'row', gap: spacing.sm },
  pieceLegende: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  controles: { gap: 4, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.background },
  controlesTitre: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary },
  controle: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  controleTexte: { flex: 1, fontSize: typography.sizes.xs, color: colors.textSecondary, lineHeight: 17 },
  pieceImage: { width: '100%', height: 200, borderRadius: radius.sm, backgroundColor: colors.background },
  pieceImageOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  pieceImageOverlayText: { color: colors.white, fontSize: typography.sizes.xs, fontWeight: '600' },
  pieceModal: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pieceModalClose: {
    position: 'absolute', top: 48, right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full, padding: 8,
  },
  pieceModalImage: { width: '100%', height: '75%' },
  twoButtons: { flexDirection: 'row', gap: spacing.sm },

  // Avertissements
  sectionAction: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.primary },
  inlineLoader: { marginVertical: spacing.base },
  vide: { fontSize: typography.sizes.sm, color: colors.textMuted, padding: spacing.base },
  avertRow: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: 4 },
  avertTop: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  avertMotif: { fontSize: typography.sizes.sm, color: colors.textPrimary },
  avertMeta: { fontSize: typography.sizes.xs, color: colors.textMuted },

  // Annonces
  masquage: {
    padding: spacing.base,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  masqueNotice: { gap: 4 },
  masqueText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  hint: { fontSize: typography.sizes.xs, color: colors.textMuted },

  // Modales communes
  modalBox: { width: '85%', backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  modalSub: { fontSize: typography.sizes.sm, color: colors.textMuted },
  motifRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: typography.sizes.md, color: colors.textPrimary,
    textAlignVertical: 'top', minHeight: 80,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtnCancel: { flex: 1 },
  modalBtnConfirm: { flex: 1 },
  modalBtnWarn: { flex: 1 },
});
