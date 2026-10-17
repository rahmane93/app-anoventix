# Module 09 — Modération et signalements

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Garantir la qualité et la sécurité du contenu **a posteriori** : les annonces sont publiées sans validation préalable, puis les utilisateurs signalent les contenus problématiques, et l'équipe de modération masque, rejette ou remet en ligne les annonces, supprime les messages abusifs et sanctionne les comptes (avertissements, suspension, masquage de toutes les annonces d'un compte). La validation des pièces d'identité (🆕 et des selfies, EVO-01) est décrite au module 02.

Hors périmètre (non implémenté) : modération avant publication et détection automatique (doublons, mots-clés, photos réutilisées, ECART-35) ; seuil de signalements déclenchant un masquage automatique ; suspension temporaire avec date de fin ; procédure de recours ou de contestation ; journal d'audit consultable (ECART-63) ; information du signaleur (ECART-26) ; objectifs de délai de traitement (SFG §1.2).

## 2. Acteurs et droits

| Action | Utilisateur | Modérateur | Admin |
|---|---|---|---|
| Signaler une annonce, retirer son signalement, voir ses signalements | ✅ | — | — |
| Signaler un message | ✅ (participant) | — | — |
| Traiter, supprimer un signalement | — | ✅ | ✅ |
| Masquer, rejeter, remettre en ligne une annonce | — | ✅ | ✅ |
| Supprimer un message, classer un signalement de message, lire une conversation | — | ✅ | ✅ |
| Émettre un avertissement | — | ✅ (pas sur un modérateur ni un admin) | ✅ (pas sur un admin) |
| Changer le statut d'un compte | — | ✅ (pas sur un modérateur ni un admin) | ✅ (pas sur un admin) |
| Masquer / réafficher toutes les annonces d'un compte | — | ❌ | ✅ (pas sur un admin) |

## 3. User stories

| ID | User story |
|---|---|
| US-09-01 | En tant qu'utilisateur, je signale une annonce en choisissant un motif et en ajoutant un commentaire facultatif (≤ 500 caractères). |
| US-09-02 | En tant qu'utilisateur, je consulte « Mes signalements » avec leur statut et je retire un signalement. |
| US-09-03 | En tant que modérateur, je traite la file des signalements : je décide de masquer, rejeter ou remettre en ligne l'annonce, ou je classe sans suite, avec une note interne facultative. |
| US-09-04 | En tant que modérateur, je masque ou rejette une annonce avec un motif communiqué au propriétaire. |
| US-09-05 | En tant que modérateur, je traite les messages signalés : supprimer le contenu ou classer le signalement, et je consulte la conversation complète. |
| US-09-06 | En tant que modérateur, j'émets un avertissement gradué ; au 3e, le compte est suspendu automatiquement. |
| US-09-07 | En tant qu'administrateur, je masque d'un coup toutes les annonces d'un compte problématique, puis je lève ce masquage. |

## 4. Règles de gestion

### 4.1 Signalement d'annonce

| ID | Règle | Source |
|---|---|---|
| RG-09-01 | Seule une annonce **visible publiquement** peut être signalée, et pas par son propriétaire. | `BienImmoServiceImpl.java:434-441` |
| RG-09-02 | **Un seul signalement par (annonce, utilisateur)** (contrainte en base). Un signalement actif bloque un nouveau signalement (« Vous avez déjà signalé cette annonce. ») ; un signalement retiré est rouvert (EN_ATTENTE, décision effacée). | `BienImmoServiceImpl.java:445-461`, `Signalement.java:13-16` |
| RG-09-03 | Motifs : contenu inapproprié, déjà vendu / loué, arnaque / fraude, annonce en double, infos incorrectes, mauvaise catégorie, problème de localisation, autre. Le **libellé** est enregistré (et non le code), libellé « Conenu inaproprié » compris (ECART-26). | `MotifSignalement.java`, `BienImmoServiceImpl.java:462` |
| RG-09-04 | Retrait : le signaleur annule son signalement actif (retrait logique avec date). | `BienImmoServiceImpl.java:469-479` |
| RG-09-05 | « Mes signalements » montre le statut et la date de traitement, mais ni l'identité du modérateur ni sa note interne. | `BienImmoServiceImpl.java:483-504` |

### 4.2 Traitement des signalements

| ID | Règle | Source |
|---|---|---|
| RG-09-06 | Un signalement EN_ATTENTE passe à TRAITE ou IGNORE, une seule fois, avec l'auteur, la date et une note interne facultative. | `AdminServiceImpl.java:164-181` |
| RG-09-07 | Le traitement **ne modifie pas l'annonce** : l'app enchaîne deux appels (décision sur l'annonce, puis clôture du signalement). En cas d'échec du second, elle affiche « L'annonce a bien été modérée, mais le signalement n'a pas été clos » (ECART-26). | `app/(tabs)/administration/signalements.tsx` |
| RG-09-08 | Décisions proposées dans l'app : Masquer (« Retirée du public temporairement »), Rejeter (« Retirée définitivement »), Remettre en ligne (« Annule un masquage ou un rejet »), Classer sans suite (« Signalement infondé »). Le motif est obligatoire pour masquer ou rejeter et il est affiché au propriétaire. | idem |
| RG-09-09 | La suppression d'un signalement est **physique** et irréversible. | `AdminServiceImpl.java:185-190` |
| RG-09-10 | Le signaleur n'est pas prévenu de la décision. | — |
| RG-09-26 | **Ordre de la file** : signalements triés du plus récent au plus ancien, une carte par signalement. Plusieurs signalements de la même annonce ne sont ni regroupés ni comptés, et aucune priorité n'est donnée aux motifs graves (arnaque / fraude) : les signalements les plus anciens descendent en fin de file (ECART-26). | `SignalementRepository.java:36` |

### 4.3 Décisions sur les annonces

| ID | Règle | Source |
|---|---|---|
| RG-09-11 | **Masquer** : statut MASQUEE, `actif = false`, motif obligatoire (≤ 500 caractères) enregistré sur l'annonce et dans l'historique, email au propriétaire. | `AdminServiceImpl.java:196-209, 290-299` |
| RG-09-12 | **Rejeter** : statut REJETEE, `actif = false`, même gestion du motif et de l'email. Décrit comme « définitif » mais réversible par la modération (ECART-17) ; 🆕 définitif avec DEC-10 (RG-09-32). | `AdminServiceImpl.java:213-226` |
| RG-09-13 | **Remettre en ligne** : statut PUBLIEE, motif effacé ; si l'annonce n'est pas clôturée, `actif = true` et nouvelle validité de 180 jours ; email au propriétaire. Aucun contrôle de quota ni de licence. | `AdminServiceImpl.java:230-246` |
| RG-09-14 | Le propriétaire ne peut ni réafficher ni **corriger** une annonce masquée ou rejetée (ECART-03) ; l'app l'invite à « contacter le support ». | `BienImmoServiceImpl.java:161, 376-389` |
| RG-09-15 | **Masquage système d'un compte** (admin) : motif obligatoire ; drapeau posé sur le compte sans modifier les annonces ; elles disparaissent de toutes les vues publiques ; publier, modifier et gérer les photos sont refusés au titulaire ; email au titulaire. La levée rend à chaque annonce sa visibilité antérieure. Ne s'applique pas aux annonces des autres membres de l'entreprise. Les relances d'expiration sont suspendues pendant le masquage. | `AdminServiceImpl.java:250-287`, `MasquageCompte.java` |

### 4.4 Signalement et modération des messages

| ID | Règle | Source |
|---|---|---|
| RG-09-16 | Règles de signalement d'un message : module 06, RG-06-10. | — |
| RG-09-17 | File de modération : messages signalés non supprimés, avec l'annonce, l'auteur, le signaleur, le motif et la date. | `AdminServiceImpl.java:477-480` |
| RG-09-18 | **Supprimer** : le contenu est conservé en base mais remplacé à l'affichage par « [Message supprimé par la modération] » ; auteur et date de la suppression enregistrés. | `AdminServiceImpl.java:484-494` |
| RG-09-19 | **Classer** : le message redevient non signalé (le motif, la date et le signaleur restent en base) ; il peut être signalé à nouveau. | `AdminServiceImpl.java:498-506` |
| RG-09-20 | La modération peut lire toute la conversation, messages supprimés compris. L'API ne vérifie pas que la conversation contient un message signalé : **toute conversation** est lisible à partir de son identifiant, sans journalisation (module 06, RG-06-19, ECART-60). | `AdminServiceImpl.java:510-513` |

### 4.5 Avertissements et statut des comptes

| ID | Règle | Source |
|---|---|---|
| RG-09-21 | Avertissement : motif obligatoire (≤ 200 caractères). Le **niveau dépend du rang** : 1er LÉGER, 2e MODÉRÉ, 3e et suivants GRAVE, sans expiration. Motifs proposés : annonces non conformes, comportement abusif, fraude avérée, avertissements répétés, ou texte libre. | `AdminServiceImpl.java:417-460` |
| RG-09-22 | Au niveau GRAVE, un compte qui n'est pas déjà SUSPENDU est **suspendu automatiquement** (« Suspension automatique suite à N avertissements. »). | idem |
| RG-09-23 | Interdits : s'avertir soi-même, avertir un administrateur ; seul un administrateur avertit un modérateur. | idem |
| RG-09-24 | L'utilisateur averti **n'est pas prévenu** (pas d'email) ; il voit le nombre d'avertissements sur son profil et son tableau de bord (ECART-24). | — |
| RG-09-25 | Changement de statut (ACTIF, SUSPENDU, INACTIF ; EN_ATTENTE_ACTIVATION n'est pas filtré) avec un motif facultatif ; interdit sur un administrateur, et sur un modérateur sauf par un administrateur. Toute décision annule une suppression RGPD en cours. Pas d'email au titulaire. Le titulaire perd l'accès dès sa requête suivante (module 01, RG-01-28), mais **ses annonces ne sont pas modifiées et restent visibles du public** ; il en va de même pour la suspension automatique de RG-09-22 (ECART-52). | `UserServiceImpl.java:310-329` |
| RG-09-27 | Une suspension n'a **pas de durée** : elle dure jusqu'à sa levée manuelle. Le motif est facultatif et le titulaire n'est pas prévenu (module 01, RG-01-31). | `UserServiceImpl.java:310-329` |
| RG-09-28 | **Aucune voie de recours** : un propriétaire dont l'annonce est masquée ou rejetée, ou un compte suspendu, ne peut que contacter le support par email ; aucune demande de réexamen n'est tracée (ECART-03). | `APP/app/annonce/[id].tsx` (bandeau propriétaire) |
| 🆕 RG-09-29 | **Cible DEC-01** : la suspension et la désactivation retirent les annonces du compte du public (SFG §8, RG-01-35) ; combiner suspension et masquage système n'est plus nécessaire pour couper la visibilité d'un fraudeur. | DEC-01 |
| 🆕 RG-09-30 | **Cible DEC-02** : accès de la modération limité aux conversations contenant un message signalé, chaque lecture journalisée (module 06, RG-06-21). | DEC-02 |
| 🆕 RG-09-31 | **Cible DEC-09 — file « Réexamens »** : annonces masquées dont le propriétaire a demandé un réexamen, de la plus ancienne à la plus récente, avec le motif initial, le message du propriétaire et l'historique des modifications depuis le masquage. Décisions : remettre en ligne, maintenir le masquage (nouveau motif obligatoire) ou rejeter (module 03, RG-03-32). | DEC-09 |
| 🆕 RG-09-32 | **Cible DEC-10 — rejet définitif** : une annonce REJETEE ne peut plus être remise en ligne, ni par `publier` (refus 409 « Une annonce rejetée ne peut pas être remise en ligne. »), ni par `toggle-actif`. L'app retire l'action « Remettre en ligne » des annonces rejetées et le libellé « Annule un masquage ou un rejet » devient « Annule un masquage ». Le propriétaire peut seulement la supprimer. Le rejet est réservé aux infractions graves (fraude, contenu illicite) ; une annonce corrigeable est masquée. | DEC-10 |
| 🆕 RG-09-33 | **Cible DEC-11 — masquage automatique** : dès qu'une annonce visible reçoit **3 signalements « arnaque / fraude »** en attente et non retirés, de signaleurs distincts (seuil réglable : `moderation.seuil-masquage-auto`), elle est masquée automatiquement avec le motif « Masquée automatiquement après plusieurs signalements, en attente de vérification ». L'historique indique l'auteur « Système » ; le propriétaire reçoit l'email E6 avec ce motif. | DEC-11 |
| 🆕 RG-09-34 | Les signalements restent EN_ATTENTE. L'annonce passe **en tête de la file** des signalements avec la mention « Masquée automatiquement ». La décision de la modération clôt tous ses signalements en une fois : remise en ligne (signalements classés IGNORE), maintien du masquage ou rejet (signalements TRAITE). | DEC-11, ECART-26 |
| 🆕 RG-09-35 | Une annonce masquée automatiquement est, comme toute annonce masquée, corrigeable par son propriétaire, qui peut demander un réexamen (DEC-09). Une annonce remise en ligne par la modération après un masquage automatique n'est plus masquée automatiquement par les signalements antérieurs à cette décision. | DEC-11 |

### 4.6 Comparaison des sanctions

| Sanction | Qui | Accès du titulaire | Annonces visibles | Publication / modification | Email au titulaire | Levée |
|---|---|---|---|---|---|---|
| Avertissement (1er, 2e) | Modération | ✅ | ✅ | ✅ | ❌ (ECART-24) | Aucune (sans expiration) |
| Avertissement (3e et suivants) | Modération | ❌ suspension automatique | ✅ (ECART-52) | ❌ (pas d'accès) | ❌ | Levée de la suspension |
| Masquage / rejet d'une annonce | Modération | ✅ | ❌ pour cette annonce | Annonce non modifiable (ECART-03) | ✅ (E6, E7) | Modération (« remettre en ligne ») |
| Suspension du compte | Modération | ❌ | ✅ (ECART-52) | ❌ | ❌ | Modération |
| Désactivation du compte (INACTIF) | Modération | ❌ (non réactivable par le titulaire) | ✅ (ECART-52) | ❌ | ❌ | Modération |
| Masquage système du compte | Admin | ✅ | ❌ toutes | ❌ | ✅ (E9) | Admin (E10) |
| Suppression du compte | Admin | ❌ définitif | ❌ (DESACTIVEE) | ❌ | ❌ | Aucune |

> Seul le masquage système retire les annonces du public sans supprimer le compte. Combiner une suspension et un masquage système est aujourd'hui la seule façon de couper à la fois l'accès et la visibilité d'un fraudeur.
>
> 🆕 Avec DEC-01, la suspension et la désactivation retirent aussi les annonces du public (RG-09-29).

### 4.7 Traçabilité des décisions

| Décision | Auteur enregistré | Date | Motif | Source |
|---|---|---|---|---|
| Masquer, rejeter, remettre en ligne une annonce | ✅ (historique de l'annonce) | ✅ | ✅ | RG-03-16 |
| Traiter un signalement | ✅ `traite_par` | ✅ | note interne facultative | RG-09-06 |
| Supprimer un message | ✅ `supprime_par` | ✅ | — | RG-09-18 |
| Émettre un avertissement | ✅ `emit_par` | ✅ | ✅ | RG-09-21 |
| Changer le statut d'un compte | ❌ | ❌ | facultatif (`motif_statut`, écrasé à chaque décision) | RG-09-25 |
| Masquer les annonces d'un compte | ❌ | ✅ | ✅ | RG-09-15 |
| Valider ou rejeter une pièce d'identité | ❌ (🆕 ✅ avec EVO-01, RG-02-31) | ❌ (🆕 ✅) | rejet seulement | RG-02-08 |
| Lire une conversation | ❌ (non journalisé) | ❌ | — | RG-09-20, ECART-60 |

Aucun journal d'audit ne regroupe ces actions (ECART-63).

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Signaler (fiche) | `app/annonce/[id].tsx` | Fenêtre « Signaler cette annonce » : motif, commentaire facultatif, « Signalement envoyé, merci ! » |
| Mes signalements | `app/mes-signalements.tsx` | Liste, statut, « Retirer ce signalement » |
| Admin > Signalements | `app/(tabs)/administration/signalements.tsx` | Filtre (en attente par défaut), carte par signalement, fenêtre « Décider du signalement », note interne, suppression |
| Admin > Annonces | `app/(tabs)/administration/annonces.tsx` | Onglets Publiées, Masquées, Rejetées, Clôturées, Désactivées ; recherche (titre, référence, propriétaire) ; actions masquer, rejeter, remettre en ligne, activer ou désactiver ; mention « Compte masqué » |
| Admin > Messages signalés | `app/(tabs)/administration/messages.tsx`, `messages/[id].tsx` | File, « Supprimer le message », « Message conforme, classer le signalement », conversation complète |
| Admin > Fiche utilisateur | `app/(tabs)/administration/users/[id].tsx` | Avertissements (historique, émettre), statut du compte avec motif, masquage des annonces, pièce d'identité, rôle, suppression |

## 6. API

| Méthode | URL | Accès |
|---|---|---|
| POST / DELETE | `/api/biens-immo/{id}/signaler` | connecté |
| GET | `/api/biens-immo/user/signalements` | connecté |
| GET | `/api/admin/signalements?statut=` | modération (renvoie une `Page` Spring brute) |
| PUT | `/api/admin/signalements/{id}/traiter` `{statut, noteAdmin}` | modération |
| DELETE | `/api/admin/signalements/{id}` | modération |
| PUT | `/api/admin/annonces/{id}/masquer?raison=` · `/rejeter?raison=` · `/publier` | modération |
| GET | `/api/admin/annonces/{id}/historique` | modération (non utilisé par l'app) |
| PUT | `/api/admin/utilisateurs/{id}/annonces/masquer?raison=` · `/afficher` | admin |
| GET | `/api/admin/messages/signales` | modération |
| PUT | `/api/admin/messages/{id}/supprimer` · `/ignorer` | modération |
| GET | `/api/admin/conversations/{id}/messages` | modération |
| POST / GET | `/api/admin/utilisateurs/{id}/avertissements` | modération |
| PUT | `/api/users/{id}/statut` `{statut, motif}` | modération |

## 7. Données

`signalements` : `annonce_id`, `reporter_id` (unique ensemble), `motif` (libellé ≤ 100), `commentaire`, `date`, `annule`, `date_annulation`, `statut`, `traite_par`, `date_traitement`, `note_admin`.
`avertissements` : `utilisateur_id`, `motif` (≤ 200), `emit_par`, `niveau`, `suspendu_automatiquement`, `date`.
`annonce.motif_moderation` (≤ 500) ; `account.annonces_masquees`, `motif_masquage_annonces`, `date_masquage_annonces` (V9).

## 8. Statuts

```
Signalement :  EN_ATTENTE ──traiter──► TRAITE | IGNORE        (retrait : annule = true ; nouveau signalement : retour EN_ATTENTE)
Message :      normal ──signaler──► signalé ──supprimer──► supprimé
                                       └──classer──► normal (re-signalable)
Avertissement : 1er LEGER → 2e MODERE → 3e GRAVE (+ suspension automatique)
```

## 9. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-09-01 | Un masquage sans motif renvoie 400 « Le motif est obligatoire… » ; un motif de 501 caractères renvoie 400. |
| CA-09-02 | Après un masquage, le propriétaire reçoit un email avec le titre, la référence et le motif ; l'annonce disparaît du catalogue. |
| CA-09-03 | Le 3e avertissement suspend le compte ; la connexion suivante renvoie « Votre compte est temporairement suspendu… ». |
| CA-09-04 | Un modérateur ne peut pas avertir un autre modérateur (403). |
| CA-09-05 | Après un masquage de compte, aucune annonce du compte n'apparaît dans les résultats publics ; après la levée, seules celles qui étaient en ligne réapparaissent. |
| CA-09-06 | Masquer une annonce qui a trois signalements en attente laisse les deux autres signalements dans la file (comportement actuel, ECART-26). |
| CA-09-07 | Une annonce remise en ligne par la modération reçoit une nouvelle échéance à 180 jours, même si son propriétaire a atteint son quota ou ses annonces gratuites. |
| CA-09-08 | *Cible (ECART-63)* : la fiche d'un utilisateur suspendu indique qui l'a suspendu et quand. |
| 🆕 CA-09-09 | Le 3e signalement « arnaque / fraude » d'une annonce, par un 3e signaleur distinct, la masque aussitôt ; deux signalements « arnaque » et un « autre » ne la masquent pas. |
| 🆕 CA-09-10 | `PUT /api/admin/annonces/{id}/publier` sur une annonce rejetée renvoie 409. |
| 🆕 CA-09-11 | Remettre en ligne une annonce masquée automatiquement classe ses 3 signalements en IGNORE et la retire de la file. |

## 10. Écarts propres au module

ECART-03, ECART-17, ECART-24, ECART-26, ECART-27, ECART-29, ECART-35 (aucune modération préalable, aucune détection de doublons), ECART-52 (annonces d'un compte suspendu toujours visibles), ECART-60 (lecture de toute conversation sans trace), ECART-63 (décisions sans auteur, pas de journal d'audit).

## 11. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-01 ; Q3 → DEC-09 pour les annonces (le recours d'un compte suspendu reste ouvert) ; Q4 → DEC-11 (seuil : 3 signalements).

1. Une suspension doit-elle masquer automatiquement les annonces du compte (99 §7, question 11) ?
2. Faut-il des suspensions temporaires (7 jours, 30 jours) et une expiration des avertissements (ECART-24) ?
3. Faut-il une procédure de recours : demande de réexamen depuis l'annonce masquée ou depuis l'écran de connexion d'un compte suspendu ?
4. À partir de combien de signalements « arnaque / fraude » une annonce doit-elle être masquée automatiquement en attendant la décision ?
5. Quels délais de traitement viser pour les signalements et les messages signalés, et qui les suit ?
