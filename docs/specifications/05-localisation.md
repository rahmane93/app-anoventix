# Module 05 — Localisation (référentiel géographique)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Fournir le référentiel administratif de la Guinée utilisé pour localiser chaque annonce et pour filtrer les recherches, selon la hiérarchie **Région > Préfecture > Commune > Quartier**. Le module couvre aussi la position GPS facultative d'une annonce (sélecteur de carte) et l'administration du référentiel.

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
| RG-05-03 | Données initiales : `sql/localisation.sql`, environ 745 quartiers couvrant les 8 régions (387 en communes urbaines, 360 en communes rurales). Le script se charge à la main, il n'est pas intégré à Flyway. | `sql/localisation.sql` |
| RG-05-04 | Lecture paginée (20 par défaut, 100 au plus), tri sur `region`, `prefecture`, `commune`, `quartier` ou `typeCommune`. L'app charge toutes les pages (par 100) et construit les listes en cascade côté client. | `LocalisationController.java`, `src/api/localisation.api.ts:7-36` |
| RG-05-05 | Suppression refusée si des annonces sont rattachées au quartier (« Impossible de supprimer cette localisation : des annonces y sont encore rattachées. »). | `LocalisationServiceImpl.java:81-91` |
| RG-05-06 | **Aucun contrôle de doublon** : le même quartier peut être créé deux fois dans la même commune (ECART-45). | `LocalisationServiceImpl.create` |
| RG-05-07 | La position GPS d'une annonce est facultative (latitude −90 à 90, longitude −180 à 180, 6 décimales). Elle est saisie sur une carte Leaflet (`MapPickerModal`), avec possibilité de se géolocaliser. Sans position, l'annonce n'apparaît pas dans la recherche de proximité. Les quartiers n'ont pas de coordonnées de référence pour proposer un point par défaut. | `Annonce.java:92-100`, `components/ui/MapPickerModal.tsx` |
| RG-05-08 | Les filtres de recherche comparent les libellés (région, préfecture, commune, quartier) sans tenir compte de la casse. | `BienImmoSpecification.java` |

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

## 9. Écarts propres au module

ECART-45 (doublons, coordonnées de référence, script initial hors Flyway, écran visible pour le modérateur).
