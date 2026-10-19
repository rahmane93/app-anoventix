# Module 06 — Messagerie

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à un utilisateur connecté d'échanger avec l'annonceur **à propos d'une annonce précise**, sans exposer les adresses email, de suivre les messages non lus, de voir si l'interlocuteur est en ligne et de signaler un message abusif. Le contact peut aussi passer par l'appel téléphonique ou WhatsApp depuis la fiche (le numéro de l'annonceur est public).

La modération des messages signalés est décrite au module 09.

Hors périmètre (non implémenté) : photos, pièces jointes et messages vocaux ; notifications push et emails de nouveau message (ECART-23) ; temps réel (ECART-20) ; réponses types ; prise de rendez-vous de visite ; conversation avec l'entreprise plutôt qu'avec l'agent ; blocage, archivage et suppression (ECART-29).

## 2. Acteurs et droits

| Action | Participant | Non-participant | Modération |
|---|---|---|---|
| Ouvrir une conversation sur une annonce visible | ✅ (pas sur sa propre annonce) | — | ❌ dans l'app (pas d'onglet Messagerie) |
| Lire, envoyer, marquer comme lu | ✅ | ❌ (404) | lecture via l'administration uniquement |
| Signaler un message | ✅ (pas ses propres messages) | ❌ | — |

## 3. User stories

| ID | User story |
|---|---|
| US-06-01 | En tant qu'acheteur, je clique sur « Envoyer un message » depuis une fiche ; si une conversation existe déjà pour cette annonce, je la retrouve. |
| US-06-02 | En tant qu'utilisateur, je vois la liste de mes conversations, triée par dernier message, avec un aperçu, le nombre de messages non lus et l'annonce concernée. |
| US-06-03 | En tant qu'utilisateur, j'échange des messages texte et je vois si mon interlocuteur est en ligne. |
| US-06-04 | En tant qu'utilisateur, je signale un message (arnaque, propos insultants, harcèlement, spam, autre). |
| US-06-05 | En tant qu'acheteur, j'appelle l'annonceur ou je lui écris sur WhatsApp avec un message pré-rempli. |

## 4. Règles de gestion

| ID | Règle | Source |
|---|---|---|
| RG-06-01 | Une conversation se crée uniquement sur une annonce **visible publiquement**, dont le propriétaire est ACTIF, et pas sur sa propre annonce. | `MessagingServiceImpl.java:54-98` |
| RG-06-02 | **Unicité** : une seule conversation par (annonce, couple de participants). Les participants sont rangés dans un ordre déterministe (comparaison des identifiants) ; une nouvelle demande renvoie la conversation existante. | `Conversation.java:27-29`, `MessagingServiceImpl.java:74-92` |
| RG-06-03 | L'interlocuteur est toujours le **propriétaire de l'annonce** : pour une annonce d'agent, c'est l'agent et non l'entreprise. | `MessagingServiceImpl.java:63` |
| RG-06-04 | Une conversation déjà ouverte reste utilisable même si l'annonce n'est plus visible (indicateur `annonceActive`). Aucun contrôle n'empêche d'écrire à un compte devenu suspendu, inactif ou anonymisé (ECART-29). | `MessagingServiceImpl.java:126-143` |
| RG-06-05 | Message : texte seul, 1 à 4000 caractères, espaces de début et de fin supprimés. Pas de pièce jointe ni d'image. | `SendMessageRequest.java` |
| RG-06-06 | L'envoi met à jour la date du dernier message, qui sert au tri des conversations (`lastMessageAt` décroissant par défaut). | `MessagingServiceImpl.java:136-138` |
| RG-06-07 | Lecture : ouvrir une conversation marque comme lus tous les messages reçus. Un message envoyé par soi n'est jamais marqué lu par soi. Le nombre de non-lus est calculé par conversation ; le total apparaît en pastille sur l'onglet. | `MessagingServiceImpl.java:146-168`, `nav-items.ts` |
| RG-06-08 | Confidentialité : l'email de l'interlocuteur n'est jamais renvoyé (`otherParticipantUsername` et `senderUsername` à `null`) ; seuls le nom complet (ou « Utilisateur ») et la photo le sont. | `MessagingServiceImpl.java:224-227, 246` |
| RG-06-09 | Un message supprimé par la modération est affiché « [Message supprimé par la modération] », y compris dans l'aperçu et l'export. | `MessagingServiceImpl.java:238-261` |
| RG-06-10 | Signalement : un participant autre que l'auteur, une seule fois par message (« Ce message a déjà été signalé. »). Le motif est **facultatif** dans l'API ; l'app le demande. Le message est marqué signalé, avec la date et le signaleur. | `MessagingServiceImpl.java:171-191` |
| RG-06-11 | Présence : « En ligne » si l'interlocuteur a fait une requête authentifiée depuis moins de 2 minutes, sinon « Hors ligne ». | module 02, RG-02-12 |
| RG-06-12 | Rafraîchissement : **aucun temps réel**. La conversation ouverte interroge l'API toutes les **5 secondes** ; la liste est rechargée à l'ouverture de l'écran et par tirer-pour-rafraîchir. Aucune notification push ni email de nouveau message (ECART-20, ECART-23). | `app/(tabs)/messagerie/[conversationId].tsx:175-178` |
| RG-06-13 | Pas d'archivage, de suppression de conversation ni de blocage d'un interlocuteur (le champ `Conversation.active` n'est jamais utilisé). | `Conversation.java:76` |
| RG-06-14 | Contact externe : bouton « Appeler l'annonceur » (`tel:`) et WhatsApp (`https://wa.me/<numéro>?text=…`) avec le message « Bonjour, je suis intéressé(e) par votre annonce « titre » (réf. X) vue sur AnoventiX. » La référence ainsi transmise n'est pas retrouvable par le champ de recherche de l'accueil (ECART-57). | `app/annonce/[id].tsx` |
| RG-06-15 | Une conversation créée puis abandonnée sans message est renvoyée par l'API mais **masquée par l'app** (aucun aperçu et aucun non-lu). L'annonceur ne la voit donc pas. | `APP/src/features/messagerie/ConversationList.tsx:154-157` |
| RG-06-16 | L'interrogation toutes les 5 s ne tourne que si la conversation est à l'écran **et** l'app au premier plan : elle s'arrête en arrière-plan et reprend au retour. La **pastille de non-lus** n'est recalculée qu'à l'affichage de l'accueil ou de la liste des conversations : elle n'augmente pas toute seule pendant que l'utilisateur est sur un autre écran. | `app/(tabs)/messagerie/[conversationId].tsx:172-190`, `useExploreAnnonces.tsx:195-203` |
| RG-06-17 | L'interlocuteur est figé à la création. Si l'agent est **retiré** par son entreprise, ses annonces en ligne passent au professionnel, mais leurs conversations restent avec l'agent devenu inactif : l'acheteur continue d'écrire à un compte que personne ne lit, et le professionnel ne voit pas ces échanges (ECART-16, ECART-29). Il en va de même pour un compte suspendu (module 03 §4.6). | `EntrepriseServiceImpl.java:357-395`, `MessagingServiceImpl.java:126-143` |
| RG-06-18 | **Aucune limite d'envoi** : un compte peut ouvrir une conversation sur chaque annonce visible et envoyer un nombre illimité de messages. La limitation de débit ne couvre que l'authentification (module 01, RG-01-20) (ECART-29). | `RateLimitFilter.java` |
| RG-06-19 | La modération peut lire **toute conversation** à partir de son identifiant, même sans message signalé, et ces lectures ne sont pas journalisées (module 09, RG-09-20, ECART-60). Les participants n'en sont pas informés. | `AdminServiceImpl.java:508-513` |
| RG-06-20 | **Conservation** : conversations et messages sont conservés sans limite, y compris après l'anonymisation d'un participant (RG-02-22) et la suppression de l'annonce (RG-03-22). Durée cible proposée : SFG §11.2. 🆕 **Cible DEC-26** : une conversation est supprimée 2 ans après son dernier message ; une conversation contenant un message signalé est conservée jusqu'à 1 an après la décision de modération (tâche de 04:00). | — |
| 🆕 RG-06-21 | **Développée (DEC-02)** : la modération n'ouvre une conversation que si elle contient **au moins un message signalé**, en attente ou déjà traité (le motif de signalement est conservé, RG-09-19) ; toute autre demande renvoie 404. Chaque ouverture est journalisée (acteur, conversation, message signalé à l'origine, date) dans le journal d'audit (ECART-63), consultable par l'administrateur. La politique de confidentialité indique que les échanges signalés peuvent être lus par la modération. | DEC-02 (SFG §17) |
| 🆕 RG-06-22 | **Cible DEC-13** : à chaque message reçu, si la conversation n'est pas ouverte à l'écran, une **notification push** est envoyée sur les appareils Android du destinataire : « Nouveau message de <prénom> à propos de « <titre> » », **sans le contenu du message** (écran verrouillé). Une seule notification par conversation, mise à jour à chaque nouveau message ; elle ouvre la conversation. La pastille de non-lus se met à jour à la réception. | DEC-13 |
| 🆕 RG-06-23 | La permission de notification est demandée au premier message envoyé ou reçu, pas au lancement. Le jeton de l'appareil est enregistré à la connexion et supprimé à la déconnexion, à la suppression du compte ou quand le service le signale invalide. Les notifications se désactivent dans le profil (module 11, RG-11-09). | DEC-13 |
| 🆕 RG-06-24 | **Développée côté API (DEC-14)** : le numéro est retiré des réponses par un sérialiseur appliqué au champ du DTO ; aucune réponse publique ne peut le laisser fuiter. **Cible** : les boutons « Appeler » et « WhatsApp » et le numéro de l'annonceur ne sont affichés qu'à un utilisateur **connecté**. Les réponses publiques de l'API, les pages de partage et le HTML initial du site ne contiennent jamais le numéro. Un visiteur voit « Connectez-vous pour contacter l'annonceur ». | DEC-14, ECART-31 |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Liste des conversations | `app/(tabs)/messagerie/index.tsx`, `features/messagerie/ConversationList.tsx` | Avatar, nom, annonce, aperçu du dernier message, heure, pastille de non-lus, état vide « Aucun message » |
| Conversation | `app/(tabs)/messagerie/[conversationId].tsx` (et `app/conversation/[conversationId].tsx`, même écran monté dans la pile racine pour que le retour ramène à la fiche) | En-tête avec présence, fil chronologique avec chargement de l'historique, champ « Écrivez votre message… », renvoi d'un message en échec (« Message non envoyé, réessayer »), signalement par appui long (« Pourquoi ce message pose-t-il problème ? »), mention « Ce message a été signalé à la modération. » |
| Fiche annonce, contact | `app/annonce/[id].tsx` | Fenêtre « Contacter l'annonceur » (message, appel, WhatsApp) ; connexion demandée pour un visiteur |

## 6. API

| Méthode | URL | Description |
|---|---|---|
| POST | `/api/messagerie/conversations` | `{annonceId}` → conversation créée ou existante (toujours 201) |
| GET | `/api/messagerie/conversations` | Mes conversations (10 par défaut, tri `lastMessageAt` ou `createdAt`) |
| GET | `/api/messagerie/conversations/{id}` | Détail |
| GET | `/api/messagerie/conversations/{id}/messages` | Messages (20 par défaut, ordre chronologique) |
| POST | `/api/messagerie/conversations/{id}/messages` | `{content}` → 201 |
| PUT | `/api/messagerie/conversations/{id}/read` | Tout marquer comme lu → 204 |
| PUT | `/api/messagerie/messages/{id}/read` | Marquer un message comme lu (non utilisé par l'app) |
| POST | `/api/messagerie/messages/{id}/signaler` | `{motif}` facultatif |
| GET | `/api/users/{id}/presence` | Présence de l'interlocuteur |

Tous les endpoints exigent une connexion ; une conversation dont on n'est pas participant renvoie 404.

## 7. Données

`conversation` : `annonce_id`, `participant_one_id`, `participant_two_id`, `created_by_id`, `created_at`, `updated_at`, `last_message_at`, `active`.
`message` : `conversation_id`, `sender_id`, `content` (≤ 4000), `created_at`, `read_at`, `signale`, `motif_signalement`, `date_signalement`, `signale_par_id` (V10), `supprime`, `supprime_par`, `date_suppression`.

## 8. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-06-01 | Deux demandes de conversation successives sur la même annonce par le même acheteur renvoient la même conversation. |
| CA-06-02 | Un utilisateur tiers qui appelle `GET /conversations/{id}/messages` reçoit 404. |
| CA-06-03 | Aucune réponse de la messagerie ne contient l'email d'un participant. |
| CA-06-04 | Un message reçu pendant que la conversation est ouverte apparaît en moins de 5 secondes. |
| CA-06-05 | L'auteur d'un message ne peut pas le signaler ; un second signalement renvoie 400. |
| CA-06-06 | Ouvrir une conversation sur l'annonce d'un compte suspendu, ou sur une annonce non visible, est refusé ; une conversation déjà ouverte reste utilisable. |
| CA-06-07 | Une conversation ouverte sans aucun message n'apparaît pas dans la liste de l'annonceur. |
| CA-06-08 | Quand l'app passe en arrière-plan, plus aucune requête de messages ne part ; au retour, les nouveaux messages arrivent en moins de 5 s. |
| CA-06-09 | *Cible (ECART-60)* : un modérateur ne peut lire que les conversations qui contiennent un message signalé, et chaque lecture est journalisée. |
| CA-06-10 | Un modérateur ou un administrateur n'a pas accès à la messagerie dans l'app (pas d'onglet), conformément à la SFG §6. |
| 🆕 CA-06-11 | Un message reçu app fermée déclenche une notification sans son contenu ; un deuxième message dans la même conversation met à jour la notification au lieu d'en créer une autre. |
| 🆕 CA-06-12 | `GET /api/biens-immo/public/p/{publicId}` sans connexion ne renvoie pas le téléphone ; connecté, la fiche affiche « Appeler » et « WhatsApp ». |

## 9. Écarts propres au module

ECART-16 (conversations d'un agent retiré), ECART-20 (WebSocket annoncé mais absent), ECART-23 (aucune notification de nouveau message), ECART-29 (blocage, archivage, comptes suspendus, motif facultatif, re-signalement possible après classement, aucune limite d'envoi), ECART-52 (annonces d'un compte suspendu toujours visibles), ECART-57 (référence du message WhatsApp introuvable par la recherche), ECART-60 (lecture de toute conversation par la modération, sans trace).

## 10. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-13 ; Q5 → DEC-02.

1. Quelle notification de nouveau message en priorité : notification push (suppose `expo-notifications` et un service d'envoi) ou email groupé (« Vous avez 3 nouveaux messages ») ?
2. Pour une annonce d'agence, l'acheteur doit-il échanger avec l'agent, avec l'entreprise (boîte partagée) ou avec les deux ? Que deviennent les conversations d'un agent retiré ?
3. Faut-il autoriser l'envoi de photos dans la messagerie (documents du bien, plans), au prix d'une modération plus lourde ?
4. Quelles limites d'envoi contre le spam (proposé : 20 nouvelles conversations et 200 messages par jour et par compte) ?
5. Dans quels cas la modération peut-elle lire une conversation, et comment les utilisateurs en sont-ils informés (politique de confidentialité) ?
