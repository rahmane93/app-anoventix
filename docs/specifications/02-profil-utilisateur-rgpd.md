# Module 02 — Profil utilisateur, pièce d'identité et RGPD

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Permettre à chaque utilisateur de gérer son identité sur la plateforme (informations, photo), de faire vérifier son identité (**pièce d'identité et selfie**, condition préalable à toute publication), et d'exercer ses droits RGPD : accès et portabilité (export JSON), effacement (suppression avec délai de grâce). Le module couvre aussi l'affichage de la présence (« en ligne »), le profil public d'un particulier et la purge des comptes inactifs.

Hors périmètre : reconnaissance faciale ou détection de vivacité automatiques (la comparaison reste humaine, RG-02-32), vérification de la pièce auprès d'un registre officiel, vérification vidéo, pièce au format PDF (images seulement, DEC-36).

## 2. Acteurs et droits

| Action | Titulaire | Modérateur | Admin |
|---|---|---|---|
| Consulter et modifier son profil, changer sa photo | ✅ | ✅ | ✅ |
| Envoyer son dossier de vérification (pièce et selfie) | ✅ (masqué dans l'app pour le staff) | — | — |
| Consulter une pièce d'identité (recto, verso) ou un selfie | les siens | ✅ tous | ✅ tous |
| Valider ou rejeter un dossier | — | ✅ (sauf celui d'un modérateur ou d'un admin) | ✅ (sauf celui d'un admin) |
| Exporter ses données | ✅ | ✅ | ✅ |
| Supprimer son compte | ✅ (particulier, pro, agent) | ❌ | ❌ |
| Voir la présence d'un utilisateur | soi-même, ou un interlocuteur en messagerie | ✅ | ✅ |

## 3. User stories

| ID | User story |
|---|---|
| US-02-01 | En tant qu'utilisateur, je consulte mon profil : identité, rôle, statut, entreprise, dossier de vérification, avertissements en vigueur, masquage éventuel de mes annonces. |
| US-02-02 | En tant qu'utilisateur, je modifie mon nom, mon prénom et mon téléphone tant que mon dossier n'est pas validé (téléphone : toujours). |
| US-02-03 | En tant qu'utilisateur, je change ma photo de profil. |
| US-02-04 | En tant qu'annonceur, j'envoie ma pièce d'identité (recto, verso si besoin, type, numéro, date d'expiration) avec un selfie, pour pouvoir publier. |
| US-02-05 | En tant qu'annonceur, je suis informé par email de la validation ou du refus (avec le motif) de mon dossier. |
| US-02-06 | En tant qu'utilisateur, je télécharge toutes mes données personnelles au format JSON. |
| US-02-07 | En tant qu'utilisateur, je supprime mon compte ; je peux revenir dessus pendant 30 jours. |
| US-02-08 | En tant que visiteur, je consulte le profil public d'un annonceur particulier et ses annonces. |
| US-02-09 | En tant qu'annonceur, je prends un selfie en tenant ma pièce d'identité, guidé par un cadre et des consignes. |
| US-02-10 | En tant que modérateur, je vois la pièce et le selfie côte à côte pour vérifier que la même personne détient le document, et je rejette avec un motif précis si ce n'est pas le cas. |

## 4. Règles de gestion

### 4.1 Profil

| ID | Règle | Source |
|---|---|---|
| RG-02-01 | Champs modifiables : nom (≤ 50), prénom (≤ 50), téléphone (format international, normalisé, unique), type et numéro de pièce (≤ 50). L'email n'est pas modifiable. | `UpdateProfileRequest.java`, `UserServiceImpl.updateProfile` |
| RG-02-02 | Une fois le dossier **VALIDEE**, le nom, le prénom, le type et le numéro de pièce sont figés (l'envoi de la même valeur est toléré). | idem |
| RG-02-03 | La photo de profil est une image (voir les règles médias du module 03). L'ancienne photo est supprimée du disque après l'enregistrement de la nouvelle. | `UserServiceImpl.uploadProfilePhoto` |
| RG-02-04 | Le profil renvoyé contient le nombre d'avertissements **en vigueur** (module 09), l'état de masquage des annonces (motif et date), l'entreprise, le créateur (pour un agent), la liste des identifiants des favoris et l'état du dossier de vérification (`selfieFourni`, `versoFourni`, `dateExpirationPiece`, dates d'envoi et de décision). | `UserServiceImpl.toDTO` |

### 4.2 Dossier de vérification d'identité

Le dossier comprend la pièce d'identité (recto, verso si besoin) et le selfie (EVO-01). Son statut (`StatutPieceIdentite` : EN_ATTENTE, VALIDEE, REJETEE) s'applique au dossier entier ; « pièce validée » désigne dans les autres modules un dossier validé.

| ID | Règle | Source |
|---|---|---|
| RG-02-05 | Envoi en multipart, **en une seule requête** : **recto** (image, ≤ 50 Mpx), **verso** obligatoire pour CARTE_IDENTITE et PERMIS_DE_CONDUIRE (facultatif pour PASSEPORT et AUTRE), **selfie**, type (CARTE_IDENTITE, PASSEPORT, PERMIS_DE_CONDUIRE, AUTRE), numéro et **date d'expiration** (AAAA-MM-JJ, obligatoire, postérieure à aujourd'hui). Il manque un fichier, le type est inconnu ou la pièce est expirée → 400 (DEC-36). Images seulement : pas de PDF. | `UserServiceImpl.uploadPieceIdentite` |
| RG-02-06 | Les fichiers sont stockés dans `uploads/private/piece-identite/<userId>/`, jamais servis par nginx (`/uploads/private/** denyAll`), et lisibles uniquement via l'API par le titulaire ou la modération, sans cache (`no-store`). Chaque consultation par la modération est journalisée (`PIECE_IDENTITE_CONSULTEE`). | `UserServiceImpl.servirPieceIdentite`, `SecurityConfig` |
| RG-02-07 | Chaque envoi remet le statut à EN_ATTENTE, efface le motif de rejet et remplace les fichiers précédents. Un dossier **VALIDEE** est figé : ni la pièce, ni le selfie ne se remplacent (422). | idem |
| RG-02-08 | Décision de la modération : VALIDEE ou REJETEE. **Motif obligatoire en cas de rejet** (≤ 255 caractères). La modération ne peut valider qu'un dossier complet (422 « Le selfie de vérification est manquant. ») et une pièce non expirée (422). Un modérateur ne peut pas traiter le dossier d'un autre modérateur ; personne ne traite celui d'un administrateur. La date de décision et son auteur sont enregistrés. | `UserServiceImpl.validerPieceIdentite` |
| RG-02-09 | Un email est envoyé au titulaire à chaque décision (« vous pouvez maintenant publier » ou « Motif : … »). | idem |
| RG-02-10 | Le dossier VALIDEE est **obligatoire pour publier**, pour tous les rôles, y compris les agents, qui font vérifier leur propre identité (DEC-08). | `BienImmoServiceImpl.create` |
| RG-02-11 | Motifs de rejet proposés dans l'app (saisie libre possible) : document illisible, expiré, incomplet ou recadré, nom différent de celui du compte, fraude suspectée, selfie flou ou trop sombre, visage non visible ou couvert, pièce non visible sur le selfie, visage ne correspondant pas à la pièce, photo d'écran ou photo d'une photo. | `app/(tabs)/administration/users/[id].tsx` |
| RG-02-12 | **Délai de traitement** (DEC-25) : la modération s'engage à traiter 90 % des dossiers en **72 h au plus** ; la file est triée du plus ancien au plus récent, et le délai est annoncé à l'utilisateur après l'envoi. | `UserRepository.findByStatutPieceIdentiteOrderByDateEnvoiVerificationAsc` |
| RG-02-13 | **Conservation** (DEC-26) : les fichiers (recto, verso, selfie) sont supprimés **30 jours après la décision** (validation ou rejet), en gardant le type, le numéro, le statut, les dates et l'auteur de la décision. | `PurgeConservationService.purgerFichiersVerification` |

### 4.3 Selfie (EVO-01)

| ID | Règle |
|---|---|
| RG-02-23 | **Contenu** : photo du visage du titulaire, de face et découvert (sans lunettes de soleil, masque ni couvre-chef cachant le visage), **tenant sa pièce d'identité à côté du visage**, face lisible tournée vers l'objectif. |
| RG-02-24 | **Capture en direct uniquement** : dans l'app, le selfie est pris avec l'appareil photo (caméra frontale par défaut, bascule possible) ; l'import depuis la galerie n'est pas proposé. Sur ordinateur, le site utilise la webcam du navigateur ; sans caméra, il invite à utiliser l'application Android ou un téléphone. L'API ne peut pas prouver qu'une photo a été prise en direct : la modération reste le contrôle final. |
| RG-02-25 | **Guidage** : un écran rappelle les consignes (lumière suffisante, visage entier, pièce lisible à côté du visage, pas de photo d'écran) ; pendant la prise de vue, un cadre indique où placer le visage et la pièce ; après la prise, un aperçu propose « Reprendre » ou « Utiliser cette photo ». La permission caméra est demandée au moment de la prise de vue. |
| RG-02-27 | **Format** : image JPEG, au moins 720 px sur le petit côté, au plus 10 Mo et 50 Mpx. L'API réencode l'image, ce qui supprime les métadonnées (dont la position GPS). |
| RG-02-29 | **Contrôle par la modération** : le visage du selfie correspond à la photo de la pièce ; la pièce tenue est bien celle envoyée ; le nom de la pièce correspond à celui du compte ; le selfie n'est pas une photo d'écran ou la photo d'une photo. |
| RG-02-32 | **Accès et usage** : le selfie n'est visible que par le titulaire et la modération. Il n'est jamais affiché publiquement, ni utilisé comme photo de profil, ni transmis à un tiers. La comparaison est **humaine** : aucun traitement automatique de reconnaissance faciale, qui ferait du selfie une donnée biométrique (SFG §11.1). |
| RG-02-33 | **Comptes antérieurs au selfie** (DEC-07) : un dossier déjà VALIDEE reste valide. Un dossier EN_ATTENTE sans selfie apparaît avec la mention « Selfie manquant », ne peut pas être validé, et accepte l'envoi du selfie seul (`POST /api/users/me/selfie`). |

### 4.4 Présence

| ID | Règle | Source |
|---|---|---|
| RG-02-14 | Un utilisateur est « en ligne » si sa dernière requête authentifiée date de moins de **2 minutes**. Sinon il est « hors ligne », avec la date de dernière activité connue depuis le démarrage du serveur (suivi en mémoire). | `PresenceTracker.java` |
| RG-02-15 | Seuls le titulaire, la modération et les personnes ayant une conversation avec lui peuvent consulter sa présence. | `PresenceService.java` |

### 4.5 Export des données (droit d'accès et portabilité)

| ID | Règle | Source |
|---|---|---|
| RG-02-16 | `GET /api/users/me/export` renvoie un fichier `mes-donnees-anoventix.json`, non mis en cache, contenant : date de l'export ; profil (sans mot de passe ni jetons ; date et version des CGU acceptées) ; dossier de vérification (type, numéro, statut, dates, présence du verso et du selfie, date d'expiration, sans les fichiers) ; fiche d'entreprise ; annonces (URL des photos, motif de modération, historique des modifications, l'auteur d'une modification de la modération n'étant pas nommé) ; favoris ; conversations et messages (indicateur « de moi », contenu remplacé si supprimé par la modération) ; signalements d'annonces et de messages posés ; avertissements reçus (sans l'identité du modérateur) ; licences. | `ExportDonneesService.java` |

### 4.6 Suppression du compte, anonymisation et comptes inactifs

| ID | Règle | Source |
|---|---|---|
| RG-02-17 | Un administrateur ou un modérateur ne peut pas supprimer son propre compte. | `UserServiceImpl.deleteMyAccount` |
| RG-02-18 | **Demande de suppression** : toutes les annonces actives du titulaire passent hors ligne, le compte passe INACTIF (motif « Suppression demandée par l'utilisateur ») et la date de la demande est enregistrée. Pour un professionnel, l'entreprise est désactivée et ses agents actifs passent INACTIF (motif « Compte de l'entreprise supprimé »), avec leurs annonces. | `CompteSuppressionService.demanderSuppression` |
| RG-02-19 | **Délai de grâce de 30 jours** : réactivation possible par le titulaire (module 01, RG-01-26 à RG-01-28). | `User.DELAI_GRACE_SUPPRESSION_JOURS` |
| RG-02-20 | **Anonymisation** (tâche de 03:30, au-delà de 30 jours, compte toujours INACTIF) : pour un professionnel, ses agents et son entreprise sont traités avec lui. Annonces désactivées et photos effacées ; photo de profil, pièce (recto, verso) et selfie supprimés ; email remplacé par `supprime-<aléatoire>@anonyme.invalid`, nom « Utilisateur supprimé », téléphone et pièce effacés, mot de passe aléatoire, favoris, appareils de notification et alertes de recherche supprimés, `date_suppression_definitive` renseignée. Le compte disparaît des listes et des statistiques. La suppression par un administrateur applique le même traitement, immédiatement. | `CompteSuppressionService.effacerCompteEtEntreprise` |
| RG-02-21 | Toute décision de statut prise par la modération annule une suppression en cours (la date de demande est effacée). | `UserServiceImpl.updateStatut` |
| RG-02-22 | Les messages échangés sont conservés, rattachés au compte anonymisé. Aucun email n'est envoyé au compte anonymisé. | `EmailNotificationService.java` |
| RG-02-40 | **Comptes inactifs** (SFG §11.2) : tâche quotidienne (03:45). Un compte sans connexion depuis **2 ans** reçoit un email (E23) annonçant sa suppression ; sans connexion dans les **3 mois** suivants, il est anonymisé comme en RG-02-20 (avec son entreprise pour un professionnel). Une connexion ou un rafraîchissement de session annule la relance (module 01, RG-01-21). Les comptes du staff, les comptes non activés et ceux dont la suppression est déjà en cours ne sont pas concernés. | `InactiviteComptesService.java` |

### 4.7 Profil public d'un particulier (DEC-21)

| ID | Règle | Source |
|---|---|---|
| RG-02-38 | `GET /api/users/{id}/profil-public` (public) renvoie : prénom, **initiale du nom**, photo de profil, « membre depuis » (mois et année), mention « Identité vérifiée » si le dossier est VALIDEE, et les annonces **visibles** du compte, paginées. Jamais de téléphone, d'email ni de statut. | `UserController`, `ProfilPublicDTO` |
| RG-02-39 | Le profil est accessible depuis la carte annonceur des annonces d'un particulier. Pour un professionnel ou un agent, la carte mène à la page de l'agence (module 07). Un compte suspendu, désactivé, anonymisé ou du staff répond 404. | idem |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Mon profil | `app/(tabs)/profile.tsx` | Avatar et photo, identité, rôle, « Mes informations », dossier de vérification (type, numéro, date d'expiration, recto, verso, selfie, statut, motif de rejet, « Voir le document »), menu (Gérer mes annonces, Ma licence, Mes alertes, Mes signalements, notifications, Changer mon mot de passe, Contacter le support, CGU, Politique de confidentialité), « Exporter mes données », « Supprimer mon compte », « Se déconnecter ». Bandeau « Compte limité » si les annonces sont masquées ou la publication bloquée. |
| Vérification d'identité | formulaire dans `app/(tabs)/profile.tsx`, `src/features/profile/SelfieCapture.tsx` | Type de pièce, numéro, date d'expiration (JJ/MM/AAAA), photo du recto, photo du verso (obligatoire pour la carte et le permis), selfie pris avec l'appareil photo, puis « Envoyer ». États affichés : à compléter, selfie manquant, en attente (délai annoncé), validé, refusé avec motif. |
| Mes informations | `app/edit-profile.tsx` | Prénom, nom, téléphone → « Profil mis à jour avec succès ! » |
| Profil public d'un particulier | `app/profil/[userId].tsx` | Avatar, prénom et initiale, « membre depuis », « Identité vérifiée », annonces visibles. |
| Modération des dossiers | `administration/pieces-identite.tsx`, `administration/users/[id].tsx` (module 10) | Recto et selfie côte à côte, avec zoom, puis verso ; date d'expiration (« Expirée » en rouge si elle est passée) ; liste de contrôle de RG-02-29 ; motifs de RG-02-11 ; mention « Selfie manquant » et validation désactivée si le dossier est incomplet. |

## 6. API

| Méthode | URL | Accès | Description |
|---|---|---|---|
| GET | `/api/users/me` | connecté | Mon profil (`UserDTO`) |
| PUT | `/api/users/me` | connecté | Modifier mon profil |
| PUT | `/api/users/me/photo` | connecté | Photo de profil (multipart `file`) |
| POST | `/api/users/me/piece-identite` | connecté | Dossier : multipart `file` (recto), `verso`, `selfie`, `typePieceIdentite`, `numeroPieceIdentite`, `dateExpiration` → 201 ; 400 (fichier manquant, type inconnu, pièce expirée) ; 422 (dossier déjà validé) |
| POST | `/api/users/me/selfie` | connecté | Selfie seul pour un dossier EN_ATTENTE sans selfie → 201 ; 422 dans tout autre cas |
| GET | `/api/users/{id}/piece-identite` | titulaire / modération | Recto (`no-store`) |
| GET | `/api/users/{id}/piece-identite/verso` | titulaire / modération | Verso (`no-store`) |
| GET | `/api/users/{id}/selfie` | titulaire / modération | Selfie (`no-store`) |
| PUT | `/api/users/{id}/piece-identite/statut` | modération | `{statut, motifRejet}` ; 422 si le selfie manque ou si la pièce est expirée |
| GET | `/api/admin/pieces-identite/en-attente` | modération | File des dossiers, du plus ancien au plus récent |
| GET | `/api/users/{id}/presence` | voir RG-02-15 | `{userId, status: ONLINE/OFFLINE, lastSeenAt}` |
| GET | `/api/users/me/export` | connecté | Export JSON |
| DELETE | `/api/users/me` | connecté (hors staff) | Demande de suppression → 204 |
| GET | `/api/users/{id}/profil-public` | public | Profil public d'un particulier (RG-02-38) |
| GET | `/api/users/{id}` | modération | Compte par id (fiche de l'administration) |

## 7. Données

`account` : `nom`, `prenom`, `telephone`, `photo_profil`, `type_piece_identite`, `numero_piece_identite`, `piece_identite_url`, `piece_identite_verso_url`, `date_expiration_piece`, `selfie_url`, `statut_piece_identite`, `motif_rejet_piece_identite` (≤ 255), `date_envoi_verification`, `date_decision_verification`, `decision_verification_par`, `date_suppression_demandee`, `date_suppression_definitive`, `derniere_connexion`, `date_relance_inactivite`.

## 8. Statuts du dossier de vérification

```
(aucun) ──envoi recto (+ verso) + selfie──► EN_ATTENTE ──validation──► VALIDEE (figé)
                                                │
                                                └──rejet + motif──► REJETEE ──nouvel envoi complet──► EN_ATTENTE
EN_ATTENTE sans selfie (dossier antérieur au selfie) ──ajout du selfie seul──► EN_ATTENTE (complet)
Décision + 30 jours : fichiers supprimés, statut et dates conservés
```

## 9. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-02-01 | Sans dossier VALIDEE, la création d'annonce renvoie 422 « Votre pièce d'identité doit être validée… » et l'app affiche un bandeau explicatif avant l'assistant de publication. |
| CA-02-02 | Après validation, toute tentative de changer le nom ou le numéro de pièce renvoie 400. |
| CA-02-03 | Un utilisateur A ne peut pas télécharger la pièce, le verso ou le selfie de l'utilisateur B (403) ; une requête directe sur `/uploads/private/…` est refusée. |
| CA-02-04 | L'export ne contient ni mot de passe, ni jeton, ni code de réinitialisation, ni fichier de vérification. |
| CA-02-05 | Une suppression demandée par un professionnel désactive immédiatement l'entreprise et tous ses agents, et retire leurs annonces du public. |
| CA-02-06 | Un envoi sans selfie, ou une carte d'identité sans verso, renvoie 400 ; une pièce dont la date d'expiration est passée est refusée à l'envoi et ne peut pas être validée (422). |
| CA-02-07 | Dans l'app, l'étape selfie n'ouvre que l'appareil photo : aucun accès à la galerie n'est proposé. |
| CA-02-08 | Valider un dossier sans selfie renvoie 422 « Le selfie de vérification est manquant. » ; l'écran de modération désactive le bouton « Valider ». |
| CA-02-09 | Un selfie envoyé avec des coordonnées GPS dans ses métadonnées est stocké sans aucune métadonnée. |
| CA-02-10 | À l'anonymisation d'un compte, la pièce, le verso et le selfie sont supprimés du disque ; les dates d'envoi et de décision restent. |
| CA-02-11 | Après une décision, le dossier porte la date d'envoi, la date de décision et l'auteur ; 30 jours plus tard, ses fichiers sont supprimés. |
| CA-02-12 | Le profil public d'un particulier affiche « Aminata D. », sans téléphone ni email ; le profil d'un compte suspendu répond 404. |
| CA-02-13 | Un compte sans connexion depuis 2 ans reçoit une seule relance ; s'il se connecte, la relance est annulée ; sinon il est anonymisé 3 mois plus tard. |
