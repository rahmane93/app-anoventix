import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as notificationApi from '@/src/api/notification.api';

// ─── Notifications push (DEC-13, RG-06-22, RG-06-23) ─────────────────────────
// Android uniquement. La permission est demandée au premier message envoyé ou reçu, pas au lancement.
// Le jeton de l'appareil est enregistré à la connexion et retiré à la déconnexion.

const CLE_JETON = 'push.jeton';
const CLE_PERMISSION_DEMANDEE = 'push.permissionDemandee';

const actif = () => Platform.OS === 'android' && Device.isDevice;

/** Conversation affichée à l'écran : ses notifications ne s'affichent pas par-dessus (RG-06-22). */
let conversationOuverte: string | null = null;
export const definirConversationOuverte = (id: string | number | null): void => {
  conversationOuverte = id == null ? null : String(id);
};

let gestionnaireInstalle = false;

/** À appeler une fois au démarrage : règle l'affichage des notifications reçues app ouverte. */
export function installerGestionnaire(): void {
  if (gestionnaireInstalle || Platform.OS !== 'android') return;
  gestionnaireInstalle = true;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as { conversationId?: number | string } | undefined;
      const dejaALEcran = data?.conversationId != null && String(data.conversationId) === conversationOuverte;
      return {
        shouldShowBanner: !dejaALEcran,
        shouldShowList: !dejaALEcran,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
  });
  Notifications.setNotificationChannelAsync('default', {
    name: 'Messages et alertes',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  }).catch(() => {});
}

async function lireJeton(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

async function enregistrerJeton(): Promise<void> {
  const jeton = await lireJeton();
  if (!jeton) return;
  await notificationApi.enregistrerAppareil(jeton);
  await AsyncStorage.setItem(CLE_JETON, jeton);
}

/** À la connexion : enregistre l'appareil si la permission est déjà accordée (sans jamais la demander). */
export async function enregistrerSiAutorise(): Promise<void> {
  if (!actif()) return;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (granted) await enregistrerJeton();
  } catch {
    // Les notifications ne doivent jamais gêner la connexion.
  }
}

/** Au premier message envoyé ou reçu : demande la permission (une seule fois), puis enregistre l'appareil. */
export async function demanderPermissionEtEnregistrer(): Promise<void> {
  if (!actif()) return;
  try {
    const actuel = await Notifications.getPermissionsAsync();
    if (actuel.granted) {
      await enregistrerJeton();
      return;
    }
    if (!actuel.canAskAgain || (await AsyncStorage.getItem(CLE_PERMISSION_DEMANDEE))) return;
    await AsyncStorage.setItem(CLE_PERMISSION_DEMANDEE, '1');
    const res = await Notifications.requestPermissionsAsync();
    if (res.granted) await enregistrerJeton();
  } catch {
    // idem
  }
}

/** À la déconnexion : retire l'appareil du compte. */
export async function desenregistrer(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const jeton = await AsyncStorage.getItem(CLE_JETON);
    if (jeton) {
      await notificationApi.retirerAppareil(jeton);
      await AsyncStorage.removeItem(CLE_JETON);
    }
  } catch {
    // Un jeton non retiré sera supprimé par le serveur quand le service le déclarera invalide.
  }
}

type Donnees = { type?: string; conversationId?: number | string; alerteId?: number | string };

/** Ouverture d'une notification : mène à la conversation ou à la liste des nouvelles annonces de l'alerte. */
export function ouvrirNotification(donnees: Donnees | undefined): void {
  if (!donnees) return;
  if (donnees.type === 'message' && donnees.conversationId != null) {
    router.push({ pathname: '/conversation/[conversationId]', params: { conversationId: String(donnees.conversationId) } } as never);
  } else if (donnees.type === 'alerte' && donnees.alerteId != null) {
    router.push({ pathname: '/alertes', params: { ouvrir: String(donnees.alerteId) } } as never);
  }
}
