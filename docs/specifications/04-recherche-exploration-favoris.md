# Module 04 — Recherche, exploration, favoris et alertes

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Permettre à tout visiteur de trouver rapidement un bien : flux des dernières annonces, recherche texte ou par référence, filtres multicritères, tri, recherche autour de soi, zones les plus actives, annonces similaires. Les utilisateurs connectés enregistrent des favoris et des alertes de recherche.

Toutes les lectures publiques appliquent la **règle de visibilité** de la SFG §8 : en ligne, publiée, compte propriétaire ACTIF, entreprise active, compte non masqué. La synthèse des cas figure au module 03 §4.6.

Hors périmètre : historique des recherches, suggestions pendant la saisie, tolérance aux fautes de frappe, carte de toutes les annonces (la carte n'existe que sur l'écran « À proximité »), tri par distance hors de cet écran, prix au m², comparateur d'annonces.

## 2. Acteurs et droits

| Action | Visiteur | Connecté (tous rôles) |
|---|---|---|
| Explorer, rechercher, filtrer, carte, similaires | ✅ | ✅ |
| Favoris (DEC-15) | ❌ (connexion demandée) | ✅ |
| Alertes de recherche (DEC-16) | ❌ | ✅ |

## 3. User stories

| ID | User story |
|---|---|
| US-04-01 | En tant que visiteur, je vois les dernières annonces publiées sur l'accueil. |
| US-04-02 | En tant que visiteur, je saisis une recherche libre (« appartement 3 pièces Kaloum ») ou une référence (« VE-260317-K7QM »). |
| US-04-03 | En tant que visiteur, je filtre par type d'annonce, type de bien, usage, prix, région, préfecture, commune, quartier, pièces, chambres et surface, et je trie les résultats. |
| US-04-04 | En tant que visiteur, je choisis une zone parmi les communes les plus actives. |
| US-04-05 | En tant que visiteur, je vois les annonces autour de ma position dans un rayon choisi. |
| US-04-06 | En tant que visiteur, je découvre des annonces similaires depuis une fiche. |
| US-04-07 | En tant qu'utilisateur connecté, j'ajoute une annonce à mes favoris et je retrouve la liste de mes favoris encore disponibles. |
| US-04-08 | En tant qu'utilisateur connecté, j'enregistre ma recherche en alerte et je suis prévenu des nouvelles annonces correspondantes. |

## 4. Règles de gestion

### 4.1 Catalogue et recherche

| ID | Règle | Source |
|---|---|---|
| RG-04-01 | Catalogue `GET /api/biens-immo` : annonces visibles, paginées (10 par défaut, 50 au plus), tri possible sur `dateCreation`, `prix`, `vueCount` ou `nbFavoris` (tout autre champ est remplacé par `dateCreation`). | `BienImmoController.getAll` |
| RG-04-02 | Filtres multicritères `GET /api/biens-immo/filter` : tous facultatifs et cumulables — référence exacte (insensible à la casse), type d'annonce, type de bien, usage, prix minimum et maximum, région, préfecture, commune, quartier (égalité insensible à la casse), `q` (texte), nombre minimum de pièces et de chambres, surface minimum et maximum. C'est la seule recherche de l'API. | `BienImmoController.filter`, `BienImmoSpecification.java` |
| RG-04-03 | Texte `q` : recherche plein texte PostgreSQL (dictionnaire français, `plainto_tsquery`), **insensible aux accents** (« Kipe » trouve « Kipé »), sur un texte indexé qui réunit le titre, la description, le type de bien et la localisation (quartier, commune, préfecture, région ; le quartier technique « Autre quartier » est ignoré). Ce texte est tenu à jour par la base (colonne `recherche_doc`, index GIN, V33). Les 2 000 meilleurs résultats, classés par pertinence, sont combinés aux autres filtres. Pas de tolérance aux fautes de frappe. | `BienImmoRepository.findIdsByFullTextSearch`, V33 |
| RG-04-04 | Le filtre prix porte sur le **prix initial** (le prix révisé n'est pas pris en compte). | `BienImmoSpecification.prixBetween` |
| RG-04-05 | Tri proposé dans l'app : Plus récent (défaut), Prix croissant, Prix décroissant. Les critères actifs sont affichés en puces supprimables ; le nombre de filtres actifs est indiqué. | `features/explore/filters.ts`, `explore.tsx` |
| RG-04-06 | **Champ de recherche de l'accueil** (« Quartier, type de bien, référence… ») : une saisie au format d'une référence (`VE|LO|BA-aammjj-XXXX`, ou l'ancien format `MMjj`) part dans le filtre `reference` (recherche exacte) ; toute autre saisie part dans `q` (RG-04-03). L'envoi a lieu après un court délai sans frappe ou à la validation du clavier. | `src/lib/recherche.ts`, `useExploreAnnonces.tsx` |
| RG-04-07 | Les requêtes de recherche se chassent : quand les critères changent, la requête en cours est ignorée et la liste repart de la première page, avec des squelettes de chargement. | `useExploreAnnonces.tsx` |

### 4.2 Zones actives et proximité

| ID | Règle | Source |
|---|---|---|
| RG-04-08 | Zones actives : communes classées par nombre d'annonces visibles (de 1 à 20 zones, 8 par défaut), puis par ordre alphabétique. Elles alimentent le sélecteur de zones de l'accueil (« Partout », les zones, « Autour de moi »). L'app garde la liste 10 min en cache. Si l'API ne renvoie aucune zone ou ne répond pas, l'app affiche à la place les communes de Conakry, sans décompte. | `BienImmoRepository.findZonesActives`, `useZonesActives.ts` |
| RG-04-09 | Proximité `GET /nearby?lat&lng&rayon` : formule de Haversine, annonces visibles **ayant des coordonnées GPS**, triées par distance croissante, avec les filtres facultatifs `typeAnnonce`, `typeBien`, `prixMin` et `prixMax`. Filtres, tri et pagination sont faits par la base. Rayon par défaut de 5 km côté API ; l'app propose 2, 5, 10, 25 et 50 km (10 par défaut). | `BienImmoRepository.findIdsByProximitePage`, `app/proximite.tsx` |
| RG-04-10 | La position de l'appareil est demandée avec autorisation. En cas de refus : message « Localisation désactivée » / « Autorisez l'accès… ». | `app/proximite.tsx`, `utils/location.ts` |

### 4.3 Annonces similaires

| ID | Règle | Source |
|---|---|---|
| RG-04-11 | Similaires d'une annonce visible : même type de bien, **même commune de la même préfecture** (des communes homonymes existent dans des préfectures différentes, module 05), prix entre −30 % et +30 % (arrondis), hors l'annonce elle-même, les plus récentes d'abord ; 6 par défaut, 20 au plus. | `BienImmoServiceImpl.findSimilaires` |

### 4.4 Favoris (DEC-15)

| ID | Règle | Source |
|---|---|---|
| RG-04-12 | Ajouter un favori : uniquement une annonce visible. Retirer : sans condition. Les opérations renvoient le profil mis à jour (avec `favorisIds`). L'onglet Favoris est proposé à tous les comptes connectés. | `UserServiceImpl`, `src/lib/nav-items.ts` |
| RG-04-13 | Liste des favoris : seuls les favoris encore visibles sont affichés (les annonces masquées, clôturées ou supprimées sont conservées mais cachées), tri par date de création décroissante. | `UserServiceImpl.getFavoris` |
| RG-04-14 | Le nombre de favoris d'une annonce (`nbFavoris`) est calculé à la volée et exposé sur chaque annonce. | `Annonce.nbFavoris` |
| RG-04-15 | Effets d'autres modules sur les favoris : une annonce supprimée par son propriétaire reste dans les favoris, cachée (RG-03-22) ; les annonces d'un compte anonymisé sont **retirées** des favoris de tous, et ses propres favoris sont vidés (RG-02-20). L'utilisateur n'est pas prévenu qu'un favori est clôturé, vendu ou a baissé de prix. | modules 02, 03 |

### 4.5 Alertes de recherche (DEC-16)

| ID | Règle | Source |
|---|---|---|
| RG-04-20 | Depuis une liste de résultats, « Créer une alerte » enregistre les critères en cours (filtres et texte) sous un nom modifiable. Une alerte doit avoir au moins un critère. **10 alertes au plus** par compte. | `AlerteRechercheService.java` |
| RG-04-21 | Une tâche horaire recherche les annonces **devenues visibles** (`visible_depuis`) depuis la dernière vérification de chaque alerte active. Au plus **une notification push par alerte et par jour**, qui indique le nombre de nouvelles annonces ; les annonces qui arrivent entre deux notifications s'accumulent. La notification ouvre la liste de ces annonces. Rien n'est envoyé si le compte n'est pas ACTIF ou s'il a coupé les alertes dans son profil. | idem, module 11 |
| RG-04-22 | Écran « Mes alertes » : renommer, mettre en pause, supprimer. Une alerte dont les notifications n'ont pas été ouvertes depuis 6 mois est mise en pause automatiquement. Les alertes sont supprimées à l'anonymisation du compte. | `app/alertes.tsx` |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Accueil / Explorer | `app/(tabs)/explore.tsx` | Bannière, champ « Quartier, type de bien, référence… », sélecteur de zones actives, bouton « Voir les annonces autour de moi », fenêtre de filtres (`FilterModal`, régions chargées depuis l'API), tri, puces de critères, « Créer une alerte », liste paginée à défilement infini, états vides, squelettes de chargement, bouton « Publier une annonce », bandeau « pièce d'identité non validée ». |
| À proximité | `app/proximite.tsx` | Carte Leaflet, choix du rayon et du type, liste des annonces localisées. |
| Favoris | `app/(tabs)/favoris.tsx` | Liste des favoris, état vide avec « Explorer les annonces ». |
| Mes alertes | `app/alertes.tsx` | Liste des alertes avec leurs critères, interrupteur de pause, renommage, suppression, ouverture des résultats. |
| Fiche annonce, bloc similaires | `app/annonce/[id].tsx` | « Vous pourriez aimer aussi ». |

## 6. API

| Méthode | URL | Accès | Description |
|---|---|---|---|
| GET | `/api/biens-immo` | public | Catalogue paginé et trié |
| GET | `/api/biens-immo/filter` | public | Recherche multicritères + texte + référence |
| GET | `/api/biens-immo/nearby` | public | Proximité, avec filtres |
| GET | `/api/biens-immo/zones-actives?limit=` | public | Zones les plus actives |
| GET | `/api/biens-immo/{id}/similaires?max=` | public | Similaires |
| POST / DELETE | `/api/users/me/favoris/{annonceId}` | connecté | Ajouter / retirer |
| GET | `/api/users/me/favoris` | connecté | Mes favoris |
| GET / POST | `/api/alertes` | connecté | Mes alertes / créer une alerte |
| PATCH / DELETE | `/api/alertes/{id}` | connecté (titulaire) | Renommer, mettre en pause / supprimer |
| POST | `/api/alertes/{id}/ouverture` | connecté (titulaire) | Notification ouverte (repousse la mise en pause automatique) |

Format de page renvoyé : `PageResponse` (`data`, `currentPage`, `totalItems`, `totalPages`).

## 7. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-04-01 | Une annonce masquée par la modération, clôturée, expirée, supprimée, appartenant à un compte masqué, suspendu ou désactivé, ou à une entreprise désactivée n'apparaît dans aucun résultat public (catalogue, filtres, texte, proximité, zones, similaires, favoris). |
| CA-04-02 | La combinaison `q=villa` et `commune=Ratoma` ne renvoie que des villas de Ratoma pertinentes pour « villa ». |
| CA-04-03 | `sort=titre` sur le catalogue est remplacé par `dateCreation` sans erreur. |
| CA-04-04 | Une annonce sans coordonnées GPS n'apparaît jamais dans les résultats de proximité ; le filtre `typeAnnonce` de proximité porte sur tous les résultats, pas sur la seule page chargée. |
| CA-04-05 | Un favori dont l'annonce est clôturée disparaît de la liste et réapparaît si l'annonce est remise en ligne. |
| CA-04-06 | Saisir la référence exacte d'une annonce visible dans le champ de l'accueil affiche cette annonce ; saisir « Kipe » ou « kipé » trouve les annonces du quartier Kipé. |
| CA-04-07 | Si `zones-actives` ne répond pas, le sélecteur affiche les communes de Conakry par ordre alphabétique, sans décompte. |
| CA-04-08 | Après l'anonymisation d'un compte, ses annonces ne figurent plus dans les favoris d'aucun utilisateur. |
| CA-04-09 | Modifier un critère pendant un chargement n'affiche jamais les résultats de l'ancienne recherche. |
| CA-04-10 | Un agent voit l'onglet Favoris et peut y ajouter une annonce. |
| CA-04-11 | Une alerte « Villa · Ratoma · ≤ 2 Mds GNF » envoie une seule notification dans la journée pour trois nouvelles villas correspondantes. |
| CA-04-12 | Les similaires d'une annonce à Koba (préfecture de Dalaba) ne contiennent aucune annonce de Koba (préfecture de Télimélé). |
