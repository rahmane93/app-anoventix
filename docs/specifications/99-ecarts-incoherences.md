# AnoventiX — Écarts, éléments manquants et incohérences

[← Vue d'ensemble](00-SFG-vue-ensemble.md)

| | |
|---|---|
| **Version** | 1.0 — 16/10/2026 |
| **Méthode** | Lecture croisée de quatre couches : base (migrations Flyway, entités), API (controllers, services, validations, sécurité), application (écrans, appels API, schémas Zod, types) et documentation existante. Chaque écart cite sa preuve sous la forme `fichier:ligne`. |
| **Gravité** | 🔴 **Bloquant** : fonction cassée, risque légal ou risque d'indisponibilité. 🟠 **Majeur** : règle métier incohérente, erreur 500 possible, droits incohérents, information fausse affichée. 🟡 **Mineur** : dette, documentation, confort. |
| **Type** | `INCOH` incohérence entre couches · `MANQ` élément manquant · `BUG` comportement erroné · `SÉCU` sécurité ou confidentialité · `DOC` documentation |

## 1. Synthèse

| Gravité | Nombre | Écarts |
|---|---|---|
| 🔴 Bloquant | 6 | 01 à 06 |
| 🟠 Majeur | 30 | 07 à 36 |
| 🟡 Mineur | 15 | 37 à 51 |

**Les six points à traiter en premier**

1. **Mots de passe** : l'app accepte des mots de passe que l'API refuse. Une partie des inscriptions et réinitialisations échoue sans explication claire (ECART-01).
2. **Profil public d'un particulier** : la fonction est entièrement inopérante (ECART-02).
3. **Annonce masquée par la modération** : le propriétaire ne peut ni la corriger ni la remettre en ligne, alors que l'app l'y invite (ECART-03).
4. **Installation sur une base vierge** : très probablement impossible en l'état des migrations (ECART-04).
5. **Limitation de débit sur le rafraîchissement de session** : avec des IP partagées par les opérateurs mobiles, risque de déconnexions en masse (ECART-05).
6. **Politique de confidentialité absente**, alors que la plateforme collecte des pièces d'identité (ECART-06).

---

## 2. Écarts bloquants 🔴

### ECART-01 — Règles de mot de passe différentes entre l'app et l'API · `INCOH` · Modules 01

- **Constat** : l'app ([validation.ts:15-27](../../anoventix-app/src/lib/validation.ts#L15-L27)) exige 8 caractères, une majuscule, un chiffre et **n'importe quel** caractère spécial (la liste de contrôle affiche « - _ ! @ … »). Elle n'exige **pas de minuscule**. L'API ([AuthServiceImpl.java:562-568](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/AuthServiceImpl.java#L562-L568)) exige en plus une minuscule et un caractère spécial de l'ensemble `[!@#$%^&*()-+]`, où `)-+` est une plage : seuls `! @ # $ % ^ & * ( ) +` sont admis.
- **Conséquence** : `Maison-2026`, `Conakry_2026` ou `MAISON@2026` passent la liste de contrôle de l'app puis sont refusés par l'API (« Erreur: Mot de passe trop faible. ») à l'inscription, à la réinitialisation et au changement de mot de passe. Les bornes diffèrent aussi : 8 à 40 à l'inscription, 6 à 100 en réinitialisation, aucune au changement ([SignupRequest.java:34](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/payload/request/SignupRequest.java#L34), [ResetPasswordRequest.java:17](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/payload/request/ResetPasswordRequest.java#L17)).
- **Recommandation** : définir une règle unique (proposition : 8 à 64 caractères, une minuscule, une majuscule, un chiffre, un caractère non alphanumérique quelconque) ; l'appliquer dans `isValidPassword` (`[^A-Za-z0-9]`), dans les trois `@Size` et dans `PASSWORD_CHECKS` ; ajouter un test partagé de cas limites.

### ECART-02 — Profil public d'un particulier inopérant · `BUG` · Modules 02, 04

- **Constat** :
  1. La carte de l'annonceur ne navigue vers `/profil/{id}` que si `annonceur.id` existe ([AnnonceurCard.tsx:38-44](../../anoventix-app/src/features/annonce/AnnonceurCard.tsx#L38-L44)), or l'API ne renvoie pas d'identifiant d'annonceur ([AnnonceurDTO.java](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/dto/AnnonceurDTO.java)) : le lien n'est jamais actif.
  2. L'écran ([profil/[userId].tsx:73](../../anoventix-app/app/profil/[userId].tsx#L73)) appelle `GET /api/users/{id}`, réservé à la modération ([UserController.java:225-230](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/controllers/UserController.java#L225-L230)) : 403 pour tout autre utilisateur.
  3. Il charge les annonces via `/filter?userId=…`, paramètre que l'API ignore : il afficherait **toutes** les annonces de la plateforme.
- **Recommandation** : décider si le profil public d'un particulier est souhaité. Si oui : ajouter `id` (et `entrepriseNom`) dans `AnnonceurDTO`, créer `GET /api/users/{id}/profil-public` (nom, photo, date d'inscription, annonces visibles paginées, sans email ni téléphone) et l'utiliser. Si non : supprimer l'écran et la route nginx.

### ECART-03 — Une annonce masquée par la modération ne peut pas être corrigée · `INCOH` · Modules 03, 09

- **Constat** : la modification exige une annonce en ligne (`findByIdAndActifTrue`, [BienImmoServiceImpl.java:161](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/BienImmoServiceImpl.java#L161)). Or un masquage met `actif = false` ([AdminServiceImpl.java:201](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/AdminServiceImpl.java#L201)) et le propriétaire ne peut pas réafficher l'annonce ([BienImmoServiceImpl.java:384-389](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/BienImmoServiceImpl.java#L384-L389)). L'app affiche pourtant « Corrigez-la puis contactez le support pour la remettre en ligne. » ([annonce/[id].tsx:376](../../anoventix-app/app/annonce/[id].tsx#L376)). Aucun canal « support » structuré n'existe (simple `mailto`). Même blocage pour une annonce clôturée ou masquée par son propriétaire : il faut d'abord la remettre en ligne pour la modifier.
- **Recommandation** : autoriser la modification d'une annonce MASQUEE (ou clôturée) par son propriétaire, et ajouter une action « Demander une nouvelle vérification » qui crée une entrée dans une file de modération, avec notification. Aligner le message de l'app sur le parcours réel.

### ECART-04 — Installation sur une base vierge probablement impossible · `BUG` · Transverse

- **Constat** : V1 est un simple `SELECT 1` ([V1__baseline.sql](../../anoventix-api/src/main/resources/db/migration/V1__baseline.sql)) ; V2 à V12 ne font rien si les tables n'existent pas, en comptant sur Hibernate `ddl-auto=update` pour les créer ensuite. Mais **V13 n'est pas conditionnelle** ([V13__public_id_annonce.sql](../../anoventix-api/src/main/resources/db/migration/V13__public_id_annonce.sql)) : sur une base vide, `ALTER TABLE annonce` échoue avant que Hibernate ne crée la table. En production, `ddl-auto=validate` ([application-prod.yml](../../anoventix-api/src/main/resources/application-prod.yml)) ne crée rien de toute façon. La procédure de première installation du `README.md` (§3) ne peut donc pas aboutir sans une base existante. Les tests désactivent Flyway (`src/test/resources/application.yml`, `flyway.enabled: false`), si bien que ce scénario n'est jamais vérifié.
- **Recommandation** : remplacer V1 par un vrai schéma de référence (`pg_dump --schema-only` de la production), rendre les migrations inconditionnelles, et tester une installation de bout en bout sur une base vide dans l'intégration continue (Testcontainers). Ajouter `sql/localisation.sql` comme migration de données.

### ECART-05 — Limitation par IP du rafraîchissement de session · `BUG` · Module 01

- **Constat** : `/api/auth/refresh` est classé « sensible » : 5 requêtes par 15 minutes **par adresse IP** ([RateLimitFilter.java:37-44](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/security/RateLimitFilter.java#L37-L44)). Le jeton d'accès dure 15 minutes, donc chaque utilisateur actif rafraîchit environ 4 fois par heure. En Guinée, les opérateurs mobiles partagent une même IP publique entre de nombreux abonnés (CGNAT) : au-delà de quelques utilisateurs simultanés derrière une même IP, les rafraîchissements échouent en 429 et les sessions tombent. La connexion est aussi limitée à 10 requêtes/min par IP.
- **Recommandation** : limiter le rafraîchissement par jeton ou par compte plutôt que par IP (ou relever fortement la limite), garder la protection par IP pour la connexion avec des seuils plus élevés, et suivre les 429 en production.

### ECART-06 — Politique de confidentialité absente · `MANQ` / légal · Modules 02, 12

- **Constat** : l'app et nginx pointent vers `/confidentialite` ([legal.ts](../../anoventix-app/src/constants/legal.ts), [default.conf:48](../../anoventix-api/nginx/default.conf#L48)) mais `landing/confidentialite.html` n'existe pas (le code le signale : « reste à rédiger »). La plateforme traite pourtant des données sensibles : pièces d'identité, téléphones, messages, géolocalisation.
- **Recommandation** : rédiger et publier la politique (finalités, base légale, durées de conservation des pièces d'identité et des messages, droits et contact, sous-traitants comme le fournisseur SMTP et l'hébergeur), puis l'associer au consentement (voir ECART-41).

---

## 3. Écarts majeurs 🟠

| ID | Type | Module | Constat | Preuve | Recommandation |
|---|---|---|---|---|---|
| ECART-07 | BUG | 07 | Le tableau de bord pro compte les annonces « masquées » et « rejetées » parmi celles où `actif = true`, alors que masquer et rejeter mettent `actif = false` : ces compteurs valent **toujours 0** (dans le portefeuille comme dans la conformité). | [ProStatsServiceImpl.java:74-75, 199-200](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/ProStatsServiceImpl.java#L74-L75) | Compter par statut sans le filtre `actif`. |
| ECART-08 | BUG | 03 | L'unicité de la référence est vérifiée parmi les annonces **actives** seulement, alors que la base l'impose sur **toutes** : une collision avec une annonce inactive provoque une erreur 500. Le format `VE-MMjj-XXXX` n'a pas d'année : le risque de collision augmente avec le temps. | [BienImmoServiceImpl.java:141-143](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/BienImmoServiceImpl.java#L141-L143), [Annonce.java:72](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/entities/Annonce.java#L72), [Utility.java:102-113](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/Utilities/Utility.java#L102-L113) | Vérifier `existsByReferenceAnnonce` ; ajouter l'année (`VE-26MMjj-XXXX`). |
| ECART-09 | BUG | 03 | `typeUsage` est NOT NULL en base mais facultatif dans la requête de l'API : sans usage, erreur 500 au lieu d'un 400 (l'app le rend obligatoire). La surface, présentée comme « obligatoire pour tous les types », n'est pas validée. | [BienImmo.java:39-41](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/entities/BienImmo.java#L39-L41), [BienImmoRequest.java:28](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/payload/request/BienImmoRequest.java#L28) | `@NotNull` sur `typeUsage` ; décider si la surface est obligatoire. |
| ECART-10 | BUG | 07 | L'email d'un agent accepte 100 caractères (app et API) mais le compte n'en accepte que 50 : erreur 500 entre 51 et 100. | [AgentRequest.java:22](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/payload/request/AgentRequest.java#L22), [User.java:64-67](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/entities/User.java#L64-L67) | Aligner sur une longueur unique (100 conseillé, avec migration). |
| ECART-11 | BUG | 02, 09 | Textes saisis par la modération sans limite de longueur alors que les colonnes sont bornées : motif de rejet de pièce (255), motif de changement de statut (500). Erreur 500 si le texte est trop long. | [ValidationPieceIdentiteRequest.java](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/payload/request/ValidationPieceIdentiteRequest.java), [UpdateStatutRequest.java](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/payload/request/UpdateStatutRequest.java) | `@Size` alignés sur les colonnes, et compteur de caractères dans l'app. |
| ECART-12 | INCOH | 03 | La modification d'annonce n'est pas validée (`@RequestBody` sans `@Valid`) : titre, description, prix et frais ne sont pas contrôlés, contrairement à la création. Création en multipart, modification en JSON. | [BienImmoController.java:94-102](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/controllers/BienImmoController.java#L94-L102) | Ajouter `@Valid`, avec un groupe de validation qui exclut la photo obligatoire. |
| ECART-13 | INCOH | 03, 07 | Droits du professionnel sur les annonces de ses agents : il peut les masquer ou les réafficher et voir leurs statistiques, mais pas les modifier, les clôturer ni les supprimer. | [BienImmoServiceImpl.java:594-610, 688-708](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/BienImmoServiceImpl.java#L594-L610) | Définir une politique unique (proposition : le professionnel a tous les droits du propriétaire sur les annonces de son entreprise). |
| ECART-14 | INCOH | 07, 10 | Désactiver une entreprise ne fait que bloquer la publication : les annonces restent visibles, les agents restent actifs, la page publique reste accessible. Le professionnel ne peut pas la réactiver lui-même. Les textes de l'app annoncent pourtant que l'entreprise « ne sera plus active pour son propriétaire et ses agents ». | [EntrepriseServiceImpl.java:542-561](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/EntrepriseServiceImpl.java#L542-L561), [getEntrepriseProfil:529](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/EntrepriseServiceImpl.java#L529) | Spécifier l'effet voulu (masquer les annonces et suspendre les agents ?) et l'aligner avec la suppression RGPD ; permettre la réactivation par le professionnel si c'est lui qui a désactivé. |
| ECART-15 | INCOH / RGPD | 02 | Suppression d'un professionnel par lui-même : à l'échéance des 30 jours, seul son compte est anonymisé. Ses agents restent INACTIF avec leurs données personnelles, l'entreprise n'est pas anonymisée et les photos des annonces sont conservées. La suppression par un administrateur, elle, traite tout. | [CompteSuppressionService.java:73-94, 171-188](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/CompteSuppressionService.java#L171-L188) | Réutiliser `effacerCompte` (agents, entreprise, photos) dans la tâche d'anonymisation. |
| ECART-16 | MANQ | 07 | Retrait d'un agent : seules ses annonces **actives** sont transférées au professionnel. Ses annonces hors ligne et ses conversations restent rattachées à un compte INACTIF, et les acheteurs écrivent dans le vide. | [EntrepriseServiceImpl.java:382-392](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/EntrepriseServiceImpl.java#L382-L392) | Transférer toutes les annonces et réattribuer ou clore les conversations. |
| ECART-17 | INCOH | 09 | Le rejet est présenté comme « définitif » (documentation de l'API, énumération, app : « Retirée définitivement »), mais la modération peut remettre en ligne une annonce rejetée. | [AdminController.java:167-176](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/controllers/AdminController.java#L167-L176), [AdminServiceImpl.java:230-246](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/AdminServiceImpl.java#L230-L246) | Trancher : rejet irréversible (interdire `publier` sur REJETEE) ou réversible (corriger les libellés). |
| ECART-18 | INCOH | 10 | Champs lus par l'administration et absents des réponses de l'API : `annonceurProfessionnelUsername` (l'API renvoie `annonceurProfessionnelEmail`), `proprietaireUsername` et `proprietaireId` dans la liste des annonces. Le propriétaire n'est donc pas affiché. Deux formats de `UserDTO` coexistent (recherche et fiche). | [admin.types.ts:182, 222](../../anoventix-app/src/types/admin.types.ts#L182), [entreprises/[id].tsx:246-248](../../anoventix-app/app/(tabs)/administration/entreprises/[id].tsx#L246-L248), [annonces.tsx:112-115](../../anoventix-app/app/(tabs)/administration/annonces.tsx#L112-L115), [AdminServiceImpl.java:554](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/AdminServiceImpl.java#L554) | Ajouter `proprietaireEmail` et `proprietaireNom` au DTO admin des annonces ; renommer côté app ; un seul mapper `UserDTO`. |
| ECART-19 | BUG | 07 | La page publique d'entreprise est demandée avec `?limit=` alors que l'API attend `size` : la page contient toujours 10 annonces. | [entreprise.api.ts:76](../../anoventix-app/src/api/entreprise.api.ts#L76), [EntrepriseController.java:201-202](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/controllers/EntrepriseController.java#L201-L202) | Utiliser `size`, et gérer la pagination ou le défilement infini. |
| ECART-20 | INCOH / DOC | 06, 12 | Le `README.md` et nginx annoncent un WebSocket (`/ws-native`) qu'aucun code de l'API n'expose. Le plan de tests indique « REST uniquement ». | [default.conf:137](../../anoventix-api/nginx/default.conf#L137), `README.md` §1 | Supprimer la route et la mention, ou spécifier le temps réel (WebSocket ou SSE). |
| ECART-21 | SÉCU | 01 | Révocations, verrouillages, limites de débit, présence et vues dédupliquées sont gardés **en mémoire** : un redémarrage réactive les jetons de rafraîchissement révoqués à la déconnexion (valables 7 jours), remet les compteurs anti-force brute à zéro et empêche toute montée à plusieurs instances. | [TokenBlacklist.java](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/security/TokenBlacklist.java), [LoginAttemptTracker.java](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/security/LoginAttemptTracker.java) | Stocker les jetons de rafraîchissement en base (avec rotation et révocation) ou utiliser Redis. |
| ECART-22 | INCOH | 10 | Un compte n'a qu'**un** rôle, mais l'API d'administration parle d'« octroyer » et de « révoquer » des rôles. Octroyer remplace le rôle. Passer un professionnel à PARTICULIER ou MODERATEUR laisse son entreprise et ses agents orphelins ; passer un particulier à PROFESSIONNEL ne crée pas d'entreprise ; aucune notification n'est envoyée. | [User.java:161-165](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/entities/User.java#L161-L165), [AdminServiceImpl.java:350-396](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/AdminServiceImpl.java#L350-L396) | Remplacer par `PUT /utilisateurs/{id}/role` et interdire, ou traiter explicitement, le changement de rôle d'un professionnel qui a une entreprise. |
| ECART-23 | MANQ | 06, 11 | Aucune notification de **nouveau message** (ni push, ni email) : un vendeur n'est averti que s'il ouvre l'app. Aucun email pour une suspension, une réactivation, une désactivation, un avertissement, une demande de suppression ou une anonymisation, un changement de mot de passe, un changement de rôle, la licence ou l'entreprise. | [catalogue, module 11](11-notifications-emails.md), `package.json` (pas d'`expo-notifications`) | Notifications push (Expo) pour les messages, emails pour les décisions qui touchent le compte. |
| ECART-24 | MANQ | 09 | Avertissements : l'utilisateur n'est pas prévenu, le niveau dépend seulement du rang (sans expiration ni gravité choisie), aucune levée n'existe, et la colonne `account.nb_avertissements` n'est jamais mise à jour (le compteur est recalculé). | [AdminServiceImpl.java:437-460](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/AdminServiceImpl.java#L437-L460), [User.java:141-143](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/entities/User.java#L141-L143) | Email d'avertissement, durée de validité (par exemple 12 mois), choix du niveau par le modérateur, suppression de la colonne morte. |
| ECART-25 | MANQ / INCOH | 08 | Licence : les clés vendues avant l'ouverture du mode ne peuvent pas être activées ; aucune révocation ni suppression de clé, aucune relance avant expiration, aucun historique de paiement. Une licence PARTICULIER reste valable après un passage au rôle PROFESSIONNEL (le type n'est pas revérifié). Un compte « bloqué » ne peut même plus corriger ses annonces. | [LicenceServiceImpl.java:161-163, 273-275](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/LicenceServiceImpl.java#L161-L163) | Autoriser l'activation à tout moment ; ajouter révocation, relance J-30 et journal des ventes ; vérifier le type dans `aLicenceValide`. |
| ECART-26 | INCOH | 09 | Signalements : la décision sur l'annonce et la clôture du signalement sont deux appels indépendants (une incohérence est possible) ; les autres signalements de la même annonce restent ouverts ; la suppression est physique ; le motif est stocké sous forme de **libellé** (faute « Conenu inaproprié » comprise), ce qui empêche tout filtrage par code ; le signaleur n'est pas informé. | [BienImmoServiceImpl.java:462](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/BienImmoServiceImpl.java#L462), [MotifSignalement.java](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/enums/MotifSignalement.java) | Endpoint unique « décider » (transactionnel, qui clôt tous les signalements de l'annonce) ; stocker le code ; corriger le libellé ; suppression logique. |
| ECART-27 | INCOH | 10 | La notion d'« annonce active » varie selon les statistiques : tableau de bord admin et répartitions = `actif` (comptes masqués compris) ; évolution sur 12 mois = toutes les annonces ; catalogue = visibilité publique. | [AnnonceRepository.java](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/repositories/AnnonceRepository.java), [AdminServiceImpl.java:107](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/AdminServiceImpl.java#L107) | Définir les indicateurs dans un glossaire et utiliser une seule requête « visibles ». |
| ECART-28 | MANQ | 02 | Pièce d'identité : image seule (pas de PDF ni de recto / verso), type inconnu ignoré sans erreur, aucune date d'expiration du document. Les **agents** doivent faire valider leur propre pièce alors qu'ils agissent pour une entreprise vérifiée (choix à confirmer). Rien n'empêche de réutiliser le même numéro de pièce sur plusieurs comptes. | [UserServiceImpl.java:174-179](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/UserServiceImpl.java#L174-L179), [BienImmoServiceImpl.java:109](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/BienImmoServiceImpl.java#L109) | Valider le type (400), autoriser recto / verso, contrôler l'unicité du numéro, décider de la politique pour les agents. |
| ECART-29 | MANQ | 06 | Messagerie : pas de blocage d'un interlocuteur, pas d'archivage ni de suppression (`Conversation.active` inutilisé), envoi possible à un compte suspendu ou anonymisé, motif de signalement facultatif dans l'API, message re-signalable après classement. | [MessagingServiceImpl.java:126-191](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/MessagingServiceImpl.java#L126-L191) | Blocage et archivage, refus d'envoi si le destinataire n'est pas ACTIF, motif obligatoire. |
| ECART-30 | MANQ | 03, 09, 10 | Fonctions de l'API **sans écran** : historique d'une annonce (propriétaire et admin), statistiques de vues d'une annonce, statistiques avancées de l'admin, liste `GET /api/users`, `can-create-annonce`, `can-add-agent`, recherches `/search`, `/surface`, `/quartier`, `/public/search`, lecture d'un message, détail d'une localisation. | Matrice §5 | Exposer l'historique dans la fiche admin et les statistiques avancées ; supprimer les endpoints morts. |
| ECART-31 | SÉCU | 07 | La page publique d'entreprise renvoie l'email du professionnel, le RCCM, les quotas, le nombre d'agents et les annonces restantes ; les fiches d'annonce exposent le téléphone de l'annonceur (choix produit pour WhatsApp, à confirmer). `GET /entreprises/{id}` et `/can-create-annonce` ne vérifient pas l'appartenance. | [EntrepriseDTO.java](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/dto/EntrepriseDTO.java), [EntrepriseController.java:94-113, 244-251](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/controllers/EntrepriseController.java#L244-L251) | DTO public dédié ; contrôle d'appartenance ; option « masquer mon numéro » pour les particuliers. |
| ECART-32 | MANQ / RGPD | 02 | L'export RGPD omet les avertissements, les licences, le détail de l'entreprise, l'historique, les signalements de messages et le fichier de la pièce d'identité. | [ExportDonneesService.java:48-74](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/ExportDonneesService.java#L48-L74) | Compléter l'export. |
| ECART-33 | BUG | 04 | Sur l'écran « À proximité », le filtre par type d'annonce est appliqué côté client à la page chargée : des résultats manquent. | [proximite.tsx:96](../../anoventix-app/app/proximite.tsx#L96) | Ajouter `typeAnnonce` (et les autres filtres) à `/nearby`. |
| ECART-34 | INCOH | 04 | Les favoris ne sont proposés qu'aux particuliers dans l'app, alors que l'API les ouvre à tous. Un professionnel ou un agent ne peut pas suivre la concurrence ni sauvegarder des biens pour un client. | [nav-items.ts:58](../../anoventix-app/src/lib/nav-items.ts#L58) | Trancher et aligner l'app et l'API. |
| ECART-35 | MANQ | 03, 09 | Aucune modération préalable ni détection de doublons (photos, texte, téléphone) : la publication est immédiate dès que la pièce est validée. Les « documents disponibles » sont une liste fermée dans l'app mais un texte libre dans l'API. Le type `StatutAnnonce` de l'app garde une valeur `EN_ATTENTE` inexistante dans l'API. | [constants.ts](../../anoventix-app/src/features/publier/constants.ts), [Annonce.java:114](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/entities/Annonce.java#L114) | Énumération `DocumentDisponible` côté API (liste multiple) ; décider s'il faut une file de modération a priori pour les premiers comptes. |
| ECART-36 | INCOH | 01 | Validation de l'inscription : le motif du rôle est en majuscules (`PARTICULIER\|PROFESSIONNEL`) alors que le service et son message attendent des minuscules ; le téléphone est facultatif à l'inscription alors qu'il est un identifiant de connexion et obligatoire pour les agents ; la réinitialisation est possible pour un compte suspendu ou désactivé. | [SignupRequest.java:30](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/payload/request/SignupRequest.java#L30), [AuthServiceImpl.java:318-319, 407-412](../../anoventix-api/src/main/java/com/app/AnnoncesAPI/services/AuthServiceImpl.java#L318-L319) | Harmoniser les messages ; décider si le téléphone est obligatoire ; ne pas envoyer de code de réinitialisation à un compte suspendu. |

---

## 4. Écarts mineurs 🟡

| ID | Type | Constat | Preuve | Recommandation |
|---|---|---|---|---|
| ECART-37 | DOC | Commentaires et types obsolètes : `StatutUtilisateur` cite DESACTIVE (la valeur s'appelle INACTIF) ; `BienImmo.typeUsage` « renseigné si TERRAIN » (il est toujours obligatoire en base) ; `StatutAnnonce` de l'app contient `EN_ATTENTE`, absent de l'API. | `enums/StatutUtilisateur.java`, `entities/BienImmo.java:38`, `APP/src/types/annonce.types.ts:33` | Mettre à jour. |
| ECART-38 | DOC | Documentation existante obsolète : le plan de tests cite Expo SDK 54 / RN 0.81 (le projet est en Expo 57 / RN 0.86) et une « activation par code » ; `FEATURES.md` est cité mais absent ; `ADMIN_USERNAME` est documenté mais inutilisé ; `.env.example` décrit un profil dev (« logs DEBUG, actuator complet ») sans `application-dev.yml`. | `anoventix-app/docs/TESTS_FONCTIONNELS.md`, `features/publier/constants.ts:78`, `DataLoader.java` | Mettre à jour à partir des présentes spécifications. |
| ECART-39 | INCOH | `EntrepriseDTO` expose `ville`, `codePostal`, `pays` et `siteWeb`, jamais renseignés ; `pays` est accepté en entrée puis ignoré. | `dto/EntrepriseDTO.java:22-27`, `EntrepriseRequest.java` | Supprimer ou implémenter (site web utile pour une agence). |
| ECART-40 | INCOH | Format de pagination hétérogène : `PageResponse` presque partout, `Page` Spring brute pour les signalements et les pièces en attente, `List` non paginée pour les entreprises. | `AdminController.java:104, 135`, `EntrepriseController.java:122` | Utiliser `PageResponse` partout. |
| ECART-41 | MANQ / légal | L'acceptation des CGU n'est ni transmise ni horodatée côté serveur (aucune preuve du consentement, de la version acceptée ni de la majorité déclarée). | `validation.ts` (`acceptCgu`), `SignupRequest.java` | Stocker la date et la version des CGU acceptées. |
| ECART-42 | MANQ | Prix révisé : affiché comme prix courant avec un indicateur de baisse et utilisé dans les aperçus de partage, mais non saisissable dans l'assistant, sans historique, et ignoré par les filtres, le tri et les similaires. La périodicité du loyer est figée au mois (pas de loyer annuel ni de caution, pourtant courants). | `components/annonce/Prix.tsx:28`, `SharePageService.java`, `src/lib/bien.ts:32` | Spécifier la baisse de prix (saisie, historique, filtre sur le prix courant) et la périodicité. |
| ECART-43 | Dette | Tables et colonnes orphelines conservées : `credit_compte`, `credit_transaction`, `annonce.boost_expiration` (ancien modèle crédits et mise en avant). | `V8__licence.sql` | Migration de nettoyage. |
| ECART-44 | INCOH | Le téléphone d'une entreprise n'est pas normalisé (`00…` et `+…` coexistent), contrairement à celui des comptes : le contrôle d'unicité peut être contourné. | `EntrepriseServiceImpl.java:111-114` | Appliquer `Identifiants.normaliserTelephone`. |
| ECART-45 | MANQ | Localisations : aucun contrôle de doublon, pas de coordonnées de référence par quartier (pour centrer la carte), données initiales hors Flyway, écran visible par le modérateur alors que l'écriture lui est refusée. | `LocalisationServiceImpl.java:57`, `administration/index.tsx:113` | Contrainte d'unicité, colonnes lat / lng, migration de données, masquer l'écran au modérateur. |
| ECART-46 | Perf | La recherche plein texte et la proximité chargent **tous** les identifiants puis paginent en mémoire ; le tri plein texte recalcule `to_tsvector` sans index. | `BienImmoServiceImpl.java:300-307, 661-668` | Pagination SQL (`LIMIT` / `OFFSET`), index GIN sur une colonne tsvector, PostGIS ou index spatial. |
| ECART-47 | SÉCU | Agent : mot de passe temporaire envoyé en clair, sans durée de validité, et email envoyé avant la validation de la transaction. | `EntrepriseServiceImpl.java:270-305` | Lien d'invitation à usage unique et à durée limitée (comme l'activation), envoyé après la validation. |
| ECART-48 | INCOH | Message d'inscription « Le code d'activation a été envoyé » alors que c'est un lien. | `AuthController.java:43` | Corriger le libellé. |
| ECART-49 | MANQ | Photos : l'ordre (`Media.ordre`) n'est pas géré ; impossible de choisir la photo principale ou de réordonner. | `entities/Media.java:28` | Réordonnancement dans l'assistant. |
| ECART-50 | INCOH | Tableau de bord pro : le portefeuille et la visibilité portent sur le seul utilisateur et non sur l'entreprise ; le professionnel figure parmi les « agents » (performances, agents actifs) alors que le quota l'exclut ; `canCreateAnnonce` ignore la pièce, le masquage et l'entreprise désactivée. | `ProStatsServiceImpl.java:136-232` | Définir le périmètre (moi / entreprise) et exclure le propriétaire de l'équipe. |
| ECART-51 | SÉCU | Le jeton de rafraîchissement n'est pas renouvelé à l'usage (pas de rotation ni de détection de réutilisation). | `AuthServiceImpl.java:229-246` | Rotation avec famille de jetons. |

---

## 5. Matrice de traçabilité API ↔ écrans

Légende : ✅ utilisé par l'app · ❌ non utilisé · ⚠️ utilisé de façon incorrecte.

| Endpoint | Écran(s) | État |
|---|---|---|
| `POST /api/auth/signup` · `signin` · `refresh` · `logout` · `forgot-password` · `reset-password` · `change-password` · `reactivate` · `resend-activation` · `GET /activate` | `(auth)/*`, client HTTP | ✅ |
| `GET /activate` (HTML) | Lien de l'email | ✅ |
| `GET/PUT /api/users/me` · `PUT /me/photo` · `POST /me/piece-identite` · `GET /me/export` · `DELETE /me` | profil, edit-profile | ✅ |
| `GET /api/users/{id}/piece-identite` | profil, admin fiche utilisateur | ✅ |
| `GET /api/users/{id}` | admin fiche utilisateur ✅ · profil public ⚠️ (403) | ⚠️ ECART-02 |
| `GET /api/users` | — | ❌ |
| `GET /api/users/{id}/presence` | conversation | ✅ |
| `PUT /api/users/{id}/statut` · `/piece-identite/statut` | admin | ✅ |
| `POST/DELETE/GET /api/users/me/favoris…` | fiche, favoris | ✅ |
| `POST /api/biens-immo` · `PUT /{id}` · `DELETE /{id}` · `PUT /{id}/medias` · `DELETE /{id}/medias/{m}` | publier, mes annonces | ✅ |
| `GET /api/biens-immo` · `/filter` · `/nearby` · `/zones-actives` · `/{id}` · `/public/p/{publicId}` · `/{id}/similaires` · `/user` | explore, proximité, fiche, mes annonces | ✅ (`/filter?userId` ⚠️ ECART-02) |
| `PUT /{id}/toggle-actif` · `/cloturer` · `/reactiver` | mes annonces, admin | ✅ |
| `POST/DELETE /{id}/signaler` · `GET /user/signalements` | fiche, mes signalements | ✅ |
| `GET /{id}/stats` · `/{id}/historique` · `/search` · `/surface` · `/quartier/{id}` · `/public/search` | — | ❌ ECART-30 |
| `GET/POST/PUT/DELETE /api/localisations…` (liste, région, CRUD) | publier, filtres, admin | ✅ |
| `GET /api/localisations/{id}` · `/commune/…` · `/prefecture/…` | — | ❌ |
| `POST/GET /api/messagerie/conversations…` · messages · `PUT …/read` · `POST /messages/{id}/signaler` | messagerie | ✅ |
| `PUT /api/messagerie/messages/{id}/read` | — | ❌ |
| `POST/PUT /api/entreprises…` · photo · agents (CRUD, suspendre, activer) · `/annonces` · `/user/{userId}` · `DELETE /{id}` | entreprise | ✅ |
| `GET /api/entreprises/{id}/profil` | page publique | ⚠️ ECART-19 |
| `GET /api/entreprises` · `/{id}` · `PUT /{id}/reactiver` | admin entreprises | ✅ |
| `GET /{id}/can-create-annonce` · `/can-add-agent` | — | ❌ |
| `GET /api/stats/pro` | statistiques | ✅ |
| `GET/POST /api/licences/…` (me, activer, admin/*) | ma licence, admin licences | ✅ |
| `GET/PUT /api/admin/quotas` · `PUT /api/admin/entreprises/{id}/quotas` | admin quotas, fiche entreprise | ✅ |
| `GET /api/admin/stats` | admin tableau de bord | ✅ |
| `GET /api/admin/stats/avancees` · `/annonces/{id}/historique` | — | ❌ ECART-30 |
| `GET /api/admin/annonces` · masquer · rejeter · publier · signalements (liste, traiter, supprimer) · utilisateurs (recherche, avertissements, rôles, suppression, masquage) · messages signalés · conversation · pièces en attente | admin | ✅ (propriétaire ⚠️ ECART-18) |
| `GET /share/annonce/{segment}` | pages de partage (nginx) | ✅ |

**Écrans sans fonction API opérationnelle** : `app/profil/[userId].tsx` (ECART-02).

---

## 6. Plan de correction proposé

| Lot | Contenu | Écarts | Effort indicatif |
|---|---|---|---|
| **Lot 1 — Corrections immédiates** | Règle de mot de passe unique ; contrôles `@Valid`, `@NotNull` et `@Size` manquants ; unicité de la référence ; compteurs du tableau de bord pro ; `size` au lieu de `limit` ; champs propriétaire dans l'admin ; libellés (« lien », « Conenu ») | 01, 08, 09, 10, 11, 12, 18, 19, 36, 48, 07 | 2 à 3 jours |
| **Lot 2 — Exploitation et conformité** | Migrations reproductibles et test sur base vierge ; limitation de débit du rafraîchissement ; politique de confidentialité et trace du consentement ; jetons en base ; anonymisation complète ; export complet | 04, 05, 06, 21, 41, 15, 32, 51 | 1 à 2 semaines |
| **Lot 3 — Parcours métier** | Correction d'une annonce modérée et demande de revérification ; droits du professionnel ; effets de la désactivation d'entreprise ; retrait d'agent ; rôle unique ; rejet définitif ou non ; signalement transactionnel | 03, 13, 14, 16, 17, 22, 26 | 1 à 2 semaines |
| **Lot 4 — Engagement** | Notifications push des messages ; emails des décisions de compte ; blocage et archivage en messagerie ; profil public (ou suppression) | 02, 23, 24, 29 | 2 à 3 semaines |
| **Lot 5 — Évolutions** | Licence (activation, révocation, relances) ; prix révisé et périodicité ; favoris pour tous ; écrans d'historique et de statistiques avancées ; filtres de proximité ; performances de recherche ; ordre des photos ; localisations | 25, 30, 33, 34, 42, 45, 46, 49, 50 | à planifier |

## 7. Questions à arbitrer par le métier

1. Le profil public d'un **particulier** doit-il exister (ECART-02) ? Avec quelles informations ?
2. Un **rejet** est-il définitif (ECART-17) ? Le propriétaire peut-il corriger une annonce **masquée** et demander une revérification (ECART-03) ?
3. Que doit produire la **désactivation d'une entreprise** : annonces masquées ? agents suspendus ? réactivation par le professionnel (ECART-14) ?
4. Le professionnel a-t-il tous les droits sur les annonces de ses agents (ECART-13) ?
5. Les **agents** doivent-ils faire valider leur propre pièce d'identité (ECART-28) ?
6. Le **téléphone** de l'annonceur doit-il rester public (WhatsApp) ou être masquable (ECART-31) ? Le téléphone est-il obligatoire à l'inscription (ECART-36) ?
7. Faut-il une **modération a priori** pour les nouveaux comptes (ECART-35) ?
8. **Loyers** : mensuel seulement, ou aussi annuel et caution (ECART-42) ?
9. Les **favoris** sont-ils réservés aux particuliers (ECART-34) ?
10. Peut-on activer une **licence** quand le mode licence est désactivé (ECART-25) ?
