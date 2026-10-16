# Module 10 — Administration (back-office)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Fournir aux modérateurs et aux administrateurs un espace de pilotage intégré à l'application (onglet « Administration », barre latérale sur ordinateur) : tableau de bord des tâches en attente, gestion des utilisateurs, des rôles, des entreprises et des annonces, et réglages de la plateforme. Les décisions de modération sont détaillées au module 09, les licences et quotas au module 08, les localisations au module 05.

## 2. Accès

| Section de l'app | Modérateur | Admin |
|---|---|---|
| Tableau de bord | ✅ (libellé « Modération ») | ✅ (libellé « Administration ») |
| Signalements, Annonces, Messages signalés, Pièces d'identité | ✅ | ✅ |
| Utilisateurs (liste, fiche, statut, avertissements, pièce) | ✅ | ✅ |
| Utilisateurs : rôles, suppression, masquage des annonces | ❌ (refusé par l'API) | ✅ |
| Entreprises (liste, fiche, agents) | ✅ en lecture et suspension d'agents | ✅ + désactiver, réactiver, quotas propres |
| Localisations | visible, mais écriture refusée par l'API (ECART-45) | ✅ |
| Quotas, Licences | ❌ (masqués) | ✅ |

Garde d'accès : `app/(tabs)/administration/_layout.tsx` (redirection si l'utilisateur n'est ni modérateur ni administrateur) ; côté API, `@PreAuthorize` sur chaque endpoint.

## 3. User stories

| ID | User story |
|---|---|
| US-10-01 | En tant que modérateur, je vois d'un coup d'œil ce qui est « À traiter » : signalements, messages signalés, pièces d'identité, comptes en attente d'activation. |
| US-10-02 | En tant que modérateur, je recherche un utilisateur par nom, email ou téléphone et je filtre par statut. |
| US-10-03 | En tant que modérateur, j'ouvre la fiche d'un utilisateur : informations, entreprise, compte parent, pièce, avertissements, statut, masquage, annonces. |
| US-10-04 | En tant qu'administrateur, je change le rôle d'un utilisateur (particulier, professionnel, modérateur). |
| US-10-05 | En tant qu'administrateur, je supprime définitivement un compte (et, pour un professionnel, son entreprise et ses agents). |
| US-10-06 | En tant que modérateur, je recherche une annonce (titre, référence, propriétaire) et je filtre par statut et par clôture. |
| US-10-07 | En tant que modérateur, je consulte la liste des entreprises et leur fiche (propriétaire, agents, quotas, statut). |
| US-10-08 | En tant qu'administrateur, je consulte des statistiques avancées (pas d'écran aujourd'hui : ECART-30). |

## 4. Règles de gestion

### 4.1 Tableau de bord (`GET /api/admin/stats`)

| Indicateur | Définition | Source |
|---|---|---|
| Utilisateurs | Comptes non anonymisés | `AdminServiceImpl.java:104-119` |
| Annonces actives | Annonces `actif = true`, **y compris celles des comptes masqués** (≠ visibilité publique, ECART-27) | idem |
| Signalements | Signalements non retirés (tous statuts) | idem |
| Entreprises | Entreprises dont le propriétaire n'est pas anonymisé | idem |
| Comptes en attente d'activation | Statut EN_ATTENTE_ACTIVATION (agents non connectés compris) | idem |
| Pièces d'identité en attente | Statut de pièce EN_ATTENTE | idem |
| Annonces masquées / rejetées | Par statut de modération | idem |
| Signalements en attente | Statut EN_ATTENTE | idem |
| Messages signalés en attente | Signalés et non supprimés | idem |

Statistiques avancées (`GET /api/admin/stats/avancees`, sans écran) : créations d'annonces par mois sur 12 mois (toutes annonces), répartition des annonces actives par région, par type de bien et par type d'annonce.

### 4.2 Utilisateurs

| ID | Règle | Source |
|---|---|---|
| RG-10-01 | Recherche paginée par email, nom, prénom ou téléphone, filtre facultatif par statut ; l'administrateur appelant est exclu des résultats. | `AdminController.java:142-154` |
| RG-10-02 | La liste de recherche ne renvoie ni photo, ni entreprise, ni compte parent ; la fiche (`GET /api/users/{id}`) les renvoie (deux formats de `UserDTO`, ECART-18). | `AdminServiceImpl.java:554-579`, `UserServiceImpl.java:357-390` |
| RG-10-03 | **Rôles** (admin) : « octroyer » **remplace** le rôle unique du compte ; ADMINISTRATEUR et AGENT_PROFESSIONNEL ne peuvent pas être attribués ; impossible sur soi-même ou sur un administrateur. « Révoquer » ramène le compte au rôle PARTICULIER (PARTICULIER lui-même n'est pas révocable). Aucune conséquence n'est gérée sur l'entreprise ou les agents d'un ancien professionnel (ECART-22). | `AdminServiceImpl.java:350-396` |
| RG-10-04 | **Suppression d'un compte** (admin) : impossible sur soi-même, sur un administrateur ou sur un compte déjà anonymisé. Effets immédiats : annonces du compte retirées des favoris de tous, photos supprimées du disque, annonces DESACTIVEE (conservées pour les conversations, signalements et historique), compte anonymisé ; pour un professionnel, mêmes effets sur chaque agent et anonymisation de l'entreprise (« Entreprise supprimée »). Messages conservés. | `AdminServiceImpl.java:400-411`, `CompteSuppressionService.java:122-153` |
| RG-10-05 | Le changement de rôle et la suppression ne déclenchent aucun email (ECART-23). Comme les rôles sont relus en base à chaque requête, un changement de rôle prend effet immédiatement. | — |

### 4.3 Annonces

| ID | Règle | Source |
|---|---|---|
| RG-10-06 | Liste admin : toutes les annonces (supprimées comprises), filtres `statut` (PUBLIEE, MASQUEE, REJETEE, DESACTIVEE), `cloturee` (vrai / faux) et `q` (titre, référence, email, nom ou prénom du propriétaire) ; tri sur `dateCreation`, `prix`, `titre` ou `statutModeration`. | `AdminController.java:68-85`, `BienImmoRepository.rechercherPourAdmin` |
| RG-10-07 | L'app affiche le propriétaire à partir de `proprietaireUsername` / `proprietaireId`, champs absents de la réponse de l'API : la colonne propriétaire est vide (ECART-18). | `app/(tabs)/administration/annonces.tsx:112-115` |
| RG-10-08 | « Activer / Désactiver » une annonce depuis l'administration passe par `toggle-actif` (module 03, RG-03-18). | `src/api/admin.api.ts:182` |

### 4.4 Entreprises

| ID | Règle | Source |
|---|---|---|
| RG-10-09 | Liste complète non paginée des entreprises (actives et inactives, hors propriétaires anonymisés), filtrée côté app par nom, email, RCCM ou téléphone. | `EntrepriseServiceImpl.java:222-228`, `administration/entreprises.tsx` |
| RG-10-10 | Fiche : coordonnées, propriétaire (lien vers sa fiche), agents, annonces actives, quotas (global ou propre), statut, désactivation et réactivation. L'app affiche `annonceurProfessionnelUsername`, absent de la réponse (seul l'email est renvoyé, ECART-18). | `administration/entreprises/[id].tsx:246-248` |
| RG-10-11 | La section « Statut du compte » (désactiver / réactiver) et la modification des quotas ne sont affichées qu'à l'administrateur, conformément à l'API. Le texte de confirmation annonce des effets (« ne sera plus active pour son propriétaire et ses agents ») plus larges que l'effet réel, qui se limite au blocage de la publication (ECART-14). | `administration/entreprises/[id].tsx:314-337`, `EntrepriseController.java:268-288` |

## 5. Écrans

| Écran | Route |
|---|---|
| Tableau de bord | `app/(tabs)/administration/index.tsx` (sections « À traiter » et « Gestion », tirer pour rafraîchir) |
| Utilisateurs / fiche | `administration/users.tsx`, `administration/users/[id].tsx` |
| Annonces | `administration/annonces.tsx` |
| Signalements | `administration/signalements.tsx` |
| Messages signalés / conversation | `administration/messages.tsx`, `administration/messages/[id].tsx` |
| Pièces d'identité | `administration/pieces-identite.tsx` (file des pièces en attente, ouverture de la fiche utilisateur) |
| Entreprises / fiche | `administration/entreprises.tsx`, `administration/entreprises/[id].tsx` |
| Localisations | `administration/localisations.tsx` |
| Quotas | `administration/quotas.tsx` |
| Licences | `administration/licences.tsx` |

## 6. API (hors modules 05, 08 et 09)

| Méthode | URL | Accès |
|---|---|---|
| GET | `/api/admin/stats` · `/api/admin/stats/avancees` | modération |
| GET | `/api/admin/utilisateurs?search&statut` | modération |
| GET | `/api/users` (liste paginée, non utilisée par l'app) · `/api/users/{id}` | modération |
| GET | `/api/admin/pieces-identite/en-attente` | modération (renvoie une `Page` Spring brute) |
| POST / DELETE | `/api/admin/utilisateurs/{id}/roles/{role}` | admin |
| DELETE | `/api/admin/utilisateurs/{id}` | admin |
| GET | `/api/admin/annonces` | modération |
| GET | `/api/entreprises` · `/api/entreprises/{id}` · `/{id}/agents` | modération |
| DELETE / PUT | `/api/entreprises/{id}` · `/{id}/reactiver` | admin (DELETE aussi pour le propriétaire) |

## 7. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-10-01 | Un modérateur n'a pas accès à Quotas ni à Licences, et reçoit 403 sur `POST /api/admin/utilisateurs/{id}/roles/MODERATEUR`. |
| CA-10-02 | La suppression d'un professionnel par l'admin anonymise le professionnel, ses agents et l'entreprise, et désactive toutes leurs annonces. |
| CA-10-03 | Un administrateur ne peut ni changer le rôle, ni supprimer, ni avertir, ni suspendre un autre administrateur via l'API. |
| CA-10-04 | Les compteurs « À traiter » correspondent au nombre d'éléments dans chaque file. |

## 8. Écarts propres au module

ECART-14, ECART-18, ECART-22, ECART-23, ECART-27, ECART-30, ECART-40, ECART-45.
