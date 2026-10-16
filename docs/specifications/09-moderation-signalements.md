# Module 09 — Modération et signalements

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Garantir la qualité et la sécurité du contenu **a posteriori** : les annonces sont publiées sans validation préalable, puis les utilisateurs signalent les contenus problématiques, et l'équipe de modération masque, rejette ou remet en ligne les annonces, supprime les messages abusifs et sanctionne les comptes (avertissements, suspension, masquage de toutes les annonces d'un compte). La validation des pièces d'identité est décrite au module 02.

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

### 4.3 Décisions sur les annonces

| ID | Règle | Source |
|---|---|---|
| RG-09-11 | **Masquer** : statut MASQUEE, `actif = false`, motif obligatoire (≤ 500 caractères) enregistré sur l'annonce et dans l'historique, email au propriétaire. | `AdminServiceImpl.java:196-209, 290-299` |
| RG-09-12 | **Rejeter** : statut REJETEE, `actif = false`, même gestion du motif et de l'email. Décrit comme « définitif » mais réversible par la modération (ECART-17). | `AdminServiceImpl.java:213-226` |
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
| RG-09-20 | La modération peut lire toute la conversation, messages supprimés compris. | `AdminServiceImpl.java:510-513` |

### 4.5 Avertissements et statut des comptes

| ID | Règle | Source |
|---|---|---|
| RG-09-21 | Avertissement : motif obligatoire (≤ 200 caractères). Le **niveau dépend du rang** : 1er LÉGER, 2e MODÉRÉ, 3e et suivants GRAVE, sans expiration. Motifs proposés : annonces non conformes, comportement abusif, fraude avérée, avertissements répétés, ou texte libre. | `AdminServiceImpl.java:417-460` |
| RG-09-22 | Au niveau GRAVE, un compte qui n'est pas déjà SUSPENDU est **suspendu automatiquement** (« Suspension automatique suite à N avertissements. »). | idem |
| RG-09-23 | Interdits : s'avertir soi-même, avertir un administrateur ; seul un administrateur avertit un modérateur. | idem |
| RG-09-24 | L'utilisateur averti **n'est pas prévenu** (pas d'email) ; il voit le nombre d'avertissements sur son profil et son tableau de bord (ECART-24). | — |
| RG-09-25 | Changement de statut (ACTIF, SUSPENDU, INACTIF ; EN_ATTENTE_ACTIVATION n'est pas filtré) avec un motif facultatif ; interdit sur un administrateur, et sur un modérateur sauf par un administrateur. Toute décision annule une suppression RGPD en cours. Pas d'email au titulaire. | `UserServiceImpl.java:310-329` |

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

## 10. Écarts propres au module

ECART-03, ECART-17, ECART-24, ECART-26, ECART-27, ECART-29, ECART-35 (aucune modération préalable, aucune détection de doublons).
