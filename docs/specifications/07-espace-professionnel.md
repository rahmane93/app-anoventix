# Module 07 — Espace professionnel (entreprise, agents, tableau de bord)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à une agence immobilière (compte PROFESSIONNEL) de créer sa fiche entreprise, d'inviter et de gérer des agents qui publient en son nom, d'exposer une page publique et de suivre son activité. Les quotas et licences appliqués aux entreprises sont détaillés au module 08.

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
| US-07-08 | En tant qu'agent, je change mon mot de passe temporaire à la première connexion, puis je fais valider ma pièce d'identité pour publier. |

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

### 4.2 Agents

| ID | Règle | Source |
|---|---|---|
| RG-07-07 | Création d'un agent par le propriétaire uniquement, dans la limite du **quota d'agents** (agents non retirés, hors propriétaire). | `EntrepriseServiceImpl.java:231-248` |
| RG-07-08 | Email (normalisé, unique) et téléphone (normalisé, unique, **obligatoire**) ; prénom et nom ≤ 50. L'email accepte 100 caractères alors que le compte n'en accepte que 50 (ECART-10). | `AgentRequest.java` |
| RG-07-09 | Le compte agent est créé avec le rôle AGENT_PROFESSIONNEL, rattaché à l'entreprise et à son créateur (`parentUser`), au statut EN_ATTENTE_ACTIVATION, avec un **mot de passe temporaire aléatoire de 12 caractères** et l'obligation de le changer. | `EntrepriseServiceImpl.java:263-289` |
| RG-07-10 | Le mot de passe temporaire est envoyé **en clair par email** (« Vos accès agent AnoventiX »), sans durée de validité (ECART-47). | `EntrepriseServiceImpl.java:291-305` |
| RG-07-11 | Liste des agents : réservée aux membres de l'entreprise et à la modération ; exclut le propriétaire et les agents retirés (INACTIF). | `EntrepriseServiceImpl.java:328-354` |
| RG-07-12 | **Suspendre** (propriétaire, créateur ou modération) : seulement un agent ACTIF ou en attente ; statut SUSPENDU avec un motif propre à l'entreprise. | `EntrepriseServiceImpl.java:432-456` |
| RG-07-13 | **Réactiver** : l'entreprise ne lève que ses propres suspensions ; une suspension posée par la modération, ou un agent retiré, ne se lève que par la modération (avec contrôle du quota pour un agent retiré). Un agent qui n'a pas encore changé son mot de passe revient EN_ATTENTE_ACTIVATION. | `EntrepriseServiceImpl.java:459-489` |
| RG-07-14 | **Retirer** (propriétaire) : les annonces **actives** de l'agent sont transférées au propriétaire ; l'agent passe INACTIF. Ses annonces hors ligne et ses conversations restent rattachées à l'agent désactivé (ECART-16). | `EntrepriseServiceImpl.java:357-395` |
| RG-07-15 | Un agent publie sous son propre nom ; ses annonces portent l'identifiant de l'entreprise et la fiche renvoie vers la page publique de l'agence. Les annonces gratuites et la licence sont celles du professionnel (module 08). | `AnnonceMapper`, `AnnonceurCard.tsx:38-40` |

### 4.3 Annonces de l'entreprise et page publique

| ID | Règle | Source |
|---|---|---|
| RG-07-16 | Vue interne `GET /entreprises/{id}/annonces` : annonces **actives** de tous les membres (y compris masquées ou rejetées si `actif` est vrai), réservée aux membres et à la modération. | `EntrepriseServiceImpl.java:511-525` |
| RG-07-17 | Page publique `GET /entreprises/{id}/profil` : fiche de l'entreprise et annonces visibles publiquement, paginées. Elle renvoie aussi l'email du propriétaire, le RCCM, les quotas et le nombre d'agents (ECART-31). | `EntrepriseServiceImpl.java:529-539`, `EntrepriseDTO.java` |
| RG-07-18 | L'app demande la page avec le paramètre `limit`, ignoré par l'API qui attend `size` : la page contient toujours 10 annonces (ECART-19). | `src/api/entreprise.api.ts:76` |

### 4.4 Tableau de bord (`GET /api/stats/pro`)

| Section | Contenu | Règles |
|---|---|---|
| Portefeuille | Annonces publiées, masquées, rejetées ; clôtures du mois par motif (vendu, loué, retiré) ; taux de conversion du mois = (vendus + loués) / clôtures × 100 ; répartition par type d'annonce | Calculé sur les annonces **de l'utilisateur seul**, pas de l'entreprise. Les compteurs « masquées » et « rejetées » valent toujours 0 (ECART-07). |
| Visibilité | Total des vues, top 5 des annonces par vues (vues, favoris), total des favoris | Annonces actives de l'utilisateur |
| Messagerie | Nombre de conversations, messages non lus, taux de réponse (conversations où il est propriétaire et a répondu) | — |
| Équipe (PRO seulement) | Agents actifs, suspendus, performances par agent (annonces, vues), meilleur agent (s'il a au moins une vue) | Le propriétaire est compté parmi les « agents » (ECART-50) |
| Conformité | Statut de la pièce d'identité, nombre d'avertissements, annonces actives, quota maximum, annonces restantes, possibilité de publier, limitation par la licence | Si le mode licence est actif sans licence valide, le quota affiché est celui des annonces gratuites. `canCreateAnnonce` ignore la pièce, le masquage et l'entreprise désactivée. |

Source : `ProStatsServiceImpl.java`.

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

## 9. Écarts propres au module

ECART-07, ECART-10, ECART-13, ECART-14, ECART-16, ECART-19, ECART-31, ECART-39, ECART-44, ECART-47, ECART-50.
