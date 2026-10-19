# AnoventiX — Spécifications fonctionnelles générales (SFG)

| | |
|---|---|
| **Version** | 2.0 |
| **Statut** | Aligné sur le code ; validation métier et juridique à obtenir |
| **Date** | 19/10/2026 |
| **Validation** | *(à renseigner : responsable produit, date)* |
| **Périmètre** | API `anoventix-api` (Spring Boot 4 / Java 21 / PostgreSQL) et application `anoventix-app` (Expo / React Native : Android + site web) |
| **Méthode** | Spécifications reconstituées à partir du code, puis corrigées au fil des phases 0 à 8 : chaque module décrit le comportement actuel du code. Les décisions du responsable produit sont tenues dans le §17 ; ce qui reste à faire est dans [98-evolutions.md](98-evolutions.md). |

**Historique**

| Version | Date | Modification |
|---|---|---|
| 1.0 | 16/10/2026 | Rétro-ingénierie initiale du code source |
| 1.1 | 17/10/2026 | Hors périmètre, indicateurs, dépendances externes, parcours, cycles de vie, exigences cibles, conservation et cadre légal, questions ouvertes. |
| 1.2 | 17/10/2026 | Évolution EVO-01 (selfie de vérification). |
| 1.3 | 17/10/2026 | Corrections issues de la relecture des modules 03 à 12. |
| 1.4 – 1.5 | 17/10/2026 | Registre des décisions (DEC-01 à DEC-32) et règles cibles dans les modules. |
| 2.0 | 19/10/2026 | Corrections des phases 0 à 8 reportées dans tous les modules, décisions DEC-33 à DEC-37 ; le document des écarts est retiré (archivé dans l'historique git, étiquette `fin-des-ecarts`) ; le reste à faire passe dans le document 98. |

> **Conventions de référence.** `API/` désigne `anoventix-api/src/main/java/com/app/AnnoncesAPI/` et `APP/` désigne `anoventix-app/`. Les identifiants suivent le schéma `US-<module>-nn` (user story), `RG-<module>-nn` (règle de gestion), `CA-<module>-nn` (critère d'acceptation), `DEC-nn` (décision du responsable produit, §17) et `EVO-nn` (évolution, §16). Les mentions `ECART-nn` qui subsistent dans le §17, dans le code et dans les migrations renvoient au document des écarts archivé.

---

## 1. Contexte et objectifs

AnoventiX est une **place de marché immobilière dédiée à la Guinée**. Elle met en relation des annonceurs (particuliers, agences immobilières et leurs agents) avec des personnes qui cherchent un bien à **acheter, louer ou prendre à bail**. Les prix sont exprimés en **francs guinéens (GNF)** et toute l'interface est en français.

Objectifs métier :

1. **Publier** rapidement une annonce illustrée (assistant en 5 étapes, 1 à 10 photos, localisation jusqu'au quartier).
2. **Trouver** un bien : catalogue public, recherche plein texte ou par référence, filtres multicritères, recherche autour de soi, annonces similaires, alertes de recherche.
3. **Mettre en relation** : messagerie interne avec notifications push, appel et WhatsApp pour les utilisateurs connectés.
4. **Garantir la confiance** : vérification d'identité (pièce et selfie pris en direct) avant toute publication, vérification des agences, signalements, masquage automatique des annonces suspectes, modération, avertissements, suspension.
5. **Structurer l'offre professionnelle** : entreprise, agents, quotas, tableau de bord.
6. **Monétiser** (optionnel, activable par l'administrateur avec préavis) : licence annuelle au-delà d'un nombre d'annonces gratuites.
7. **Respecter la vie privée** : export des données, suppression du compte avec délai de grâce de 30 jours, anonymisation, durées de conservation appliquées automatiquement.

### 1.1 Hors périmètre

| Élément | Situation | Renvoi |
|---|---|---|
| Application iOS publiée | Configuration iOS présente dans `app.json`, mais aucune publication | §10 |
| Distribution par le Play Store | APK téléchargeable sur le site ; publication décidée (DEC-20), à faire au lancement | [98](98-evolutions.md) |
| Paiement en ligne | La licence s'achète hors plateforme et s'active par une clé nominative | Module 08 |
| Échanges en temps réel | La messagerie interroge le serveur toutes les 5 s ; les nouveaux messages sont notifiés par push | Module 06 |
| Modération avant publication | Les annonces sont publiées immédiatement et modérées après coup (DEC-11), avec masquage automatique | Module 09 |
| Vérification du téléphone | Décidée (DEC-05), reportée | [98](98-evolutions.md) |
| Langues autres que le français, devises autres que le GNF | — | — |
| Visites virtuelles, vidéos, plans | Photos uniquement | Module 03 |
| Estimation de prix, crédit immobilier, mise en relation avec des notaires | — | — |
| Avis et notes sur les annonceurs | — | — |
| Fonctionnement hors ligne | Une connexion est nécessaire pour tout écran | §10 |

### 1.2 Indicateurs de succès *(proposés)*

| Objectif | Indicateur | Cible proposée | Calculable aujourd'hui ? |
|---|---|---|---|
| 1. Publier | Délai entre l'activation du compte et la première annonce | médiane < 3 jours | Partiellement (pas de date d'activation stockée) |
| 1. Publier | Taux d'abandon de l'assistant de publication | < 40 % | Non (outil d'audience à installer, DEC-29) |
| 2. Trouver | Recherches sans résultat | < 15 % | Non (outil d'audience) |
| 3. Mettre en relation | Annonces ayant reçu au moins un contact dans les 30 jours | > 30 % | Messages oui ; appels et WhatsApp non |
| 4. Confiance | Délai de traitement d'un dossier d'identité | 90 % en < 72 h (DEC-25) | Oui (dates d'envoi et de décision) |
| 4. Confiance | Dossiers rejetés pour un selfie qui ne correspond pas à la pièce | suivi mensuel | Oui (motif de rejet) |
| 4. Confiance | Délai de traitement d'un signalement | 90 % en < 72 h | Oui (`date`, `date_traitement`) |
| 5. Professionnels | Entreprises actives avec au moins une annonce en ligne | suivi mensuel | Oui |
| 6. Monétiser | Comptes bloqués par la licence qui activent une clé | suivi mensuel | Oui |
| Qualité de l'offre | Annonces clôturées « VENDU » ou « LOUE » sur l'ensemble des clôtures | suivi mensuel | Oui (motif de clôture) |

> Retenu (DEC-29) : un outil de mesure d'audience **sans cookies** (Plausible ou Matomo auto-hébergé) pour le site et l'app, à installer ([98](98-evolutions.md)) ; les indicateurs métier sont calculés depuis la base.

## 2. Acteurs et rôles

| Acteur | Rôle technique | Origine du compte | Description |
|---|---|---|---|
| Visiteur | *(non connecté)* | — | Consulte le catalogue, les fiches, les profils publics et les pages de partage. |
| Particulier | `PARTICULIER` | Inscription libre | Publie ses propres annonces, gère ses favoris et ses alertes, contacte les annonceurs, signale du contenu. |
| Professionnel | `PROFESSIONNEL` | Inscription libre | Propriétaire d'une agence : crée **une** entreprise, la fait vérifier, invite des agents, publie, a tous les droits sur les annonces de ses agents, consulte un tableau de bord d'entreprise. |
| Agent professionnel | `AGENT_PROFESSIONNEL` | Invité par un professionnel | Publie au nom de l'entreprise. Choisit son mot de passe depuis le lien d'invitation et fait vérifier sa propre identité. |
| Modérateur | `MODERATEUR` | Attribué par un administrateur | Modère les annonces, les signalements, les messages signalés, les dossiers d'identité et d'entreprise, et émet des avertissements. Double authentification par email. |
| Administrateur | `ADMINISTRATEUR` | Créé au premier démarrage (variables `ADMIN_*`) | Toutes les capacités du modérateur, plus : rôles, suppression de comptes, masquage des comptes, levée d'avertissements, licences, quotas, localisations, paramètres, journal d'audit. |
| Système | — | — | Tâches planifiées (§12) : expirations, purges, relances, alertes de recherche, masquage automatique. |

> Un compte porte **un seul rôle** (`account.role_id`). L'administration le change (`PUT /api/admin/utilisateurs/{id}/role`), avec des garde-fous (DEC-37, module 10).

## 3. Cartographie des modules

| # | Module | Document | Contenu principal |
|---|---|---|---|
| 01 | Authentification et comptes | [01-authentification-comptes.md](01-authentification-comptes.md) | Inscription, activation, connexion (email ou téléphone), sessions, mot de passe, double authentification du staff, réactivation, purge des comptes non activés |
| 02 | Profil utilisateur et RGPD | [02-profil-utilisateur-rgpd.md](02-profil-utilisateur-rgpd.md) | Profil, vérification d'identité (pièce, verso, selfie), profil public, export, suppression, anonymisation, comptes inactifs |
| 03 | Annonces et biens | [03-annonces-biens.md](03-annonces-biens.md) | Publication, modification, photos, cycle de vie, clôture, expiration, réexamen, historique |
| 04 | Recherche, exploration, favoris et alertes | [04-recherche-exploration-favoris.md](04-recherche-exploration-favoris.md) | Catalogue, filtres, plein texte, référence, proximité, zones actives, similaires, favoris, alertes |
| 05 | Localisation | [05-localisation.md](05-localisation.md) | Référentiel Région > Préfecture > Commune > Quartier, point de référence, quartiers demandés |
| 06 | Messagerie | [06-messagerie.md](06-messagerie.md) | Conversations par annonce, messages, notifications push, blocage, archivage, signalement |
| 07 | Espace professionnel | [07-espace-professionnel.md](07-espace-professionnel.md) | Entreprise, vérification, agents, page publique, tableau de bord |
| 08 | Licences et quotas | [08-licences-quotas.md](08-licences-quotas.md) | Mode licence, vente nominative, clés, annonces gratuites, quotas d'entreprise |
| 09 | Modération et signalements | [09-moderation-signalements.md](09-moderation-signalements.md) | Signalements, masquage automatique, décisions, réexamens, avertissements, statuts |
| 10 | Administration | [10-administration.md](10-administration.md) | Back-office : tableau de bord, utilisateurs, rôles, entreprises, statistiques, paramètres, journal d'audit |
| 11 | Notifications et emails | [11-notifications-emails.md](11-notifications-emails.md) | File d'envoi des emails, catalogue des emails et des notifications push |
| 12 | Partage, web et SEO | [12-partage-web-seo.md](12-partage-web-seo.md) | Pages Open Graph, URL canoniques, sitemap, pages légales, APK et version minimale, différences web / mobile |
| 98 | Évolutions | [98-evolutions.md](98-evolutions.md) | Ce qui reste à faire : décisions reportées, mise en production, améliorations relevées |

## 4. Architecture fonctionnelle

```
 Visiteurs / utilisateurs
   │  App Android (APK)      Site web www.anoventix.com (export statique Expo)
   └──────────────┬──────────────────────┘
                  ▼  HTTPS (TLS 1.2 / 1.3, HSTS)
            nginx (anoventix.com)
     /api/**  → API REST Spring Boot (JWT)
     /uploads/public/** → photos (public)       /uploads/private/** → interdit
     /annonce/<slug>-<publicId>, /share/agence/<id> → pages avec balises Open Graph
     /sitemap.xml, /robots.txt (servis par l'API)
     /cgu, /confidentialite, /mentions-legales → pages légales statiques
     /downloads/anoventix.apk
                  ▼
           PostgreSQL (schéma piloté par Flyway V1 → V40, validé par Hibernate)
           Fichiers : volume Docker local `anoventix_uploads` (photos et variantes, pièces, selfies, justificatifs)
           Emails : file en base avec nouvel essai, envoi SMTP
           Notifications push : service d'Expo

 Côté client : cartes Leaflet + tuiles OpenStreetMap (WebView sur Android), géolocalisation de l'appareil
```

- **Authentification** : JWT. Jeton d'accès de 15 min ; jeton de rafraîchissement de 7 jours (24 h pour le staff), **enregistré en base** et renouvelé à chaque usage (rotation, détection du rejeu). Double authentification par email pour le staff. Sur le web, le jeton de rafraîchissement est dans un cookie `HttpOnly`.
- **État en mémoire** (perdu au redémarrage, non partagé entre instances) : liste noire des jetons d'accès révoqués, tentatives de connexion, compteurs de débit, présence, déduplication des vues.
- **Échanges temps réel** : aucun. La messagerie interroge le serveur toutes les 5 s dans une conversation ouverte ; les nouveaux messages sont notifiés par push.
- **Montée en charge** : l'état en mémoire et le stockage des fichiers sur disque local imposent **une seule instance** de l'API. Passer à plusieurs instances demande un stockage partagé des fichiers et un état partagé.

### 4.1 Dépendances externes

| Dépendance | Usage | Configuration | Point d'attention |
|---|---|---|---|
| Serveur d'email (SMTP) | Tous les emails (module 11) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` | File avec nouvel essai en place. Retenu (DEC-31) : service transactionnel (Brevo, Mailjet ou Amazon SES) avec SPF, DKIM et DMARC, à configurer ([98](98-evolutions.md)). |
| Service de notifications push d'Expo | Nouveaux messages, alertes de recherche | `app.push.actif` | Jetons d'appareil enregistrés et purgés ; pas de notification sur le site web ; pas dans Expo Go. |
| Tuiles OpenStreetMap (`tile.openstreetmap.org`) | Cartes (fiche, sélecteur de position, « À proximité ») | En dur dans `APP/src/components/ui/leaflet-html.ts` | La politique d'usage des serveurs publics d'OSM n'autorise pas un service à fort trafic. Retenu (DEC-30) : un fournisseur de tuiles OSM avec clé d'API, à mettre en place avant la production ([98](98-evolutions.md)). |
| CDN `unpkg.com` (Leaflet 1.9.4) | Bibliothèque de cartes | En dur dans `leaflet-html.ts` | Si le CDN est inaccessible, aucune carte ne s'affiche. |
| Géolocalisation de l'appareil | Recherche autour de soi, position de l'annonce | Permission « pendant l'utilisation » | Refus de la permission géré (saisie du quartier). |
| WhatsApp et téléphone | Contact de l'annonceur | Liens `wa.me` / `tel:` | Numéro fourni aux seuls utilisateurs connectés (DEC-14). |
| Polices (Nunito) | Interface | Embarquées dans l'APK | — |

### 4.2 Environnements, déploiement et distribution

| Sujet | Situation | À faire |
|---|---|---|
| Environnements | Dev (`docker-compose.override.yml`, `default.dev.conf`) et prod (`docker-compose.yml`) | Environnement de recette, jeu de données de test |
| Déploiement de l'API | Docker Compose sur un serveur unique ; migrations Flyway appliquées au démarrage, installation sur base vierge vérifiée par les tests | Procédure écrite et retour arrière |
| Site web | Export statique Expo servi par nginx, trois versions conservées | — |
| Application Android | APK publié sous `/downloads/anoventix.apk` ; l'app vérifie au démarrage la version minimale exigée par l'API et invite à mettre à jour (RG-12-14) | Publication sur le Play Store (DEC-20) |
| Sauvegardes | Base + fichiers chaque jour à 02:00, conservation 14 jours, **sur le même serveur** (`scripts/backup.sh`) | Copie quotidienne hors serveur et test de restauration chaque trimestre (DEC-32) |
| Supervision | `spring-boot-starter-actuator` présent ; abandons d'emails journalisés en erreur | Alertes (API arrêtée, disque plein, emails abandonnés, sauvegarde en échec), centralisation des journaux |

## 5. Parcours de bout en bout

Les parcours relient les modules. Chaque étape renvoie à la règle qui la gouverne.

### P1 — D'un visiteur à sa première annonce (particulier)

| # | Étape | Écran / action | Règles | Blocage possible |
|---|---|---|---|---|
| 1 | Consulte le catalogue, veut publier | Onglet Publier → connexion demandée | Module 04 | — |
| 2 | S'inscrit (rôle Particulier) | Inscription, acceptation des CGU | RG-01-01 à RG-01-07 | Email ou téléphone déjà utilisé |
| 3 | Active son compte | Lien reçu par email, valable 48 h | RG-01-07 | Email non reçu → renvoi (3 max / 15 min) ; relance à J+5, suppression à J+7 |
| 4 | Se connecte | Email ou téléphone + mot de passe | RG-01-16 | Verrouillage 15 min après 5 échecs |
| 5 | Envoie sa pièce (recto, verso, date d'expiration) et prend un selfie en tenant sa pièce (appareil photo uniquement) | Profil → vérification d'identité | RG-02-05, RG-02-23 à RG-02-27 | Permission caméra refusée ; pièce expirée |
| 6 | Attend la validation | Email de validation ou de refus avec motif | RG-02-08, RG-02-12 | Traitement en 72 h au plus pour 90 % des dossiers ; refus → nouvel envoi |
| 7 | Publie | Assistant en 5 étapes | RG-03-01 à RG-03-08 | Licence si le mode licence est en vigueur et les annonces gratuites épuisées (module 08) |
| 8 | L'annonce est en ligne immédiatement | Mes annonces | RG-03-07 | — |
| 9 | Reçoit des contacts | Messagerie (notification push), appels, WhatsApp | Module 06 | — |
| 10 | Clôture (vendu, loué, retiré) ou laisse expirer à 180 jours | Mes annonces | RG-03-19 à RG-03-21 | — |

### P2 — Mise en place d'une agence

| # | Étape | Acteur | Règles |
|---|---|---|---|
| 1 | Inscription avec le rôle Professionnel, activation, identité vérifiée | Professionnel | P1, étapes 2 à 6 |
| 2 | Création de l'entreprise (nom, RCCM, téléphone unique) | Professionnel | Module 07 |
| 3 | Envoi du justificatif RCCM ; vérification par la modération ; badge « Agence vérifiée » | Professionnel, modération | RG-07-23 à RG-07-28 |
| 4 | Invitation d'un agent : lien d'invitation (usage unique, 7 jours) envoyé par email | Professionnel | RG-07-09, RG-07-10 |
| 5 | L'agent ouvre le lien et choisit son mot de passe, puis fait vérifier sa propre identité | Agent, modération | RG-07-10, RG-02-10 |
| 6 | L'agent publie dans la limite du quota de l'entreprise | Agent | RG-03-01, module 08 |
| 7 | Suivi de l'entreprise dans le tableau de bord ; gestion des annonces des agents ; suspension ou retrait d'agents (annonces et conversations reprises) | Professionnel | Module 07 |

### P3 — Chercher et contacter

| # | Étape | Règles |
|---|---|---|
| 1 | Recherche (texte, référence, filtres, autour de soi, zones actives) ; création d'une alerte | Module 04 |
| 2 | Consulte une fiche (une vue comptée par lecteur et par 24 h) | RG-03-24 |
| 3 | Ajoute aux favoris (tout compte connecté) | RG-04-12 |
| 4 | Contacte : connexion requise, puis message, appel ou WhatsApp | Module 06 |
| 5 | Partage la fiche (lien `www.anoventix.com/annonce/<slug>-<publicId>`) | Module 12 |

### P4 — Boucle de modération

| # | Étape | Acteur | Règles |
|---|---|---|---|
| 1 | Signale une annonce (une fois par annonce) ou un message | Utilisateur | RG-09-02, RG-06-14 |
| 2 | Trois signalements « arnaque / fraude » de signaleurs distincts masquent l'annonce automatiquement | Système | RG-09-06 |
| 3 | Traite la file : masquer, rejeter (définitif), remettre en ligne ou classer sans suite, en une seule décision | Modérateur | RG-09-09 |
| 4 | Le propriétaire reçoit le motif par email et le voit dans Mes annonces | Système | RG-09-13, RG-09-14 |
| 5 | Le propriétaire corrige l'annonce masquée et demande un réexamen ; la modération remet en ligne, maintient ou rejette | Propriétaire, modérateur | RG-03-29 à RG-03-32, RG-09-16 |
| 6 | Avertissement (6 mois) ; au 3e en 6 mois, ou au niveau grave choisi, suspension automatique | Modérateur | RG-09-23, RG-09-24 |
| 7 | Cas grave : masquage de toutes les annonces du compte, ou suppression du compte | Administrateur | RG-09-17, module 10 |
| 8 | Le signaleur suit le statut dans « Mes signalements » | Utilisateur | RG-09-05 |

### P5 — Départ d'un utilisateur

| # | Étape | Règles |
|---|---|---|
| 1 | Exporte ses données (JSON) | RG-02-16 |
| 2 | Demande la suppression : annonces hors ligne, compte INACTIF ; pour un pro, entreprise et agents désactivés | RG-02-18 |
| 3 | Peut se réactiver pendant 30 jours (les annonces restent hors ligne) | RG-01-26 à RG-01-28 |
| 4 | Au-delà de 30 jours, anonymisation définitive (avec l'entreprise et les agents d'un professionnel) | RG-02-20 |
| 5 | Sans suppression demandée : 2 ans sans connexion → relance ; 3 mois de plus → anonymisation | RG-02-40 |

## 6. Matrice rôles × fonctionnalités

Légende : ✅ autorisé · ⚠️ autorisé sous condition · ❌ interdit · *(UI)* = masqué dans l'application alors que l'API l'autorise.

| Fonctionnalité | Visiteur | Particulier | Professionnel | Agent | Modérateur | Admin |
|---|---|---|---|---|---|---|
| Consulter le catalogue, les fiches publiques, les similaires, la carte | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contacter un annonceur (message, appel, WhatsApp) | ❌ (connexion demandée) | ✅ | ✅ | ✅ | ❌ *(UI)* | ❌ *(UI)* |
| Favoris, alertes de recherche | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Signaler une annonce ou un message | ❌ | ✅ | ✅ | ✅ | ❌ *(UI)* | ❌ *(UI)* |
| Publier une annonce | ❌ | ⚠️ identité vérifiée | ⚠️ identité vérifiée + entreprise active + quota | ⚠️ identité vérifiée + entreprise active + quota | ⚠️ *(API seulement)* | ⚠️ *(API seulement)* |
| Modifier / clôturer / supprimer ses annonces | — | ✅ | ✅ et celles de ses agents | ✅ | ⚠️ modifier si en ligne, supprimer | ⚠️ idem |
| Masquer / réafficher une annonce d'agent | — | — | ✅ | — | ✅ | ✅ |
| Consulter l'historique d'une annonce | — | ⚠️ les siennes | ⚠️ les siennes et celles de ses agents | ⚠️ les siennes | ✅ | ✅ |
| Créer et gérer l'entreprise et les agents | — | — | ✅ | ❌ | ⚠️ suspendre / réactiver un agent, vérifier l'entreprise | ✅ + désactiver / réactiver |
| Tableau de bord pro | — | — | ✅ (toute l'entreprise, équipe) | ✅ (ses annonces) | — | — |
| Licence (consulter / activer) | — | ✅ | ✅ | consulter (licence du pro) | — | — |
| Modérer annonces, signalements, réexamens, dossiers d'identité et d'entreprise | — | — | — | — | ✅ | ✅ |
| Lire les conversations signalées, supprimer les messages signalés | — | — | — | — | ✅ | ✅ |
| Tableau de bord et statistiques de l'administration | — | — | — | — | ✅ | ✅ |
| Avertir / changer le statut d'un compte | — | — | — | — | ⚠️ pas un autre modérateur ni un admin | ⚠️ pas un autre admin |
| Rôle, suppression de compte, masquage d'un compte, levée d'un avertissement | — | — | — | — | ❌ | ✅ |
| Licences, quotas (écriture), localisations, quartiers demandés, paramètres, journal d'audit | — | — | — | — | ❌ (quotas en lecture) | ✅ |
| Export / suppression de son propre compte | — | ✅ | ✅ | ✅ | ❌ suppression | ❌ suppression |

## 7. Modèle de données métier

```
Role(1) ──< User >── Entreprise (1 propriétaire PRO, n agents ; vérification RCCM)
                │  └── parentUser (PRO créateur d'un agent)
                ├──< Annonce(BienImmo) >── Localisation (dont entrées techniques « Autre quartier »)
                │        ├──< Media (1..10, ordonnées, variantes)
                │        ├──< HistoriqueAnnonce
                │        ├──< Signalement >── User(reporter)
                │        └──< Conversation (annonce, participantOne, participantTwo, état par participant) ──< Message
                ├── favoris  (account_favoris, n–n avec Annonce)
                ├──< Avertissement
                ├──< Licence (clé annuelle, acheteur, vente)
                ├──< AlerteRecherche, AppareilPush
                ├──< BlocageUtilisateur
                └──< RefreshToken, VerificationConnexion, CodeSecours
DemandeQuartier, AuditEvent, EmailSortant, ParametrePlateforme (clé / valeur)
```

| Entité | Table | Rôle | Points clés |
|---|---|---|---|
| `User` | `account` | Compte | Email unique (≤ 100), téléphone unique au format international, un rôle, statut, dossier de vérification (recto, verso, selfie, date d'expiration, dates et auteur de la décision), CGU acceptées, dernière connexion, indicateurs RGPD et masquage, interrupteurs de notification |
| `Role` | `roles` | Référentiel des 5 rôles | Créé au démarrage (`DataLoader`) |
| `Entreprise` | `entreprises` | Agence | Nom, description, RCCM, téléphone unique, email, photo, quotas propres facultatifs, `active`, statut de vérification et justificatif RCCM |
| `Annonce` / `BienImmo` | `annonce` / `bien_immo` (héritage JOINED) | Annonce immobilière | `publicId`, référence `VE/LO/BA-aammjj-XXXX`, prix, caution et avance, type d'annonce, type de bien, usage, composition, documents (codes), localisation, GPS, statut de modération, `actif`, réexamen, clôture, expiration, vues, `visible_public` et `visible_depuis` (calculés par la base), texte de recherche indexé |
| `Media` | `medias` | Photo d'annonce | URL, type MIME, ordre (1 = photo principale), variantes (miniature, moyenne) |
| `HistoriqueAnnonce` | `historique_annonce` | Traçabilité | Un enregistrement par champ modifié (titre, prix, description, statut, motif, réexamen) |
| `Signalement` | `signalements` | Signalement d'annonce | Un seul par couple (annonce, signaleur), code et libellé du motif, retrait possible, statut, modérateur et note interne |
| `Conversation` / `Message` | `conversation` / `message` | Messagerie | Unique par (annonce, participants), état par participant (active, archivée, supprimée), messages ≤ 4000 caractères, lecture. Le signalement d'un message est porté par le message (`signale`, motif, date, signaleur) |
| `BlocageUtilisateur` | `blocage_utilisateur` | Blocage | Un compte en bloque un autre : plus de message dans un sens comme dans l'autre |
| `Avertissement` | `avertissements` | Sanction | Niveau (proposé selon le rang des avertissements en vigueur sur 6 mois, modifiable), émetteur, suspension automatique, levée |
| `Licence` | `licence` | Clé annuelle | Type, titulaire, acheteur, montant, moyen et référence de paiement, administrateur, dates d'activation, de début et de fin |
| `Localisation` | `localisation` | Référentiel géographique | Région, préfecture, commune, quartier, type de commune, point de référence ; 743 quartiers fournis ; unicité du quartier par commune |
| `DemandeQuartier` | `demande_quartier` | Quartier manquant | Nom saisi, commune, annonce, demandeur, décision |
| `AlerteRecherche` | `alerte_recherche` | Recherche enregistrée | Critères (JSON), état, dates de vérification, de notification et d'ouverture |
| `AppareilPush` | `appareil_push` | Notifications | Jeton Expo de chaque appareil Android |
| `RefreshToken`, `VerificationConnexion`, `CodeSecours` | idem | Sessions et double authentification | Jeton de session (rotation, révocation), code de connexion du staff, codes de secours hachés |
| `AuditEvent` | `audit_event` | Journal d'audit | Auteur, rôle, action, cible, motif, adresse IP |
| `EmailSortant` | `email_sortant` | File d'envoi | Destinataire, sujet, corps, tentatives, prochain essai, statut |
| `ParametrePlateforme` | `parametre_plateforme` | Réglages | Mode licence et date d'effet, tarifs, contact, quotas globaux, seuil de masquage automatique |

> Données **non persistées** (en mémoire) : liste noire des jetons d'accès, tentatives de connexion, compteurs de débit, présence, déduplication des vues.

### 7.1 Énumérations de référence

| Énumération | Valeurs |
|---|---|
| `TypeAnnonce` | VENTE (préfixe VE), LOCATION (LO), BAIL (BA) |
| `TypeBien` | APPARTEMENT, MAISON, VILLA, TERRAIN, DOMAINE, MAGASIN, BUREAU, ENTREPOT, AUTRE |
| `TypeUsage` | AGRICOLE, HABITATION, COMMERCIAL, LOISIR, PROFESSIONNEL, AUTRE |
| `StatutAnnonce` (modération) | PUBLIEE, MASQUEE, REJETEE, DESACTIVEE |
| `MotifCloture` | VENDU, LOUE, RETIRE, EXPIREE |
| `DocumentDisponible` | TITRE_FONCIER, DONATION, ACTE_DE_VENTE, CERTIFICAT_USAGE_FONCIER, AUTRE |
| `StatutUtilisateur` | EN_ATTENTE_ACTIVATION, ACTIF, INACTIF, SUSPENDU |
| `StatutPieceIdentite` | EN_ATTENTE, VALIDEE, REJETEE |
| `TypePieceIdentite` | CARTE_IDENTITE, PASSEPORT, PERMIS_DE_CONDUIRE, AUTRE |
| `StatutVerificationEntreprise` | NON_VERIFIEE, EN_ATTENTE, VERIFIEE, REJETEE |
| `StatutSignalement` | EN_ATTENTE, TRAITE, IGNORE |
| `MotifSignalement` (annonce) | CONTENU_INAPPROPRIE, DEJA_VENDU_LOUE, ARNAQUE_FRAUDE, ANNONCE_EN_DOUBLE, INFOS_INCORRECTES, MAUVAISE_CATEGORIE, PROBLEME_LOCALISATION, AUTRE |
| `MotifSignalementMessage` | ARNAQUE, PROPOS_INSULTANTS, HARCELEMENT, SPAM, AUTRE |
| `NiveauAvertissement` | LEGER, MODERE, GRAVE |
| `EtatConversation` | ACTIVE, ARCHIVEE, SUPPRIMEE |
| `TypeLicence` | PARTICULIER, PROFESSIONNEL |
| `MoyenPaiement` | ORANGE_MONEY, MTN_MOMO, ESPECES, VIREMENT, AUTRE |

### 7.2 Compatibilités type d'annonce → type de bien → usage

| Type d'annonce | Types de bien autorisés |
|---|---|
| VENTE | tous |
| LOCATION | tous sauf DOMAINE |
| BAIL | MAGASIN, BUREAU, ENTREPOT |

| Type de bien | Usages autorisés | Bien bâti (composition pièces / chambres / salles de bain) |
|---|---|---|
| APPARTEMENT, MAISON | HABITATION | oui |
| VILLA | HABITATION, LOISIR | oui |
| TERRAIN | HABITATION, COMMERCIAL, LOISIR, PROFESSIONNEL, AUTRE | non |
| DOMAINE | AGRICOLE, LOISIR, PROFESSIONNEL, AUTRE | non |
| MAGASIN | COMMERCIAL | oui |
| BUREAU | PROFESSIONNEL | oui |
| ENTREPOT | COMMERCIAL, PROFESSIONNEL | oui |
| AUTRE | tous | oui |

## 8. Règle transverse de visibilité publique

Une annonce est **visible du public** si et seulement si :

1. `actif = true` ;
2. `statutModeration = PUBLIEE` ;
3. le compte propriétaire n'est pas masqué par l'administrateur (`annoncesMasquees = false`) ;
4. le compte propriétaire est **ACTIF** (DEC-01) ;
5. si le propriétaire est membre d'une entreprise, celle-ci est **active** (DEC-12).

La règle est calculée par la base (fonction `annonce_est_visible`, colonne `annonce.visible_public` tenue à jour par des déclencheurs, migrations V15 et V25) ; `visible_depuis` note la date à laquelle l'annonce est devenue visible (base des alertes de recherche). Toutes les lectures publiques s'appuient sur cette colonne : catalogue, filtres, texte, proximité, zones actives, similaires, profils publics, favoris, pages de partage, sitemap, statistiques.

| Lecteur | Ce qu'il voit d'une annonce |
|---|---|
| Public | Annonces visibles publiquement uniquement |
| Propriétaire (et son professionnel) | Toutes ses annonces, **sauf celles qu'il a supprimées** (DESACTIVEE) |
| Modérateur / admin | Tout, y compris les annonces supprimées |

## 9. Cycles de vie (synthèse)

Les diagrammes détaillés sont dans les modules. Les tableaux ci-dessous donnent, pour chaque état, ce qu'il signifie et **qui peut en sortir**.

### 9.1 Annonce

L'état réel combine trois champs : `statutModeration`, `actif` et `motifCloture` (diagramme : [module 03 §5](03-annonces-biens.md)).

| État affiché | `statutModeration` | `actif` | `motifCloture` | Visible du public | Modifiable par le propriétaire | Sortie possible, et par qui |
|---|---|---|---|---|---|---|
| En ligne | PUBLIEE | vrai | — | ✅ (si §8) | ✅ | Propriétaire : masquer, clôturer, supprimer · Modération : masquer, rejeter · Système : expiration, masquage automatique |
| Masquée par le propriétaire | PUBLIEE | faux | — | ❌ | ❌ | Propriétaire ou professionnel : réafficher (contrôles quota, licence, masquage) |
| Clôturée | PUBLIEE | faux | VENDU / LOUE / RETIRE | ❌ | ❌ | Propriétaire ou professionnel : réactiver (nouvelle validité de 180 j) |
| Expirée | PUBLIEE | faux | EXPIREE | ❌ | ❌ | Propriétaire ou professionnel : prolonger (= réactiver) |
| Masquée par la modération | MASQUEE | faux | conservé | ❌ | ✅ (correction) | Propriétaire : corriger et demander un réexamen · Modération : remettre en ligne, maintenir, rejeter |
| Rejetée | REJETEE | faux | conservé | ❌ | ❌ | Aucune : rejet définitif (le propriétaire peut la supprimer) |
| Supprimée | DESACTIVEE | faux | effacé | ❌ (invisible aussi pour le propriétaire) | ❌ | Modération uniquement |
| *(superposé)* Compte masqué, suspendu ou désactivé, entreprise désactivée | inchangé | inchangé | inchangé | ❌ | selon le cas | Levée de la mesure |

### 9.2 Compte utilisateur

Diagramme : [module 01 §8](01-authentification-comptes.md).

| État | Connexion | Annonces | Sortie possible, et par qui |
|---|---|---|---|
| EN_ATTENTE_ACTIVATION | ❌ | — | Utilisateur : lien d'activation (48 h) · Agent : acceptation de l'invitation · Système : suppression à J+7 |
| ACTIF | ✅ | selon les règles | Utilisateur : demande de suppression · Modération : suspension, désactivation, avertissement grave · Admin : suppression · Système : inactivité (2 ans + 3 mois) |
| SUSPENDU | ❌ (dès la requête suivante) | invisibles du public | Modération : levée · Entreprise : levée de ses propres suspensions d'agent |
| INACTIF, suppression demandée | ❌ (réactivation proposée) | passées hors ligne | Utilisateur : réactivation sous 30 j · Système : anonymisation après 30 j |
| INACTIF, désactivé par la modération | ❌ | invisibles du public | Modération uniquement |
| INACTIF, agent retiré par son entreprise | ❌ | annonces et conversations reprises par le professionnel | Modération uniquement |
| INACTIF anonymisé | ❌ | DESACTIVEE, photos supprimées | Aucune (définitif) |
| *(superposé)* Annonces masquées par l'admin | ✅ | invisibles du public, publication et modification bloquées | Administrateur |
| *(superposé)* Publication bloquée par la licence | ✅ | publication et modification bloquées | Utilisateur : activer une clé |
| *(superposé)* Agent d'une entreprise désactivée | ❌ | invisibles du public | Administrateur : réactiver l'entreprise |

### 9.3 Dossier d'identité, signalement, entreprise

| Objet | Cycle | Détail |
|---|---|---|
| Dossier d'identité (pièce, verso, selfie) | (aucun) → EN_ATTENTE → VALIDEE (figé) ou REJETEE (motif) → nouvel envoi ; validation impossible sans selfie ou pièce expirée ; fichiers supprimés 30 jours après la décision | [module 02 §8](02-profil-utilisateur-rgpd.md) |
| Signalement d'annonce | EN_ATTENTE → TRAITE ou IGNORE (décision qui clôt tous les signalements de l'annonce) ; retrait possible par le signaleur ; un nouveau signalement le rouvre | [module 09 §8](09-moderation-signalements.md) |
| Signalement de message | non signalé → signalé → message supprimé par la modération, ou classé (de nouveau signalable) | [module 06](06-messagerie.md) |
| Entreprise | active → désactivée (par le professionnel, par l'admin ou par la suppression du compte) → réactivée par l'admin uniquement · vérification : NON_VERIFIEE → EN_ATTENTE → VERIFIEE ou REJETEE | [module 07](07-espace-professionnel.md) |

## 10. Exigences non fonctionnelles

La colonne « Constaté » décrit le code. La colonne « Cible » reprend les cibles retenues (DEC-32) ou proposées.

| Domaine | Constaté | Cible |
|---|---|---|
| Sécurité | Mots de passe BCrypt (coût 12), règle commune app / API. JWT signé (secret ≥ 32 octets). Sessions en base avec rotation et détection du rejeu ; jetons révoqués au changement de mot de passe, à la suspension, au changement de rôle. Double authentification par email pour le staff, codes de secours, alerte de connexion. Fichiers privés (pièces, selfies, justificatifs) servis seulement au titulaire et à la modération, chaque consultation par la modération journalisée. Messages anti-énumération. TLS 1.2 / 1.3, HSTS, `X-Frame-Options DENY`, `nosniff`. CORS limité aux origines configurées. Sur le web, jeton de rafraîchissement dans un cookie `HttpOnly`. Politique de sécurité du contenu (CSP) en mode rapport. Journal d'audit de toutes les décisions de la modération et de l'administration. | Chiffrement des fichiers d'identité sur disque et dans les sauvegardes. CSP imposée après observation du mode rapport. |
| Anti-abus | Limitation par IP : 30 requêtes/min (connexion, inscription, déconnexion), 120/min (rafraîchissement), 5 requêtes/15 min (mot de passe oublié, réinitialisation, réactivation, renvoi d'activation, activation). Verrouillage d'un identifiant 15 min après 5 échecs. Messagerie : 20 nouvelles conversations et 300 messages par compte et par 24 h. Masquage automatique après 3 signalements de fraude. | Limiter aussi la création d'annonces et les signalements par compte. |
| Performance | Pagination plafonnée à 50 éléments (100 pour les localisations). Images ≤ 10 Mo par fichier, ≤ 100 Mo par requête, ≤ 50 mégapixels, réencodées en 1920 px avec une miniature (400 px) et une version moyenne (1080 px). Recherche texte sur un index GIN, pagination faite par la base. | Lectures : 95 % en < 500 ms ; publications en < 3 s (hors envoi des photos). Première page du catalogue affichée en < 3 s en 3G (DEC-32). |
| Réseau et données mobiles | Vignettes en 400 px dans les listes. | Vignettes ≤ 100 Ko. Envoi des photos qui reprend après une coupure. Taille de l'APK suivie (cible < 50 Mo). |
| Volumétrie | Non documentée. | À fixer sur la première année (ordre de grandeur proposé : 50 000 comptes, 20 000 annonces en ligne, 200 000 photos). |
| Disponibilité | Instance unique. L'état en mémoire est perdu au redémarrage. | Disponibilité mensuelle ≥ 99 % (DEC-32). Page de maintenance pendant les déploiements. |
| Sauvegarde et reprise | Base et fichiers chaque jour à 02:00, conservation 14 jours, sur le même serveur. | Perte maximale de 24 h ; remise en service < 8 h ; copie quotidienne hors serveur ; test de restauration chaque trimestre (DEC-32). |
| Supervision | Actuator présent ; abandons d'emails et échecs de tâches planifiées journalisés en erreur. | Alertes sur l'arrêt de l'API, le disque plein (> 80 %), l'échec de la sauvegarde et les emails abandonnés. Journaux conservés 90 jours. |
| RGPD et données personnelles | Export JSON complet. Suppression avec 30 jours de grâce puis anonymisation. Suppression immédiate par un administrateur. Consentement aux CGU enregistré (date, version). Durées de conservation appliquées par une tâche quotidienne (§11.2). | Validation juridique (DEC-19). |
| Accessibilité / UX | Libellés d'accessibilité, cibles tactiles ≥ 44 px, retour haptique, site responsive. | Niveau AA des WCAG 2.1 pour le site web. |
| Plateformes | Android (APK hors Play Store) et web. Pas d'application iOS publiée. | Android minimal à fixer et à documenter. Navigateurs : 2 dernières versions de Chrome, Firefox, Safari, Edge et Chrome Android. |
| Compatibilité app / API | L'API publie la version minimale de l'app (`GET /api/app/version`) ; l'app trop ancienne demande la mise à jour. Contrat OpenAPI versionné (`anoventix-api/openapi/openapi.json`), types de l'app générés depuis ce contrat et vérifiés. | — |
| Langue / devise | Français uniquement, GNF, dates au format `jj/mm/aaaa`. | — |

## 11. Données personnelles : cadre légal et conservation

### 11.1 Cadre légal

Retenu (DEC-19) : le **droit guinéen** comme base (loi L/2016/037/AN relative à la cybersécurité et à la protection des données à caractère personnel, *référence à confirmer*), et le **standard RGPD** pour couvrir les utilisateurs installés en Europe. La politique de confidentialité et les mentions légales sont publiées (module 12) ; elles doivent être validées par un juriste, qui validera aussi les durées du §11.2 (DEC-26). Le registre des traitements reste à produire ([98](98-evolutions.md)).

### 11.2 Durées de conservation (DEC-26, sous réserve du juriste)

| Donnée | Durée appliquée | Mise en œuvre |
|---|---|---|
| Compte actif | Tant que le compte existe | — |
| Compte inactif sans connexion | Relance après 2 ans sans connexion (E23), anonymisation 3 mois plus tard ; staff exclu | `InactiviteComptesService` (03:45) |
| Compte supprimé par son titulaire | Anonymisé 30 jours après la demande | `CompteSuppressionService` (03:30) |
| Compte jamais activé | Supprimé 7 jours après l'inscription | `PurgeComptesNonActivesService` (03:15) |
| Fichiers de vérification (recto, verso, selfie) | Supprimés 30 jours après la décision ; type, numéro, statut, dates et auteur conservés | `PurgeConservationService` (04:00) |
| Photos et historique d'une annonce clôturée ou supprimée | Supprimés 12 mois après la clôture ou la suppression | idem |
| Messages | 2 ans après le dernier message de la conversation ; conversation avec un message signalé : 1 an après la décision | idem |
| Signalements traités, avertissements | 3 ans après la décision | idem |
| Journal d'audit | Adresses IP effacées après 90 jours ; lignes supprimées après 3 ans | idem |
| File d'envoi des emails | 30 jours après l'envoi ou l'abandon | `EnvoiEmailsPlanifie` (03:45) |
| Sauvegardes | 14 jours sur le serveur ; 30 jours hors serveur une fois la copie en place | `scripts/backup.sh` |

## 12. Tâches planifiées

| Heure | Tâche | Effet |
|---|---|---|
| 02:00 tous les jours | `scripts/backup.sh` (cron du serveur, hors application) | Sauvegarde de la base et des fichiers, purge des sauvegardes de plus de 14 jours |
| 00:05 tous les jours | `LicenceServiceImpl.demarrerChaqueNuit` | Démarre les licences en attente à la date d'effet du mode |
| 03:00 tous les jours | `AnnonceExpirationService` | Relance 7 jours avant l'échéance, puis clôture (EXPIREE) des annonces échues |
| 03:15 tous les jours | `PurgeComptesNonActivesService` | Relance à J+5 (E19), suppression à J+7 des comptes jamais activés |
| 03:20, 03:25 tous les jours | `SessionService`, `VerificationConnexionService` | Purge des sessions expirées et des codes de connexion échus |
| 03:30 tous les jours | `CompteSuppressionService.anonymiserComptesExpires` | Anonymise les comptes dont la suppression a été demandée il y a plus de 30 jours |
| 03:45 tous les jours | `InactiviteComptesService`, `EnvoiEmailsPlanifie.purgerEmailsTraites` | Comptes inactifs (relance, anonymisation) ; purge de la file d'emails |
| 04:00 tous les jours | `PurgeConservationService` | Durées de conservation du §11.2 |
| Toutes les heures (:00) | `AlerteRechercheService` | Notifications des alertes de recherche |
| Toutes les heures (:20) | `MiniaturesRattrapageService` | Variantes des photos qui n'en ont pas |
| Toutes les 10 s | `EnvoiEmailsPlanifie` | Envoi de la file d'emails, nouveaux essais |
| Toutes les 10 min | Purges en mémoire | Révocations expirées, tentatives de connexion, compteurs de débit, vues dédupliquées |

## 13. Paramètres de la plateforme

| Paramètre | Source | Défaut | Modifiable |
|---|---|---|---|
| Durée de validité d'une annonce | `ANNONCE_DUREE_VALIDITE_JOURS` | 180 jours | Configuration serveur |
| Relance avant expiration | `ANNONCE_RELANCE_JOURS_AVANT` | 7 jours | Configuration serveur |
| Annonces gratuites (mode licence) | `LICENCE_ANNONCES_GRATUITES` | 5 | Configuration serveur |
| Mode licence et date d'effet | `licence.mode-actif`, `licence.date-effet` | désactivé | Admin (app), préavis de 30 jours |
| Tarifs et contact de vente des licences | `licence.prix-*`, `licence.contact-telephone` | non renseignés | Admin (app) |
| Quota global d'agents par entreprise | `quota.agents.defaut` | 5 | Admin (app) |
| Quota global d'annonces actives par entreprise | `quota.annonces.defaut` | 50 | Admin (app) |
| Seuil de masquage automatique | `moderation.seuil-masquage-auto` | 3 signalements « arnaque / fraude » | Admin (app, écran Paramètres) |
| Version minimale de l'app Android | `APP_VERSION_MINIMALE`, `APP_URL_MISE_A_JOUR` | 1.0.0, lien de l'APK | Configuration serveur |
| Notifications push | `app.push.actif` | actif | Configuration serveur |
| Double authentification du staff | `app.security.staff-2fa-actif` | actif | Configuration serveur (désactivée seulement en test) |
| Version des CGU | `CGU_VERSION` | 2026-09 | Configuration serveur |
| Délai de grâce de suppression du compte | constante `User.DELAI_GRACE_SUPPRESSION_JOURS` | 30 jours | Code |
| Validité d'un avertissement | constante `Avertissement.VALIDITE_MOIS` | 6 mois | Code |
| Limites de la messagerie | constantes de `MessagingServiceImpl` | 20 conversations, 300 messages par 24 h | Code |
| Lien d'activation, code de réinitialisation | constantes | 48 h ; 15 min (8 chiffres) | Code |
| Photos par annonce | constante | 1 à 10 | Code |
| Origines autorisées (CORS) | `APP_CORS_ALLOWED_ORIGINS` | origines locales de développement | Configuration serveur |
| Conservation des sauvegardes | `RETENTION_JOURS` (script) | 14 jours | Serveur |

## 14. Glossaire

| Terme | Définition |
|---|---|
| Agent | Compte AGENT_PROFESSIONNEL invité par un professionnel et rattaché à son entreprise ; il publie au nom de l'entreprise et consomme son quota |
| Agence vérifiée | Entreprise dont le justificatif RCCM a été contrôlé par la modération ; seule à porter le badge « Agence vérifiée » |
| Alerte de recherche | Critères de recherche enregistrés ; une notification push signale au plus une fois par jour les nouvelles annonces correspondantes |
| Annonce visible | Annonce répondant à la règle du §8 |
| Avertissement en vigueur | Avertissement de moins de 6 mois, non levé : il compte pour le niveau et la suspension automatique |
| Clôture | Retrait volontaire (vendu, loué, retiré) ou automatique (expirée) d'une annonce, réversible par le propriétaire |
| Dossier de vérification | Pièce d'identité (recto, verso si besoin, date d'expiration) et selfie ; son statut conditionne la publication |
| Entreprise active | Entreprise dont le drapeau `active` est vrai ; condition pour que ses membres publient et que leurs annonces soient visibles |
| Identifiant public (`publicId`) | Identifiant aléatoire de 12 caractères hexadécimaux utilisé dans les liens partagés |
| Licence | Droit annuel acquis par une clé nominative `ANX-XXXX-XXXX-XXXX`, exigé au-delà des annonces gratuites quand le mode licence est en vigueur |
| Masquage (annonce) | Retrait temporaire, soit par le propriétaire (réversible par lui), soit par la modération ou le système avec un motif (l'annonce reste corrigeable, réexamen possible) |
| Masquage système d'un compte | Drapeau posé par l'administrateur : toutes les annonces du compte disparaissent du public sans être modifiées, publication et modification sont suspendues |
| Photo principale | Première photo d'une annonce dans l'ordre choisi : vignette et image de partage |
| Quartier | Niveau le plus fin du référentiel de localisation ; obligatoire pour chaque annonce, ou « Autre quartier » de la commune en attendant l'ajout |
| Quota | Nombre maximal d'agents ou d'annonces actives d'une entreprise |
| RCCM | Registre du Commerce et du Crédit Mobilier (identifiant légal d'une entreprise) |
| Référence d'annonce | Code lisible `VE/LO/BA-aammjj-XXXX` (`VE/LO/BA-MMjj-XXXX` pour les annonces anciennes), reconnu par le champ de recherche de l'accueil |
| Réexamen | Demande du propriétaire d'une annonce masquée corrigée ; la modération remet en ligne, maintient le masquage ou rejette |
| Rejet | Retrait définitif par la modération pour une infraction grave, avec un motif communiqué |
| Selfie de vérification | Photo prise en direct du titulaire tenant sa pièce d'identité à côté de son visage, comparée par la modération à la photo de la pièce |
| Suppression (annonce) | Désactivation par le propriétaire : statut DESACTIVEE, invisible pour lui, restaurable uniquement par la modération |
| Zone active | Commune qui compte le plus d'annonces visibles, proposée comme raccourci de recherche sur l'accueil |

## 15. Questions ouvertes

Les questions des versions précédentes sont toutes tranchées (§17). Les points qui restent à faire ou à décider sont tenus dans [98-evolutions.md](98-evolutions.md).

## 16. Évolutions

| ID | Évolution | Spécification | Statut |
|---|---|---|---|
| EVO-01 | Selfie de vérification obligatoire, pris en direct avec la pièce tenue à côté du visage | [module 02 §4.3](02-profil-utilisateur-rgpd.md) | Développée |

Les évolutions à venir sont décrites dans [98-evolutions.md](98-evolutions.md).

## 17. Décisions arrêtées

Arbitrages rendus par le responsable produit (17/10/2026 pour DEC-01 à DEC-32, 18 et 19/10/2026 pour DEC-33 à DEC-37). La colonne « Origine » cite l'écart ou la question qui a motivé la décision ; les identifiants `ECART-nn` et `99 §7` renvoient au document des écarts archivé (historique git, étiquette `fin-des-ecarts`).

| ID | Décision | Origine | Modules | Statut |
|---|---|---|---|---|
| DEC-01 | Une suspension ou une désactivation par la modération **retire du public** toutes les annonces du compte ; la levée les rend visibles. | ECART-52 | 01, 03, 04, 09 | Fait |
| DEC-02 | La modération ne lit que les conversations qui contiennent un **message signalé**, et chaque lecture est **journalisée** ; la politique de confidentialité le mentionne. | ECART-60 | 06, 09 | Fait |
| DEC-03 | **Double authentification par code email** pour les administrateurs et modérateurs. | ECART-64 | 01, 10 | Fait |
| DEC-04 | **Vérification des entreprises** (justificatif RCCM contrôlé par la modération) ; badge « Agence vérifiée » réservé aux entreprises vérifiées ; RCCM figé après vérification. | ECART-61 | 07, 10 | Fait, sauf l'email d'invitation aux entreprises existantes ([98](98-evolutions.md)) |
| DEC-05 | Téléphone **obligatoire et vérifié par code** (SMS ou WhatsApp) à l'inscription. | ECART-36, ECART-53 | 01, 02 | **Reporté** (décision du 19/10/2026), non bloquant |
| DEC-06 | Un compte jamais activé est **supprimé après 7 jours**. | ECART-53 | 01 | Fait |
| DEC-07 | Selfie : les comptes **déjà validés restent valides**, sans blocage rétroactif. | EVO-01 | 02 | Fait |
| DEC-08 | **Chaque agent** fait vérifier sa propre identité (pièce + selfie). | ECART-28 | 02, 07 | Fait |
| DEC-09 | Le propriétaire peut **corriger** une annonce masquée par la modération et **demander un réexamen**. | ECART-03 | 03, 09 | Fait |
| DEC-10 | Le **rejet est définitif** : une annonce rejetée ne peut plus être remise en ligne. | ECART-17 | 03, 09 | Fait |
| DEC-11 | Pas de modération préalable ; **masquage automatique** d'une annonce dès **3 signalements « arnaque / fraude »** de signaleurs distincts, en attente de décision. | ECART-35 | 03, 09 | Fait (seuil réglable dans l'app) |
| DEC-12 | La **désactivation d'une entreprise retire ses annonces du public et bloque ses agents** ; tout revient à la réactivation (réservée à l'admin). | ECART-14 | 07, 10 | Fait |
| DEC-13 | Nouveaux messages signalés par **notification push**. | ECART-23 | 06, 11 | Fait (une notification par message : Expo ne permet pas de remplacer celle d'une conversation) |
| DEC-14 | Le téléphone de l'annonceur n'est visible qu'**après connexion**. | ECART-31 | 03, 06, 12 | Fait |
| DEC-15 | **Favoris ouverts à tous** les rôles connectés. | ECART-34 | 04 | Fait |
| DEC-16 | **Alertes de recherche** après la mise en place des notifications. | module 04 | 04, 11 | Fait |
| DEC-17 | Licences : **clé nominative** et **trace de chaque vente**, activable seulement par l'acheteur, **reçu par email**. | ECART-62 | 08 | Fait |
| DEC-18 | Activation du mode licence : **préavis de 30 jours** avec email aux comptes concernés. | module 08 | 08, 11 | Fait |
| DEC-19 | Cadre des données personnelles : **droit guinéen + standard RGPD**, à faire valider par un juriste. | ECART-06 | 00, 02, 12 | Pages publiées ; validation juridique à obtenir ([98](98-evolutions.md)) |
| DEC-20 | **Publication sur le Play Store**. | SFG §15 | 00, 12 | À faire au lancement ([98](98-evolutions.md)) ; version minimale de l'app en place |
| DEC-21 | **Profil public minimal** d'un particulier. | ECART-02 | 02, 04 | Fait |
| DEC-22 | Quartier manquant : **demande d'ajout** ; annonce publiée sur la commune, puis rattachée au quartier. | ECART-58 | 03, 05, 10 | Fait |
| DEC-23 | Locations : **loyer mensuel + caution / avance** (nombre de mois). | ECART-42 | 03, 04, 12 | Fait |
| DEC-24 | Référencement : **bases d'abord** (`sitemap.xml`, `robots.txt`, aperçu des pages d'agence) ; pages par commune et rendu serveur plus tard. | ECART-65 | 12 | Bases faites ; la suite dans [98](98-evolutions.md) |
| DEC-25 | Vérification d'identité traitée en **72 h au plus** pour 90 % des dossiers. | SFG §15 | 00, 02, 10 | Fait (dates enregistrées, file du plus ancien au plus récent) |
| DEC-26 | Les **durées de conservation du §11.2** deviennent la cible, sous réserve du juriste. | SFG §15 | 00, 02, 03, 06 | Fait |
| DEC-27 | Le professionnel a **tous les droits** sur les annonces de ses agents. | ECART-13 | 03, 07 | Fait |
| DEC-28 | Une clé de licence **peut être activée avant l'entrée en vigueur du mode** ; son année ne démarre qu'à la date d'effet. | ECART-25 | 08 | Fait |
| DEC-29 | Mesure d'audience par un **outil sans cookies** (Plausible ou Matomo auto-hébergé). | SFG §15 | 00, 04, 12 | À faire ([98](98-evolutions.md)) |
| DEC-30 | Tuiles de carte servies par un **fournisseur de tuiles OpenStreetMap**. | SFG §15 | 00, 05 | À faire avant la production ([98](98-evolutions.md)) |
| DEC-31 | Emails envoyés par un **service transactionnel**, avec SPF, DKIM et DMARC. | SFG §15 | 00, 11 | File avec nouvel essai faite ; service à configurer ([98](98-evolutions.md)) |
| DEC-32 | Les **cibles d'exploitation du §10** sont retenues. | SFG §15 | 00 | Copie de sauvegarde hors serveur et supervision à mettre en place ([98](98-evolutions.md)) |
| DEC-33 | Avertissements **valables 6 mois** ; niveau proposé selon le rang mais **modifiable** ; **levée** par l'administrateur ; **email** au titulaire. | ECART-24 | 09, 11 | Fait |
| DEC-34 | Retrait d'un agent : **toutes** ses annonces et ses **conversations** passent au professionnel ; l'acheteur est informé. | ECART-16 | 06, 07 | Fait |
| DEC-35 | Documents disponibles en **liste fermée** côté API (codes), libellés acceptés et convertis. | ECART-35 | 03 | Fait |
| DEC-36 | Pièce d'identité : **verso obligatoire** pour la carte d'identité et le permis, **date d'expiration** obligatoire, pièce expirée refusée et non validable. Images seulement. | ECART-28 | 02 | Fait |
| DEC-37 | Changement de rôle **encadré** : un seul endpoint, garde-fous pour les entreprises et les agents, annonces d'un modérateur promu retirées du public, email au titulaire. | ECART-22 | 01, 10 | Fait |
