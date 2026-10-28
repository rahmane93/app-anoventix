# Module 07 — Espace professionnel (entreprise, agents, tableau de bord)

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Permettre à une agence immobilière (compte PROFESSIONNEL) de créer sa fiche entreprise, de la faire vérifier, d'inviter et de gérer des agents qui publient en son nom, d'exposer une page publique et de suivre son activité. Les quotas et licences appliqués aux entreprises sont détaillés au module 08.

Hors périmètre : transfert de l'entreprise à un autre compte ; plusieurs agences ou plusieurs propriétaires ; rôle intermédiaire (responsable d'équipe) ; boîte de messagerie partagée de l'agence (les conversations vont à l'agent, RG-06-03) ; localisation de l'agence dans le référentiel (l'adresse est un texte libre) ; facturation au nom de l'entreprise.

## 2. Acteurs et droits

| Action | PRO propriétaire | Agent | Modérateur | Admin | Public |
|---|---|---|---|---|---|
| Créer / modifier l'entreprise, changer sa photo, envoyer le justificatif RCCM | ✅ | ❌ | ❌ | ❌ | ❌ |
| Vérifier l'entreprise (justificatif) | ❌ | ❌ | ✅ | ✅ | ❌ |
| Consulter la fiche interne et la liste des agents | ✅ | ✅ (son entreprise) | ✅ | ✅ | ❌ |
| Inviter un agent, retirer un agent | ✅ | ❌ | ❌ | ❌ | ❌ |
| Suspendre / réactiver un agent | ✅ (ses propres suspensions) | ❌ | ✅ | ✅ | ❌ |
| Désactiver l'entreprise | ✅ | ❌ | ❌ | ✅ | ❌ |
| Réactiver l'entreprise | ❌ | ❌ | ❌ | ✅ | ❌ |
| Page publique de l'entreprise | ✅ | ✅ | ✅ | ✅ | ✅ (entreprise active) |
| Tableau de bord | ✅ (toute l'entreprise, avec section équipe) | ✅ (ses annonces) | ❌ | ❌ | ❌ |

## 3. User stories

| ID | User story |
|---|---|
| US-07-01 | En tant que professionnel, je crée mon entreprise (nom, description, RCCM, adresse, téléphone, email) avant de pouvoir publier. |
| US-07-02 | En tant que professionnel, je modifie les informations et la photo de mon entreprise. |
| US-07-03 | En tant que professionnel, j'envoie l'extrait RCCM de mon agence pour obtenir le badge « Agence vérifiée ». |
| US-07-04 | En tant que professionnel, j'invite un agent (prénom, nom, email, téléphone) ; il reçoit un lien pour choisir son mot de passe. |
| US-07-05 | En tant que professionnel, je suspends, réactive ou retire un agent ; ses annonces et ses conversations me sont transférées à son retrait. |
| US-07-06 | En tant que professionnel, je gère les annonces de mes agents comme les miennes et je les filtre par référence ou titre. |
| US-07-07 | En tant que visiteur, je consulte la page publique de l'agence et ses annonces. |
| US-07-08 | En tant que professionnel ou agent, je suis mon activité : portefeuille, visibilité, messagerie, équipe, conformité. |
| US-07-09 | En tant qu'agent, je choisis mon mot de passe depuis le lien d'invitation, puis je fais vérifier mon identité (pièce et selfie, module 02) pour publier. |

## 4. Règles de gestion

### 4.1 Entreprise

| ID | Règle | Source |
|---|---|---|
| RG-07-01 | Seul un PROFESSIONNEL peut créer une entreprise, **une seule** par compte. | `EntrepriseServiceImpl.createEntreprise` |
| RG-07-02 | Champs obligatoires : nom (≤ 100), description (≤ 200), RCCM (≤ 50), adresse (≤ 100), téléphone (format international, normalisé comme celui des comptes, unique parmi les entreprises), email (≤ 100). | `EntrepriseRequest.java`, `validation.ts` |
| RG-07-04 | Seul le propriétaire modifie l'entreprise et sa photo ; l'ancienne photo est supprimée du disque. | `EntrepriseServiceImpl.updateEntreprise` |
| RG-07-05 | **Désactivation** (propriétaire ou admin, DEC-12) : `active = false`. Les annonces de tous les membres disparaissent du public (SFG §8) sans changer d'état ; les agents ne peuvent plus se connecter (RG-01-34) ; le professionnel garde l'accès mais ne publie ni ne réaffiche plus (« Votre entreprise est désactivée… ») ; la page publique répond 404 « Cette agence n'est plus disponible. » ; aucune nouvelle conversation n'est possible sur ces annonces. L'action est inscrite au journal d'audit. | `EntrepriseServiceImpl.disableEntreprise`, fonction de visibilité (V25) |
| RG-07-06 | **Réactivation** : administrateur uniquement. Elle rétablit annonces et accès ; un agent suspendu avant la désactivation le reste. Journalisée. | `EntrepriseServiceImpl.enableEntreprise` |

### 4.2 Vérification de l'entreprise (DEC-04)

| ID | Règle | Source |
|---|---|---|
| RG-07-23 | Statut de vérification : **NON_VERIFIEE** (à la création), **EN_ATTENTE** (justificatif envoyé), **VERIFIEE** ou **REJETEE** (avec motif). Chaque nouvel envoi remet EN_ATTENTE. | `VerificationEntrepriseService.java` |
| RG-07-24 | **Justificatif** : extrait RCCM en image (pas de PDF, ≤ 10 Mo), stocké dans `uploads/private/entreprise/<id>/`, lisible seulement par le propriétaire et la modération ; chaque consultation par la modération est journalisée. L'envoi exige que l'identité du propriétaire soit déjà vérifiée (module 02). | idem |
| RG-07-25 | **Décision** de la modération (file « Entreprises à vérifier ») : elle vérifie que le numéro RCCM, la raison sociale et le nom du gérant correspondent à la fiche et à l'identité vérifiée du propriétaire. Motif obligatoire en cas de rejet. Auteur et date enregistrés, décision journalisée. Email au propriétaire : E17 (vérifiée) ou E18 (refusée, motif). | idem |
| RG-07-26 | **Badge « Agence vérifiée »** : affiché sur la page publique et sur la carte annonceur des annonces du professionnel et de ses agents, uniquement pour une entreprise VERIFIEE. Une entreprise non vérifiée publie normalement, sans badge. | `AnnonceurCard.tsx` |
| RG-07-27 | Après vérification, le **nom et le RCCM sont figés** ; une modification passe par le support et une nouvelle vérification. | `EntrepriseServiceImpl.updateEntreprise` |
| RG-07-28 | **Unicité du RCCM** : un RCCM n'est réservé qu'une fois vérifié. Plusieurs entreprises non vérifiées peuvent déclarer le même numéro ; une demande de vérification est refusée si une autre entreprise a déjà été vérifiée avec ce numéro. | `VerificationEntrepriseService.java` |

### 4.3 Agents

| ID | Règle | Source |
|---|---|---|
| RG-07-07 | Invitation d'un agent par le propriétaire uniquement, dans la limite du **quota d'agents** (agents non retirés, hors propriétaire). | `EntrepriseServiceImpl.createAgentForEntreprise` |
| RG-07-08 | Email (normalisé, unique, ≤ 100) et téléphone (normalisé, unique, **obligatoire**) ; prénom et nom ≤ 50. | `AgentRequest.java` |
| RG-07-09 | Le compte agent est créé avec le rôle AGENT_PROFESSIONNEL, rattaché à l'entreprise et à son créateur (`parentUser`), au statut EN_ATTENTE_ACTIVATION, avec un mot de passe aléatoire que personne ne connaît : le compte ne s'ouvre qu'après l'acceptation de l'invitation. | idem |
| RG-07-10 | L'agent reçoit par email un **lien d'invitation à usage unique, valable 7 jours** (`/invitation?token=…`) et y choisit son mot de passe (RG-01-05) : le compte devient alors ACTIF. Le propriétaire peut **renvoyer l'invitation** (l'ancien lien cesse de fonctionner) et l'agent peut demander un nouveau lien depuis l'écran de connexion. | `InvitationAgentService.java`, `EntrepriseServiceImpl.renvoyerInvitation` |
| RG-07-11 | Liste des agents : réservée aux membres de l'entreprise et à la modération ; exclut le propriétaire et les agents retirés (INACTIF). | `EntrepriseServiceImpl.getAgentsByEntreprise` |
| RG-07-12 | **Suspendre** (propriétaire, créateur ou modération) : seulement un agent ACTIF ou en attente ; statut SUSPENDU avec un motif propre à l'entreprise. Les annonces d'un agent suspendu disparaissent du public tant que dure la suspension (RG-01-31). | `EntrepriseServiceImpl.suspendreAgent` |
| RG-07-13 | **Réactiver** : l'entreprise ne lève que ses propres suspensions ; une suspension posée par la modération, ou un agent retiré, ne se lève que par la modération (avec contrôle du quota pour un agent retiré). Un agent qui n'a pas encore accepté son invitation revient EN_ATTENTE_ACTIVATION. | `EntrepriseServiceImpl.activerAgent` |
| RG-07-14 | **Retirer** (propriétaire, DEC-34) : **toutes** les annonces de l'agent (en ligne ou non) et ses conversations passent au propriétaire ; l'acheteur reçoit un message l'informant du changement d'interlocuteur ; l'agent passe INACTIF et sort du quota. | `EntrepriseServiceImpl.removeAgentFromEntreprise`, `TransfertAgentService.java` |
| RG-07-15 | Un agent publie sous son propre nom ; ses annonces portent l'identifiant de l'entreprise et la fiche renvoie vers la page publique de l'agence. Les annonces gratuites et la licence sont celles du professionnel (module 08). | `AnnonceMapper`, `AnnonceurCard.tsx` |
| RG-07-20 | Les acheteurs écrivent à l'**agent** propriétaire de l'annonce (RG-06-03). Le professionnel ne voit pas les conversations de ses agents tant qu'ils sont dans l'équipe ; il les reprend à leur retrait (RG-07-14). | `MessagingServiceImpl.java` |
| RG-07-21 | Le professionnel a **tous les droits** sur les annonces de ses agents (DEC-27) : modifier (contenu et photos), masquer, réafficher, clôturer, réactiver, supprimer, demander un réexamen, voir l'historique (module 03 §2). | `BienImmoServiceImpl.estProprietaireOuParent` |

### 4.4 Cycle de vie de l'entreprise et des agents

Synthèse des effets croisés, établie à partir des modules 01, 02, 03, 09 et 10. Le détail des effets sur les annonces figure au module 03 §4.6.

| Événement | Entreprise | Agents | Annonces | Règle |
|---|---|---|---|---|
| Désactivation de l'entreprise (professionnel ou admin) | `active = false`, page publique fermée (404) | Plus de connexion possible ; statut inchangé | Invisibles du public, état inchangé ; publication et réaffichage refusés | RG-07-05 |
| Réactivation de l'entreprise (admin) | `active = true` | Accès rétabli | Visibles de nouveau ; publication possible | RG-07-06 |
| Suppression demandée par le professionnel | Désactivée | Les agents actifs passent INACTIF (« Compte de l'entreprise supprimé ») | Toutes passées hors ligne | RG-02-18 |
| Réactivation du professionnel sous 30 jours | Réactivée | Agents désactivés par la suppression réactivés | Restent hors ligne | RG-01-28 |
| Anonymisation du professionnel (fin du délai de grâce, inactivité, suppression par un administrateur) | Anonymisée (« Entreprise supprimée ») | Anonymisés | DESACTIVEE, photos supprimées | RG-02-20 |
| Agent suspendu par son entreprise ou par la modération | — | SUSPENDU | Invisibles tant que dure la suspension | RG-07-12, RG-07-13 |
| Agent retiré | — | INACTIF, sort du quota | Annonces et conversations transférées au professionnel | RG-07-14 |
| Agent qui supprime son propre compte | — | INACTIF (30 j réactivable), sort du quota | Passées hors ligne | RG-02-18 |

### 4.5 Annonces de l'entreprise et page publique

| ID | Règle | Source |
|---|---|---|
| RG-07-16 | Vue interne `GET /entreprises/{id}/annonces` : annonces **actives** de tous les membres, réservée aux membres et à la modération. | `EntrepriseServiceImpl.getAnnoncesByEntreprise` |
| RG-07-17 | Page publique `GET /entreprises/{id}/profil` (entreprise active) : fiche de l'entreprise et annonces visibles publiquement, paginées (paramètres `page`, `size`). Elle ne renvoie que : nom, description, adresse, photo, nombre d'agents, badge de vérification, et, aux seuls utilisateurs connectés, téléphone et email de l'agence (DEC-14). Ni RCCM, ni quotas, ni email du propriétaire. La fiche de gestion (`GET /entreprises/{id}`, `/user/{userId}`) est réservée aux membres de l'entreprise et à la modération. | `EntrepriseServiceImpl.getEntrepriseProfil`, `EntrepriseProfilDTO.java` |

### 4.6 Tableau de bord (`GET /api/stats/pro`)

Pour un professionnel, le tableau de bord porte sur **toute l'entreprise** (lui et ses agents, `perimetre = ENTREPRISE`) ; pour un agent, sur ses seules annonces (`PERSONNEL`).

| Section | Contenu | Règles |
|---|---|---|
| Portefeuille | Annonces publiées, masquées, rejetées ; clôtures du mois par motif (vendu, loué, retiré) ; taux de conversion du mois = (vendus + loués) / clôtures × 100 ; répartition par type d'annonce | Périmètre ci-dessus. Les annonces masquées ou rejetées sont comptées quel que soit leur indicateur `actif`. |
| Visibilité | Total des vues, top 5 des annonces par vues (vues, favoris), total des favoris | Même périmètre |
| Messagerie | Nombre de conversations, messages non lus, taux de réponse (conversations où il est propriétaire et a répondu) | Conversations du compte connecté |
| Équipe (PRO seulement) | Agents actifs, suspendus, performances par agent (annonces, vues), meilleur agent (s'il a au moins une vue) | Le professionnel n'y figure pas : l'équipe, ce sont ses agents |
| Conformité | Statut du dossier de vérification, nombre d'avertissements en vigueur, annonces actives, quota maximum, annonces restantes, possibilité de publier, limitation par la licence | `canCreateAnnonce` applique les mêmes conditions que la création (dossier validé, annonces non masquées, entreprise active, quota, licence) et `motifPublicationImpossible` dit laquelle bloque. Si le mode licence est actif sans licence valide, le quota affiché est celui des annonces gratuites. |

Source : `ProStatsServiceImpl.java`.

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Entreprise (PRO) | `app/(tabs)/entreprise.tsx`, `features/entreprise/*` | Sans entreprise : formulaire « Créer mon entreprise ». Avec : photo, informations (« Modifier »), carte de vérification (envoi du justificatif, statut, motif de refus), « Voir la page publique », agents (inviter, renvoyer l'invitation, suspendre, activer, retirer, statut « En attente d'activation »), annonces de l'entreprise avec filtre, « Publier une annonce », zone sensible « Désactiver l'entreprise ». |
| Page publique | `app/entreprise-publique/[entrepriseId].tsx` (et `/user/[userId]`, qui retrouve l'entreprise d'un utilisateur puis redirige) | Fiche, badge « Agence vérifiée », annonces visibles. |
| Statistiques | `app/(tabs)/dashboard.tsx` | Cartes des 5 sections (« Toute l'entreprise » pour un professionnel), alertes de conformité avec la raison du blocage, liens « Voir les annonces », « Ouvrir la messagerie », « Ouvrir mon profil », « Voir ma licence ». |
| Mes annonces (agent) | `app/(tabs)/mes-annonces.tsx` | Module 03. |

## 6. API

| Méthode | URL | Accès |
|---|---|---|
| POST | `/api/entreprises` | PRO |
| PUT | `/api/entreprises/{id}` · `/{id}/photo` | PRO propriétaire |
| POST | `/api/entreprises/{id}/verification` (justificatif) | PRO propriétaire |
| GET | `/api/entreprises/{id}/justificatif` | PRO propriétaire, modération |
| GET | `/api/entreprises/{id}` · `/user/{userId}` | membres de l'entreprise, modération |
| GET | `/api/entreprises` | modération |
| GET / POST | `/api/entreprises/{id}/agents` | membres et modération / PRO propriétaire |
| POST | `/api/entreprises/{id}/agents/{agentId}/invitation` | PRO propriétaire (renvoi) |
| DELETE | `/api/entreprises/{id}/agents/{agentId}` | PRO propriétaire |
| PUT | `/api/entreprises/{id}/agents/{agentId}/suspendre` · `/activer` | PRO, modération |
| GET | `/api/entreprises/{id}/annonces` | membres et modération |
| GET | `/api/entreprises/{id}/profil?page&size&sort&direction` | public |
| DELETE | `/api/entreprises/{id}` | PRO propriétaire, admin (désactivation) |
| PUT | `/api/entreprises/{id}/reactiver` | admin |
| GET | `/api/admin/entreprises/a-verifier` · PUT `/api/admin/entreprises/{id}/verification` | modération |
| GET | `/api/stats/pro` | PRO, agent |

## 7. Données

`entreprises` : `id` (UUID), `nom`, `description`, `numero_rccm`, `adresse`, `telephone` (unique), `email`, `photo_profil`, `annonceur_professionnel_id` (unique), `quota_annonces`, `quota_agents` (nullables : valeur globale), `active`, `statut_verification`, `justificatif_rccm_url`, `date_envoi_verification`, `date_decision_verification`, `decision_verification_par`, `motif_rejet_verification`, `date_creation`, `date_modification`.
`account.entreprise_id` (membres, y compris le propriétaire) et `account.parent_user_id` (créateur de l'agent). Le jeton d'invitation réutilise les colonnes de l'activation (`activation_code`, `activation_code_expiry`).

## 8. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-07-01 | Un professionnel sans entreprise qui tente de publier reçoit 422 « Vous devez créer votre entreprise… ». |
| CA-07-02 | Au-delà du quota d'agents, l'invitation renvoie 400 « Quota d'agents atteint (N maximum) ». |
| CA-07-03 | Un agent suspendu par la modération ne peut pas être réactivé par son professionnel (403). |
| CA-07-04 | Après le retrait d'un agent, toutes ses annonces (y compris masquées) appartiennent au professionnel, et l'acheteur d'une de ses conversations voit l'agence comme interlocuteur, avec un message d'information non lu. |
| CA-07-05 | La page publique n'affiche que les annonces visibles du public. |
| CA-07-06 | Après la demande de suppression d'un professionnel, ses agents ne peuvent plus se connecter et aucune annonce de l'entreprise n'est visible ; une réactivation sous 30 jours rétablit l'entreprise et les agents, pas les annonces. |
| CA-07-07 | Après la désactivation d'une entreprise, aucune annonce de ses membres n'est visible, ses agents ne peuvent plus se connecter et sa page publique répond 404 ; après la réactivation, tout redevient comme avant. |
| CA-07-08 | Une entreprise non vérifiée publie sans badge ; après vérification, le badge « Agence vérifiée » apparaît sur sa page publique et sur les annonces de ses membres, et son RCCM n'est plus modifiable. |
| CA-07-09 | Une entreprise dont le propriétaire n'a pas d'identité vérifiée ne peut pas envoyer de justificatif. |
| CA-07-10 | Le tableau de bord d'un professionnel additionne ses annonces et celles de ses agents ; celui d'un agent ne compte que les siennes ; le professionnel n'apparaît pas dans la section équipe. |
| CA-07-11 | Quand les annonces d'un professionnel sont masquées par l'administration, le tableau de bord indique que la publication est impossible et pourquoi. |
