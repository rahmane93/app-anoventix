# Module 07 — Espace professionnel (entreprise, agents, tableau de bord)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à une agence immobilière (compte PROFESSIONNEL) de créer sa fiche entreprise, d'inviter et de gérer des agents qui publient en son nom, d'exposer une page publique et de suivre son activité. Les quotas et licences appliqués aux entreprises sont détaillés au module 08.

Hors périmètre (non implémenté) : vérification de l'entreprise (RCCM, existence légale, ECART-61) ; transfert de l'entreprise à un autre compte ; plusieurs agences ou plusieurs propriétaires ; rôle intermédiaire (responsable d'équipe) ; boîte de messagerie partagée de l'agence (les conversations vont à l'agent, RG-06-03) ; localisation de l'agence dans le référentiel (l'adresse est un texte libre) ; facturation au nom de l'entreprise.

## 2. Acteurs et droits

| Action | PRO propriétaire | Agent | Modérateur | Admin | Public |
|---|---|---|---|---|---|
| Créer / modifier l'entreprise, changer sa photo | ✅ | ❌ | ❌ | ❌ | ❌ |
| Consulter la fiche interne et la liste des agents | ✅ | ✅ (son entreprise) | ✅ | ✅ | ❌ |
| Inviter (créer) un agent, retirer un agent | ✅ | ❌ | ❌ | ❌ | ❌ |
| Suspendre / réactiver un agent | ✅ (ses propres suspensions) | ❌ | ✅ | ✅ | ❌ |
| Désactiver l'entreprise | ✅ | ❌ | ❌ | ✅ | ❌ |
| Réactiver l'entreprise | ❌ | ❌ | ❌ | ✅ | ❌ |
| Page publique de l'entreprise | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tableau de bord | ✅ (avec section équipe) | ✅ (sans équipe) | ❌ | ❌ | ❌ |

## 3. User stories

| ID | User story |
|---|---|
| US-07-01 | En tant que professionnel, je crée mon entreprise (nom, description, RCCM, adresse, téléphone, email) avant de pouvoir publier. |
| US-07-02 | En tant que professionnel, je modifie les informations et la photo de mon entreprise. |
| US-07-03 | En tant que professionnel, j'invite un agent (prénom, nom, email, téléphone) ; il reçoit ses identifiants par email. |
| US-07-04 | En tant que professionnel, je suspends, réactive ou retire un agent ; les annonces actives d'un agent retiré me sont transférées. |
| US-07-05 | En tant que professionnel, je consulte toutes les annonces de l'entreprise et je les filtre par référence ou titre. |
| US-07-06 | En tant que visiteur, je consulte la page publique de l'agence et ses annonces. |
| US-07-07 | En tant que professionnel ou agent, je suis mon activité : portefeuille, visibilité, messagerie, équipe, conformité. |
| US-07-08 | En tant qu'agent, je choisis mon mot de passe depuis le lien d'invitation, puis je fais valider ma pièce d'identité (🆕 et mon selfie, module 02 §4.6) pour publier. |

## 4. Règles de gestion

### 4.1 Entreprise

| ID | Règle | Source |
|---|---|---|
| RG-07-01 | Seul un PROFESSIONNEL peut créer une entreprise, **une seule** par compte. | `EntrepriseServiceImpl.java:91-128` |
| RG-07-02 | Champs obligatoires : nom (≤ 100), description (≤ 200), RCCM (≤ 50, unique), adresse (≤ 100), téléphone (format international, unique parmi les entreprises), email (≤ 100). Le champ `pays` est accepté puis ignoré. | `EntrepriseRequest.java`, `validation.ts:131-146` |
| RG-07-03 | Le téléphone de l'entreprise n'est pas normalisé, contrairement à celui des comptes (ECART-44). | `EntrepriseServiceImpl.java:111-114` |
| RG-07-04 | Seul le propriétaire modifie l'entreprise et sa photo ; l'ancienne photo est supprimée du disque. | `EntrepriseServiceImpl.java:131-193` |
| RG-07-05 | **Désactivation** (propriétaire ou admin) : `active = false`. Effet réel : la publication et la remise en ligne sont refusées au pro et à ses agents (« Votre entreprise est désactivée… »). Les annonces déjà en ligne **restent visibles**, les agents restent actifs et la page publique reste accessible (ECART-14). | `EntrepriseServiceImpl.java:542-561`, `BienImmoServiceImpl.java:569-580` |
| RG-07-06 | **Réactivation** : administrateur uniquement. Un professionnel qui a désactivé son entreprise ne peut pas la réactiver lui-même. | `EntrepriseController.java:282-288` |
| RG-07-19 | **RCCM** : seule l'unicité est contrôlée ; ni le format ni l'existence ne sont vérifiés, et le professionnel peut le modifier à tout moment. Aucune notion d'« entreprise vérifiée » : pourtant, les annonces d'un professionnel ou d'un agent portent un badge de rôle et renvoient vers la page de l'agence. Un tiers peut aussi réserver le RCCM d'une agence réelle, qui ne pourra plus l'enregistrer (ECART-61). | `EntrepriseServiceImpl.java:106-108, 144-147`, `APP/src/features/annonce/AnnonceurCard.tsx:16, 67` |

### 4.2 Agents

| ID | Règle | Source |
|---|---|---|
| RG-07-07 | Création d'un agent par le propriétaire uniquement, dans la limite du **quota d'agents** (agents non retirés, hors propriétaire). | `EntrepriseServiceImpl.java:231-248` |
| RG-07-08 | Email (normalisé, unique) et téléphone (normalisé, unique, **obligatoire**) ; prénom et nom ≤ 50. L'email accepte 100 caractères alors que le compte n'en accepte que 50 (ECART-10). | `AgentRequest.java` |
| RG-07-09 | Le compte agent est créé avec le rôle AGENT_PROFESSIONNEL, rattaché à l'entreprise et à son créateur (`parentUser`), au statut EN_ATTENTE_ACTIVATION, avec un **mot de passe aléatoire que personne ne connaît** : le compte ne s'ouvre qu'après l'acceptation de l'invitation (ECART-47 corrigé). | `EntrepriseServiceImpl.java:263-289` |
| RG-07-10 | L'agent reçoit par email un **lien d'invitation à usage unique, valable 7 jours** (`/invitation?token=…`) et y choisit son mot de passe (règle commune des mots de passe) : le compte devient alors ACTIF. Aucun mot de passe n'est généré ni transmis. Le propriétaire peut **renvoyer l'invitation** (`POST /api/entreprises/{id}/agents/{agentId}/invitation`, l'ancien lien cesse de fonctionner) et l'agent peut demander un nouveau lien depuis l'écran de connexion. Le lien d'invitation n'active pas un compte par `/activate`. | `EntrepriseServiceImpl.java:291-305` |
| RG-07-11 | Liste des agents : réservée aux membres de l'entreprise et à la modération ; exclut le propriétaire et les agents retirés (INACTIF). | `EntrepriseServiceImpl.java:328-354` |
| RG-07-12 | **Suspendre** (propriétaire, créateur ou modération) : seulement un agent ACTIF ou en attente ; statut SUSPENDU avec un motif propre à l'entreprise. | `EntrepriseServiceImpl.java:432-456` |
| RG-07-13 | **Réactiver** : l'entreprise ne lève que ses propres suspensions ; une suspension posée par la modération, ou un agent retiré, ne se lève que par la modération (avec contrôle du quota pour un agent retiré). Un agent qui n'a pas encore changé son mot de passe revient EN_ATTENTE_ACTIVATION. | `EntrepriseServiceImpl.java:459-489` |
| RG-07-14 | **Retirer** (propriétaire) : les annonces **actives** de l'agent sont transférées au propriétaire ; l'agent passe INACTIF. Ses annonces hors ligne et ses conversations restent rattachées à l'agent désactivé (ECART-16). | `EntrepriseServiceImpl.java:357-395` |
| RG-07-15 | Un agent publie sous son propre nom ; ses annonces portent l'identifiant de l'entreprise et la fiche renvoie vers la page publique de l'agence. Les annonces gratuites et la licence sont celles du professionnel (module 08). | `AnnonceMapper`, `AnnonceurCard.tsx:38-40` |
| RG-07-20 | Les acheteurs écrivent à l'**agent** propriétaire de l'annonce, jamais à l'entreprise (RG-06-03). Le professionnel ne voit pas les conversations de ses agents, ni avant ni après leur retrait (RG-06-17). | `MessagingServiceImpl.java:63` |
| RG-07-21 | Droits du professionnel sur les annonces de ses agents : il peut les masquer, les réafficher et voir leurs vues, mais ni les modifier, ni les clôturer, ni les supprimer, ni voir leur historique (module 03 §2, ECART-13). 🆕 **Cible DEC-27** : tous les droits, y compris modifier, clôturer, supprimer et voir l'historique (module 03 §2). | `BienImmoServiceImpl.java:365-417` |
| 🆕 RG-07-22 | **Cible DEC-12 — désactivation de l'entreprise** (par le professionnel ou l'admin) : les annonces de tous les membres disparaissent du public (SFG §8, cinquième condition) sans changer d'état ; les agents ne peuvent plus se connecter (RG-01-42) ; le professionnel garde l'accès mais ne publie plus ; la page publique de l'agence affiche « Cette agence n'est plus disponible » (404) ; toute nouvelle conversation sur ces annonces est refusée. La **réactivation** (admin uniquement, RG-07-06) rétablit annonces et accès ; un agent suspendu avant la désactivation le reste. Le texte de confirmation décrit ces effets (module 10, RG-10-11). | DEC-12 (SFG §17) |

### 4.2 bis Cycle de vie de l'entreprise et des agents

Synthèse des effets croisés, établie à partir des modules 01, 02, 03, 09 et 10. Le détail des effets sur les annonces figure au module 03 §4.6.

| Événement | Entreprise | Agents | Annonces | Règle |
|---|---|---|---|---|
| Désactivation de l'entreprise (professionnel ou admin) — 🆕 cible DEC-12 : annonces invisibles, agents sans accès, page publique fermée (RG-07-22) | `active = false`, page publique toujours accessible | Restent actifs et connectés | Restent en ligne ; publication et réaffichage refusés à tous les membres | RG-07-05, ECART-14 |
| Réactivation de l'entreprise (admin) | `active = true` | — | Publication de nouveau possible | RG-07-06 |
| Suppression demandée par le professionnel | Désactivée | Les agents actifs passent INACTIF (« Compte de l'entreprise supprimé ») | Toutes passées hors ligne | RG-02-17 |
| Réactivation du professionnel sous 30 jours | Réactivée | Agents désactivés par la suppression réactivés | Restent hors ligne | RG-01-27 |
| Anonymisation du professionnel (J+30) | **Non traitée** : reste désactivée, non anonymisée | **Non traités** : restent INACTIF, non anonymisés | Restent hors ligne, photos conservées | RG-02-20, ECART-15 |
| Suppression du professionnel par un administrateur | Anonymisée (« Entreprise supprimée ») | Anonymisés | DESACTIVEE, photos supprimées | RG-10-04 |
| Agent suspendu par son entreprise | — | SUSPENDU, levée possible par l'entreprise | **Restent en ligne** | RG-07-12, ECART-52 |
| Agent suspendu par la modération | — | SUSPENDU, levée par la modération uniquement | **Restent en ligne** | RG-07-13, ECART-52 |
| Agent retiré | — | INACTIF, sort du quota | En ligne : transférées au professionnel ; autres : restent à l'agent ; conversations : restent à l'agent | RG-07-14, ECART-16 |
| Agent qui supprime son propre compte | — | INACTIF (30 j réactivable), sort du quota | Passées hors ligne | RG-02-17 |

### 4.3 Annonces de l'entreprise et page publique

| ID | Règle | Source |
|---|---|---|
| RG-07-16 | Vue interne `GET /entreprises/{id}/annonces` : annonces **actives** de tous les membres (y compris masquées ou rejetées si `actif` est vrai), réservée aux membres et à la modération. | `EntrepriseServiceImpl.java:511-525` |
| RG-07-17 | Page publique `GET /entreprises/{id}/profil` : fiche de l'entreprise et annonces visibles publiquement, paginées. Elle ne renvoie que : nom, description, adresse, photo, nombre d'agents, et, aux seuls utilisateurs connectés, téléphone et email de l'agence (ECART-31 et DEC-14 corrigés). Ni RCCM, ni quotas, ni email du propriétaire. La fiche de gestion (`GET /entreprises/{id}`, `/user/{userId}`, `can-create-annonce`, `can-add-agent`) est réservée aux membres de l'entreprise et à la modération. | `EntrepriseServiceImpl.java:529-539`, `EntrepriseDTO.java` |
| RG-07-18 | L'app demande la page avec le paramètre `limit`, ignoré par l'API qui attend `size` : la page contient toujours 10 annonces (ECART-19). | `src/api/entreprise.api.ts:76` |

### 4.4 Tableau de bord (`GET /api/stats/pro`)

| Section | Contenu | Règles |
|---|---|---|
| Portefeuille | Annonces publiées, masquées, rejetées ; clôtures du mois par motif (vendu, loué, retiré) ; taux de conversion du mois = (vendus + loués) / clôtures × 100 ; répartition par type d'annonce | 🆕 (ECART-50) Pour un professionnel : **toute l'entreprise** (lui et ses agents, DEC-27), `perimetre = ENTREPRISE` ; pour un agent : ses annonces seules (`PERSONNEL`). Les compteurs « masquées » et « rejetées » valent toujours 0 (ECART-07). |
| Visibilité | Total des vues, top 5 des annonces par vues (vues, favoris), total des favoris | Même périmètre que le portefeuille |
| Messagerie | Nombre de conversations, messages non lus, taux de réponse (conversations où il est propriétaire et a répondu) | — |
| Équipe (PRO seulement) | Agents actifs, suspendus, performances par agent (annonces, vues), meilleur agent (s'il a au moins une vue) | 🆕 Le professionnel n'y figure pas : l'équipe, ce sont ses agents (ECART-50) |
| Conformité | Statut de la pièce d'identité, nombre d'avertissements, annonces actives, quota maximum, annonces restantes, possibilité de publier, limitation par la licence | Si le mode licence est actif sans licence valide, le quota affiché est celui des annonces gratuites. 🆕 `canCreateAnnonce` applique les mêmes conditions que la création (pièce validée, annonces non masquées, entreprise active, quota, licence) et `motifPublicationImpossible` dit laquelle bloque (ECART-50). |

Source : `ProStatsServiceImpl.java`.

### 4.5 🆕 Vérification de l'entreprise (cible DEC-04)

| ID | Règle | Source |
|---|---|---|
| 🆕 RG-07-23 | Statut de vérification de l'entreprise : **NON_VERIFIEE** (à la création), **EN_ATTENTE** (justificatif envoyé), **VERIFIEE** ou **REJETEE** (avec motif). Chaque nouvel envoi remet EN_ATTENTE. Les entreprises existantes partent NON_VERIFIEE à la mise en service et leur propriétaire est invité par email à envoyer son justificatif. | DEC-04 (SFG §17) |
| 🆕 RG-07-24 | **Justificatif** : extrait RCCM en photo, image uniquement, pas de PDF (≤ 10 Mo), stocké dans `uploads/private/entreprise/<id>/`, lisible seulement par le propriétaire et la modération. L'envoi exige que l'identité du propriétaire soit déjà vérifiée (module 02). | DEC-04 |
| 🆕 RG-07-25 | **Décision** de la modération : elle vérifie que le numéro RCCM, la raison sociale et le nom du gérant correspondent à la fiche et à l'identité vérifiée du propriétaire. Motif obligatoire en cas de rejet. Auteur et date enregistrés (ECART-63). Email au propriétaire : E17 (vérifiée) ou E18 (refusée, motif). | DEC-04 |
| 🆕 RG-07-26 | **Badge « Agence vérifiée »** : affiché sur la page publique, la carte annonceur des annonces du professionnel et de ses agents, uniquement pour une entreprise VERIFIEE. Une entreprise non vérifiée publie normalement, mais sans badge d'agence ; l'annonce affiche son nom sans mention de vérification. | DEC-04, ECART-61 |
| 🆕 RG-07-27 | Après vérification, le **nom et le RCCM sont figés** ; une modification passe par le support et une nouvelle vérification. | DEC-04 |
| 🆕 RG-07-28 | **Unicité du RCCM** : un RCCM n'est réservé qu'une fois vérifié. Plusieurs entreprises non vérifiées peuvent déclarer le même numéro ; quand l'une est vérifiée, les autres doivent corriger le leur avant toute nouvelle demande. Règle le cas du RCCM réservé par un tiers (ECART-61). | DEC-04 |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Entreprise (PRO) | `app/(tabs)/entreprise.tsx`, `features/entreprise/*` | Sans entreprise : formulaire « Créer mon entreprise ». Avec : photo, informations (« Modifier »), « Voir la page publique », agents (inviter, suspendre, activer, retirer, statut « En attente d'activation »), annonces de l'entreprise avec filtre, « Publier une annonce », zone sensible « Désactiver l'entreprise ». |
| Page publique | `app/entreprise-publique/[entrepriseId].tsx` (et `/user/[userId]`, qui retrouve l'entreprise d'un utilisateur puis redirige) | Fiche et annonces publiées. |
| Statistiques | `app/(tabs)/dashboard.tsx` | Cartes des 5 sections, liens « Voir les annonces », « Ouvrir la messagerie », « Ouvrir mon profil », « Voir ma licence ». |
| Mes annonces (agent) | `app/(tabs)/mes-annonces.tsx` | Module 03. |

## 6. API

| Méthode | URL | Accès |
|---|---|---|
| POST | `/api/entreprises` | PRO |
| PUT | `/api/entreprises/{id}` · `/{id}/photo` | PRO propriétaire |
| GET | `/api/entreprises/{id}` · `/user/{userId}` | PRO, agent, modération (sans contrôle d'appartenance) |
| GET | `/api/entreprises` | modération (liste non paginée) |
| GET / POST | `/api/entreprises/{id}/agents` | membres et modération / PRO propriétaire |
| DELETE | `/api/entreprises/{id}/agents/{agentId}` | PRO propriétaire |
| PUT | `/api/entreprises/{id}/agents/{agentId}/suspendre` · `/activer` | PRO, modération |
| GET | `/api/entreprises/{id}/annonces` | membres et modération |
| GET | `/api/entreprises/{id}/profil?page&size&sort&direction` | public |
| GET | `/api/entreprises/{id}/can-create-annonce` · `/can-add-agent` | PRO / agent (sans contrôle d'appartenance, non utilisés par l'app) |
| DELETE | `/api/entreprises/{id}` | PRO propriétaire, admin |
| PUT | `/api/entreprises/{id}/reactiver` | admin |
| GET | `/api/stats/pro` | PRO, agent |

## 7. Données

`entreprises` : `id` (UUID), `nom`, `description`, `numero_rccm` (unique), `adresse`, `telephone` (unique), `email`, `photo_profil`, `annonceur_professionnel_id` (unique), `quota_annonces`, `quota_agents` (nullables depuis V11), `active`, `date_creation`, `date_modification`.
`account.entreprise_id` (membres, y compris le propriétaire) et `account.parent_user_id` (créateur de l'agent).

## 8. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-07-01 | Un professionnel sans entreprise qui tente de publier reçoit 422 « Vous devez créer votre entreprise… ». |
| CA-07-02 | Au-delà du quota d'agents, l'invitation renvoie 400 « Quota d'agents atteint (N maximum) ». |
| CA-07-03 | Un agent suspendu par la modération ne peut pas être réactivé par son professionnel (403). |
| CA-07-04 | Après le retrait d'un agent, ses annonces en ligne apparaissent dans les annonces du professionnel. |
| CA-07-05 | La page publique n'affiche que les annonces visibles du public. |
| CA-07-06 | Un second professionnel qui saisit un RCCM déjà enregistré reçoit 400 « Ce numéro RCCM est déjà enregistré dans le système ». |
| CA-07-07 | Après la demande de suppression d'un professionnel, ses agents ne peuvent plus se connecter et aucune annonce de l'entreprise n'est visible ; une réactivation sous 30 jours rétablit l'entreprise et les agents, pas les annonces. |
| CA-07-08 | Un agent suspendu par son entreprise peut être réactivé par elle ; ses annonces sont restées visibles pendant la suspension (comportement actuel, ECART-52). |
| CA-07-09 | Un professionnel ne voit aucune conversation de ses agents dans sa messagerie. |
| 🆕 CA-07-10 | Après la désactivation d'une entreprise, aucune annonce de ses membres n'est visible, ses agents ne peuvent plus se connecter et sa page publique répond 404 ; après la réactivation, tout redevient comme avant. |
| 🆕 CA-07-11 | Une entreprise non vérifiée publie sans badge ; après vérification, le badge « Agence vérifiée » apparaît sur sa page publique et sur les annonces de ses membres, et son RCCM n'est plus modifiable. |
| 🆕 CA-07-12 | Une entreprise dont le propriétaire n'a pas d'identité vérifiée ne peut pas envoyer de justificatif. |

## 9. Écarts propres au module

ECART-07, ECART-10, ECART-13, ECART-14, ECART-15, ECART-16, ECART-19, ECART-31, ECART-39, ECART-44, ECART-47, ECART-50, ECART-52, ECART-61.

## 10. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-04 ; Q2 → DEC-12 ; Q3 → DEC-27.

1. Faut-il **vérifier les entreprises** (justificatif RCCM contrôlé par la modération) et n'afficher le badge d'agence qu'aux entreprises vérifiées (ECART-61) ?
2. Que doit produire la désactivation d'une entreprise : annonces masquées, agents suspendus (99 §7, question 3) ?
3. Le professionnel doit-il avoir tous les droits sur les annonces de ses agents (99 §7, question 4) ?
4. Faut-il une boîte de messagerie partagée de l'agence, ou au moins un accès du professionnel aux conversations de ses agents (module 06 §10) ?
5. Faut-il permettre de transférer l'entreprise à un autre compte (départ du gérant, revente de l'agence) ?
