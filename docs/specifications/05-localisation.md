# Module 05 — Localisation (référentiel géographique)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Fournir le référentiel administratif de la Guinée utilisé pour localiser chaque annonce et pour filtrer les recherches, selon la hiérarchie **Région > Préfecture > Commune > Quartier**. Le module couvre aussi la position GPS facultative d'une annonce (sélecteur de carte), le point de référence des quartiers, les demandes d'ajout d'un quartier manquant et l'administration du référentiel.

Hors périmètre : contours des quartiers, recherche d'une adresse sur la carte (géocodage), mise à jour depuis une source officielle, tables Région / Préfecture / Commune avec identifiants (évolution : [98](98-evolutions.md)). Le niveau « quartier » sert aussi pour les districts et secteurs des communes rurales : aucune distinction n'est faite.

Modules qui utilisent le référentiel : 03 (localisation obligatoire d'une annonce), 04 (filtres, zones actives, similaires, proximité, texte de recherche), 07 (aucune localisation pour l'entreprise), 12 (libellés dans les pages de partage).

## 2. Acteurs et droits

| Action | Public | Annonceur | Admin | Modérateur |
|---|---|---|---|---|
| Lire le référentiel | ✅ | ✅ | ✅ | ✅ |
| Signaler un quartier manquant (à la publication) | — | ✅ | — | — |
| Ajouter, modifier, supprimer un quartier ; traiter les demandes | ❌ | ❌ | ✅ | ❌ (écran non proposé) |

## 3. User stories

| ID | User story |
|---|---|
| US-05-01 | En tant qu'annonceur, je choisis successivement la région, la préfecture, la commune puis le quartier de mon bien, et je peux préciser un complément d'adresse et un point sur la carte. |
| US-05-02 | En tant qu'annonceur dont le quartier manque, je saisis son nom : mon annonce est publiée sur la commune en attendant l'ajout. |
| US-05-03 | En tant que visiteur, je filtre les annonces par région, préfecture, commune ou quartier. |
| US-05-04 | En tant qu'administrateur, j'ajoute un quartier, je corrige un libellé, je saisis son point de référence, je supprime un quartier inutilisé et je traite les demandes d'ajout. |

## 4. Règles de gestion

### 4.1 Référentiel

| ID | Règle | Source |
|---|---|---|
| RG-05-01 | Une localisation = un **quartier** avec sa région, sa préfecture, sa commune et le type de commune (`urbaine` ou `rurale`). Tous les champs sont obligatoires (≤ 100 caractères). | `LocalisationRequest.java` |
| RG-05-02 | Identifiant : chaîne (UUID généré à la création ; identifiants fournis par les données initiales). | `LocalisationServiceImpl.create` |
| RG-05-03 | Données initiales : migration Flyway V14, **743 quartiers** dans 8 régions, 34 préfectures et 369 communes (385 quartiers en communes urbaines, 358 en communes rurales). Chargement idempotent : sans effet sur une base déjà alimentée. | `V14__donnees_localisation.sql` |
| RG-05-04 | Lecture paginée (20 par défaut, 100 au plus), tri sur `region`, `prefecture`, `commune`, `quartier` ou `typeCommune`. Les entrées techniques « Autre quartier » (RG-05-16) ne sont jamais listées. | `LocalisationController.java` |
| RG-05-05 | Suppression refusée si des annonces sont rattachées au quartier (« Impossible de supprimer cette localisation : des annonces y sont encore rattachées. »). | `LocalisationServiceImpl.delete` |
| RG-05-06 | **Pas de doublon** : un quartier n'existe qu'une fois par commune, aux accents, à la casse et à la ponctuation près. L'API refuse un doublon (« Le quartier « … » existe déjà dans la commune … », 422), à la création comme à la modification et à l'ajout d'un quartier demandé ; la base l'interdit aussi (index unique `uq_localisation_quartier`, V37). | `LocalisationRepository.trouverQuartier` |
| RG-05-07 | **Point de référence** : chaque quartier peut porter une latitude et une longitude (les deux ou aucune), saisies par l'administrateur. Il centre la carte de l'assistant de publication quand l'annonceur choisit ce quartier. | `Localisation.latitude`, `MapPickerModal` |
| RG-05-08 | Les filtres de recherche comparent les libellés (région, préfecture, commune, quartier) sans tenir compte de la casse, mais en tenant compte des accents. La recherche texte, elle, ignore les accents (module 04, RG-04-03). | `BienImmoSpecification.java` |
| RG-05-09 | Une annonce est rattachée à un quartier par son **identifiant**. Modifier un quartier (libellé, commune, type) modifie donc la localisation affichée de toutes ses annonces, pages de partage et texte de recherche compris, sans historique. | `annonce.localisation_id`, trigger `trg_localisation_recherche` (V33) |
| RG-05-10 | Les régions sont **chargées depuis l'API** (`GET /api/localisations/regions`) et gardées en cache pendant la session ; une liste écrite dans l'app ne sert que de secours si l'API ne répond pas. | `src/lib/useRegions.ts` |
| RG-05-11 | L'app charge les quartiers **d'une région à la fois** (`/region/{nom}`, comparaison exacte), par pages de 100 ; préfectures, communes et quartiers sont ensuite déduits côté client. | `src/api/localisation.api.ts`, `annonce.store.ts` |
| RG-05-12 | **Homonymes** : 8 noms de commune existent dans deux préfectures différentes (Banko, Dialakoro, Koba, Kollet, Missira, Moribayah, Tanene, Touba) et 10 noms de quartier dans plusieurs communes. Les listes en cascade, les zones actives et les annonces similaires les distinguent : elles portent toujours la préfecture. | V14, `BienImmoRepository.findSimilaires` |
| RG-05-13 | **Administration** : dans l'app, la région, la préfecture et la commune d'un nouveau quartier se choisissent parmi les valeurs existantes. Créer une préfecture ou une commune, ou renommer une commune pour tous ses quartiers, n'est pas possible depuis l'app. Chaque création, modification ou suppression est inscrite au journal d'audit. | `administration/localisations.tsx`, `LocalisationServiceImpl` |

### 4.2 Position sur la carte

| ID | Règle | Source |
|---|---|---|
| RG-05-14 | La position GPS d'une annonce est facultative (latitude −90 à 90, longitude −180 à 180, 6 décimales). Elle est saisie sur une carte Leaflet (`MapPickerModal`), avec possibilité de se géolocaliser. Sans position, l'annonce n'apparaît pas dans la recherche de proximité. | `Annonce.java`, `components/ui/MapPickerModal.tsx` |
| RG-05-15 | **Carte** : sans position enregistrée, la carte s'ouvre sur le point de référence du quartier choisi (zoom 15), sinon sur Conakry (9,6412 ; −13,5784) ; la géolocalisation recentre sur l'appareil. La bibliothèque Leaflet est chargée depuis `unpkg.com`, les tuiles depuis les serveurs d'OpenStreetMap. Le passage à un fournisseur de tuiles avec clé d'API (DEC-30) est à faire avant la mise en production ([98](98-evolutions.md)). | `components/ui/leaflet-html.ts` |

### 4.3 Quartier manquant (DEC-22)

| ID | Règle | Source |
|---|---|---|
| RG-05-16 | À l'étape « Lieu », après le choix de la commune, l'option « Mon quartier n'est pas dans la liste » permet de saisir le nom du quartier (≤ 100 caractères). L'annonce est rattachée à une entrée technique « Autre quartier » de la commune (`technique = true`, créée à la demande) et s'affiche avec le nom de la commune seul. | `QuartierDemandeService.java`, `GET /api/localisations/autre-quartier` |
| RG-05-17 | La saisie crée une **demande d'ajout** (nom saisi, commune, annonce, demandeur), traitée dans la file « Quartiers demandés » de l'administration, qui propose les quartiers proches (variantes d'orthographe) : **ajouter** le quartier (nom éventuellement corrigé), ce qui rattache aussitôt les annonces concernées et traite les autres demandes de même nom ; **rattacher** à un quartier existant de la même commune ; ou **refuser** avec un motif, l'annonce restant rattachée à la commune. | idem |
| RG-05-18 | Une annonce rattachée à « Autre quartier » apparaît dans les filtres par région, préfecture et commune, pas dans les filtres par quartier ; elle compte dans les zones actives de sa commune. | `BienImmoSpecification.java` |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Étape « Lieu » de l'assistant | `app/(tabs)/publier.tsx` | Listes en cascade, « Mon quartier n'est pas dans la liste », complément d'adresse, sélecteur de carte |
| Filtres de recherche | `features/explore/FilterModal.tsx` | Région, préfecture, commune, quartier |
| Administration > Localisations | `app/(tabs)/administration/localisations.tsx` (administrateur) | Recherche, filtres par région / préfecture, liste, formulaire (région, préfecture, commune, nom du quartier, type de commune, point de référence), modification, suppression avec confirmation |
| Administration > Quartiers demandés | `app/(tabs)/administration/quartiers-demandes.tsx` (administrateur) | Demandes en attente, quartiers proches proposés, ajouter / rattacher / refuser |

## 6. API

| Méthode | URL | Accès |
|---|---|---|
| GET | `/api/localisations` · `/{id}` · `/regions` · `/region/{nom}` · `/prefecture/{nom}` · `/commune/{nom}` | public |
| GET | `/api/localisations/autre-quartier?region&prefecture&commune` | public (entrée technique de la commune) |
| POST · PUT · DELETE | `/api/localisations` · `/api/localisations/{id}` | admin |
| GET | `/api/admin/quartiers-demandes` | admin |
| PUT | `/api/admin/quartiers-demandes/{id}/ajouter` · `/rattacher` · `/refuser` | admin |

## 7. Données

Table `localisation` : `id` (varchar), `region`, `prefecture`, `commune`, `quartier`, `type_commune`, `technique` (entrée « Autre quartier »), `latitude`, `longitude` (9,6). Unicité du quartier par commune (hors entrées techniques). Table `demande_quartier` : `nom`, `localisation_id` (entrée technique), `annonce_id`, `demandeur_id`, `statut` (EN_ATTENTE, AJOUTEE, RATTACHEE, REFUSEE), `motif_refus`, `localisation_finale`, dates, `decide_par`.

## 8. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-05-01 | Choisir une région vide la préfecture et la commune déjà saisies. |
| CA-05-02 | La suppression d'un quartier utilisé par une annonce renvoie un message explicite, jamais une erreur 500. |
| CA-05-03 | Un modérateur ne peut pas créer de quartier (403) et ne voit pas l'écran Localisations. |
| CA-05-04 | Renommer un quartier change aussitôt le libellé affiché sur toutes ses annonces et le texte sur lequel porte la recherche. |
| CA-05-05 | Créer « quartier temoin » dans une commune qui a déjà « Quartier Témoin » est refusé (422). |
| CA-05-06 | Choisir la région « N'Zérékoré » dans l'assistant charge bien ses quartiers. |
| CA-05-07 | Pour un quartier qui a un point de référence, la carte de l'assistant s'ouvre sur ce point ; sinon, sur Conakry. |
| CA-05-08 | Une annonce publiée avec « Mon quartier n'est pas dans la liste » est visible tout de suite sur la commune ; quand l'admin ajoute le quartier, l'annonce l'affiche sans action de l'annonceur. |
