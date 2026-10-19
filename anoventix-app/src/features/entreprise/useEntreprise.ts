import { renvoyerInvitation } from '@/src/api/entreprise.api';
import { toJpegUpload } from '@/src/lib/images';
import { getRoleFlags } from '@/src/lib/roles';
import {
    AgentFormData,
    EntrepriseFormData,
    agentSchema,
    entrepriseSchema,
} from '@/src/lib/validation';
import { useAuthStore } from '@/src/stores/auth.store';
import { useEntrepriseStore } from '@/src/stores/entreprise.store';
import { useUserStore } from '@/src/stores/user.store';
import type { AgentDTO } from '@/src/types/entreprise.types';
import { getErrorMessage } from '@/src/utils/format';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { appAlert } from '@/src/components/ui/app-alert';

export function useEntreprise() {
  // Sélecteurs scopés : évite les re-renders quand un flag non lié change
  // ailleurs dans auth/user (token refresh, etc.) — sinon, jitter scroll
  // Android par recomposition d'ombres.
  const user = useAuthStore((s) => s.user);
  const profile = useUserStore((s) => s.profile);

  const entreprise = useEntrepriseStore((s) => s.entreprise);
  const annonces = useEntrepriseStore((s) => s.annonces);
  const isLoading = useEntrepriseStore((s) => s.isLoading);
  const isSaving = useEntrepriseStore((s) => s.isSaving);
  const error = useEntrepriseStore((s) => s.error);

  const fetchByUserId = useEntrepriseStore((s) => s.fetchByUserId);
  const fetchById = useEntrepriseStore((s) => s.fetchById);
  const fetchAnnonces = useEntrepriseStore((s) => s.fetchAnnonces);
  const fetchAgents = useEntrepriseStore((s) => s.fetchAgents);
  const createEntreprise = useEntrepriseStore((s) => s.createEntreprise);
  const updateEntreprise = useEntrepriseStore((s) => s.updateEntreprise);
  const uploadPhoto = useEntrepriseStore((s) => s.uploadPhoto);
  const deleteEntreprise = useEntrepriseStore((s) => s.deleteEntreprise);
  const addAgent = useEntrepriseStore((s) => s.addAgent);
  const suspendAgent = useEntrepriseStore((s) => s.suspendAgent);
  const activateAgent = useEntrepriseStore((s) => s.activateAgent);
  const removeAgent = useEntrepriseStore((s) => s.removeAgent);
  const clearError = useEntrepriseStore((s) => s.clearError);

  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removingAgentId, setRemovingAgentId] = useState<string | null>(null);
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  // Message dédié au formulaire d'invitation d'agent (affiché DANS la carte,
  // pas en haut de page) — corrige l'UX des messages de validation/confirmation.
  const [agentFormMessage, setAgentFormMessage] = useState<
    { type: 'error' | 'success'; text: string } | null
  >(null);
  // Retour des actions sur les agents, affiché au-dessus de leur liste (en bas
  // de page) : une bannière en haut de l'écran resterait hors de vue.
  const [agentsFeedback, setAgentsFeedback] = useState<
    { type: 'error' | 'success'; text: string } | null
  >(null);
  const [annonceReferenceFilter, setAnnonceReferenceFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const roles = profile?.roles ?? profile?.role ?? user?.roles ?? [];
  const effectiveUserId = user?.id ?? profile?.id;
  const { canManageEntreprise, isAgentProfessionnel, canAccessEntreprise } = getRoleFlags(roles);
  const canViewAgents = canManageEntreprise || isAgentProfessionnel;
  const canToggleAgents = canManageEntreprise;

  // Chargement au focus, mais skip si la bonne entreprise est déjà en mémoire.
  const loadedEntrepriseId = entreprise?.id;
  const loadedProprietaireId = entreprise?.proprietaireId;
  useFocusEffect(
    useCallback(() => {
      const targetId = profile?.entrepriseId;
      if (targetId) {
        if (loadedEntrepriseId === targetId) return;
        fetchById(targetId);
      } else if (effectiveUserId) {
        if (loadedProprietaireId === effectiveUserId) return;
        fetchByUserId(effectiveUserId);
      }
    }, [profile?.entrepriseId, effectiveUserId, loadedEntrepriseId, loadedProprietaireId, fetchById, fetchByUserId]),
  );

  // Pull-to-refresh : recharge annonces + agents de l'entreprise courante.
  // Indispensable car le chargement au focus est court-circuité quand
  // l'entreprise est déjà en mémoire (une annonce créée n'apparaîtrait pas).
  const onRefresh = useCallback(async () => {
    const id = loadedEntrepriseId;
    if (!id) return;
    setIsRefreshing(true);
    try {
      await Promise.all([fetchAnnonces(id), fetchAgents(id)]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadedEntrepriseId, fetchAnnonces, fetchAgents]);

  // ── Formulaire Entreprise ────────────────────────────────────────────────
  const entrepriseForm = useForm<EntrepriseFormData>({
    resolver: zodResolver(entrepriseSchema),
    defaultValues: {
      nom: entreprise?.nom ?? '',
      description: entreprise?.description ?? '',
      telephone: entreprise?.telephone ?? '',
      email: entreprise?.email ?? '',
      adresse: entreprise?.adresse ?? '',
      numeroRCCM: entreprise?.numeroRCCM ?? '',
    },
  });

  // ── Formulaire Agent ─────────────────────────────────────────────────────
  const agentForm = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    mode: 'onTouched',
    defaultValues: { nom: '', prenom: '', email: '', telephone: '' },
  });

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleUploadPhoto = async () => {
    if (!entreprise) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      // iOS : exporter en JPEG plutôt qu'en HEIC (format illisible côté serveur).
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      // JPEG garanti (photos iPhone en HEIC illisibles côté serveur).
      await uploadPhoto(entreprise.id, await toJpegUpload(asset, { baseName: 'entreprise' }));
      flash('Photo mise à jour !');
    } catch {
      appAlert("Photo non mise à jour", 'Impossible de mettre à jour la photo.');
    }
  };

  const handleDeleteEntreprise = () => {
    if (!entreprise) return;
    appAlert(
      'Désactiver l\'entreprise',
      `Voulez-vous désactiver "${entreprise.nom}" ? Ses agents et ses annonces ne seront plus rattachés à une entreprise active, et vous ne pourrez pas la réactiver vous-même : il faudra contacter le support.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntreprise(entreprise.id);
            } catch {
              appAlert("Désactivation impossible", "Impossible de désactiver l'entreprise.");
            }
          },
        },
      ],
    );
  };

  const filteredAnnonces = useMemo(() => {
    const query = annonceReferenceFilter.trim().toLowerCase();
    if (!query) return annonces;
    return annonces.filter((annonce) =>
      annonce.referenceAnnonce?.toLowerCase().includes(query) ||
      annonce.titre?.toLowerCase().includes(query),
    );
  }, [annonces, annonceReferenceFilter]);

  // ── Soumission création / édition entreprise ─────────────────────────────
  const onSubmitEntreprise = async (data: EntrepriseFormData) => {
    clearError();
    const payload = {
      nom: data.nom,
      description: data.description || undefined,
      telephone: data.telephone || undefined,
      email: data.email || undefined,
      adresse: data.adresse || undefined,
      numeroRCCM: data.numeroRCCM || undefined,
    };
    try {
      if (entreprise) {
        await updateEntreprise(entreprise.id, payload);
        flash('Entreprise mise à jour !');
        setEditOpen(false);
      } else {
        const created = await createEntreprise(payload);
        entrepriseForm.reset({
          nom: created.nom,
          description: created.description ?? '',
          telephone: created.telephone ?? '',
          email: created.email ?? '',
          adresse: created.adresse ?? '',
          numeroRCCM: created.numeroRCCM ?? '',
        });
        flash('Entreprise créée avec succès !');
      }
    } catch {
      // error déjà stockée dans le store
    }
  };

  // ── Soumission invitation agent ──────────────────────────────────────────
  const onSubmitAgent = async (data: AgentFormData) => {
    if (!entreprise) return;
    clearError();
    setAgentFormMessage(null);
    try {
      await addAgent(entreprise.id, {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone || undefined,
      });
      agentForm.reset();
      // Succès : on ferme le formulaire et on confirme via une alerte. Le nouvel
      // agent apparaît dans la liste juste en dessous.
      setAgentFormMessage(null);
      setInviteOpen(false);
      appAlert(
        'Agent ajouté',
        `${data.prenom} ${data.nom} a été ajouté. Un email d'invitation lui a été envoyé : il y choisira son mot de passe.`,
      );
    } catch (err) {
      // On efface l'erreur globale (en haut de page) pour n'afficher le message
      // qu'au plus près du champ / du formulaire concerné.
      clearError();
      const msg = getErrorMessage(err, "Impossible d'inviter l'agent.");
      // On route le message sous le bon champ selon ce qu'il évoque (téléphone
      // avant e-mail, car « déjà utilisé » est ambigu et apparaît dans les deux).
      if (/t[ée]l[ée]phone|num[ée]ro|phone/i.test(msg)) {
        agentForm.setError('telephone', { message: msg });
      } else if (/e-?mail|courriel|adresse|registered|already/i.test(msg)) {
        agentForm.setError('email', { message: msg });
      } else {
        setAgentFormMessage({ type: 'error', text: msg });
      }
    }
  };

  // ── Suppression agent ────────────────────────────────────────────────────
  const handleRemoveAgent = (agent: AgentDTO) => {
    appAlert(
      'Retirer l\'agent',
      `Voulez-vous retirer ${agent.prenom ?? ''} ${agent.nom ?? agent.email} ? Son compte sera désactivé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            if (!entreprise) return;
            setRemovingAgentId(agent.id);
            setAgentsFeedback(null);
            try {
              await removeAgent(entreprise.id, agent.id);
              setAgentsFeedback({ type: 'success', text: 'Agent retiré.' });
            } catch (err) {
              clearError();
              setAgentsFeedback({ type: 'error', text: getErrorMessage(err, "Impossible de retirer l'agent.") });
            } finally {
              setRemovingAgentId(null);
            }
          },
        },
      ],
    );
  };

  const handleResendInvitation = async (agent: AgentDTO) => {
    if (!entreprise) return;
    setAgentsFeedback(null);
    try {
      await renvoyerInvitation(entreprise.id, agent.id);
      setAgentsFeedback({ type: 'success', text: `Une nouvelle invitation a été envoyée à ${agent.email}.` });
    } catch (err) {
      clearError();
      setAgentsFeedback({ type: 'error', text: getErrorMessage(err, "Impossible de renvoyer l'invitation.") });
    }
  };

  const handleToggleAgentStatus = (agent: AgentDTO) => {
    if (!entreprise) return;

    // Même règle que la carte agent (parts.tsx) : un agent en attente est suspendable.
    const isActive = agent.statut === 'ACTIF' || agent.statut === 'EN_ATTENTE_ACTIVATION';
    const actionLabel = isActive ? 'suspendre' : 'activer';
    const successLabel = isActive ? 'Agent suspendu.' : 'Agent activé.';

    appAlert(
      isActive ? 'Suspendre l\'agent' : 'Activer l\'agent',
      `Voulez-vous ${actionLabel} ${agent.prenom ?? ''} ${agent.nom ?? agent.email} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isActive ? 'Suspendre' : 'Activer',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            setTogglingAgentId(agent.id);
            setAgentsFeedback(null);
            try {
              if (isActive) {
                await suspendAgent(entreprise.id, agent.id);
              } else {
                await activateAgent(entreprise.id, agent.id);
              }
              setAgentsFeedback({ type: 'success', text: successLabel });
            } catch (err) {
              clearError();
              setAgentsFeedback({ type: 'error', text: getErrorMessage(err, `Impossible de ${actionLabel} l'agent.`) });
            } finally {
              setTogglingAgentId(null);
            }
          },
        },
      ],
    );
  };

  return {
    entreprise,
    annonces,
    isLoading,
    isSaving,
    error,
    successMsg,
    editOpen,
    setEditOpen,
    inviteOpen,
    setInviteOpen,
    agentFormMessage,
    setAgentFormMessage,
    agentsFeedback,
    removingAgentId,
    togglingAgentId,
    annonceReferenceFilter,
    setAnnonceReferenceFilter,
    isRefreshing,
    onRefresh,
    canManageEntreprise,
    isAgentProfessionnel,
    canAccessEntreprise,
    canViewAgents,
    canToggleAgents,
    entrepriseForm,
    agentForm,
    handleUploadPhoto,
    handleDeleteEntreprise,
    filteredAnnonces,
    onSubmitEntreprise,
    onSubmitAgent,
    handleRemoveAgent,
    handleToggleAgentStatus,
    handleResendInvitation,
  };
}
