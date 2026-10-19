# Module 08 — Licences et quotas

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Deux mécanismes limitent la publication :

1. **La licence annuelle**, mécanisme de monétisation que l'administrateur active ou non. Quand le mode licence est en vigueur, chaque compte (ou chaque entreprise) dispose d'un nombre d'**annonces actives gratuites** ; au-delà, une licence valide est exigée. Le paiement se fait **hors application** : l'utilisateur contacte AnoventiX par téléphone, WhatsApp ou email, paie, puis l'administrateur génère une clé à son nom.
2. **Les quotas des entreprises** : nombre maximal d'agents et d'annonces actives par entreprise, avec une valeur globale et des exceptions par entreprise.

Hors périmètre : paiement intégré (Orange Money, MTN MoMo, carte), facture, offre d'essai, formules mensuelles, remboursement, mise en avant payante, quota pour les particuliers quand le mode licence est inactif, relance avant la fin d'une licence et révocation d'une clé (évolutions : [98](98-evolutions.md)).

## 2. Acteurs et droits

| Action | Particulier | PRO | Agent | Modérateur | Admin |
|---|---|---|---|---|---|
| Consulter sa licence | ✅ | ✅ | ✅ (celle du PRO, en lecture) | ❌ | ❌ |
| Activer une clé (générée à son nom) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Générer et lister les clés, affecter un acheteur, régler le mode, les tarifs et le contact | ❌ | ❌ | ❌ | ❌ | ✅ |
| Consulter les quotas globaux | — | — | — | ✅ | ✅ |
| Modifier les quotas globaux et ceux d'une entreprise | — | — | — | ❌ | ✅ |

## 3. User stories

| ID | User story |
|---|---|
| US-08-01 | En tant qu'administrateur, j'active le mode licence (avec un préavis de 30 jours) et je fixe le prix annuel particulier et professionnel (en GNF) ainsi que le numéro de vente. |
| US-08-02 | En tant qu'administrateur, je génère une clé au nom de l'acheteur, avec le montant et la référence de paiement ; l'acheteur reçoit un reçu par email. |
| US-08-03 | En tant qu'administrateur, je recherche une clé (par clé ou email) et je vois si elle est libre, en attente, active ou expirée. |
| US-08-04 | En tant qu'annonceur ayant épuisé mes annonces gratuites, je vois le prix et je contacte AnoventiX pour acheter une licence. |
| US-08-05 | En tant qu'annonceur, je saisis ma clé et ma licence est valable 1 an ; si je renouvelle avant l'échéance, la nouvelle année s'ajoute à la suite. |
| US-08-06 | En tant qu'agent, je vois si la licence de mon entreprise couvre mes publications. |
| US-08-07 | En tant qu'administrateur, je règle le nombre d'agents et d'annonces actives par entreprise, globalement ou pour une entreprise donnée. |

## 4. Règles de gestion

### 4.1 Mode licence et annonces gratuites

| ID | Règle | Source |
|---|---|---|
| RG-08-01 | Mode licence désactivé par défaut (`licence.mode-actif`). **Activer** le mode fixe une **date d'effet à J+30** (DEC-18) : d'ici là, la publication reste libre ; les comptes qui seraient au-delà des annonces gratuites reçoivent un email (E21) et voient un bandeau « Le mode licence s'appliquera le jj/mm/aaaa ». **Désactiver** le mode est immédiat. Chaque changement est journalisé. | `LicenceServiceImpl.setModeActif` |
| RG-08-02 | Annonces gratuites : **5** par défaut (`LICENCE_ANNONCES_GRATUITES`), comptées en annonces **actives** (`actif = true`) ; pour une entreprise, elles sont **partagées** entre le pro et ses agents. | `LicenceServiceImpl.compterActives` |
| RG-08-03 | **Publication** (création, réaffichage, réactivation), une fois le mode en vigueur : refusée avec **402** si le compte a déjà au moins N annonces actives et aucune licence valide (« Vous avez atteint vos N annonces gratuites… »). | `LicenceServiceImpl.verifierPublication` |
| RG-08-04 | **Compte bloqué** : strictement plus de N annonces actives sans licence valide (cas d'un compte déjà au-delà quand le mode entre en vigueur, ou à la fin d'une licence). Il ne peut alors plus **modifier** ses annonces ni ajouter de photos ; il peut les clôturer ou les supprimer. Ses annonces restent visibles. | `LicenceServiceImpl.verifierNonBloque` |
| RG-08-05 | Administrateurs et modérateurs sont exemptés. | `LicenceServiceImpl.estExempte` |
| RG-08-22 | **Annonces comptées** (annonces gratuites et quota d'entreprise) : toutes celles dont `actif = true`, y compris celles d'un compte masqué par l'admin ou suspendu, invisibles du public. Ne sont pas comptées : les annonces masquées par leur propriétaire, clôturées, expirées, masquées ou rejetées par la modération, supprimées. | `LicenceServiceImpl.compterActives`, `QuotaEntrepriseService.annoncesActives` |
| RG-08-23 | **Mode inactif** : aucune limite pour un particulier ; pour une entreprise, seul le quota d'annonces s'applique. | `BienImmoServiceImpl.create` |

### 4.2 Clés, vente et activation

| ID | Règle | Source |
|---|---|---|
| RG-08-06 | Format de clé : `ANX-XXXX-XXXX-XXXX`, alphabet sans 0, O, 1 ni I (pour une saisie à la main), unique, tirée au hasard de façon sûre (`SecureRandom`, environ 60 bits). | `LicenceServiceImpl.vendre` |
| RG-08-24 | **Vente nominative** (DEC-17) : l'administrateur désigne l'**acheteur** (compte existant, retrouvé par email ou téléphone) ; le type de licence découle de son rôle. Il saisit le **montant** (GNF), le **moyen de paiement** (Orange Money, MTN MoMo, espèces, virement, autre) et la **référence de transaction** (obligatoire sauf pour les espèces). L'administrateur et la date de vente sont enregistrés, et la vente est journalisée. L'acheteur reçoit un **reçu par email** (E20 : clé, type, montant, moyen, référence, date). | `LicenceServiceImpl.vendre`, `Licence.java` |
| RG-08-25 | La clé ne peut être activée **que par son acheteur** (« Cette clé est réservée à un autre compte. »). Les clés générées avant la vente nominative restent au porteur ; l'administrateur peut leur **affecter un acheteur** depuis la liste. | `LicenceServiceImpl.activer`, `affecterAcheteur` |
| RG-08-07 | Activation : la clé est mise en majuscules ; elle doit exister, être libre, réservée à ce compte (ou au porteur) et correspondre au **type de compte** (PARTICULIER ou PROFESSIONNEL). Messages : « Clé de licence invalide. », « Cette clé de licence a déjà été utilisée. », « Cette clé est réservée aux comptes professionnels / particuliers. » | `LicenceServiceImpl.activer` |
| RG-08-08 | Durée : **1 an**. Début = aujourd'hui, ou le lendemain de la fin de la licence en cours si elle est encore valide (renouvellement chaîné). Fin = début + 1 an − 1 jour (dernier jour inclus). | idem |
| RG-08-28 | **Clé activée avant la date d'effet** (DEC-28) : quand le mode n'est pas encore en vigueur, la clé est rattachée au compte avec le statut **EN_ATTENTE** (« En attente de démarrage »), sans dates. Elle démarre à la date d'effet du mode (fin un an moins un jour plus tard) ; une seconde clé activée avant ce jour s'enchaîne à la suite. « Ma licence » affiche « Votre licence démarrera à l'ouverture du mode licence ». | `LicenceServiceImpl.demarrerLicencesEnAttente` |
| RG-08-09 | La licence d'un PROFESSIONNEL couvre ses agents (`partage = true` dans la réponse de l'agent). | `LicenceServiceImpl.resolveOwner` |
| RG-08-10 | Statut renvoyé à l'utilisateur : ACTIVE, EN_ATTENTE, EXPIREE ou AUCUNE, avec dates, date d'effet du mode, titulaire, annonces gratuites, annonces actives, indicateur de blocage, prix de son type de compte et contact de vente. Liste admin : LIBRE, EN_ATTENTE, ACTIVE, EXPIREE (filtre TOUTES par défaut), recherche dans la clé ou l'email du titulaire ou de l'acheteur, avec acheteur, montant, moyen, référence et administrateur, tri par date de création décroissante. | `LicenceServiceImpl.toResponse`, `listerCles` |
| RG-08-11 | Tarifs et contact : prix annuels (GNF) et téléphone de vente, effacés si la valeur envoyée est vide ; modification journalisée. | `LicenceServiceImpl.setReglages` |
| RG-08-19 | **Achat** : l'écran « Ma licence » invite à payer hors application (« Orange Money, MTN MoMo… ») en contactant AnoventiX par WhatsApp ou par appel (numéro réglé par l'admin) ou par email (`contact@anoventix.com`, fixé dans l'app). Sans numéro réglé, seuls l'email et le prix s'affichent. | `APP/app/licence.tsx`, `src/constants/legal.ts` |
| RG-08-21 | **Fin d'une licence** : aucune relance n'est envoyée. Le lendemain du dernier jour, un compte au-delà des annonces gratuites devient bloqué (RG-08-04) ; ses annonces restent visibles. | `LicenceServiceImpl.estValide` |

### 4.3 Quotas des entreprises

| ID | Règle | Source |
|---|---|---|
| RG-08-13 | Valeurs globales : **5 agents** et **50 annonces actives** par entreprise par défaut (`quota.agents.defaut`, `quota.annonces.defaut`). Les deux valeurs sont requises pour une modification, journalisée. | `QuotaEntrepriseService.setDefauts`, `QuotaController` |
| RG-08-14 | Exception par entreprise : une valeur propre ; `null` ramène à la valeur globale. Modification journalisée. | `QuotaEntrepriseService.setQuotasEntreprise` |
| RG-08-15 | Agents comptés : membres de l'entreprise hors propriétaire et hors agents retirés (INACTIF). Annonces comptées : annonces `actif = true` de tous les membres. | `QuotaEntrepriseService` |
| RG-08-16 | Le quota d'annonces est vérifié à la création **et** à toute remise en ligne (pour éviter le contournement par clôture puis réactivation). Baisser un quota ne retire rien : l'entreprise garde ses agents et annonces mais ne peut plus en ajouter. | `BienImmoServiceImpl.verifierQuotaEntreprise` |
| RG-08-17 | La fiche entreprise renvoie les quotas effectifs, s'ils sont personnalisés, le nombre d'agents, les agents restants et les annonces restantes. | `QuotaEntrepriseService.toDTO` |

> **Cumul des limites pour une entreprise** : la limite effective de publication est le minimum entre le quota d'annonces de l'entreprise et, si le mode licence est en vigueur sans licence valide, le nombre d'annonces gratuites.

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Ma licence | `app/licence.tsx` | Statut (« Valable jusqu'au… », « Expirée depuis le… », « En attente de démarrage »), date d'effet du mode, annonces actives et gratuites, saisie de clé `ANX-XXXX-XXXX-XXXX`, « Activer une licence » / « Renouveler ma licence », achat par WhatsApp, appel ou email, message spécifique pour l'agent. |
| Garde de publication | `features/licence/useLicenceGate.ts`, `LicenceBloqueeNotice.tsx` | Redirection vers « Ma licence » quand la publication est bloquée. |
| Admin > Licences | `app/(tabs)/administration/licences.tsx` | Interrupteur du mode (confirmation, date d'effet), tarifs et téléphone, vente d'une clé (acheteur, montant, moyen, référence), affectation d'un acheteur à une clé au porteur, liste filtrable avec « Charger plus ». |
| Admin > Quotas | `app/(tabs)/administration/quotas.tsx` | Quotas globaux. |
| Admin > Entreprise | `app/(tabs)/administration/entreprises/[id].tsx` | Quotas propres (« Valeur globale » / « Valeur propre à l'entreprise »). |

## 6. API

| Méthode | URL | Accès |
|---|---|---|
| GET | `/api/licences/me` | particulier, PRO, agent |
| POST | `/api/licences/activer` `{cle}` | particulier, PRO |
| POST / GET | `/api/licences/admin/cles` | admin (vente nominative / liste) |
| PUT | `/api/licences/admin/cles/{id}/acheteur` | admin |
| GET / PUT | `/api/licences/admin/reglages` | admin |
| GET / PUT | `/api/licences/admin/mode` | admin |
| GET | `/api/admin/quotas` | admin, modérateur |
| PUT | `/api/admin/quotas` | admin |
| PUT | `/api/admin/entreprises/{id}/quotas` | admin |

## 7. Données

`licence` : `id`, `cle` (≤ 32, unique), `type`, `owner_id`, `acheteur_id`, `montant`, `moyen_paiement`, `reference_paiement`, `genere_par`, `date_vente`, `date_activation`, `date_debut`, `date_fin`, `created_at`.
`parametre_plateforme` : `licence.mode-actif`, `licence.date-effet`, `licence.prix-particulier`, `licence.prix-professionnel`, `licence.contact-telephone`, `quota.agents.defaut`, `quota.annonces.defaut`, `moderation.seuil-masquage-auto`.

## 8. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-08-01 | Mode inactif : la 6e annonce d'un particulier est publiée sans licence. |
| CA-08-02 | Mode en vigueur, 5 annonces actives sans licence : la 6e création renvoie 402 et l'app redirige vers « Ma licence ». |
| CA-08-03 | Une clé PROFESSIONNEL saisie par un particulier est refusée. |
| CA-08-04 | Une licence activée le 01/03/2026 alors que la précédente court jusqu'au 10/06/2026 va du 11/06/2026 au 10/06/2027. |
| CA-08-05 | Un agent dont le professionnel a une licence valide publie au-delà des annonces gratuites de l'entreprise. |
| CA-08-06 | Une clé générée pour le compte A est refusée au compte B ; A reçoit un reçu par email dès la génération. |
| CA-08-07 | Le mode licence activé le 01/03 ne limite aucune publication avant le 31/03 ; les comptes concernés ont reçu un email le 01/03. |
| CA-08-08 | Une clé activée avant la date d'effet est « En attente de démarrage » et démarre à la date d'effet. |
| CA-08-09 | Une fois le mode en vigueur, un particulier qui a 8 annonces en ligne ne peut plus en modifier aucune, mais peut les clôturer ; ses annonces restent visibles. Clôturer 3 annonces le fait passer de « bloqué » à « limité ». |
| CA-08-10 | Une entreprise dont le quota passe de 50 à 10 annonces garde ses 30 annonces en ligne mais ne peut plus en publier ni en réafficher. |
