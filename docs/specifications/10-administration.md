# Module 10 — Administration (back-office)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Fournir aux modérateurs et aux administrateurs un espace de pilotage intégré à l'application (onglet « Administration », barre latérale sur ordinateur) : tableau de bord des tâches en attente, gestion des utilisateurs, des rôles, des entreprises et des annonces, et réglages de la plateforme. Les décisions de modération sont détaillées au module 09, les licences et quotas au module 08, les localisations au module 05.

Hors périmètre (non implémenté) : journal d'audit consultable (ECART-63) ; exports CSV ; création d'un second administrateur ; double authentification du staff (ECART-64) ; réglage dans l'app des paramètres serveur (durée de validité des annonces, annonces gratuites : SFG §13) ; envoi d'un message ou d'un email à un utilisateur ; gestion des pages légales (CGU, confidentialité).

## 2. Accès

| Section de l'app | Modérateur | Admin |
|---|---|---|
| Tableau de bord | ✅ (libellé « Modération ») | ✅ (libellé « Administration ») |
| Signalements, Annonces, Messages signalés, Pièces d'identité | ✅ | ✅ |
| Utilisateurs (liste, fiche, statut, avertissements, pièce) | ✅ | ✅ |
| Utilisateurs : rôles, suppression, masquage des annonces | ❌ (refusé par l'API) | ✅ |
| Entreprises (liste, fiche, agents) | ✅ en lecture et suspension d'agents | ✅ + désactiver, réactiver, quotas propres |
| Localisations | ❌ (écran réservé à l'administrateur, ECART-45) | ✅ |
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
| US-10-08 | En tant qu'administrateur, je consulte des statistiques avancées (écran « Statistiques » : annonces créées sur 12 mois, répartitions par région, type de bien et type d'annonce). |

## 4. Règles de gestion

### 4.1 Tableau de bord (`GET /api/admin/stats`)

| Indicateur | Définition | Source |
|---|---|---|
| Utilisateurs | Comptes non anonymisés | `AdminServiceImpl.java:104-119` |
| Annonces actives | Annonces `actif = true`, **y compris celles des comptes masqués** (≠ visibilité publique, ECART-27) | idem |
| Signalements | Signalements non retirés (tous statuts) | idem |
| Entreprises | Entreprises dont le propriétaire n'est pas anonymisé | idem |
| Comptes en attente d'activation | Statut EN_ATTENTE_ACTIVATION (agents non connectés compris) | idem |
| Pièces d'identité en attente | Statut de pièce EN_ATTENTE (🆕 avec EVO-01 : distinguer les dossiers complets, validables, des dossiers « Selfie manquant », module 02 RG-02-33) | idem |
| Annonces masquées / rejetées | Par statut de modération | idem |
| Signalements en attente | Statut EN_ATTENTE | idem |
| Messages signalés en attente | Signalés et non supprimés | idem |
| 🆕 Réexamens en attente (DEC-09) | Annonces masquées avec `reexamenDemande` | à créer |
| 🆕 Annonces masquées automatiquement (DEC-11) | Masquées par le système, en attente de décision | à créer |
| 🆕 Entreprises à vérifier (DEC-04) | Statut de vérification EN_ATTENTE | à créer |
| 🆕 Quartiers demandés (DEC-22) | Demandes d'ajout de quartier en attente | à créer |
| 🆕 Dossiers d'identité en attente depuis plus de 48 h (DEC-25) | Dossiers EN_ATTENTE envoyés il y a plus de 48 h, pour tenir l'engagement de 72 h | à créer |

Statistiques avancées (`GET /api/admin/stats/avancees`, sans écran) : créations d'annonces par mois sur 12 mois (toutes annonces), répartition des annonces actives par région, par type de bien et par type d'annonce.

### 4.2 Utilisateurs

| ID | Règle | Source |
|---|---|---|
| RG-10-01 | Recherche paginée par email, nom, prénom ou téléphone, filtre facultatif par statut ; l'administrateur appelant est exclu des résultats. | `AdminController.java:142-154` |
| RG-10-02 | La liste de recherche ne renvoie ni photo, ni entreprise, ni compte parent ; la fiche (`GET /api/users/{id}`) les renvoie (deux formats de `UserDTO`, ECART-18). | `AdminServiceImpl.java:554-579`, `UserServiceImpl.java:357-390` |
| RG-10-03 | **Rôles** (admin) : « octroyer » **remplace** le rôle unique du compte ; ADMINISTRATEUR et AGENT_PROFESSIONNEL ne peuvent pas être attribués ; impossible sur soi-même ou sur un administrateur. « Révoquer » ramène le compte au rôle PARTICULIER (PARTICULIER lui-même n'est pas révocable). Aucune conséquence n'est gérée sur l'entreprise ou les agents d'un ancien professionnel (ECART-22). | `AdminServiceImpl.java:350-396` |
| RG-10-04 | **Suppression d'un compte** (admin) : impossible sur soi-même, sur un administrateur ou sur un compte déjà anonymisé. Effets immédiats : annonces du compte retirées des favoris de tous, photos supprimées du disque (🆕 selfie de vérification compris, module 02 RG-02-35), annonces DESACTIVEE (conservées pour les conversations, signalements et historique), compte anonymisé ; pour un professionnel, mêmes effets sur chaque agent et anonymisation de l'entreprise (« Entreprise supprimée »). Messages conservés. | `AdminServiceImpl.java:400-411`, `CompteSuppressionService.java:122-153` |
| RG-10-05 | Le changement de rôle et la suppression ne déclenchent aucun email (ECART-23). Comme les rôles sont relus en base à chaque requête, un changement de rôle prend effet immédiatement. | — |
| RG-10-12 | **Effets d'un changement de rôle** : seul le rôle change ; entreprise, rattachement à un professionnel, annonces, licence et pièce d'identité restent tels quels. Conséquences (ECART-22) : un professionnel devenu particulier ou modérateur garde son entreprise et ses agents ; un **agent** rétrogradé en particulier (« révoquer AGENT_PROFESSIONNEL ») reste rattaché à l'entreprise et compte dans son quota ; un compte promu **modérateur** garde ses annonces en ligne, désormais exemptées de licence (RG-08-05), et peut l'être sans pièce d'identité validée ; une licence PROFESSIONNEL reste active sur un compte devenu particulier (ECART-25). | `AdminServiceImpl.java:350-396` |
| RG-10-13 | Le compteur « Comptes en attente d'activation » n'ouvre sur aucune action : l'administration ne peut ni renvoyer le lien d'activation, ni supprimer un compte jamais activé autrement que par la suppression définitive (ECART-53). 🆕 Avec DEC-06, la purge automatique à J+7 (module 01, RG-01-47) vide ce compteur des comptes abandonnés. | `administration/index.tsx` |

### 4.2 bis Comptes du staff

| ID | Règle | Source |
|---|---|---|
| RG-10-14 | **Administrateur initial** : créé au démarrage à partir de `ADMIN_EMAIL` et `ADMIN_PASSWORD`, uniquement si aucun administrateur n'existe. Le mot de passe n'est soumis à aucune règle de robustesse et son changement n'est pas exigé à la première connexion. Le compte n'a ni téléphone ni pièce d'identité. | `DataLoader.java:46-68` |
| RG-10-15 | **Autres administrateurs** : le rôle ADMINISTRATEUR ne s'attribue pas par l'API ; un second administrateur ne peut être créé qu'en base. Aucun administrateur ne peut être suspendu, averti, rétrogradé ou supprimé par l'API (CA-10-03). En cas de perte d'accès, seule la réinitialisation par email (module 01) ou une intervention en base permettent de reprendre la main. | `AdminServiceImpl.java:354-357`, `UserServiceImpl.java:313-318` |
| RG-10-16 | **Modérateurs** : un administrateur promeut n'importe quel compte, sans condition (pièce validée, ancienneté). Le modérateur conserve son compte d'origine et ses annonces. | RG-10-12 |
| RG-10-17 | **Sécurité des sessions du staff** : mêmes règles que tout utilisateur (module 01) ; aucune double authentification ; sur le web, jetons dans le `localStorage` (ECART-54) ; aucune alerte en cas de connexion inhabituelle (ECART-64). | module 01 |
| 🆕 RG-10-18 | **Cible DEC-03** : double authentification par code email pour les administrateurs et modérateurs, jeton de rafraîchissement de 24 h, codes de secours, alerte à chaque connexion et changement de mot de passe exigé pour l'administrateur initial (module 01 §4.8). | DEC-03 |
| 🆕 RG-10-19 | **Cible DEC-11** : le seuil de masquage automatique (`moderation.seuil-masquage-auto`, 3 par défaut) se règle dans un écran Paramètres à créer, réservé à l'administrateur (aujourd'hui seuls les quotas et les licences ont un écran de réglage) ; 0 désactive le masquage automatique. | DEC-11 |
| 🆕 RG-10-20 | **Cible DEC-04** : file « Entreprises à vérifier » (justificatif, fiche, identité du propriétaire côte à côte), décisions vérifier ou refuser avec motif, ouverte aux modérateurs (module 07 §4.5). | DEC-04 |
| 🆕 RG-10-21 | **Cible DEC-22** : file « Quartiers demandés » (nom saisi, commune, annonces concernées, quartiers proches par le nom), décisions ajouter, rattacher à un quartier existant ou refuser (module 05, RG-05-17). Réservée à l'administrateur, comme l'écriture des localisations. | DEC-22 |

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
| RG-10-11 | La section « Statut du compte » (désactiver / réactiver) et la modification des quotas ne sont affichées qu'à l'administrateur, conformément à l'API. Le texte de confirmation annonce des effets (« ne sera plus active pour son propriétaire et ses agents ») plus larges que l'effet réel, qui se limite au blocage de la publication (ECART-14) ; 🆕 avec DEC-12, le texte décrit les effets de RG-07-22 (annonces retirées du public, agents sans accès, page publique fermée). | `administration/entreprises/[id].tsx:314-337`, `EntrepriseController.java:268-288` |

## 5. Écrans

| Écran | Route |
|---|---|
| Tableau de bord | `app/(tabs)/administration/index.tsx` (sections « À traiter » et « Gestion », tirer pour rafraîchir) |
| Utilisateurs / fiche | `administration/users.tsx`, `administration/users/[id].tsx` |
| Annonces | `administration/annonces.tsx` |
| Signalements | `administration/signalements.tsx` |
| Messages signalés / conversation | `administration/messages.tsx`, `administration/messages/[id].tsx` |
| Pièces d'identité | `administration/pieces-identite.tsx` (file des pièces en attente, ouverture de la fiche utilisateur). 🆕 EVO-01 : pièce et selfie côte à côte, liste de contrôle, motifs de rejet du selfie, validation désactivée si le selfie manque (module 02 §5). |
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
| CA-10-05 | Redémarrer l'API avec un autre `ADMIN_EMAIL` ne crée pas de second administrateur. |
| CA-10-06 | `POST /api/admin/utilisateurs/{id}/roles/ADMINISTRATEUR` renvoie 400 ; `…/roles/AGENT_PROFESSIONNEL` aussi. |
| CA-10-07 | Promouvoir modérateur un particulier qui a 3 annonces en ligne laisse ces annonces visibles (comportement actuel, RG-10-12). |
| CA-10-08 | Un modérateur ne voit ni l'écran Quotas ni l'écran Licences, et l'écran Localisations ne lui propose aucune action d'écriture (cible, ECART-45). |

## 8. Écarts propres au module

ECART-14, ECART-18, ECART-22, ECART-23, ECART-25, ECART-27, ECART-30, ECART-40, ECART-45, ECART-53, ECART-54, ECART-63 (décisions sans auteur, pas de journal d'audit), ECART-64 (sécurité des comptes du staff).

## 9. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-03.

1. Faut-il imposer une double authentification aux administrateurs et aux modérateurs (code par email ou application d'authentification) ?
2. Combien d'administrateurs faut-il, et comment en créer un second sans intervention en base ?
3. Un modérateur doit-il avoir un compte distinct de son compte personnel d'annonceur ?
4. Quels paramètres doivent devenir réglables dans l'app (durée de validité des annonces, annonces gratuites, email de vente) ?
5. Un changement de rôle doit-il passer par un parcours guidé qui traite l'entreprise, les agents, les annonces et la licence (ECART-22) ?
