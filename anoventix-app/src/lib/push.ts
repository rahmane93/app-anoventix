import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type * as NotificationsModule from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as notificationApi from '@/src/api/notification.api';

// ─── Notifications push (DEC-13, RG-06-22, RG-06-23) ─────────────────────────
// Android uniquement. La permission est demandée au premier message envoyé ou reçu, pas au lancement.
// Le jeton de l'appareil est enregistré à la connexion et retiré à la déconnexion.

const CLE_JETON = 'push.jeton';
const CLE_PERMISSION_DEMANDEE = 'push.permissionDemandee';

// Expo Go (Android, SDK 53+) n'embarque pas le module natif des notifications push : on ne le charge pas.
const dansExpoGo = Constants.executionEnvironment === 'storeClient';

// Chargé à la demande : un binaire compilé sans le module natif (ancien build de développement) doit
// démarrer quand même, sans notifications, au lieu de planter à l'import.
let notificationsChargees: typeof NotificationsModule | null | undefined;
function charger(): typeof NotificationsModule | null {
  if (notificationsChargees === undefined) {
    if (dansExpoGo) {
      notificationsChargees = null;
      return null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      notificationsChargees = require('expo-notifications') as typeof NotificationsModule;
    } catch {
      notificationsChargees = null;
    }
  }
  return notificationsChargees;
}

const actif = () => Platform.OS === 'android' && Device.isDevice && charger() !== null;

/** Conversation affichée à l'écran : ses notifications ne s'affichent pas par-dessus (RG-06-22). */
let conversationOuverte: string | null = null;
export const definirConversationOuverte = (id: string | number | null): void => {
  conversationOuverte = id == null ? null : String(id);
};

let gestionnaireInstalle = false;

/** À appeler une fois au démarrage : règle l'affichage des notifications reçues app ouverte. */
export function installerGestionnaire(): void {
  const Notifications = charger();
  if (gestionnaireInstalle || Platform.OS !== 'android' || !Notifications) return;
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
  const Notifications = charger();
  if (!projectId || !Notifications) return null;
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
  const Notifications = charger();
  if (!actif() || !Notifications) return;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (granted) await enregistrerJeton();
  } catch {
    // Les notifications ne doivent jamais gêner la connexion.
  }
}

/** Au premier message envoyé ou reçu : demande la permission (une seule fois), puis enregistre l'appareil. */
export async function demanderPermissionEtEnregistrer(): Promise<void> {
  const Notifications = charger();
  if (!actif() || !Notifications) return;
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

/** Écoute les notifications touchées pendant que l'app tourne ; renvoie la fonction de désabonnement. */
export function ecouterOuvertures(): () => void {
  const Notifications = charger();
  if (Platform.OS !== 'android' || !Notifications) return () => {};
  const abonnement = Notifications.addNotificationResponseReceivedListener((reponse) => {
    ouvrirNotification(reponse.notification.request.content.data as Donnees);
  });
  return () => abonnement.remove();
}

/** Notification qui a lancé l'app (app fermée) : l'ouvre une fois connecté. */
export function ouvrirDerniereNotification(): void {
  const Notifications = charger();
  if (Platform.OS !== 'android' || !Notifications) return;
  Notifications.getLastNotificationResponseAsync()
    .then((reponse) => {
      if (reponse) ouvrirNotification(reponse.notification.request.content.data as Donnees);
    })
    .catch(() => {});
}

type Donnees = { type?: string; conversationId?: number | string; alerteId?: number | string };

/** Ouverture d'une notification : mène à la conversation ou à la liste des nouvelles annonces de l'alerte. */
function ouvrirNotification(donnees: Donnees | undefined): void {
  if (!donnees) return;
  if (donnees.type === 'message' && donnees.conversationId != null) {
    router.push({ pathname: '/conversation/[conversationId]', params: { conversationId: String(donnees.conversationId) } } as never);
  } else if (donnees.type === 'alerte' && donnees.alerteId != null) {
    router.push({ pathname: '/alertes', params: { ouvrir: String(donnees.alerteId) } } as never);
  }
}
