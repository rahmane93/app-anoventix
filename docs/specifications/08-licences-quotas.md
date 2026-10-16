# Module 08 — Licences et quotas

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Deux mécanismes limitent la publication :

1. **La licence annuelle**, mécanisme de monétisation que l'administrateur active ou non. Quand le mode licence est actif, chaque compte (ou chaque entreprise) dispose d'un nombre d'**annonces actives gratuites** ; au-delà, une licence valide est exigée. Le paiement se fait **hors application** : l'utilisateur contacte AnoventiX par téléphone, WhatsApp ou email, paie, puis reçoit une clé.
2. **Les quotas des entreprises** : nombre maximal d'agents et d'annonces actives par entreprise, avec une valeur globale et des exceptions par entreprise.

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
| RG-08-01 | Mode licence désactivé par défaut (`licence.mode-actif`). Désactivé : publication illimitée, licences ni exigées ni visibles, **activation des clés refusée**. | `LicenceServiceImpl.java:57-67, 161-163` |
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

### 4.3 Quotas des entreprises

| ID | Règle | Source |
|---|---|---|
| RG-08-13 | Valeurs globales : **5 agents** et **50 annonces actives** par entreprise par défaut (`quota.agents.defaut`, `quota.annonces.defaut`). Les deux valeurs sont requises pour une modification. | `QuotaEntrepriseService.java:31-53`, `QuotaController.java:43-48` |
| RG-08-14 | Exception par entreprise : une valeur propre ; `null` ramène à la valeur globale. | `QuotaEntrepriseService.java:107-114` |
| RG-08-15 | Agents comptés : membres de l'entreprise hors propriétaire et hors agents retirés (INACTIF). Annonces comptées : annonces `actif = true` de tous les membres. | `QuotaEntrepriseService.java:82-100` |
| RG-08-16 | Le quota d'annonces est vérifié à la création **et** à toute remise en ligne (pour éviter le contournement par clôture puis réactivation). Baisser un quota ne retire rien : l'entreprise garde ses agents et annonces mais ne peut plus en ajouter. | `BienImmoServiceImpl.java:564-580` |
| RG-08-17 | La fiche entreprise renvoie les quotas effectifs, s'ils sont personnalisés, le nombre d'agents, les agents restants et les annonces restantes. | `QuotaEntrepriseService.java:117-131` |

> **Cumul des limites pour une entreprise** : la limite effective de publication est le minimum entre le quota d'annonces de l'entreprise et, si le mode licence est actif sans licence valide, le nombre d'annonces gratuites.

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

## 9. Écarts propres au module

ECART-25 (cycle de vie de la licence incomplet : activation impossible quand le mode est inactif, type non revérifié après un changement de rôle, pas de révocation ni de relance).
