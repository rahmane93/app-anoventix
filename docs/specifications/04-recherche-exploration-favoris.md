# Module 04 — Recherche, exploration et favoris

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à tout visiteur de trouver rapidement un bien : flux des dernières annonces, recherche texte, filtres multicritères, tri, recherche autour de soi, zones les plus actives, annonces similaires. Les utilisateurs connectés (particuliers dans l'app) peuvent enregistrer des favoris.

Toutes les lectures publiques appliquent la **règle de visibilité** de la SFG §7.

## 2. Acteurs et droits

| Action | Visiteur | Particulier | Pro / agent | Staff |
|---|---|---|---|---|
| Explorer, rechercher, filtrer, carte, similaires | ✅ | ✅ | ✅ | ✅ |
| Favoris | ❌ (connexion demandée) | ✅ | API ✅ / app ❌ | API ✅ / app ❌ |

## 3. User stories

| ID | User story |
|---|---|
| US-04-01 | En tant que visiteur, je vois les dernières annonces publiées sur l'accueil. |
| US-04-02 | En tant que visiteur, je saisis une recherche libre (« appartement 3 pièces Kaloum ») ou une référence. |
| US-04-03 | En tant que visiteur, je filtre par type d'annonce, type de bien, usage, prix, région, préfecture, commune, quartier, pièces, chambres et surface, et je trie les résultats. |
| US-04-04 | En tant que visiteur, je choisis une zone parmi les communes les plus actives. |
| US-04-05 | En tant que visiteur, je vois les annonces autour de ma position dans un rayon choisi. |
| US-04-06 | En tant que visiteur, je découvre des annonces similaires depuis une fiche. |
| US-04-07 | En tant que particulier, j'ajoute une annonce à mes favoris et je retrouve la liste de mes favoris encore disponibles. |

## 4. Règles de gestion

### 4.1 Catalogue et recherche

| ID | Règle | Source |
|---|---|---|
| RG-04-01 | Catalogue `GET /api/biens-immo` : annonces visibles, paginées (10 par défaut, 50 au plus), tri possible sur `dateCreation`, `prix`, `vueCount` ou `nbFavoris` (tout autre champ est remplacé par `dateCreation`). | `BienImmoController.java:62-127` |
| RG-04-02 | Filtres multicritères `GET /api/biens-immo/filter` : tous facultatifs et cumulables — référence exacte (insensible à la casse), type d'annonce, type de bien, usage, prix minimum et maximum, région, préfecture, commune, quartier (égalité insensible à la casse), `q` (texte), nombre minimum de pièces et de chambres, surface minimum et maximum. | `BienImmoController.java:320-361`, `BienImmoSpecification.java` |
| RG-04-03 | Texte `q` : recherche plein texte PostgreSQL (dictionnaire français) sur titre + description + type de bien, classée par pertinence. Combinée aux filtres, elle restreint aux identifiants trouvés (aucun résultat si aucun identifiant). | `BienImmoRepository.findIdsByFullTextSearch`, `BienImmoServiceImpl.java:342-353` |
| RG-04-04 | Le filtre prix porte sur le **prix initial** (le prix révisé n'est pas pris en compte, ECART-42). | `BienImmoSpecification.prixBetween` |
| RG-04-05 | Tri proposé dans l'app : Plus récent (défaut), Prix croissant, Prix décroissant. Les critères actifs sont affichés en puces supprimables ; le nombre de filtres actifs est indiqué. | `features/explore/filters.ts:84-91`, `explore.tsx` |
| RG-04-06 | Endpoints de recherche présents dans l'API mais **non utilisés par l'app** : `/search` (LIKE), `/surface`, `/quartier/{id}`, `/public/search` (plein texte seul) (ECART-30). | `BienImmoController.java` |

### 4.2 Zones actives et proximité

| ID | Règle | Source |
|---|---|---|
| RG-04-07 | Zones actives : communes classées par nombre d'annonces visibles (de 1 à 20 zones, 8 par défaut), puis par ordre alphabétique. Elles alimentent le sélecteur de zones de l'accueil. | `BienImmoRepository.findZonesActives`, `useZonesActives.ts` |
| RG-04-08 | Proximité `GET /nearby?lat&lng&rayon` : formule de Haversine, annonces visibles **ayant des coordonnées GPS**, triées par distance croissante. Rayon par défaut de 5 km côté API ; l'app propose 2, 5, 10, 25 et 50 km (10 par défaut). | `BienImmoRepository.findIdsByProximite`, `app/proximite.tsx:27-42` |
| RG-04-09 | La position de l'appareil est demandée avec autorisation. En cas de refus : message « Localisation désactivée » / « Autorisez l'accès… ». | `app/proximite.tsx`, `utils/location.ts` |
| RG-04-10 | Le filtre par type d'annonce sur l'écran proximité est **appliqué côté client** à la page chargée (l'API ne filtre pas par type) : les résultats peuvent être incomplets (ECART-33). | `app/proximite.tsx:96` |

### 4.3 Annonces similaires

| ID | Règle | Source |
|---|---|---|
| RG-04-11 | Similaires d'une annonce visible : même type de bien, **même commune**, prix entre −30 % et +30 % (arrondis), hors l'annonce elle-même, les plus récentes d'abord ; 6 par défaut, 20 au plus. | `BienImmoServiceImpl.java:508-522` |

### 4.4 Favoris

| ID | Règle | Source |
|---|---|---|
| RG-04-12 | Ajouter un favori : uniquement une annonce visible. Retirer : sans condition. Les opérations renvoient le profil mis à jour (avec `favorisIds`). | `UserServiceImpl.java:270-287` |
| RG-04-13 | Liste des favoris : seuls les favoris encore visibles sont affichés (les annonces masquées, clôturées ou supprimées sont conservées mais cachées), pagination en mémoire, tri par date de création décroissante. | `UserServiceImpl.java:291-306` |
| RG-04-14 | L'onglet Favoris n'est proposé qu'aux **particuliers** dans l'app (ECART-34). | `src/lib/nav-items.ts:58` |
| RG-04-15 | Le nombre de favoris d'une annonce (`nbFavoris`) est calculé à la volée et exposé sur chaque annonce. | `Annonce.java:181` |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Accueil / Explorer | `app/(tabs)/explore.tsx` | Bannière, champ « Quartier, type de bien, référence… », sélecteur de zones actives, bouton « Voir les annonces autour de moi », fenêtre de filtres (`FilterModal`), tri, puces de critères, liste paginée à défilement infini (« Dernières annonces » / « Résultats »), états vides (« Aucune annonce ne correspond à vos filtres. »), squelettes de chargement, bouton « Publier une annonce », bandeau « pièce d'identité non validée ». |
| À proximité | `app/proximite.tsx` | Carte Leaflet, choix du rayon et du type, liste des annonces localisées. |
| Favoris | `app/(tabs)/favoris.tsx` | Liste des favoris (`FavAnnonceCard`), état vide avec « Explorer les annonces ». |
| Fiche annonce, bloc similaires | `app/annonce/[id].tsx` | « Vous pourriez aimer aussi ». |

## 6. API

| Méthode | URL | Accès | Description |
|---|---|---|---|
| GET | `/api/biens-immo` | public | Catalogue paginé et trié |
| GET | `/api/biens-immo/filter` | public | Recherche multicritères + texte |
| GET | `/api/biens-immo/nearby` | public | Proximité |
| GET | `/api/biens-immo/zones-actives?limit=` | public | Zones les plus actives |
| GET | `/api/biens-immo/{id}/similaires?max=` | public | Similaires |
| GET | `/api/biens-immo/public/search?q=` · `/search?keyword=` · `/surface?minSurface=` · `/quartier/{localisationId}` | public | Variantes non utilisées par l'app |
| POST / DELETE | `/api/users/me/favoris/{annonceId}` | connecté | Ajouter / retirer |
| GET | `/api/users/me/favoris` | connecté | Mes favoris |

Format de page renvoyé : `PageResponse` (`data`, `currentPage`, `totalItems`, `totalPages`) ; la recherche plein texte renvoie `SearchPageResponse` (avec la requête). Quelques endpoints d'administration renvoient encore la `Page` brute de Spring (ECART-40).

## 7. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-04-01 | Une annonce masquée par la modération, clôturée, expirée, supprimée ou appartenant à un compte masqué n'apparaît dans aucun résultat public (catalogue, filtres, texte, proximité, zones, similaires, favoris). |
| CA-04-02 | La combinaison `q=villa` et `commune=Ratoma` ne renvoie que des villas de Ratoma pertinentes pour « villa ». |
| CA-04-03 | `sort=titre` sur le catalogue est remplacé par `dateCreation` sans erreur. |
| CA-04-04 | Une annonce sans coordonnées GPS n'apparaît jamais dans les résultats de proximité. |
| CA-04-05 | Un favori dont l'annonce est clôturée disparaît de la liste et réapparaît si l'annonce est remise en ligne. |

## 8. Écarts propres au module

ECART-30 (endpoints inutilisés), ECART-33 (filtre de proximité côté client), ECART-34 (favoris réservés aux particuliers), ECART-42 (prix révisé ignoré), ECART-46 (pagination en mémoire du plein texte et de la proximité).
