# Module 06 — Messagerie

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Permettre à un utilisateur connecté d'échanger avec l'annonceur **à propos d'une annonce précise**, sans exposer les adresses email, de suivre les messages non lus, d'être prévenu des nouveaux messages par notification push, de voir si l'interlocuteur est en ligne, de signaler un message abusif, de bloquer un interlocuteur et de ranger ses conversations. Le contact peut aussi passer par l'appel téléphonique ou WhatsApp depuis la fiche, pour un utilisateur connecté.

La modération des messages signalés est décrite au module 09.

Hors périmètre : photos, pièces jointes et messages vocaux ; temps réel (WebSocket) ; réponses types ; prise de rendez-vous de visite ; conversation avec l'entreprise plutôt qu'avec l'agent ; email de nouveau message.

## 2. Acteurs et droits

| Action | Participant | Non-participant | Modération |
|---|---|---|---|
| Ouvrir une conversation sur une annonce visible | ✅ (pas sur sa propre annonce) | — | ❌ dans l'app (pas d'onglet Messagerie) |
| Lire, envoyer, marquer comme lu | ✅ | ❌ (404) | lecture des conversations signalées via l'administration (DEC-02) |
| Signaler un message | ✅ (pas ses propres messages) | ❌ | — |
| Archiver, restaurer, supprimer pour soi, bloquer l'interlocuteur | ✅ | ❌ | — |

## 3. User stories

| ID | User story |
|---|---|
| US-06-01 | En tant qu'acheteur, je clique sur « Envoyer un message » depuis une fiche ; si une conversation existe déjà pour cette annonce, je la retrouve. |
| US-06-02 | En tant qu'utilisateur, je vois la liste de mes conversations (boîte de réception ou archives), triée par dernier message, avec un aperçu, le nombre de messages non lus et l'annonce concernée. |
| US-06-03 | En tant qu'utilisateur, j'échange des messages texte, je vois si mon interlocuteur est en ligne et je reçois une notification quand l'app n'est pas ouverte. |
| US-06-04 | En tant qu'utilisateur, je signale un message (arnaque, propos insultants, harcèlement, spam, autre). |
| US-06-05 | En tant qu'acheteur connecté, j'appelle l'annonceur ou je lui écris sur WhatsApp avec un message pré-rempli. |
| US-06-06 | En tant qu'utilisateur, j'archive ou je supprime une conversation pour moi, et je bloque un interlocuteur indésirable. |

## 4. Règles de gestion

### 4.1 Conversations et messages

| ID | Règle | Source |
|---|---|---|
| RG-06-01 | Une conversation se crée uniquement sur une annonce **visible publiquement** (son propriétaire est donc ACTIF), pas sur sa propre annonce, et pas si l'un des deux a bloqué l'autre. | `MessagingServiceImpl.createOrGetConversation` |
| RG-06-02 | **Unicité** : une seule conversation par (annonce, couple de participants). Les participants sont rangés dans un ordre déterministe ; une nouvelle demande renvoie la conversation existante. | `Conversation.java`, idem |
| RG-06-03 | L'interlocuteur est le **propriétaire de l'annonce** : pour une annonce d'agent, c'est l'agent. Si l'agent est **retiré** par son entreprise (DEC-34), ses conversations passent au professionnel et l'acheteur reçoit le message « Votre interlocuteur a changé : l'agence … reprend cet échange… ». | `TransfertAgentService.java` |
| RG-06-04 | Une conversation déjà ouverte reste utilisable même si l'annonce n'est plus visible (indicateur `annonceActive`). L'envoi est refusé si l'interlocuteur n'est plus ACTIF (« Cet utilisateur n'est plus joignable. ») ou si l'un des deux a bloqué l'autre ; la conversation l'indique (`ecriturePossible`, `ecritureImpossibleMotif`) et l'app désactive la saisie avec un bandeau. | `MessagingServiceImpl.sendMessage` |
| RG-06-05 | Message : texte seul, 1 à 4000 caractères, espaces de début et de fin supprimés. | `SendMessageRequest.java` |
| RG-06-06 | L'envoi met à jour la date du dernier message, qui sert au tri des conversations (`lastMessageAt` décroissant par défaut), et ramène la conversation dans la boîte de réception des deux participants, qu'elle y ait été archivée ou supprimée. | idem |
| RG-06-07 | Lecture : ouvrir une conversation marque comme lus tous les messages reçus. Le nombre de non-lus est calculé par conversation ; le total apparaît en pastille sur l'onglet. | `MessagingServiceImpl.markConversationAsRead`, `nav-items.ts` |
| RG-06-08 | Confidentialité : l'email de l'interlocuteur n'est jamais renvoyé ; seuls le nom complet (ou « Utilisateur ») et la photo le sont. | `MessagingServiceImpl.toDTO` |
| RG-06-09 | Un message supprimé par la modération est affiché « [Message supprimé par la modération] », y compris dans l'aperçu et l'export. | idem |
| RG-06-10 | **Limites d'envoi** par compte et par 24 h : **20 nouvelles conversations** et **300 messages** ; au-delà, 429 « Vous avez atteint la limite… Réessayez demain. ». | `MessagingServiceImpl` (`CONVERSATIONS_PAR_JOUR`, `MESSAGES_PAR_JOUR`) |
| RG-06-11 | Une conversation créée puis abandonnée sans message est renvoyée par l'API mais **masquée par l'app** (aucun aperçu et aucun non-lu). | `ConversationList.tsx` |

### 4.2 Rangement et blocage

| ID | Règle | Source |
|---|---|---|
| RG-06-12 | Chaque participant a son propre état de la conversation : **ACTIVE** (boîte de réception), **ARCHIVEE** (archives) ou **SUPPRIMEE** (masquée pour lui seul ; l'autre participant la garde). Un nouveau message, de l'un ou de l'autre, remet la conversation ACTIVE chez les deux. | `Conversation.etatPour`, V34 |
| RG-06-13 | **Bloquer** un interlocuteur : plus aucun message dans un sens comme dans l'autre, ni nouvelle conversation entre les deux. Seul celui qui a bloqué peut débloquer. On ne peut bloquer ni soi-même ni un compte du staff. La liste de ses blocages se consulte et se gère dans l'API. | `MessagingServiceImpl.bloquer`, `blocage_utilisateur` (V34) |

### 4.3 Signalement et modération

| ID | Règle | Source |
|---|---|---|
| RG-06-14 | Signalement : un participant autre que l'auteur, une fois par message tant que le signalement est en cours (« Ce message a déjà été signalé. »). Le motif est demandé par l'app ; l'API l'accepte absent, pour les anciennes versions de l'app. Le message est marqué signalé, avec la date et le signaleur. Un signalement classé sans suite par la modération rend le message à nouveau signalable. | `MessagingServiceImpl.signalerMessage`, `AdminServiceImpl.ignorerSignalementMessage` |
| RG-06-15 | La modération n'ouvre une conversation que si elle contient **au moins un message signalé**, en attente ou déjà traité ; toute autre demande renvoie 404. Chaque ouverture est inscrite au journal d'audit (`CONVERSATION_CONSULTEE`). La politique de confidentialité indique que les échanges signalés peuvent être lus par la modération (DEC-02). | `AdminServiceImpl.getMessagesConversationAdmin` |

### 4.4 Rafraîchissement et notifications

| ID | Règle | Source |
|---|---|---|
| RG-06-16 | **Aucun temps réel** : la conversation ouverte interroge l'API toutes les **5 secondes**, seulement si elle est à l'écran **et** l'app au premier plan ; la liste est rechargée à l'ouverture de l'écran et par tirer-pour-rafraîchir. | `app/(tabs)/messagerie/[conversationId].tsx` |
| RG-06-17 | **Notification push** (DEC-13, Android) : à chaque message reçu, une notification est envoyée sur les appareils du destinataire : « Nouveau message de <prénom> à propos de « <titre> » », **sans le contenu du message**. Elle n'est pas affichée si la conversation est ouverte à l'écran, et elle ouvre la conversation. Chaque message produit sa propre notification : le service d'envoi (Expo) ne permet pas de remplacer celle d'une conversation. | `PushService.java`, `src/lib/push.ts` |
| RG-06-18 | La permission de notification est demandée au premier message envoyé ou reçu, pas au lancement. Le jeton de l'appareil est enregistré à la connexion et supprimé à la déconnexion, à l'anonymisation du compte ou quand le service d'envoi le déclare invalide. Les notifications de messages se coupent dans le profil (module 11). Elles ne fonctionnent pas dans Expo Go (build de développement ou APK nécessaire). | idem |

### 4.5 Contact externe et conservation

| ID | Règle | Source |
|---|---|---|
| RG-06-19 | **Contact externe** (DEC-14) : le numéro de l'annonceur, le bouton « Appeler » (`tel:`) et WhatsApp (`https://wa.me/<numéro>?text=…`, message « Bonjour, je suis intéressé(e) par votre annonce « titre » (réf. X) vue sur AnoventiX. ») ne sont fournis qu'à un utilisateur **connecté**. Les réponses publiques de l'API et les pages de partage ne contiennent jamais le numéro ; un visiteur voit « Connectez-vous pour contacter l'annonceur. ». | `ContactReserveAuxConnectes` (sérialiseur), `app/annonce/[id].tsx` |
| RG-06-20 | **Conservation** (DEC-26) : une conversation est supprimée **2 ans après son dernier message** ; une conversation qui contient un message signalé est conservée jusqu'à 1 an après la décision de modération (tâche de 04:00). Les messages d'un participant anonymisé restent rattachés à son compte anonymisé. | `PurgeConservationService.java` |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Liste des conversations | `app/(tabs)/messagerie/index.tsx`, `features/messagerie/ConversationList.tsx` | Onglets « Boîte de réception » et « Archives » ; avatar, nom, annonce, aperçu du dernier message, heure, pastille de non-lus, état vide |
| Conversation | `app/(tabs)/messagerie/[conversationId].tsx` (et `app/conversation/[conversationId].tsx`, même écran dans la pile racine) | En-tête avec présence et menu (archiver ou restaurer, bloquer ou débloquer, supprimer pour moi), fil chronologique avec chargement de l'historique, champ « Écrivez votre message… » (désactivé avec un bandeau si l'écriture est impossible), renvoi d'un message en échec, signalement par appui long |
| Fiche annonce, contact | `app/annonce/[id].tsx` | Fenêtre « Contacter l'annonceur » (message, appel, WhatsApp) ; connexion demandée pour un visiteur |

## 6. API

| Méthode | URL | Description |
|---|---|---|
| POST | `/api/messagerie/conversations` | `{annonceId, message}` → conversation créée ou existante (201) ; 429 au-delà de la limite |
| GET | `/api/messagerie/conversations?etat=ACTIVE\|ARCHIVEE` | Mes conversations (10 par défaut, tri `lastMessageAt` ou `createdAt`) |
| GET | `/api/messagerie/conversations/{id}` | Détail (avec `etat`, `bloqueParMoi`, `ecriturePossible`, `ecritureImpossibleMotif`) |
| GET | `/api/messagerie/conversations/{id}/messages` | Messages (20 par défaut) |
| POST | `/api/messagerie/conversations/{id}/messages` | `{content}` → 201 ; 422 si l'écriture est impossible ; 429 au-delà de la limite |
| PUT | `/api/messagerie/conversations/{id}/read` | Tout marquer comme lu → 204 |
| PUT | `/api/messagerie/conversations/{id}/archiver` · `/restaurer` | Ranger la conversation |
| DELETE | `/api/messagerie/conversations/{id}` | Supprimer la conversation pour soi |
| GET | `/api/messagerie/blocages` | Mes blocages |
| POST · DELETE | `/api/messagerie/blocages/{userId}` | Bloquer / débloquer |
| POST | `/api/messagerie/messages/{id}/signaler` | `{motif}` |
| GET | `/api/users/{id}/presence` | Présence de l'interlocuteur |

Tous les endpoints exigent une connexion ; une conversation dont on n'est pas participant renvoie 404.

## 7. Données

`conversation` : `annonce_id`, `participant_one_id`, `participant_two_id`, `created_by_id`, `created_at`, `updated_at`, `last_message_at`, `active`, `etat_participant_one`, `etat_participant_two` (ACTIVE, ARCHIVEE, SUPPRIMEE).
`message` : `conversation_id`, `sender_id`, `content` (≤ 4000), `created_at`, `read_at`, `signale`, `motif_signalement`, `date_signalement`, `signale_par_id`, `supprime`, `supprime_par`, `date_suppression`.
`blocage_utilisateur` : `bloqueur_id`, `bloque_id`, `date_blocage` (unique par couple).
`appareil_push` : `user_id`, `jeton`, `plateforme`, `date_enregistrement`.

## 8. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-06-01 | Deux demandes de conversation successives sur la même annonce par le même acheteur renvoient la même conversation. |
| CA-06-02 | Un utilisateur tiers qui appelle `GET /conversations/{id}/messages` reçoit 404. |
| CA-06-03 | Aucune réponse de la messagerie ne contient l'email d'un participant. |
| CA-06-04 | Un message reçu pendant que la conversation est ouverte apparaît en moins de 5 secondes. |
| CA-06-05 | L'auteur d'un message ne peut pas le signaler ; un second signalement pendant que le premier est en cours renvoie 400. |
| CA-06-06 | Ouvrir une conversation sur une annonce non visible est refusé ; écrire à un compte suspendu ou anonymisé est refusé avec « Cet utilisateur n'est plus joignable. ». |
| CA-06-07 | Après un blocage, aucun des deux ne peut écrire à l'autre ; seul celui qui a bloqué peut débloquer. |
| CA-06-08 | Une conversation archivée quitte la boîte de réception et y revient au message suivant de l'interlocuteur ; une conversation supprimée pour soi reste visible chez l'autre participant, et revient chez soi au message suivant. |
| CA-06-09 | Le 21e nouvel échange de la journée renvoie 429. |
| CA-06-10 | Un modérateur ne peut lire que les conversations qui contiennent un message signalé, et chaque lecture est journalisée. |
| CA-06-11 | Un message reçu app fermée déclenche une notification sans son contenu, qui ouvre la conversation. |
| CA-06-12 | `GET /api/biens-immo/public/p/{publicId}` sans connexion ne renvoie pas le téléphone ; connecté, la fiche affiche « Appeler » et « WhatsApp ». |
