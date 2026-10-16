# Module 03 — Annonces et biens immobiliers

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Gérer le cycle de vie complet d'une annonce immobilière : création par un assistant, modification, photos, mise hors ligne et remise en ligne, clôture (vendu, loué, retiré), expiration automatique, suppression, historique et compteur de vues. L'entité `BienImmo` couvre tous les types de biens (habitations, terrains, locaux).

Les règles de licence et de quota appelées ici sont détaillées au module 08 ; la modération (masquage, rejet) au module 09.

## 2. Acteurs et droits

| Action | Propriétaire | PRO parent (annonce d'un de ses agents) | Modérateur / admin |
|---|---|---|---|
| Créer | ✅ (conditions RG-03-01) | — | ⚠️ API seulement, pas d'écran |
| Modifier (contenu, photos) | ✅ si l'annonce est en ligne | ❌ | ✅ |
| Masquer / réafficher (`toggle-actif`) | ✅ | ✅ | ✅ |
| Clôturer / réactiver après clôture | ✅ | ❌ | ❌ |
| Supprimer | ✅ | ❌ | ✅ |
| Voir les statistiques de vues | ✅ | ✅ | ✅ |
| Voir l'historique | ✅ | ❌ | ✅ |

> L'incohérence des droits du PRO parent est relevée en **ECART-13**.

## 3. User stories

| ID | User story |
|---|---|
| US-03-01 | En tant qu'annonceur vérifié, je publie une annonce en 5 étapes : Photos → Type → Lieu → Détails → Aperçu. |
| US-03-02 | En tant qu'annonceur, je modifie le contenu et les photos de mon annonce. |
| US-03-03 | En tant qu'annonceur, je masque temporairement mon annonce puis la réaffiche. |
| US-03-04 | En tant qu'annonceur, je clôture mon annonce en indiquant si le bien est vendu, loué ou retiré, et je peux la remettre en ligne plus tard. |
| US-03-05 | En tant qu'annonceur, je suis prévenu 7 jours avant l'expiration de mon annonce et je la prolonge gratuitement après son expiration. |
| US-03-06 | En tant qu'annonceur, je supprime une annonce dont je n'ai plus besoin. |
| US-03-07 | En tant qu'annonceur, je vois dans « Mes annonces » l'état de chacune : en ligne, masquée, clôturée, expirée, masquée ou rejetée par la modération (avec le motif), date d'expiration. |
| US-03-08 | En tant que propriétaire ou modérateur, je consulte l'historique des modifications (pas d'écran aujourd'hui : ECART-30). |

## 4. Règles de gestion

### 4.1 Création

| ID | Règle | Source |
|---|---|---|
| RG-03-01 | **Préconditions, dans cet ordre** : (1) au moins une photo ; (2) pièce d'identité VALIDEE ; (3) un PROFESSIONNEL doit avoir créé son entreprise ; (4) annonces du compte non masquées par l'admin ; (5) entreprise active et quota d'annonces actives non atteint (pro et agents) ; (6) licence (si le mode licence est actif et que les annonces gratuites sont épuisées). | `BienImmoServiceImpl.java:99-125` |
| RG-03-02 | Champs obligatoires : titre (5 à 100 caractères), description (20 à 2000), prix > 0, quartier (`localisationId` existant), type d'annonce, type de bien, documents disponibles (au moins un). L'usage est obligatoire dans l'app ; dans l'API il ne l'est pas mais la colonne est NOT NULL (ECART-09). | `AnnonceRequest.java`, `BienImmoRequest.java`, `usePublierForm.ts` |
| RG-03-03 | Champs facultatifs : prix révisé (> 0), frais d'honoraires (≥ 0, 0 par défaut), surface totale (m²), complément d'adresse, latitude et longitude (via un sélecteur de carte), nombre de pièces (1 à 100), de chambres (0 à 50), de salles de bain (0 à 50). | idem |
| RG-03-03b | **Sens du prix** : pour une VENTE, prix de vente ; pour une LOCATION ou un BAIL, **loyer mensuel** (libellé « Loyer mensuel (GNF) », suffixe « par mois » / « / mois » à l'affichage et dans les pages de partage). La périodicité n'est pas paramétrable (pas de loyer annuel ni de caution). Le **prix révisé**, s'il existe, devient le prix affiché avec un indicateur de baisse, mais l'assistant ne permet pas de le saisir et les filtres, le tri et les similaires utilisent le prix initial (ECART-42). | `src/lib/bien.ts:32-38`, `components/annonce/Prix.tsx:28-36`, `SharePageService.java` |
| RG-03-04 | Compatibilités type d'annonce → type de bien → usage : voir la SFG §6.2. Une combinaison incompatible renvoie 400. L'app ne propose que les combinaisons valides. | `BienImmoServiceImpl.java:524-533`, `features/publier/constants.ts` |
| RG-03-05 | Composition : remise à vide pour un bien non bâti (TERRAIN, DOMAINE). Pour un bien bâti, le nombre de chambres ne peut pas dépasser le nombre de pièces. | `BienImmoServiceImpl.java:540-555` |
| RG-03-06 | Documents disponibles : l'app propose TITRE_FONCIER, DONATION, ACTE_DE_VENTE, CERTIFICAT_USAGE_FONCIER, AUTRE ; l'API stocke une chaîne libre sans contrôle (ECART-35). | `constants.ts`, `Annonce.java:114` |
| RG-03-07 | À la création : statut PUBLIEE, `actif = true` (publication **immédiate, sans modération préalable**), validité de **180 jours**, identifiant public aléatoire de 12 caractères hexadécimaux. | `BienImmoServiceImpl.java:136-139`, `Annonce.java:156-163` |
| RG-03-08 | Référence : `<préfixe>-<MMjj>-<4 caractères aléatoires>` (VE, LO ou BA). L'unicité est vérifiée parmi les annonces actives seulement, alors que la base l'impose sur toutes (ECART-08). | `BienImmoServiceImpl.java:141-143`, `Utility.java:102` |

### 4.2 Photos

| ID | Règle | Source |
|---|---|---|
| RG-03-09 | 1 à **10 photos** par annonce. Création : au moins une. Ajout ultérieur : total ≤ 10. Suppression : impossible s'il ne reste qu'une photo. | `MediaService.java:55, 272-313` |
| RG-03-10 | Formats : images uniquement (type MIME `image/*`, format lisible), ≤ 50 mégapixels, ≤ 10 Mo par fichier et ≤ 100 Mo par requête. Les images sont recompressées. | `MediaService.java:96-136, 322-342`, `application.yml` |
| RG-03-11 | L'ordre des photos n'est pas modifiable ; la première photo sert de vignette et d'image de partage (ECART-49). | `Media.java` (`ordre` inutilisé) |
| RG-03-12 | Ajouter ou supprimer des photos est refusé si les annonces du compte sont masquées ; l'ajout est aussi refusé si la publication est bloquée par la licence. | `MediaService.java:236-237, 282` |

### 4.3 Modification

| ID | Règle | Source |
|---|---|---|
| RG-03-13 | Seules les annonces **en ligne** (`actif = true`) sont modifiables. Une annonce masquée par son propriétaire, clôturée, expirée, ou masquée / rejetée par la modération ne l'est pas (ECART-03). | `BienImmoServiceImpl.java:161` |
| RG-03-14 | Modification refusée si les annonces du compte sont masquées par l'admin ou si la publication est bloquée par la licence. | `BienImmoServiceImpl.java:168-169` |
| RG-03-15 | La modification ne passe pas par la validation des champs (`@Valid` absent) : bornes du titre, de la description et du prix non vérifiées par l'API (ECART-12). Les compatibilités et la composition sont revérifiées. | `BienImmoController.java:94-102` |
| RG-03-16 | **Historique** : une ligne par champ modifié, seulement pour le titre, le prix et la description (ancienne valeur, nouvelle valeur, auteur, date). Les décisions de modération ajoutent `statutModeration` et `raison`. | `BienImmoServiceImpl.java:190-195`, `AdminServiceImpl.java:544` |

### 4.4 Visibilité, clôture, expiration, suppression

| ID | Règle | Source |
|---|---|---|
| RG-03-17 | **Masquer** (`toggle-actif` sur une annonce en ligne) : `actif = false`, statut inchangé. L'annonce reste dans « Mes annonces ». | `BienImmoServiceImpl.java:365-417` |
| RG-03-18 | **Réafficher** (`toggle-actif` sur une annonce hors ligne) : interdit si REJETEE ; interdit au propriétaire si MASQUEE par la modération ou DESACTIVEE (supprimée). Pour un non-staff, les contrôles de quota, de masquage et de licence s'appliquent. La clôture éventuelle est levée et une nouvelle validité de 180 jours démarre. Un modérateur qui réaffiche une annonce DESACTIVEE la repasse PUBLIEE. | idem |
| RG-03-19 | **Clôturer** (propriétaire uniquement, annonce en ligne) : motif VENDU, LOUE ou RETIRE ; `actif = false`, date de clôture renseignée. | `BienImmoServiceImpl.java:688-699` |
| RG-03-20 | **Réactiver après clôture** (propriétaire uniquement) : l'annonce doit être clôturée et au statut PUBLIEE ; contrôles de quota, de masquage et de licence ; nouvelle validité de 180 jours. C'est aussi le chemin de **prolongation** d'une annonce expirée. | `BienImmoServiceImpl.java:703-728` |
| RG-03-21 | **Expiration** (tâche de 03:00) : 7 jours avant l'échéance, un email de relance est envoyé une seule fois (annonces PUBLIEE en ligne, compte non masqué). À l'échéance, l'annonce est clôturée avec le motif EXPIREE et le propriétaire est prévenu par email. | `AnnonceExpirationService.java:57-110` |
| RG-03-22 | **Supprimer** : depuis n'importe quel état, statut DESACTIVEE, `actif = false`, clôture effacée. L'annonce devient invisible pour son propriétaire et n'est restaurable que par la modération. Elle reste dans les favoris des autres utilisateurs (non affichée) et dans les conversations. L'app annonce une suppression « définitive ». | `BienImmoServiceImpl.java:202-220` |
| RG-03-23 | Un administrateur peut aussi masquer, rejeter ou remettre en ligne (module 09). Une remise en ligne par la modération ne réactive pas une annonce clôturée par son propriétaire. | `AdminServiceImpl.java:230-246` |

### 4.5 Vues et statistiques

| ID | Règle | Source |
|---|---|---|
| RG-03-24 | Une vue est comptée à la consultation d'une fiche accessible, **jamais pour le propriétaire**, et une seule fois par lecteur (utilisateur connecté ou adresse IP) et par 24 h. Le compteur n'augmente que si l'annonce est en ligne. | `BienImmoController.java:156-186`, `VueCountTracker.java` |
| RG-03-25 | `GET /{id}/stats` renvoie l'identifiant, la référence et le nombre de vues (propriétaire, PRO parent, modération). Aucun écran ne l'utilise (ECART-30). | `BienImmoServiceImpl.java:421-430` |

## 5. Cycle de vie d'une annonce

État = (`statutModeration`, `actif`, `motifCloture`).

```
                    création (photos + pièce validée + quota + licence)
                                   │
                                   ▼
      ┌──────────────── EN LIGNE (PUBLIEE, actif) ◄──────────────────────────────┐
      │ toggle (propriétaire)    │ clôturer (VENDU/LOUE/RETIRE)  │ job 03:00      │
      ▼                          ▼                               ▼                │
 MASQUÉE PAR LE PROPRIÉTAIRE   CLÔTURÉE                      EXPIRÉE (EXPIREE)    │
 (PUBLIEE, inactif)            (PUBLIEE, inactif, motif)     (PUBLIEE, inactif)   │
      │ toggle ────────────────────┴── réactiver / toggle ───────┴────────────────┘
      │
 Depuis tout état :
   modération « masquer » ─► MASQUEE (inactif, motif communiqué) ─► « publier » (modération) ─► en ligne
   modération « rejeter » ─► REJETEE (inactif, motif communiqué) ─► « publier » (modération) ─► en ligne
   propriétaire « supprimer » ─► DESACTIVEE (inactif) ─► toggle par la modération ─► en ligne
   admin « masquer le compte » ─► état inchangé, mais invisible au public tant que le masquage dure
```

Côté app, le statut CLOTUREE est **dérivé** quand `motifCloture` est renseigné sur une annonce PUBLIEE (`src/api/annonce.api.ts:28`). Les pastilles de « Mes annonces » (`src/lib/annonce-statut.ts`) sont : aucune pour une annonce en ligne, « Clôturée · <motif> » (y compris Expirée), « Masquée » (par la modération ou par le propriétaire), « Rejetée ». Le type `StatutAnnonce` de l'app contient encore une valeur `EN_ATTENTE` qui n'existe pas dans l'API (vestige d'une modération préalable, ECART-37).

## 6. Écrans

| Écran | Route | Contenu clé |
|---|---|---|
| Publier / modifier | `app/(tabs)/publier.tsx` + `features/publier/usePublierForm.ts` | Assistant en 5 étapes, contrôle à la sortie de chaque champ, retour à l'étape de l'erreur renvoyée par l'API, pré-remplissage en mode modification, gestion des photos existantes (ajout et suppression immédiats), carte de prévisualisation, sélecteur de position sur carte (`MapPickerModal`). Bandeau si la pièce n'est pas validée (`explore.tsx`). Garde licence (`useLicenceGate`). |
| Mes annonces | `app/(tabs)/mes-annonces.tsx` (onglet pour les agents ; pour les autres, accès depuis le profil) | Cartes avec statut, référence, date d'expiration, motif de modération ; actions Modifier, Masquer / Afficher, Clôturer (fenêtre avec motif), Réactiver, Prolonger, Supprimer (confirmation « Voulez-vous supprimer définitivement… ») ; avis « Annonces masquées » (`AnnoncesMasqueesNotice`). |
| Fiche annonce | `app/annonce/[id].tsx` | Galerie (carrousel sur mobile, mosaïque et visionneuse sur ordinateur), prix, type, localisation (« Ouvrir dans Maps »), points forts, description (« Voir plus »), documents, dates de publication et de modification, carte de l'annonceur, contact, signalement, similaires. Pour le propriétaire : « Modifier l'annonce » et bandeau d'état (masquée ou rejetée par la modération, avec message). |

## 7. API

| Méthode | URL | Accès | Description |
|---|---|---|---|
| POST | `/api/biens-immo` (multipart) | connecté | Créer (champs + `medias[]`) → 201 `BienImmoDTO` |
| PUT | `/api/biens-immo/{id}` (JSON) | propriétaire / modération | Modifier (sans les photos) |
| DELETE | `/api/biens-immo/{id}` | propriétaire / modération | Supprimer (DESACTIVEE) → 204 |
| PUT | `/api/biens-immo/{id}/toggle-actif` | propriétaire / PRO parent / modération | Masquer ou réafficher |
| PUT | `/api/biens-immo/{id}/cloturer?motif=` | propriétaire | Clôturer |
| PUT | `/api/biens-immo/{id}/reactiver` | propriétaire | Réactiver ou prolonger |
| PUT | `/api/biens-immo/{id}/medias` (multipart `medias`) | propriétaire / modération | Ajouter des photos |
| DELETE | `/api/biens-immo/{id}/medias/{mediaId}` | propriétaire / modération | Supprimer une photo |
| GET | `/api/biens-immo/{id}` · `/api/biens-immo/public/p/{publicId}` | public (règle de visibilité) | Fiche (compte une vue) |
| GET | `/api/biens-immo/user` | connecté | Mes annonces (sauf supprimées), paginé |
| GET | `/api/biens-immo/{id}/stats` · `/{id}/historique` | voir §2 | Vues, historique |

Codes d'erreur métier : 400 (validation, compatibilité), 402 (licence requise), 403 (droits, compte masqué), 404 (annonce introuvable ou invisible), 409 (modification concurrente, verrou optimiste `@Version`), 413 (fichier trop volumineux), 422 (pièce non validée, entreprise manquante ou désactivée, quota atteint, transition interdite).

## 8. Données

Table `annonce` : `id`, `version`, `public_id` (V13), `reference_annonce` (unique), `titre`, `description` (≤ 2000), `prix`, `prix_revise`, `frais_honoraire`, `localisation_id`, `complement_adresse`, `latitude` / `longitude` (9,6), `type_annonce`, `type_bien`, `documents_disponibles`, `date_creation`, `date_modification`, `actif`, `statut_moderation`, `motif_moderation` (≤ 500, V4), `motif_cloture`, `date_cloture`, `date_expiration` et `relance_expiration_envoyee` (V7), `vue_count`, `owner_id`.
Table `bien_immo` : `surface_total`, `type_usage` (NOT NULL), `nb_pieces`, `nb_chambres`, `nb_salles_bain` (V3).

## 9. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-03-01 | Une annonce LOCATION de type DOMAINE est refusée (400) ; une annonce BAIL de type MAGASIN avec l'usage COMMERCIAL est acceptée. |
| CA-03-02 | Une création sans photo renvoie 400 « Ajoutez au moins une photo à votre annonce. » ; une 11e photo renvoie 400. |
| CA-03-03 | Clôturer puis réactiver une annonce repousse son échéance de 180 jours à partir de la réactivation. |
| CA-03-04 | Une annonce supprimée n'apparaît plus dans « Mes annonces » mais reste visible pour un modérateur dans Administration > Annonces > Désactivées. |
| CA-03-05 | Consulter sa propre annonce n'augmente pas le compteur de vues ; deux consultations par la même IP en 24 h comptent pour une vue. |
| CA-03-06 | À J-7 de l'échéance, un seul email de relance est envoyé ; à l'échéance, l'annonce passe « Expirée » et peut être prolongée. |

## 10. Écarts propres au module

ECART-03 (annonce modérée non corrigeable), ECART-08 (unicité de la référence), ECART-09 (usage obligatoire), ECART-12 (validation en modification), ECART-13 (droits du PRO parent), ECART-35 (pas de modération préalable, documents en texte libre), ECART-42 (prix révisé sans règle), ECART-49 (ordre des photos), ECART-30 (historique et statistiques sans écran).
