import { appAlert } from '@/src/components/ui/app-alert';
import { useAdminStore } from '@/src/stores/admin.store';
import { getErrorMessage } from '@/src/utils/format';

// Décisions sur un message signalé, partagées par la file et la vue conversation.

/** Signalement infondé : le message reste visible et sort de la file. */
export function confirmerMessageConforme(messageId: number) {
  appAlert(
    'Message conforme ?',
    'Le signalement sera classé et le message conservé tel quel.',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Conforme',
        onPress: async () => {
          try {
            await useAdminStore.getState().ignorerSignalementMessage(messageId);
          } catch (e) {
            appAlert("Signalement non classé", getErrorMessage(e, 'Impossible de classer ce signalement.'));
          }
        },
      },
    ],
  );
}

export function confirmerSuppressionMessage(messageId: number) {
  appAlert(
    'Supprimer ce message ?',
    'Le contenu sera remplacé par « Message supprimé par la modération » pour les deux participants.',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await useAdminStore.getState().supprimerMessage(messageId);
          } catch (e) {
            appAlert("Message non supprimé", getErrorMessage(e, 'Impossible de supprimer ce message.'));
          }
        },
      },
    ],
  );
}
