# Module 10 — Administration (back-office)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Fournir aux modérateurs et aux administrateurs un espace de pilotage intégré à l'application (onglet « Administration », barre latérale sur ordinateur) : tableau de bord des tâches en attente, gestion des utilisateurs, des rôles, des entreprises et des annonces, statistiques, journal d'audit et réglages de la plateforme. Les décisions de modération sont détaillées au module 09, les licences et quotas au module 08, les localisations au module 05.

Hors périmètre : exports CSV ; création d'un second administrateur depuis l'app ; réglage dans l'app de la durée de validité des annonces et du nombre d'annonces gratuites (SFG §13) ; envoi d'un message ou d'un email à un utilisateur ; gestion des pages légales (CGU, confidentialité).

## 2. Accès

| Section de l'app | Modérateur | Admin |
|---|---|---|
| Tableau de bord | ✅ (libellé « Modération ») | ✅ (libellé « Administration ») |
| Signalements, Réexamens, Annonces, Messages signalés, Pièces d'identité, Entreprises à vérifier | ✅ | ✅ |
| Utilisateurs (liste, fiche, statut, avertissements, dossier de vérification) | ✅ | ✅ |
| Utilisateurs : rôle, suppression, masquage des annonces, levée d'un avertissement | ❌ (refusé par l'API) | ✅ |
| Entreprises (liste, fiche, agents) | ✅ en lecture et suspension d'agents | ✅ + désactiver, réactiver, quotas propres |
| Statistiques | ✅ | ✅ |
| Localisations, Quartiers demandés, Quotas, Licences, Paramètres, Journal d'audit | ❌ (masqués) | ✅ |

Garde d'accès : `app/(tabs)/administration/_layout.tsx` (redirection si l'utilisateur n'est ni modérateur ni administrateur), écrans réservés à l'administrateur masqués du menu et de la barre latérale ; côté API, `@PreAuthorize` sur chaque endpoint.

## 3. User stories

| ID | User story |
|---|---|
| US-10-01 | En tant que modérateur, je vois d'un coup d'œil ce qui est « À traiter » : signalements, réexamens, messages signalés, pièces d'identité, entreprises à vérifier, quartiers demandés, comptes en attente d'activation. |
| US-10-02 | En tant que modérateur, je recherche un utilisateur par nom, email ou téléphone et je filtre par statut. |
| US-10-03 | En tant que modérateur, j'ouvre la fiche d'un utilisateur : informations, entreprise, compte parent, dossier de vérification, avertissements, statut, masquage, annonces. |
| US-10-04 | En tant qu'administrateur, je change le rôle d'un utilisateur (particulier, professionnel, modérateur), avec les garde-fous de DEC-37. |
| US-10-05 | En tant qu'administrateur, je supprime définitivement un compte (et, pour un professionnel, son entreprise et ses agents). |
| US-10-06 | En tant que modérateur, je recherche une annonce (titre, référence, propriétaire), je filtre par statut et par clôture, et j'ouvre son historique. |
| US-10-07 | En tant que modérateur, je consulte la liste des entreprises et leur fiche (propriétaire, agents, quotas, statut, vérification). |
| US-10-08 | En tant que modérateur, je consulte les statistiques : annonces créées sur 12 mois, répartitions par région, type de bien et type d'annonce. |
| US-10-09 | En tant qu'administrateur, je consulte le journal d'audit et je règle le seuil de masquage automatique. |

## 4. Règles de gestion

### 4.1 Tableau de bord (`GET /api/admin/stats`)

| Indicateur | Définition |
|---|---|
| Utilisateurs | Comptes non anonymisés |
| Annonces actives | Annonces **visibles du public** (même règle que le catalogue, SFG §8) |
| Signalements | Signalements non retirés (tous statuts) |
| Entreprises | Entreprises dont le propriétaire n'est pas anonymisé |
| Comptes en attente d'activation | Statut EN_ATTENTE_ACTIVATION (les comptes abandonnés sont supprimés à J+7, RG-01-33) |
| Pièces d'identité en attente | Dossiers de vérification EN_ATTENTE |
| Annonces masquées / rejetées | Par statut de modération |
| Signalements en attente | Statut EN_ATTENTE |
| Messages signalés en attente | Signalés et non supprimés |
| Réexamens en attente | Annonces masquées avec une demande de réexamen (DEC-09) |
| Entreprises à vérifier | Statut de vérification EN_ATTENTE (DEC-04) |
| Quartiers demandés | Demandes d'ajout de quartier en attente (DEC-22) |

Source : `AdminServiceImpl.getStats`.

**Statistiques** (`GET /api/admin/stats/avancees`, écran « Statistiques ») : annonces créées par mois sur 12 mois, répartition des annonces visibles par région, par type de bien et par type d'annonce.

### 4.2 Utilisateurs

| ID | Règle | Source |
|---|---|---|
| RG-10-01 | Recherche paginée par email, nom, prénom ou téléphone, filtre facultatif par statut ; l'administrateur appelant est exclu des résultats. | `AdminController.rechercherUtilisateurs` |
| RG-10-02 | La fiche (`GET /api/users/{id}`) renvoie le profil complet : photo, entreprise, compte parent, dossier de vérification (recto, verso, selfie, date d'expiration), avertissements en vigueur, masquage. | `UserServiceImpl.toDTO` |
| RG-10-03 | **Rôle** (admin, DEC-37) : `PUT /utilisateurs/{id}/role` remplace le rôle unique du compte ; refusé pour soi-même, vers ADMINISTRATEUR ou AGENT_PROFESSIONNEL (un agent s'invite depuis son entreprise), et sur un administrateur. Sessions fermées, email au titulaire, changement journalisé. | `AdminServiceImpl.changerRole` |
| RG-10-12 | **Effets d'un changement de rôle** (DEC-37) : refusé pour un professionnel qui dirige une entreprise et pour un agent encore rattaché (son professionnel le retire d'abord) ; un agent retiré qui change de rôle perd son rattachement ; un compte promu modérateur voit ses annonces retirées du public (masquage du compte), rendues s'il redevient annonceur. | idem |
| RG-10-04 | **Suppression d'un compte** (admin) : impossible sur soi-même, sur un administrateur ou sur un compte déjà anonymisé. Effets immédiats : annonces du compte retirées des favoris de tous, photos supprimées du disque, pièce, verso et selfie supprimés, annonces DESACTIVEE (conservées pour les conversations, signalements et historique), compte anonymisé ; pour un professionnel, mêmes effets sur chaque agent et anonymisation de l'entreprise (« Entreprise supprimée »). Messages conservés. Pas d'email. | `AdminServiceImpl.supprimerCompte`, `CompteSuppressionService.supprimerParAdministrateur` |
| RG-10-13 | Le compteur « Comptes en attente d'activation » mène à la liste filtrée ; l'administration ne peut pas renvoyer le lien d'activation (l'utilisateur le fait depuis l'écran de connexion). | `administration/index.tsx` |

### 4.3 Comptes du staff

| ID | Règle | Source |
|---|---|---|
| RG-10-14 | **Administrateur initial** : créé au démarrage à partir de `ADMIN_EMAIL` et `ADMIN_PASSWORD`, uniquement si aucun administrateur n'existe. Il doit changer son mot de passe à sa première connexion. Le compte n'a ni téléphone ni pièce d'identité. | `DataLoader.java` |
| RG-10-15 | **Autres administrateurs** : le rôle ADMINISTRATEUR ne s'attribue pas par l'API ; un second administrateur ne peut être créé qu'en base. Aucun administrateur ne peut être suspendu, averti, changé de rôle ou supprimé par l'API. En cas de perte d'accès, seule la réinitialisation par email (module 01), les codes de secours ou une intervention en base permettent de reprendre la main. | `AdminServiceImpl.refuserSiAdministrateur` |
| RG-10-16 | **Modérateurs** : un administrateur promeut n'importe quel compte qui n'a pas d'entreprise ni de rattachement d'agent. Le modérateur conserve son compte d'origine ; ses annonces quittent le public (RG-10-12). | RG-10-12 |
| RG-10-17 | **Sécurité des comptes du staff** (DEC-03) : double authentification par code email à chaque connexion, jeton de rafraîchissement de 24 h, codes de secours, email d'alerte à chaque connexion (module 01 §4.8). Sur le web, le jeton de rafraîchissement est dans un cookie `HttpOnly`. | module 01 |

### 4.4 Annonces

| ID | Règle | Source |
|---|---|---|
| RG-10-06 | Liste admin : toutes les annonces (supprimées comprises), filtres `statut` (PUBLIEE, MASQUEE, REJETEE, DESACTIVEE), `cloturee` (vrai / faux) et `q` (titre, référence, email, nom ou prénom du propriétaire) ; tri sur `dateCreation`, `prix`, `titre` ou `statutModeration`. Chaque ligne porte le nom et l'email du propriétaire (lien vers sa fiche) et donne accès à l'historique de l'annonce. | `AdminController.getAllAnnonces`, `BienImmoRepository.rechercherPourAdmin` |
| RG-10-08 | « Activer / Désactiver » une annonce depuis l'administration passe par `toggle-actif` (module 03, RG-03-18). | `src/api/admin.api.ts` |

### 4.5 Entreprises

| ID | Règle | Source |
|---|---|---|
| RG-10-09 | Liste des entreprises (actives et inactives, hors propriétaires anonymisés), filtrée par nom, email, RCCM ou téléphone. | `EntrepriseServiceImpl.getAllEntreprises`, `administration/entreprises.tsx` |
| RG-10-10 | Fiche : coordonnées, propriétaire (nom et email, lien vers sa fiche), agents, annonces actives, quotas (global ou propre), statut, vérification, désactivation et réactivation. | `administration/entreprises/[id].tsx` |
| RG-10-11 | La section « Statut » (désactiver / réactiver) et la modification des quotas ne sont affichées qu'à l'administrateur. Le texte de confirmation décrit les effets de la désactivation (DEC-12) : annonces retirées du public, agents sans accès, page publique fermée, tout revenant à la réactivation. | idem |
| RG-10-20 | File « Entreprises à vérifier » (DEC-04) : justificatif, fiche et identité du propriétaire, décisions vérifier ou refuser avec motif ; ouverte aux modérateurs (module 07 §4.2). | `administration/entreprises-a-verifier.tsx` |

### 4.6 Réglages et traçabilité

| ID | Règle | Source |
|---|---|---|
| RG-10-19 | **Paramètres** (DEC-11) : le seuil de masquage automatique se règle dans l'écran Paramètres (`GET/PUT /api/admin/parametres`, administrateur seulement, entre 0 et 50, journalisé) ; la configuration `moderation.seuil-masquage-auto` (3) sert de valeur par défaut ; 0 désactive le masquage automatique. | `ModerationAnnonceService.setSeuilMasquageAuto` |
| RG-10-21 | File « Quartiers demandés » (DEC-22) : nom saisi, commune, annonces concernées, quartiers proches par le nom ; décisions ajouter, rattacher à un quartier existant ou refuser (module 05, RG-05-17). Réservée à l'administrateur. | `administration/quartiers-demandes.tsx` |
| RG-10-22 | **Journal d'audit** (administrateur) : toutes les actions de la modération, de l'administration et du système, de la plus récente à la plus ancienne, avec l'auteur (libellé et rôle, ou « Système »), la cible (type et identifiant), le motif et l'adresse IP. Sont journalisés : décisions sur les annonces, signalements et messages, lectures de conversations signalées et de pièces ou justificatifs, statuts, rôles, avertissements et leur levée, suppressions de comptes, masquage des annonces d'un compte, vérifications d'identité et d'entreprise, désactivation et réactivation d'entreprise, quotas, ventes et réglages des licences, mode licence, localisations et quartiers demandés, paramètres. Filtres de l'écran : type de cible ; l'API accepte aussi l'auteur, l'action et l'identifiant de la cible. | `AuditService.java`, `app/(tabs)/administration/journal.tsx` |
| RG-10-23 | **Conservation du journal** (DEC-26) : adresses IP effacées après 90 jours, lignes supprimées après 3 ans (tâche de 04:00). | `PurgeConservationService.java` |

## 5. Écrans

| Écran | Route |
|---|---|
| Tableau de bord | `app/(tabs)/administration/index.tsx` (sections « À traiter » et « Gestion », tirer pour rafraîchir) |
| Utilisateurs / fiche | `administration/users.tsx`, `administration/users/[id].tsx` |
| Annonces | `administration/annonces.tsx` (avec accès à l'historique, `app/annonce-historique/[id].tsx`) |
| Signalements, Réexamens | `administration/signalements.tsx`, `administration/reexamens.tsx` |
| Messages signalés / conversation | `administration/messages.tsx`, `administration/messages/[id].tsx` |
| Pièces d'identité | `administration/pieces-identite.tsx` (file des dossiers, ouverture de la fiche utilisateur) |
| Entreprises / fiche / à vérifier | `administration/entreprises.tsx`, `administration/entreprises/[id].tsx`, `administration/entreprises-a-verifier.tsx` |
| Statistiques | `administration/statistiques.tsx` |
| Localisations, Quartiers demandés | `administration/localisations.tsx`, `administration/quartiers-demandes.tsx` (administrateur) |
| Quotas, Licences | `administration/quotas.tsx`, `administration/licences.tsx` (administrateur) |
| Paramètres, Journal d'audit | `administration/parametres.tsx`, `administration/journal.tsx` (administrateur) |

## 6. API (hors modules 05, 07, 08 et 09)

| Méthode | URL | Accès |
|---|---|---|
| GET | `/api/admin/stats` · `/api/admin/stats/avancees` | modération |
| GET | `/api/admin/utilisateurs?search&statut` | modération |
| GET | `/api/users/{id}` | modération |
| GET | `/api/admin/pieces-identite/en-attente` | modération |
| PUT | `/api/admin/utilisateurs/{id}/role` `{role}` | admin |
| DELETE | `/api/admin/utilisateurs/{id}` | admin |
| GET | `/api/admin/annonces` | modération |
| GET | `/api/entreprises` · `/api/entreprises/{id}` · `/{id}/agents` | modération |
| DELETE / PUT | `/api/entreprises/{id}` · `/{id}/reactiver` | admin (DELETE aussi pour le propriétaire) |
| GET / PUT | `/api/admin/parametres` | admin |
| GET | `/api/admin/audit?page&size&acteurId&action&cibleType&cibleId` | admin |

Toutes les listes paginées renvoient une `PageResponse` (`data`, `currentPage`, `totalItems`, `totalPages`).

## 7. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-10-01 | Un modérateur n'a accès ni à Quotas, ni à Licences, ni à Localisations, ni à Paramètres, ni au Journal d'audit, et reçoit 403 sur `PUT /api/admin/utilisateurs/{id}/role`. |
| CA-10-02 | La suppression d'un professionnel par l'admin anonymise le professionnel, ses agents et l'entreprise, et désactive toutes leurs annonces. |
| CA-10-03 | Un administrateur ne peut ni changer le rôle, ni supprimer, ni avertir, ni suspendre un autre administrateur via l'API. |
| CA-10-04 | Les compteurs « À traiter » correspondent au nombre d'éléments dans chaque file. |
| CA-10-05 | Redémarrer l'API avec un autre `ADMIN_EMAIL` ne crée pas de second administrateur. |
| CA-10-06 | Changer un rôle vers ADMINISTRATEUR ou AGENT_PROFESSIONNEL renvoie 400 ; changer le rôle d'un professionnel qui dirige une entreprise renvoie 422. |
| CA-10-07 | Promouvoir modérateur un particulier qui a 3 annonces en ligne les retire du public ; le redevenir particulier les rend visibles. |
| CA-10-08 | Après la création d'un quartier par l'administrateur, le journal d'audit contient `LOCALISATION_CREEE` avec son auteur. |
