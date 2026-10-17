# Module 05 — Localisation (référentiel géographique)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Fournir le référentiel administratif de la Guinée utilisé pour localiser chaque annonce et pour filtrer les recherches, selon la hiérarchie **Région > Préfecture > Commune > Quartier**. Le module couvre aussi la position GPS facultative d'une annonce (sélecteur de carte) et l'administration du référentiel.

Hors périmètre (non implémenté) : coordonnées ou contours des quartiers, recherche d'une adresse sur la carte (géocodage), demande d'ajout d'un quartier par un annonceur, mise à jour depuis une source officielle. Le niveau « quartier » sert aussi pour les districts et secteurs des communes rurales : aucune distinction n'est faite.

Modules qui utilisent le référentiel : 03 (localisation obligatoire d'une annonce), 04 (filtres, zones actives, similaires, proximité), 07 (aucune localisation pour l'entreprise), 12 (libellés dans les pages de partage).

## 2. Acteurs et droits

| Action | Public | Admin | Modérateur |
|---|---|---|---|
| Lire le référentiel | ✅ | ✅ | ✅ |
| Ajouter, modifier, supprimer un quartier | ❌ | ✅ | ❌ (l'écran est listé dans l'administration, l'API refuse l'écriture) |

## 3. User stories

| ID | User story |
|---|---|
| US-05-01 | En tant qu'annonceur, je choisis successivement la région, la préfecture, la commune puis le quartier de mon bien, et je peux préciser un complément d'adresse et un point sur la carte. |
| US-05-02 | En tant que visiteur, je filtre les annonces par région, préfecture, commune ou quartier. |
| US-05-03 | En tant qu'administrateur, j'ajoute un quartier manquant, je corrige un libellé ou je supprime un quartier inutilisé. |

## 4. Règles de gestion

| ID | Règle | Source |
|---|---|---|
| RG-05-01 | Une localisation = un **quartier** avec sa région, sa préfecture, sa commune et le type de commune (`urbaine` ou `rurale`). Tous les champs sont obligatoires (≤ 100 caractères). | `LocalisationRequest.java` |
| RG-05-02 | Identifiant : chaîne (UUID généré à la création ; identifiants fournis par le script de chargement initial). | `LocalisationServiceImpl.java:57-65` |
| RG-05-03 | Données initiales : `sql/localisation.sql`, **743 quartiers** dans 8 régions, 34 préfectures et 369 communes (385 quartiers en communes urbaines, 358 en communes rurales). Le script se charge à la main, il n'est pas intégré à Flyway (ECART-45). | `sql/localisation.sql` |
| RG-05-04 | Lecture paginée (20 par défaut, 100 au plus), tri sur `region`, `prefecture`, `commune`, `quartier` ou `typeCommune`. L'app charge toutes les pages (par 100) et construit les listes en cascade côté client. | `LocalisationController.java`, `src/api/localisation.api.ts:7-36` |
| RG-05-05 | Suppression refusée si des annonces sont rattachées au quartier (« Impossible de supprimer cette localisation : des annonces y sont encore rattachées. »). | `LocalisationServiceImpl.java:81-91` |
| RG-05-06 | **Aucun contrôle de doublon** : le même quartier peut être créé deux fois dans la même commune (ECART-45). | `LocalisationServiceImpl.create` |
| RG-05-07 | La position GPS d'une annonce est facultative (latitude −90 à 90, longitude −180 à 180, 6 décimales). Elle est saisie sur une carte Leaflet (`MapPickerModal`), avec possibilité de se géolocaliser. Sans position, l'annonce n'apparaît pas dans la recherche de proximité. Les quartiers n'ont pas de coordonnées de référence pour proposer un point par défaut. | `Annonce.java:92-100`, `components/ui/MapPickerModal.tsx` |
| RG-05-08 | Les filtres de recherche comparent les libellés (région, préfecture, commune, quartier) sans tenir compte de la casse, mais en tenant compte des accents. | `BienImmoSpecification.java` |
| RG-05-09 | Une annonce est rattachée à un quartier par son **identifiant**. Modifier un quartier (libellé, commune, type) modifie donc la localisation affichée de toutes ses annonces, pages de partage comprises (module 12), sans historique. | `Annonce.java` (`localisation_id`) |
| RG-05-10 | Les **8 régions sont écrites en dur dans l'app** (`REGIONS_GUINEE`) et doivent correspondre exactement aux libellés de la base. Une région créée ou renommée par l'API n'apparaît ni dans l'assistant de publication ni dans les filtres (ECART-59). | `APP/src/stores/annonce.store.ts:9-18` |
| RG-05-11 | L'app charge les quartiers **d'une région à la fois** (`/region/{nom}`, comparaison exacte, sensible à la casse et aux accents), par pages de 100, sans cache : chaque choix de région relance le chargement. Préfectures, communes et quartiers sont ensuite déduits côté client. | `APP/src/api/localisation.api.ts`, `annonce.store.ts:94-105` |
| RG-05-12 | **Homonymes** : 8 noms de commune existent dans deux préfectures différentes (Banko, Dialakoro, Koba, Kollet, Missira, Moribayah, Tanene, Touba) et 10 noms de quartier dans plusieurs communes. Les listes en cascade et les zones actives les distinguent (elles portent la préfecture), mais les **annonces similaires** comparent le seul nom de la commune et mélangent les homonymes (ECART-59). | `sql/localisation.sql`, `BienImmoServiceImpl.java:514` |
| RG-05-13 | **Administration** : dans l'app, la région, la préfecture et la commune d'un nouveau quartier se choisissent parmi les valeurs existantes. Créer une préfecture ou une commune, ou renommer une commune pour tous ses quartiers, est impossible depuis l'app. L'API accepte n'importe quel libellé, ce qui permet des variantes d'orthographe qui créent de fausses communes. | `administration/localisations.tsx:230-240`, `LocalisationRequest.java` |
| RG-05-14 | **Quartier manquant** : l'assistant ne propose aucune option « Mon quartier n'est pas dans la liste ». L'annonceur doit choisir un quartier voisin (donnée fausse, recherche faussée) ou écrire au support par email ; aucune demande n'est tracée (ECART-58). | `features/publier/usePublierForm.ts` |
| RG-05-15 | **Carte** : sans position enregistrée, la carte s'ouvre sur Conakry (9,6412 ; −13,5784) quelle que soit la région choisie ; la géolocalisation recentre sur l'appareil (zoom 15 au moins). La bibliothèque Leaflet est chargée depuis le CDN `unpkg.com`, et les tuiles depuis OpenStreetMap (SFG §4.1). 🆕 Retenu (DEC-30) : tuiles servies par un fournisseur de tuiles OSM, avec clé d'API et attribution affichée sur chaque carte. | `components/ui/leaflet-html.ts:30, 49-59, 93` |
| 🆕 RG-05-16 | **Cible DEC-22** : à l'étape « Lieu », après le choix de la commune, l'option « Mon quartier n'est pas dans la liste » permet de saisir le nom du quartier (≤ 100 caractères). L'annonce est rattachée à une entrée technique « Autre quartier » de la commune et s'affiche avec le nom de la commune seul. | DEC-22 |
| 🆕 RG-05-17 | La saisie crée une **demande d'ajout** (nom saisi, commune, annonce, demandeur), traitée dans la file « Quartiers demandés » de l'administration : **ajouter** le quartier (ou le rattacher à un quartier existant en cas de variante d'orthographe), ce qui rattache aussitôt les annonces concernées, ou **refuser** avec un motif, l'annonce restant rattachée à la commune. | DEC-22 |
| 🆕 RG-05-18 | Une annonce rattachée à « Autre quartier » apparaît dans les filtres par région, préfecture et commune, pas dans les filtres par quartier ; elle compte dans les zones actives de sa commune. | DEC-22 |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Étape « Lieu » de l'assistant | `app/(tabs)/publier.tsx` | Listes en cascade, complément d'adresse, sélecteur de carte |
| Filtres de recherche | `features/explore/FilterModal.tsx` | Région, préfecture, commune, quartier |
| Administration > Localisations | `app/(tabs)/administration/localisations.tsx` | Recherche, filtres par région / préfecture, liste, formulaire (région, préfecture, commune, nom du quartier, « Commune urbaine / rurale »), modification, suppression avec confirmation |

## 6. API

| Méthode | URL | Accès |
|---|---|---|
| GET | `/api/localisations` · `/api/localisations/{id}` · `/region/{nom}` · `/prefecture/{nom}` · `/commune/{nom}` | public |
| POST | `/api/localisations` | admin |
| PUT | `/api/localisations/{id}` | admin |
| DELETE | `/api/localisations/{id}` | admin |

`/{id}`, `/prefecture/{nom}` et `/commune/{nom}` ne sont pas utilisés par l'app.

## 7. Données

Table `localisation` : `id` (varchar), `region`, `prefecture`, `commune`, `quartier`, `type_commune`. Aucune contrainte d'unicité sur le quadruplet région / préfecture / commune / quartier.

## 8. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-05-01 | Choisir une région vide la préfecture et la commune déjà saisies. |
| CA-05-02 | La suppression d'un quartier utilisé par une annonce renvoie un message explicite, jamais une erreur 500. |
| CA-05-03 | Un modérateur ne peut pas créer de quartier (403). |
| CA-05-04 | Renommer un quartier change aussitôt le libellé affiché sur toutes ses annonces. |
| CA-05-05 | *Cible (ECART-59)* : les similaires d'une annonce située à Koba (préfecture de Dalaba) ne contiennent aucune annonce de Koba (préfecture de Télimélé). |
| CA-05-06 | Choisir la région « N'Zérékoré » dans l'assistant charge bien ses quartiers (apostrophe et accents identiques à la base). |
| CA-05-07 | Sans position enregistrée, la carte de l'assistant s'ouvre centrée sur Conakry. |
| 🆕 CA-05-08 | Une annonce publiée avec « Mon quartier n'est pas dans la liste » est visible tout de suite sur la commune ; quand l'admin ajoute le quartier, l'annonce l'affiche sans action de l'annonceur. |

## 9. Écarts propres au module

ECART-45 (doublons, coordonnées de référence, script initial hors Flyway, écran visible pour le modérateur), ECART-58 (quartier manquant sans recours), ECART-59 (libellés utilisés comme clés : régions en dur, communes homonymes mélangées).

## 10. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-22.

1. Faut-il une option « Mon quartier n'est pas dans la liste » qui crée une demande d'ajout traitée par l'administration (ECART-58) ? En attendant sa validation, l'annonce est-elle rattachée à la commune ?
2. Faut-il ajouter des **coordonnées par quartier**, pour centrer la carte sur le quartier choisi et inclure les annonces sans GPS dans « À proximité » (ECART-45, module 04 §9) ?
3. Qui tient le référentiel à jour (nouvelles communes, découpages) et à partir de quelle source officielle ?
4. Faut-il distinguer quartiers urbains et districts ou secteurs ruraux dans les libellés affichés ?
