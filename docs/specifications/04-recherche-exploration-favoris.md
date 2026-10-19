# Module 04 — Recherche, exploration et favoris

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à tout visiteur de trouver rapidement un bien : flux des dernières annonces, recherche texte, filtres multicritères, tri, recherche autour de soi, zones les plus actives, annonces similaires. Les utilisateurs connectés (particuliers dans l'app) peuvent enregistrer des favoris.

Toutes les lectures publiques appliquent la **règle de visibilité** de la SFG §8. Cette règle ne tient compte ni du statut du compte ni de l'état de l'entreprise : les annonces d'un compte suspendu ou désactivé (ECART-52) et celles d'une entreprise désactivée (ECART-14) apparaissent dans tous les résultats. La synthèse des cas figure au module 03 §4.6.

Hors périmètre (non implémenté) : alertes et recherches enregistrées, historique des recherches, suggestions pendant la saisie, tolérance aux fautes de frappe, carte de toutes les annonces (la carte n'existe que sur l'écran « À proximité »), tri par distance hors de cet écran, prix au m², comparateur d'annonces.

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
| RG-04-03 | Texte `q` : recherche plein texte PostgreSQL (dictionnaire français, `plainto_tsquery`) sur titre + description + type de bien, classée par pertinence. Combinée aux filtres, elle restreint aux identifiants trouvés (aucun résultat si aucun identifiant). **Ne sont pas couverts** : la référence de l'annonce, le nom du quartier, de la commune ou de la préfecture (sauf s'ils figurent dans le titre ou la description), le prix. La recherche est sensible aux accents (« Kipe » ne trouve pas « Kipé ») et ne tolère pas les fautes de frappe (ECART-57). | `BienImmoRepository.findIdsByFullTextSearch`, `BienImmoServiceImpl.java:342-353` |
| RG-04-04 | Le filtre prix porte sur le **prix initial** (le prix révisé n'est pas pris en compte, ECART-42). | `BienImmoSpecification.prixBetween` |
| RG-04-05 | Tri proposé dans l'app : Plus récent (défaut), Prix croissant, Prix décroissant. Les critères actifs sont affichés en puces supprimables ; le nombre de filtres actifs est indiqué. | `features/explore/filters.ts:84-91`, `explore.tsx` |
| RG-04-06 | 🆕 (ECART-30) Les endpoints de recherche inutilisés (`/search`, `/surface`, `/quartier/{id}`, `/public/search`) ont été **retirés** : `/filter` (avec `q` pour le texte) est la seule recherche. | `BienImmoController` |
| RG-04-16 | **Champ de recherche de l'accueil** (« Quartier, type de bien, référence… ») : la saisie est envoyée telle quelle dans `q` (RG-04-03), après un court délai sans frappe ou à la validation du clavier. Elle n'est jamais envoyée dans le filtre `reference` ni dans les filtres de localisation : chercher une référence (« VE-1017-AB12 », pourtant reprise dans le message WhatsApp prérempli) ne donne aucun résultat, et chercher un quartier ne trouve que les annonces qui le citent dans leur texte (ECART-57). | `APP/src/features/explore/useExploreAnnonces.tsx:113-121, 223-227` |
| RG-04-17 | Les requêtes de recherche se chassent : quand les critères changent, la requête en cours est ignorée et la liste repart de la première page, avec des squelettes de chargement. | `useExploreAnnonces.tsx:157-175` |

### 4.2 Zones actives et proximité

| ID | Règle | Source |
|---|---|---|
| RG-04-07 | Zones actives : communes classées par nombre d'annonces visibles (de 1 à 20 zones, 8 par défaut), puis par ordre alphabétique. Elles alimentent le sélecteur de zones de l'accueil (« Partout », les zones, « Autour de moi »). L'app garde la liste 10 min en cache. Si l'API ne renvoie aucune zone ou ne répond pas, l'app affiche à la place les communes de Conakry, sans décompte. La zone choisie devient le titre de la liste ; le filtre de localisation le plus précis s'affiche en une seule puce. | `BienImmoRepository.findZonesActives`, `APP/src/features/explore/useZonesActives.ts`, `explore.tsx:134-150` |
| RG-04-08 | Proximité `GET /nearby?lat&lng&rayon` : formule de Haversine, annonces visibles **ayant des coordonnées GPS**, triées par distance croissante. Rayon par défaut de 5 km côté API ; l'app propose 2, 5, 10, 25 et 50 km (10 par défaut). | `BienImmoRepository.findIdsByProximite`, `app/proximite.tsx:27-42` |
| RG-04-09 | La position de l'appareil est demandée avec autorisation. En cas de refus : message « Localisation désactivée » / « Autorisez l'accès… ». | `app/proximite.tsx`, `utils/location.ts` |
| RG-04-10 | Le filtre par type d'annonce sur l'écran proximité est **appliqué côté client** à la page chargée (l'API ne filtre pas par type) : les résultats peuvent être incomplets (ECART-33). | `app/proximite.tsx:96` |

### 4.3 Annonces similaires

| ID | Règle | Source |
|---|---|---|
| RG-04-11 | Similaires d'une annonce visible : même type de bien, **même commune de la même préfecture** (ECART-59), prix entre −30 % et +30 % (arrondis), hors l'annonce elle-même, les plus récentes d'abord ; 6 par défaut, 20 au plus. La commune est comparée **par son nom seul** : les communes homonymes de deux préfectures sont mélangées (module 05, RG-05-12, ECART-59). | `BienImmoServiceImpl.java:508-522` |

### 4.4 Favoris

| ID | Règle | Source |
|---|---|---|
| RG-04-12 | Ajouter un favori : uniquement une annonce visible. Retirer : sans condition. Les opérations renvoient le profil mis à jour (avec `favorisIds`). | `UserServiceImpl.java:270-287` |
| RG-04-13 | Liste des favoris : seuls les favoris encore visibles sont affichés (les annonces masquées, clôturées ou supprimées sont conservées mais cachées), pagination en mémoire, tri par date de création décroissante. | `UserServiceImpl.java:291-306` |
| RG-04-14 | L'onglet Favoris n'est proposé qu'aux **particuliers** dans l'app (ECART-34). | `src/lib/nav-items.ts:58` |
| RG-04-15 | Le nombre de favoris d'une annonce (`nbFavoris`) est calculé à la volée et exposé sur chaque annonce. | `Annonce.java:181` |
| RG-04-18 | Effets d'autres modules sur les favoris : une annonce supprimée par son propriétaire reste dans les favoris, cachée (RG-03-22) ; une annonce d'un compte supprimé par un administrateur est **retirée** des favoris de tous (RG-10-04) ; l'anonymisation d'un compte vide ses propres favoris (RG-02-19) ; une annonce d'un compte suspendu reste visible dans les favoris (ECART-52). L'utilisateur n'est jamais prévenu qu'un favori est clôturé, vendu ou a baissé de prix. | modules 02, 03, 10 |
| 🆕 RG-04-19 | **Cible DEC-15** : l'onglet Favoris est proposé à **tous les comptes connectés**, professionnels, agents et staff compris (l'API le permet déjà). | DEC-15 |

### 4.5 🆕 Alertes de recherche (cible DEC-16, après DEC-13)

| ID | Règle | Source |
|---|---|---|
| 🆕 RG-04-20 | Depuis une liste de résultats, « Créer une alerte » enregistre les critères en cours (filtres et texte) sous un nom modifiable. **10 alertes au plus** par compte. | DEC-16 |
| 🆕 RG-04-21 | Une tâche horaire recherche les annonces devenues visibles depuis le dernier passage qui répondent à chaque alerte. Au plus **une notification push par alerte et par jour**, qui indique le nombre de nouvelles annonces ; elle ouvre la liste de ces annonces. | DEC-16, DEC-13 |
| 🆕 RG-04-22 | Écran « Mes alertes » : renommer, mettre en pause, supprimer. Une alerte dont les notifications n'ont pas été ouvertes depuis 6 mois est mise en pause automatiquement. Les alertes sont supprimées à l'anonymisation du compte. | DEC-16 |

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
| CA-04-01 | Une annonce masquée par la modération, clôturée, expirée, supprimée ou appartenant à un compte masqué n'apparaît dans aucun résultat public (catalogue, filtres, texte, proximité, zones, similaires, favoris). *Cible après correction d'ECART-52 : idem pour un compte suspendu ou désactivé.* |
| CA-04-02 | La combinaison `q=villa` et `commune=Ratoma` ne renvoie que des villas de Ratoma pertinentes pour « villa ». |
| CA-04-03 | `sort=titre` sur le catalogue est remplacé par `dateCreation` sans erreur. |
| CA-04-04 | Une annonce sans coordonnées GPS n'apparaît jamais dans les résultats de proximité. |
| CA-04-05 | Un favori dont l'annonce est clôturée disparaît de la liste et réapparaît si l'annonce est remise en ligne. |
| CA-04-06 | *Cible (ECART-57)* : saisir la référence exacte d'une annonce visible dans le champ de l'accueil affiche cette annonce en premier ; saisir « Kipe » ou « kipé » trouve les annonces du quartier Kipé. Aujourd'hui, aucun résultat. |
| CA-04-07 | Si `zones-actives` ne répond pas, le sélecteur affiche les communes de Conakry par ordre alphabétique, sans décompte. |
| CA-04-08 | Après la suppression d'un compte par un administrateur, ses annonces ne figurent plus dans les favoris d'aucun utilisateur, même si elles sont restaurées. |
| CA-04-09 | Modifier un critère pendant un chargement n'affiche jamais les résultats de l'ancienne recherche. |
| 🆕 CA-04-10 | Un agent voit l'onglet Favoris et peut y ajouter une annonce. |
| 🆕 CA-04-11 | Une alerte « Villa · Ratoma · ≤ 2 Mds GNF » envoie une seule notification dans la journée pour trois nouvelles villas correspondantes. |

## 8. Écarts propres au module

ECART-14 (annonces d'une entreprise désactivée visibles), ECART-30 (endpoints inutilisés), ECART-33 (filtre de proximité côté client), ECART-34 (favoris réservés aux particuliers), ECART-42 (prix révisé ignoré), ECART-45 (pas de coordonnées par quartier), ECART-46 (pagination en mémoire du plein texte et de la proximité), ECART-52 (annonces d'un compte suspendu visibles), ECART-55 (pas de miniatures dans les listes), ECART-57 (champ de recherche : référence et localisation non cherchées).

## 9. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-16.

1. Faut-il des **alertes de recherche** (« nouvelle annonce correspondant à mes critères »), par email puis par notification push ? C'est le principal levier de retour des utilisateurs.
2. Les annonces sans coordonnées GPS doivent-elles apparaître dans « À proximité » à partir de la position de leur quartier (suppose des coordonnées par quartier, ECART-45) ? Faut-il rendre la position obligatoire ?
3. Les **similaires** doivent-ils s'élargir aux communes voisines ou à la préfecture quand la commune compte peu d'annonces ?
4. Faut-il prévenir l'utilisateur quand un de ses favoris baisse de prix ou est clôturé ?
5. Comment mesurer les recherches sans résultat (indicateur SFG §1.2) : journal côté API ou outil de mesure d'audience ?
