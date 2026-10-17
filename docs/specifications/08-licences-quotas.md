# Module 08 — Licences et quotas

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Deux mécanismes limitent la publication :

1. **La licence annuelle**, mécanisme de monétisation que l'administrateur active ou non. Quand le mode licence est actif, chaque compte (ou chaque entreprise) dispose d'un nombre d'**annonces actives gratuites** ; au-delà, une licence valide est exigée. Le paiement se fait **hors application** : l'utilisateur contacte AnoventiX par téléphone, WhatsApp ou email, paie, puis reçoit une clé.
2. **Les quotas des entreprises** : nombre maximal d'agents et d'annonces actives par entreprise, avec une valeur globale et des exceptions par entreprise.

Hors périmètre (non implémenté) : paiement intégré (Orange Money, MTN MoMo, carte), facture ou reçu, offre d'essai, formules mensuelles, remboursement, mise en avant payante (vestiges en base : ECART-43), quota pour les particuliers quand le mode licence est inactif.

## 2. Acteurs et droits

| Action | Particulier | PRO | Agent | Modérateur | Admin |
|---|---|---|---|---|---|
| Consulter sa licence | ✅ | ✅ | ✅ (celle du PRO, en lecture) | ❌ | ❌ |
| Activer une clé | ✅ | ✅ | ❌ | ❌ | ❌ |
| Générer et lister les clés, régler le mode, les tarifs et le contact | ❌ | ❌ | ❌ | ❌ | ✅ |
| Consulter les quotas globaux | — | — | — | ✅ | ✅ |
| Modifier les quotas globaux et ceux d'une entreprise | — | — | — | ❌ | ✅ |

## 3. User stories

| ID | User story |
|---|---|
| US-08-01 | En tant qu'administrateur, j'active le mode licence et je fixe le prix annuel particulier et professionnel (en GNF) ainsi que le numéro de vente. |
| US-08-02 | En tant qu'administrateur, je génère une clé PARTICULIER ou PROFESSIONNEL et je la partage avec l'acheteur. |
| US-08-03 | En tant qu'administrateur, je recherche une clé (par clé ou email) et je vois si elle est libre, active ou expirée. |
| US-08-04 | En tant qu'annonceur ayant épuisé mes annonces gratuites, je vois le prix et je contacte AnoventiX pour acheter une licence. |
| US-08-05 | En tant qu'annonceur, je saisis ma clé et ma licence est valable 1 an ; si je renouvelle avant l'échéance, la nouvelle année s'ajoute à la suite. |
| US-08-06 | En tant qu'agent, je vois si la licence de mon entreprise couvre mes publications. |
| US-08-07 | En tant qu'administrateur, je règle le nombre d'agents et d'annonces actives par entreprise, globalement ou pour une entreprise donnée. |

## 4. Règles de gestion

### 4.1 Mode licence et annonces gratuites

| ID | Règle | Source |
|---|---|---|
| RG-08-01 | Mode licence désactivé par défaut (`licence.mode-actif`). Désactivé : publication illimitée, licences ni exigées ni visibles, **activation des clés refusée**. 🆕 Avec DEC-28, l'activation d'une clé est acceptée même mode inactif (RG-08-28). | `LicenceServiceImpl.java:57-67, 161-163` |
| RG-08-02 | Annonces gratuites : **5** par défaut (`LICENCE_ANNONCES_GRATUITES`), comptées en annonces **actives** (`actif = true`) ; pour une entreprise, elles sont **partagées** entre le pro et ses agents. | `LicenceServiceImpl.java:45-46, 267-271` |
| RG-08-03 | **Publication** (création, réaffichage, réactivation) : refusée avec **402** si le compte a déjà au moins N annonces actives et aucune licence valide (« Vous avez atteint vos N annonces gratuites… »). | `LicenceServiceImpl.java:223-231` |
| RG-08-04 | **Compte bloqué** : strictement plus de N annonces actives sans licence valide (cas d'un compte déjà au-delà quand le mode est activé). Il ne peut alors plus **modifier** ses annonces ni ajouter de photos ; il peut les clôturer ou les supprimer. Ses annonces restent visibles. | `LicenceServiceImpl.java:235-258`, `BienImmoServiceImpl.java:169` |
| RG-08-05 | Administrateurs et modérateurs sont exemptés. | `LicenceServiceImpl.java:262-264` |

### 4.2 Clés et activation

| ID | Règle | Source |
|---|---|---|
| RG-08-06 | Format de clé : `ANX-XXXX-XXXX-XXXX`, alphabet sans 0, O, 1 ni I (pour une saisie à la main), unique. Une clé générée n'a pas de titulaire (statut LIBRE). | `LicenceServiceImpl.java:199-217` |
| RG-08-07 | Activation : la clé est mise en majuscules ; elle doit exister, être libre et correspondre au **type de compte** (PARTICULIER ou PROFESSIONNEL). Messages : « Clé de licence invalide. », « Cette clé de licence a déjà été utilisée. », « Cette clé est réservée aux comptes professionnels / particuliers. » | `LicenceServiceImpl.java:160-195` |
| RG-08-08 | Durée : **1 an**. Début = aujourd'hui, ou le lendemain de la fin de la licence en cours si elle est encore valide (renouvellement chaîné). Fin = début + 1 an − 1 jour (dernier jour inclus). | idem |
| RG-08-09 | La licence d'un PROFESSIONNEL couvre ses agents (`partage = true` dans la réponse de l'agent). | `LicenceServiceImpl.java:130-138` |
| RG-08-10 | Statut renvoyé à l'utilisateur : ACTIVE, EXPIREE ou AUCUNE, avec dates, titulaire, annonces gratuites, annonces actives, indicateur de blocage, prix de son type de compte et contact de vente. Liste admin : LIBRE, ACTIVE, EXPIREE (filtre TOUTES par défaut), recherche dans la clé ou l'email du titulaire, tri par date de création décroissante. | `LicenceServiceImpl.java:108-125, 277-298` |
| RG-08-11 | Tarifs et contact : prix annuels (GNF) et téléphone de vente, effacés si la valeur envoyée est vide. | `LicenceServiceImpl.java:73-102` |
| RG-08-12 | Il n'existe ni révocation, ni suppression, ni expiration de clé libre, ni relance avant la fin d'une licence, ni paiement intégré (ECART-25). | — |
| RG-08-18 | **Clé au porteur** : une clé est générée sans acheteur désigné, sans référence de paiement et sans trace de l'administrateur qui l'a créée. N'importe quelle personne qui obtient une clé libre du bon type peut l'activer. Les clés sont tirées au hasard de façon sûre (`SecureRandom`, environ 60 bits) : elles ne peuvent pas être devinées (ECART-62). | `LicenceServiceImpl.java:199-217`, `entities/Licence.java` |
| RG-08-19 | **Achat** : l'écran « Ma licence » invite à payer hors application (« Orange Money, MTN MoMo… ») en contactant AnoventiX par WhatsApp ou par appel (numéro réglé par l'admin, RG-08-11) ou par email (`contact@anoventix.com`, **écrit dans le code** et non réglable). Sans numéro réglé, seuls l'email et le prix s'affichent. | `APP/app/licence.tsx:86, 160-195`, `src/constants/legal.ts:9` |
| RG-08-20 | **Activation du mode** : l'administrateur confirme dans une fenêtre qui décrit les effets. Le changement est **immédiat** : les comptes déjà au-delà des annonces gratuites sont aussitôt bloqués (RG-08-04), sans préavis ni email (ECART-23). | `administration/licences.tsx:178-191` |
| RG-08-21 | **Fin d'une licence** : aucune relance (ECART-25). Le lendemain du dernier jour, un compte au-delà des annonces gratuites devient bloqué ; ses annonces restent visibles. | `LicenceServiceImpl.java:235-258` |
| RG-08-22 | **Annonces comptées** (annonces gratuites et quota d'entreprise) : toutes celles dont `actif = true`, y compris celles d'un compte masqué par l'admin, invisibles du public (RG-09-15), et celles d'un compte suspendu (ECART-52). Ne sont pas comptées : les annonces masquées par leur propriétaire, clôturées, expirées, masquées ou rejetées par la modération, supprimées. | `LicenceServiceImpl.java:267-271`, `QuotaEntrepriseService.java:82-100` |
| RG-08-23 | **Mode inactif** : aucune limite pour un particulier ; pour une entreprise, seul le quota d'annonces s'applique. | `BienImmoServiceImpl.java:99-125` |

### 4.3 Quotas des entreprises

| ID | Règle | Source |
|---|---|---|
| RG-08-13 | Valeurs globales : **5 agents** et **50 annonces actives** par entreprise par défaut (`quota.agents.defaut`, `quota.annonces.defaut`). Les deux valeurs sont requises pour une modification. | `QuotaEntrepriseService.java:31-53`, `QuotaController.java:43-48` |
| RG-08-14 | Exception par entreprise : une valeur propre ; `null` ramène à la valeur globale. | `QuotaEntrepriseService.java:107-114` |
| RG-08-15 | Agents comptés : membres de l'entreprise hors propriétaire et hors agents retirés (INACTIF). Annonces comptées : annonces `actif = true` de tous les membres. | `QuotaEntrepriseService.java:82-100` |
| RG-08-16 | Le quota d'annonces est vérifié à la création **et** à toute remise en ligne (pour éviter le contournement par clôture puis réactivation). Baisser un quota ne retire rien : l'entreprise garde ses agents et annonces mais ne peut plus en ajouter. | `BienImmoServiceImpl.java:564-580` |
| RG-08-17 | La fiche entreprise renvoie les quotas effectifs, s'ils sont personnalisés, le nombre d'agents, les agents restants et les annonces restantes. | `QuotaEntrepriseService.java:117-131` |

> **Cumul des limites pour une entreprise** : la limite effective de publication est le minimum entre le quota d'annonces de l'entreprise et, si le mode licence est actif sans licence valide, le nombre d'annonces gratuites.

### 4.4 🆕 Vente nominative et préavis (cibles DEC-17, DEC-18)

| ID | Règle | Source |
|---|---|---|
| 🆕 RG-08-24 | **Génération d'une clé** : l'administrateur désigne l'**acheteur** (compte existant, retrouvé par email ou téléphone) ; le type de licence découle de son rôle. Il saisit le **montant** (GNF), le **moyen de paiement** (Orange Money, MTN MoMo, espèces, virement, autre) et la **référence de transaction** (obligatoire sauf pour les espèces). L'administrateur et la date sont enregistrés. | DEC-17, ECART-62 |
| 🆕 RG-08-25 | La clé ne peut être activée **que par l'acheteur** ; un autre compte reçoit « Cette clé est réservée à un autre compte. ». À la génération, l'acheteur reçoit un **reçu par email** (E20 : clé, montant, moyen, référence, date). | DEC-17 |
| 🆕 RG-08-26 | Les clés libres générées avant la mise en service restent au porteur ; l'administrateur peut leur affecter un acheteur depuis la liste. La liste des clés affiche acheteur, montant, moyen, référence et administrateur, et permet de filtrer par période pour rapprocher les encaissements. | DEC-17 |
| 🆕 RG-08-27 | **Préavis** : activer le mode licence fixe une **date d'effet à J+30**. D'ici là, la publication reste libre ; les comptes au-delà des annonces gratuites reçoivent un email à l'activation (E21) et voient un bandeau « Le mode licence s'appliquera le jj/mm/aaaa ». Désactiver le mode reste immédiat. | DEC-18 |
| 🆕 RG-08-28 | **Cible DEC-28** : une clé activée quand le mode licence est inactif est rattachée au compte avec le statut « En attente de démarrage », sans dates. Le jour où le mode prend effet (date d'effet de RG-08-27), elle démarre : début à cette date, fin un an moins un jour plus tard. Une seconde clé activée avant ce jour s'enchaîne à la suite de la première. « Ma licence » affiche « Votre licence démarrera à l'ouverture du mode licence ». | DEC-28, ECART-25 |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Ma licence | `app/licence.tsx` | Statut (« Valable jusqu'au… », « Expirée depuis le… »), annonces actives et gratuites, saisie de clé `ANX-XXXX-XXXX-XXXX`, « Activer une licence » / « Renouveler ma licence », achat par WhatsApp, appel ou email, message spécifique pour l'agent (« Contactez votre responsable… »). |
| Garde de publication | `features/licence/useLicenceGate.ts`, `LicenceBloqueeNotice.tsx` | Redirection vers « Ma licence » quand la publication est bloquée. |
| Admin > Licences | `app/(tabs)/administration/licences.tsx` | Interrupteur du mode (avec confirmation et explication des effets), tarifs et téléphone, génération et partage d'une clé, liste filtrable (Toutes, Libres, Actives, Expirées) avec « Charger plus ». |
| Admin > Quotas | `app/(tabs)/administration/quotas.tsx` | Quotas globaux. |
| Admin > Entreprise | `app/(tabs)/administration/entreprises/[id].tsx` | Quotas propres (« Valeur globale » / « Valeur propre à l'entreprise »). |

## 6. API

| Méthode | URL | Accès |
|---|---|---|
| GET | `/api/licences/me` | particulier, PRO, agent |
| POST | `/api/licences/activer` `{cle}` | particulier, PRO |
| POST / GET | `/api/licences/admin/cles` | admin |
| GET / PUT | `/api/licences/admin/reglages` | admin |
| GET / PUT | `/api/licences/admin/mode` | admin |
| GET | `/api/admin/quotas` | admin, modérateur |
| PUT | `/api/admin/quotas` | admin |
| PUT | `/api/admin/entreprises/{id}/quotas` | admin |

## 7. Données

`licence` : `id`, `cle` (≤ 32, unique), `type`, `owner_id`, `date_debut`, `date_fin`, `created_at` (V8).
`parametre_plateforme` : `licence.mode-actif`, `licence.prix-particulier`, `licence.prix-professionnel`, `licence.contact-telephone`, `quota.agents.defaut`, `quota.annonces.defaut`.

## 8. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-08-01 | Mode inactif : la 6e annonce d'un particulier est publiée sans licence. |
| CA-08-02 | Mode actif, 5 annonces actives sans licence : la 6e création renvoie 402 et l'app redirige vers « Ma licence ». |
| CA-08-03 | Une clé PROFESSIONNEL saisie par un particulier est refusée. |
| CA-08-04 | Une licence activée le 01/03/2026 alors que la précédente court jusqu'au 10/06/2026 va du 11/06/2026 au 10/06/2027. |
| CA-08-05 | Un agent dont le professionnel a une licence valide publie au-delà des annonces gratuites de l'entreprise. |
| CA-08-06 | Une clé libre activée par un compte A ne peut plus être activée par un compte B (« Cette clé de licence a déjà été utilisée. »). |
| CA-08-07 | À l'activation du mode licence, un particulier qui a 8 annonces en ligne ne peut plus en modifier aucune, mais peut les clôturer ; ses 8 annonces restent visibles. |
| CA-08-08 | Clôturer 3 annonces sur 8 fait passer le compte de « bloqué » à « limité » : il peut de nouveau modifier ses annonces mais pas en publier de nouvelle. |
| CA-08-09 | Le jour qui suit la fin d'une licence, un compte au-delà des annonces gratuites est bloqué sans avoir reçu de relance (comportement actuel, ECART-25). |
| CA-08-10 | Une entreprise dont le quota passe de 50 à 10 annonces garde ses 30 annonces en ligne mais ne peut plus en publier ni en réafficher. |
| 🆕 CA-08-11 | Une clé générée pour le compte A est refusée au compte B ; A reçoit un reçu par email dès la génération. |
| 🆕 CA-08-12 | Le mode licence activé le 01/03 ne limite aucune publication avant le 31/03 ; les comptes concernés ont reçu un email le 01/03. |

## 9. Écarts propres au module

ECART-23 (aucun email lié à la licence), ECART-25 (cycle de vie de la licence incomplet : activation impossible quand le mode est inactif, type non revérifié après un changement de rôle, pas de révocation ni de relance), ECART-43 (vestiges du modèle crédits), ECART-50 (annonces restantes affichées dans le tableau de bord), ECART-62 (vente de licences sans trace).

## 10. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-17 ; Q2 → DEC-18.

1. Faut-il tracer chaque vente (acheteur, montant, moyen de paiement, référence de transaction, administrateur) et remettre un reçu (ECART-62) ? Faut-il générer la clé directement au nom de l'acheteur ?
2. Faut-il un **préavis** avant l'activation du mode licence (par exemple 30 jours, avec email aux comptes concernés) plutôt qu'un blocage immédiat ?
3. Faut-il intégrer le paiement mobile (Orange Money, MTN MoMo) pour une activation automatique ?
4. Une relance avant la fin de la licence (J-30, J-7) est-elle souhaitée (ECART-25) ?
5. L'email de vente doit-il devenir réglable par l'administrateur, comme le téléphone ?
6. Faut-il une limite de publication pour les particuliers quand le mode licence est inactif (lutte contre le spam) ?
