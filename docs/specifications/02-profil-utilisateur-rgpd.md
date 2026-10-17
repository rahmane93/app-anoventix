# Module 02 — Profil utilisateur, pièce d'identité et RGPD

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à chaque utilisateur de gérer son identité sur la plateforme (informations, photo), de faire vérifier sa **pièce d'identité**, condition préalable à toute publication, et d'exercer ses droits RGPD : accès et portabilité (export JSON), effacement (suppression avec délai de grâce). Le module couvre aussi l'affichage de la présence (« en ligne ») et le profil public.

> **Évolution EVO-01 — Selfie de vérification (à développer).** La vérification d'identité exige désormais, en plus de la photo de la pièce, un **selfie pris en direct, sur lequel le titulaire tient sa pièce à côté de son visage**. Les règles sont regroupées au §4.6 et repérées par 🆕 dans les sections suivantes. Tout ce qui n'est pas marqué 🆕 décrit le comportement actuel du code.

Hors périmètre : reconnaissance faciale ou détection de vivacité automatiques (la comparaison reste humaine, RG-02-32), vérification de la pièce auprès d'un registre officiel, vérification vidéo.

## 2. Acteurs et droits

| Action | Titulaire | Modérateur | Admin |
|---|---|---|---|
| Consulter et modifier son profil, changer sa photo | ✅ | ✅ | ✅ |
| Envoyer sa pièce d'identité | ✅ (masqué dans l'app pour le staff) | — | — |
| Consulter une pièce d'identité | la sienne | ✅ toutes | ✅ toutes |
| Valider ou rejeter une pièce | — | ✅ (sauf celle d'un modérateur ou d'un admin) | ✅ (sauf celle d'un admin) |
| 🆕 Prendre et envoyer son selfie de vérification | ✅ (masqué dans l'app pour le staff) | — | — |
| 🆕 Consulter un selfie de vérification | le sien | ✅ tous | ✅ tous |
| Exporter ses données | ✅ | ✅ | ✅ |
| Supprimer son compte | ✅ (particulier, pro, agent) | ❌ | ❌ |
| Voir la présence d'un utilisateur | soi-même, ou un interlocuteur en messagerie | ✅ | ✅ |

## 3. User stories

| ID | User story |
|---|---|
| US-02-01 | En tant qu'utilisateur, je consulte mon profil : identité, rôle, statut, entreprise, pièce d'identité, avertissements, masquage éventuel de mes annonces. |
| US-02-02 | En tant qu'utilisateur, je modifie mon nom, mon prénom et mon téléphone tant que ma pièce n'est pas validée (téléphone : toujours). |
| US-02-03 | En tant qu'utilisateur, je change ma photo de profil. |
| US-02-04 | En tant qu'annonceur, j'envoie une photo de ma pièce d'identité avec son type et son numéro, pour pouvoir publier. |
| US-02-05 | En tant qu'annonceur, je suis informé par email de la validation ou du refus (avec le motif) de ma pièce. |
| US-02-06 | En tant qu'utilisateur, je télécharge toutes mes données personnelles au format JSON. |
| US-02-07 | En tant qu'utilisateur, je supprime mon compte ; je peux revenir dessus pendant 30 jours. |
| US-02-08 | En tant que visiteur, je consulte le profil public d'un annonceur particulier et ses annonces (**non fonctionnel aujourd'hui : ECART-02**). |
| 🆕 US-02-09 | En tant qu'annonceur, je prends un selfie en tenant ma pièce d'identité, guidé par un cadre et des consignes, pour compléter ma vérification. |
| 🆕 US-02-10 | En tant qu'annonceur dont la pièce est en attente sans selfie (envoyée avant la mise en service), j'ajoute mon selfie sans renvoyer ma pièce. |
| 🆕 US-02-11 | En tant que modérateur, je vois la pièce et le selfie côte à côte pour vérifier que la même personne détient le document, et je rejette avec un motif précis si ce n'est pas le cas. |
| 🆕 US-02-12 | En tant qu'annonceur dont le dossier est rejeté, je sais précisément quoi refaire (pièce, selfie ou les deux). |

## 4. Règles de gestion

### 4.1 Profil

| ID | Règle | Source |
|---|---|---|
| RG-02-01 | Champs modifiables : nom (≤ 50), prénom (≤ 50), téléphone (format international, normalisé, unique), type et numéro de pièce (≤ 50). L'email n'est pas modifiable. 🆕 Avec DEC-05, un nouveau téléphone doit être vérifié par code (module 01, RG-01-46). | `UpdateProfileRequest.java`, `UserServiceImpl.java:92-128` |
| RG-02-02 | Une fois la pièce **VALIDEE**, le nom, le prénom, le type et le numéro de pièce sont figés (l'envoi de la même valeur est toléré). | `UserServiceImpl.java:96-123` |
| RG-02-03 | La photo de profil est une image (voir les règles médias du module 03). L'ancienne photo est supprimée du disque après l'enregistrement de la nouvelle. | `UserServiceImpl.java:132-152` |
| RG-02-04 | Le profil renvoyé contient le nombre d'avertissements, l'état de masquage des annonces (motif et date), l'entreprise, le créateur (pour un agent) et la liste des identifiants des favoris. | `UserServiceImpl.java:357-390` |

### 4.2 Pièce d'identité

| ID | Règle | Source |
|---|---|---|
| RG-02-05 | Envoi en multipart : fichier **image** obligatoire (≤ 50 Mpx), type (CARTE_IDENTITE, PASSEPORT, PERMIS_DE_CONDUIRE, AUTRE) et numéro. Un type inconnu est **ignoré sans erreur** (ECART-28). Un seul fichier (pas de recto / verso, pas de PDF). | `UserController.java:93-111`, `UserServiceImpl.java:156-192` |
| RG-02-06 | Le fichier est stocké dans `uploads/private/piece-identite/<userId>/`, jamais servi par nginx, et lisible uniquement via `GET /api/users/{id}/piece-identite` par le titulaire ou la modération. | `FileController.java`, `SecurityConfig` (`/uploads/private/** denyAll`) |
| RG-02-07 | Chaque envoi remet le statut à EN_ATTENTE et efface le motif de rejet. Une pièce VALIDEE ne peut plus être remplacée. | `UserServiceImpl.java:161-172` |
| RG-02-08 | Décision de la modération : VALIDEE ou REJETEE (EN_ATTENTE refusé). **Motif obligatoire en cas de rejet.** Un modérateur ne peut pas traiter la pièce d'un autre modérateur ; personne ne traite celle d'un administrateur. | `UserServiceImpl.java:229-266` |
| RG-02-09 | Un email est envoyé au titulaire à chaque décision (« vous pouvez maintenant publier » ou « Motif : … »). | `UserServiceImpl.java:253-264` |
| RG-02-10 | La pièce VALIDEE est **obligatoire pour publier**, pour tous les rôles, y compris les agents (module 03, RG-03-01). | `BienImmoServiceImpl.java:109-113` |
| RG-02-11 | Motifs de rejet proposés dans l'app : document illisible, expiré, incomplet ou recadré, nom différent de celui du compte, fraude suspectée (saisie libre possible). | `app/(tabs)/administration/users/[id].tsx` |

### 4.3 Présence

| ID | Règle | Source |
|---|---|---|
| RG-02-12 | Un utilisateur est « en ligne » si sa dernière requête authentifiée date de moins de **2 minutes**. Sinon il est « hors ligne », avec la date de dernière activité connue depuis le démarrage du serveur. | `PresenceTracker.java` |
| RG-02-13 | Seuls le titulaire, la modération et les personnes ayant une conversation avec lui peuvent consulter sa présence. | `PresenceService.java:34-45` |

### 4.4 Export des données (droit d'accès et portabilité)

| ID | Règle | Source |
|---|---|---|
| RG-02-14 | `GET /api/users/me/export` renvoie un fichier `mes-donnees-anoventix.json`, non mis en cache, contenant : date de l'export, profil (sans mot de passe ni jetons), annonces (avec URL des photos), favoris (id, titre), conversations et messages (indicateur « de moi », contenu remplacé si supprimé par la modération), signalements posés. | `ExportDonneesService.java` |
| RG-02-15 | Ne sont pas exportés : avertissements, licences, détail de l'entreprise, historique des modifications, signalements de messages, fichier de la pièce d'identité (ECART-32). | idem |

### 4.5 Suppression du compte et anonymisation

| ID | Règle | Source |
|---|---|---|
| RG-02-16 | Un administrateur ou un modérateur ne peut pas supprimer son propre compte. | `UserServiceImpl.java:346-355` |
| RG-02-17 | **Demande de suppression** : toutes les annonces actives du titulaire passent hors ligne, le compte passe INACTIF (motif « Suppression demandée par l'utilisateur ») et la date de la demande est enregistrée. Pour un professionnel, l'entreprise est désactivée et ses agents actifs passent INACTIF (motif « Compte de l'entreprise supprimé »), avec leurs annonces. | `CompteSuppressionService.java:73-94` |
| RG-02-18 | **Délai de grâce de 30 jours** : réactivation possible par le titulaire (module 01, RG-01-25 à RG-01-27). | `User.java:140` |
| RG-02-19 | **Anonymisation** (tâche de 03:30, au-delà de 30 jours, compte toujours INACTIF) : suppression de la photo et de la pièce d'identité, email remplacé par `supprime-<aléatoire>@anonyme.invalid`, nom « Utilisateur supprimé », téléphone et pièce effacés, mot de passe aléatoire, favoris vidés, `date_suppression_definitive` renseignée. Le compte disparaît des listes et des statistiques. | `CompteSuppressionService.java:171-224` |
| RG-02-20 | L'anonymisation automatique **ne traite pas** les agents ni l'entreprise d'un professionnel, et ne supprime pas les photos des annonces, contrairement à la suppression par un administrateur (ECART-15). | idem, comparé à `supprimerParAdministrateur` |
| RG-02-21 | Toute décision de statut prise par la modération annule une suppression en cours (la date de demande est effacée). | `UserServiceImpl.java:325-327` |
| RG-02-22 | Les messages échangés sont conservés, rattachés au compte anonymisé. Aucun email n'est envoyé au compte anonymisé. | `EmailNotificationService.java:36-38` |

### 4.6 🆕 Évolution EVO-01 — Selfie de vérification

**Dossier de vérification.** À partir de cette évolution, la vérification porte sur un *dossier* composé de la photo de la pièce (RG-02-05) et du selfie. Le statut existant (`StatutPieceIdentite` : EN_ATTENTE, VALIDEE, REJETEE) s'applique au dossier entier. Les termes « pièce validée » des autres modules désignent désormais un dossier validé.

| ID | Règle |
|---|---|
| RG-02-23 | **Contenu du selfie** : photo du visage du titulaire, de face et découvert (sans lunettes de soleil, masque ni couvre-chef cachant le visage), **tenant sa pièce d'identité à côté du visage**, face lisible tournée vers l'objectif. Le selfie est obligatoire pour tous les rôles qui publient, agents compris (RG-02-10). Choix confirmé par DEC-08 : chaque agent fait vérifier sa propre identité. |
| RG-02-24 | **Capture en direct uniquement** : dans l'app, le selfie est pris avec l'appareil photo (caméra frontale par défaut, bascule possible) ; l'import depuis la galerie ou un fichier n'est pas proposé. Sur ordinateur, le site utilise la webcam du navigateur ; sans caméra, il affiche « Pour prendre votre selfie, utilisez l'application Android ou un téléphone ». L'API ne peut pas prouver qu'une photo a été prise en direct : la modération reste le contrôle final (RG-02-29). |
| RG-02-25 | **Guidage** : avant la prise de vue, un écran rappelle les consignes (lumière suffisante, visage entier dans le cadre, pièce lisible à côté du visage, pas de photo d'écran). Pendant la prise de vue, un cadre ovale indique où placer le visage et un rectangle où placer la pièce. Après la prise, un aperçu propose « Reprendre » ou « Utiliser cette photo ». |
| RG-02-26 | **Permission caméra** : demandée au moment de la prise de vue, avec l'explication « AnoventiX utilise l'appareil photo pour votre selfie de vérification d'identité ». En cas de refus, l'app explique comment l'autoriser dans les réglages ; la vérification ne peut pas se terminer sans selfie. |
| RG-02-27 | **Format** : image JPEG, au moins 720 px sur le petit côté, au plus 10 Mo et 50 Mpx (mêmes limites que les photos, module 03). L'API réencode l'image, ce qui supprime les métadonnées (dont la position GPS). Stockage dans `uploads/private/piece-identite/<userId>/`, avec la même protection que la pièce (RG-02-06). |
| RG-02-28 | **Envoi** : lors d'une première vérification ou après un rejet, la pièce et le selfie sont envoyés **ensemble** dans la même requête ; si l'un manque, la requête est refusée (400 « La photo de la pièce et le selfie sont obligatoires. »). Exception transitoire : un dossier EN_ATTENTE sans selfie (pièce envoyée avant la mise en service) accepte l'envoi du selfie seul. |
| RG-02-29 | **Décision** : la modération ne peut valider qu'un dossier complet (422 « Le selfie de vérification est manquant. »). Elle vérifie que : (1) le visage du selfie correspond à la photo de la pièce ; (2) la pièce tenue est bien celle envoyée (même type, même apparence) ; (3) le nom de la pièce correspond à celui du compte ; (4) le selfie n'est pas une photo d'écran ou la photo d'une photo. Les règles de RG-02-08 s'appliquent (motif obligatoire en cas de rejet, restrictions sur les comptes du staff). |
| RG-02-30 | **Motifs de rejet** ajoutés à la liste de RG-02-11 : « Selfie flou ou trop sombre », « Visage non visible ou couvert », « Pièce non visible sur le selfie », « Le visage ne correspond pas à la pièce », « Photo d'écran ou photo d'une photo ». Chaque motif indique s'il faut refaire la pièce, le selfie ou les deux ; dans tous les cas, le nouvel envoi contient les deux (RG-02-28). |
| RG-02-31 | **Traçabilité** : la date d'envoi du dossier, la date de la décision et son auteur sont enregistrés. Ils permettent de mesurer le délai de vérification (SFG §1.2) et de savoir qui a validé un dossier. |
| RG-02-32 | **Accès et usage** : le selfie n'est visible que par le titulaire et la modération (`no-store`, comme la pièce). Il n'est jamais affiché publiquement, ni utilisé comme photo de profil, ni transmis à un tiers. La comparaison est **humaine** : aucun traitement automatique de reconnaissance faciale. Un tel traitement ferait du selfie une donnée biométrique et demanderait une analyse juridique préalable (SFG §11.1). |
| RG-02-33 | **Comptes existants à la mise en service** : un dossier déjà VALIDEE reste valide, sans blocage rétroactif. Un dossier EN_ATTENTE sans selfie reste en attente : il apparaît dans la file avec la mention « Selfie manquant » et ne peut pas être validé ; l'app affiche « Ajoutez un selfie pour terminer votre vérification » (US-02-10). Un dossier REJETEE est renvoyé avec un selfie. Choix confirmé par DEC-07. |
| RG-02-34 | **Figement** : un dossier VALIDEE ne peut plus être modifié, ni la pièce ni le selfie (extension de RG-02-07). |
| RG-02-35 | **Conservation** : le selfie suit la pièce. Il est supprimé à l'anonymisation (RG-02-19) et lors d'une suppression par un administrateur (module 10). La durée cible est celle de la SFG §11.2 : fichier supprimé 30 jours après la décision, en ne gardant que les dates, le statut et l'auteur de la décision. |
| RG-02-36 | **Export** : l'export des données (RG-02-14) indique la présence du selfie, la date d'envoi et le statut du dossier, sans le fichier (même traitement que la pièce, ECART-32). |
| RG-02-37 | **Information** : la politique de confidentialité (ECART-06) mentionne le selfie : finalité (lutte contre la fraude et l'usurpation d'identité), destinataires (modération uniquement), durée de conservation et caractère obligatoire pour publier. |
| 🆕 RG-02-40 | **Cible DEC-25** : la modération s'engage à traiter 90 % des dossiers de vérification en **72 h au plus**. La file est triée du plus ancien au plus récent et signale les dossiers en attente depuis plus de 48 h. Le parcours de vérification annonce ce délai à l'utilisateur après l'envoi. |
| 🆕 RG-02-41 | **Cible DEC-26** : les fichiers de la pièce et du selfie sont supprimés 30 jours après la décision (validation ou rejet), en gardant le type, le numéro, le statut, les dates et l'auteur de la décision (tâche de 04:00, SFG §12). |

### 4.7 🆕 Profil public d'un particulier (cible DEC-21)

| ID | Règle |
|---|---|
| 🆕 RG-02-38 | Un endpoint public dédié (`GET /api/users/{id}/profil-public`) remplace l'appel actuel réservé à la modération (ECART-02). Il renvoie : prénom, **initiale du nom**, photo de profil, « membre depuis » (mois et année), mention « Identité vérifiée » si le dossier est VALIDEE, et les annonces **visibles** du compte, paginées. Jamais de téléphone, d'email ni de statut. |
| 🆕 RG-02-39 | Le profil est accessible depuis la carte annonceur des annonces d'un particulier. Pour un professionnel ou un agent, la carte mène à la page de l'agence (module 07). Un compte suspendu, désactivé, anonymisé ou du staff répond 404. |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Mon profil | `app/(tabs)/profile.tsx` | Avatar et photo, identité, rôle, sections « Mes informations », pièce d'identité (type, numéro, photo du document, statut, motif de rejet, « Voir le document »), menu (Gérer mes annonces, Ma licence, Mes signalements, Changer mon mot de passe, Contacter le support par email, CGU, Politique de confidentialité), « Exporter mes données », « Supprimer mon compte », « Se déconnecter ». Bandeau « Compte limité » si les annonces sont masquées ou la publication bloquée. |
| Mes informations | `app/edit-profile.tsx` | Prénom, nom, téléphone → « Profil mis à jour avec succès ! » |
| Profil public d'un particulier | `app/profil/[userId].tsx` | Avatar, nom, « membre depuis », annonces. **Inaccessible et non fonctionnel** (ECART-02). |
| 🆕 Vérification d'identité | à créer (depuis « Mon profil » et le bandeau de l'assistant de publication) | Parcours en 3 étapes : (1) photo de la pièce, type et numéro (galerie ou appareil photo, comme aujourd'hui) ; (2) selfie avec la pièce (consignes, prise de vue guidée, aperçu, RG-02-24 à RG-02-26) ; (3) récapitulatif avec les deux photos, puis « Envoyer pour vérification ». États affichés : à compléter, selfie manquant (RG-02-33), en attente, validé, refusé avec motif et étape à refaire. |
| 🆕 Modération des dossiers | `administration/pieces-identite.tsx`, `administration/users/[id].tsx` (module 10) | Pièce et selfie côte à côte, avec zoom ; liste de contrôle de RG-02-29 ; motifs de RG-02-11 et RG-02-30 ; mention « Selfie manquant » et validation désactivée si le dossier est incomplet. |

> Aujourd'hui, la photo de la pièce est choisie **uniquement dans la galerie** (`APP/src/features/profile/useProfile.ts:107`). L'évolution ajoute la prise de vue par appareil photo, qui demande la permission caméra (`expo-image-picker` ou `expo-camera`, à déclarer dans `app.json`).

## 6. API

| Méthode | URL | Accès | Description |
|---|---|---|---|
| GET | `/api/users/me` | connecté | Mon profil (`UserDTO`) |
| PUT | `/api/users/me` | connecté | Modifier mon profil |
| PUT | `/api/users/me/photo` | connecté | Photo de profil (multipart `file`) |
| POST | `/api/users/me/piece-identite` | connecté | Pièce d'identité (multipart `file`, `typePieceIdentite`, `numeroPieceIdentite`) → 201 |
| GET | `/api/users/{id}/piece-identite` | titulaire / modération | Fichier de la pièce (`no-store`) |
| PUT | `/api/users/{id}/piece-identite/statut` | modération | `{statut, motifRejet}` |
| GET | `/api/users/{id}/presence` | voir RG-02-13 | `{userId, status: ONLINE/OFFLINE, lastSeenAt}` |
| GET | `/api/users/me/export` | connecté | Export JSON |
| DELETE | `/api/users/me` | connecté (hors staff) | Demande de suppression → 204 |
| GET | `/api/users/{id}` | **modération uniquement** | Compte par id (appelé à tort par le profil public : ECART-02) |
| 🆕 POST | `/api/users/me/piece-identite` | connecté | Modifié : multipart `file` (pièce) **et** `selfie` obligatoires, plus `typePieceIdentite` et `numeroPieceIdentite` → 201 ; 400 si l'un des deux fichiers manque (RG-02-28) |
| 🆕 POST | `/api/users/me/selfie` | connecté | Transitoire : selfie seul pour un dossier EN_ATTENTE sans selfie (multipart `selfie`) → 201 ; 422 dans tout autre cas |
| 🆕 GET | `/api/users/{id}/selfie` | titulaire / modération | Fichier du selfie (`no-store`) |
| 🆕 PUT | `/api/users/{id}/piece-identite/statut` | modération | Modifié : 422 si le dossier est validé sans selfie (RG-02-29) |

🆕 `UserDTO` et la file `GET /api/admin/pieces-identite/en-attente` exposent en plus `selfieFourni` (booléen), `dateEnvoiVerification` et `dateDecisionVerification`.

## 7. Données

`account` : `nom`, `prenom`, `telephone`, `photo_profil`, `type_piece_identite`, `numero_piece_identite`, `piece_identite_url`, `statut_piece_identite`, `motif_rejet_piece_identite` (255 caractères, sans contrôle de longueur : ECART-11), `date_suppression_demandee`, `date_suppression_definitive` (V6, V12).

🆕 Migration Flyway à créer (V14) : `selfie_url` (chemin privé), `date_envoi_verification`, `date_decision_verification`, `decision_verification_par` (référence au compte du modérateur). Ces colonnes sont vidées à l'anonymisation, sauf les dates.

## 8. Statuts du dossier de vérification

Comportement actuel :

```
(aucune) ──envoi──► EN_ATTENTE ──validation──► VALIDEE (figée)
                        │
                        └──rejet + motif──► REJETEE ──nouvel envoi──► EN_ATTENTE
```

🆕 Avec EVO-01, le statut reste le même, mais la validation exige un dossier complet :

```
(aucun) ──envoi pièce + selfie──► EN_ATTENTE (complet) ──validation──► VALIDEE (figé)
                                        │
                                        └──rejet + motif──► REJETEE ──nouvel envoi pièce + selfie──► EN_ATTENTE

Transition à la mise en service :
EN_ATTENTE sans selfie ──ajout du selfie seul──► EN_ATTENTE (complet)
                       (validation refusée tant que le selfie manque ; rejet possible)
VALIDEE avant la mise en service ──► reste VALIDEE
```

## 9. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-02-01 | Sans pièce VALIDEE, la création d'annonce renvoie 422 « Votre pièce d'identité doit être validée… » et l'app affiche un bandeau explicatif avant l'assistant de publication. |
| CA-02-02 | Après validation, toute tentative de changer le nom ou le numéro de pièce renvoie 400. |
| CA-02-03 | Un utilisateur A ne peut pas télécharger la pièce de l'utilisateur B (403). |
| CA-02-04 | L'export ne contient ni mot de passe, ni jeton, ni code de réinitialisation. |
| CA-02-05 | Une suppression demandée par un professionnel désactive immédiatement l'entreprise et tous ses agents, et retire leurs annonces du public. |
| 🆕 CA-02-06 | Un envoi de la pièce sans selfie (ou du selfie sans pièce) hors cas transitoire renvoie 400 « La photo de la pièce et le selfie sont obligatoires. » |
| 🆕 CA-02-07 | Dans l'app, l'étape selfie n'ouvre que l'appareil photo : aucun accès à la galerie ou aux fichiers n'est proposé. Sur un ordinateur sans webcam, le message de RG-02-24 s'affiche. |
| 🆕 CA-02-08 | Valider un dossier sans selfie renvoie 422 « Le selfie de vérification est manquant. » ; l'écran de modération désactive le bouton « Valider ». |
| 🆕 CA-02-09 | Un utilisateur A ne peut pas télécharger le selfie de l'utilisateur B (403) ; une requête directe sur `/uploads/private/…` est refusée par nginx. |
| 🆕 CA-02-10 | Un selfie envoyé avec des coordonnées GPS dans ses métadonnées est stocké sans aucune métadonnée. |
| 🆕 CA-02-11 | À l'anonymisation d'un compte, la pièce et le selfie sont supprimés du disque ; les dates d'envoi et de décision restent. |
| 🆕 CA-02-12 | Un compte dont la pièce était VALIDEE avant la mise en service publie sans selfie ; un compte EN_ATTENTE sans selfie voit « Ajoutez un selfie pour terminer votre vérification » et peut l'envoyer seul. |
| 🆕 CA-02-13 | Après une décision, le dossier porte la date d'envoi, la date de décision et l'identifiant du modérateur. |
| 🆕 CA-02-14 | Le profil public d'un particulier affiche « Aminata D. », sans téléphone ni email ; le profil d'un compte suspendu répond 404. |

## 10. Écarts propres au module

ECART-02 (profil public), ECART-11 (motifs sans contrôle de longueur), ECART-15 (anonymisation incomplète), ECART-28 (pièce d'identité : contrôles et périmètre), ECART-32 (export incomplet), ECART-06 (politique de confidentialité absente).

## 11. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-07 ; Q2 → DEC-08 ; Q5 → DEC-26.

1. Faut-il demander un selfie aux comptes **déjà validés** avant la mise en service (par exemple à leur prochaine publication), ou les laisser tels quels comme le prévoit RG-02-33 ?
2. Les agents doivent-ils fournir leur propre selfie (choix retenu : oui, RG-02-23), alors que leur entreprise est déjà vérifiée (99 §7, question 5) ?
3. Sur ordinateur sans webcam, faut-il prévoir un parcours de secours (QR code qui ouvre l'étape selfie sur le téléphone) ?
4. Si le volume de dossiers augmente, faut-il un prestataire de vérification d'identité (comparaison et vivacité automatiques) ? Ce serait un traitement biométrique (RG-02-32).
5. Les durées de conservation de la pièce et du selfie (SFG §11.2) sont-elles acceptées ?
