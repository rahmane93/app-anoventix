# Module 02 — Profil utilisateur, pièce d'identité et RGPD

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à chaque utilisateur de gérer son identité sur la plateforme (informations, photo), de faire vérifier sa **pièce d'identité**, condition préalable à toute publication, et d'exercer ses droits RGPD : accès et portabilité (export JSON), effacement (suppression avec délai de grâce). Le module couvre aussi l'affichage de la présence (« en ligne ») et le profil public.

## 2. Acteurs et droits

| Action | Titulaire | Modérateur | Admin |
|---|---|---|---|
| Consulter et modifier son profil, changer sa photo | ✅ | ✅ | ✅ |
| Envoyer sa pièce d'identité | ✅ (masqué dans l'app pour le staff) | — | — |
| Consulter une pièce d'identité | la sienne | ✅ toutes | ✅ toutes |
| Valider ou rejeter une pièce | — | ✅ (sauf celle d'un modérateur ou d'un admin) | ✅ (sauf celle d'un admin) |
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

## 4. Règles de gestion

### 4.1 Profil

| ID | Règle | Source |
|---|---|---|
| RG-02-01 | Champs modifiables : nom (≤ 50), prénom (≤ 50), téléphone (format international, normalisé, unique), type et numéro de pièce (≤ 50). L'email n'est pas modifiable. | `UpdateProfileRequest.java`, `UserServiceImpl.java:92-128` |
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

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Mon profil | `app/(tabs)/profile.tsx` | Avatar et photo, identité, rôle, sections « Mes informations », pièce d'identité (type, numéro, photo du document, statut, motif de rejet, « Voir le document »), menu (Gérer mes annonces, Ma licence, Mes signalements, Changer mon mot de passe, Contacter le support par email, CGU, Politique de confidentialité), « Exporter mes données », « Supprimer mon compte », « Se déconnecter ». Bandeau « Compte limité » si les annonces sont masquées ou la publication bloquée. |
| Mes informations | `app/edit-profile.tsx` | Prénom, nom, téléphone → « Profil mis à jour avec succès ! » |
| Profil public d'un particulier | `app/profil/[userId].tsx` | Avatar, nom, « membre depuis », annonces. **Inaccessible et non fonctionnel** (ECART-02). |

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

## 7. Données

`account` : `nom`, `prenom`, `telephone`, `photo_profil`, `type_piece_identite`, `numero_piece_identite`, `piece_identite_url`, `statut_piece_identite`, `motif_rejet_piece_identite` (255 caractères, sans contrôle de longueur : ECART-11), `date_suppression_demandee`, `date_suppression_definitive` (V6, V12).

## 8. Statuts de la pièce d'identité

```
(aucune) ──envoi──► EN_ATTENTE ──validation──► VALIDEE (figée)
                        │
                        └──rejet + motif──► REJETEE ──nouvel envoi──► EN_ATTENTE
```

## 9. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-02-01 | Sans pièce VALIDEE, la création d'annonce renvoie 422 « Votre pièce d'identité doit être validée… » et l'app affiche un bandeau explicatif avant l'assistant de publication. |
| CA-02-02 | Après validation, toute tentative de changer le nom ou le numéro de pièce renvoie 400. |
| CA-02-03 | Un utilisateur A ne peut pas télécharger la pièce de l'utilisateur B (403). |
| CA-02-04 | L'export ne contient ni mot de passe, ni jeton, ni code de réinitialisation. |
| CA-02-05 | Une suppression demandée par un professionnel désactive immédiatement l'entreprise et tous ses agents, et retire leurs annonces du public. |

## 10. Écarts propres au module

ECART-02 (profil public), ECART-11 (motifs sans contrôle de longueur), ECART-15 (anonymisation incomplète), ECART-28 (pièce d'identité : contrôles et périmètre), ECART-32 (export incomplet), ECART-06 (politique de confidentialité absente).
