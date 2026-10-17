# AnoventiX — Spécifications fonctionnelles générales (SFG)

| | |
|---|---|
| **Version** | 1.5 |
| **Statut** | Brouillon, à valider par le métier |
| **Date** | 17/10/2026 |
| **Validation** | *(à renseigner : responsable produit, date)* |
| **Périmètre** | API `anoventix-api` (Spring Boot 3 / Java 21 / PostgreSQL 17) et application `anoventix-app` (Expo / React Native : Android + site web) |
| **Méthode** | Spécifications reconstituées à partir du code, des migrations Flyway, de la configuration et des documents existants (`README.md`, `anoventix-app/docs/TESTS_FONCTIONNELS.md`). Les écarts relevés sont consolidés dans [99-ecarts-incoherences.md](99-ecarts-incoherences.md). Les éléments marqués **« proposé »** ne viennent pas du code : ce sont des cibles à arbitrer. |

**Historique**

| Version | Date | Modification |
|---|---|---|
| 1.0 | 16/10/2026 | Rétro-ingénierie initiale du code source |
| 1.1 | 17/10/2026 | Ajout : hors périmètre, indicateurs, dépendances externes, parcours, cycles de vie, exigences cibles, conservation et cadre légal, questions ouvertes. Compléments à la matrice des rôles et au glossaire. Renumérotation des sections. |
| 1.2 | 17/10/2026 | Évolution EVO-01 (selfie de vérification) ; correction du §9.2 (annonces d'un compte suspendu, ECART-52) ; convention `EVO-nn` et marqueur 🆕. |
| 1.3 | 17/10/2026 | Corrections issues de la relecture des modules 03 à 12 : nombre de quartiers (743), dépendance au CDN `unpkg.com`, absence de miniatures, définition des zones actives, carte, renvois vers ECART-55 et ECART-63. |
| 1.4 | 17/10/2026 | Registre des 24 décisions arrêtées par le responsable produit (§17), renvoyé depuis les questions ouvertes de chaque module et du 99. |
| 1.5 | 17/10/2026 | Second lot de décisions (DEC-25 à DEC-32) ; règles cibles des 32 décisions rédigées dans les modules (marquées 🆕). |

> **Conventions de référence.** `API/` désigne `anoventix-api/src/main/java/com/app/AnnoncesAPI/` et `APP/` désigne `anoventix-app/`. Les identifiants suivent le schéma `US-<module>-nn` (user story), `RG-<module>-nn` (règle de gestion), `CA-<module>-nn` (critère d'acceptation), `ECART-nn` (écart, voir le document 99) et `EVO-nn` (évolution décidée mais non développée, voir §16). Le marqueur 🆕 signale une règle cible, issue d'une évolution (`EVO-nn`, §16) ou d'une décision (`DEC-nn`, §17) : tout le reste décrit le code actuel.

---

## 1. Contexte et objectifs

AnoventiX est une **place de marché immobilière dédiée à la Guinée**. Elle met en relation des annonceurs (particuliers, agences immobilières et leurs agents) avec des personnes qui cherchent un bien à **acheter, louer ou prendre à bail**. Les prix sont exprimés en **francs guinéens (GNF)** et toute l'interface est en français.

Objectifs métier identifiés dans le code :

1. **Publier** rapidement une annonce illustrée (assistant en 5 étapes, 1 à 10 photos, localisation jusqu'au quartier).
2. **Trouver** un bien : catalogue public, recherche plein texte, filtres multicritères, recherche autour de soi, annonces similaires.
3. **Mettre en relation** : messagerie interne, appel et WhatsApp.
4. **Garantir la confiance** : vérification de la pièce d'identité (🆕 complétée par un selfie pris en direct, EVO-01) avant toute publication, signalements, modération, avertissements gradués, suspension.
5. **Structurer l'offre professionnelle** : entreprise, agents, quotas, tableau de bord.
6. **Monétiser** (optionnel, activable par l'administrateur) : licence annuelle au-delà d'un nombre d'annonces gratuites.
7. **Respecter la vie privée** : export des données, suppression du compte avec délai de grâce de 30 jours, anonymisation.

### 1.1 Hors périmètre

Ce qui suit **n'est pas fourni** par la version actuelle. Sauf mention contraire, il s'agit d'un choix de périmètre et non d'un oubli.

| Élément | Situation | Renvoi |
|---|---|---|
| Application iOS publiée | Configuration iOS présente dans `app.json`, mais aucune publication | §10 |
| Distribution par le Play Store | APK téléchargeable sur le site uniquement | §4.2 |
| Paiement en ligne | La licence s'achète hors plateforme (contact téléphonique) et s'active par clé | Module 08 |
| Notifications push et échanges en temps réel | La messagerie interroge le serveur toutes les 5 s, les notifications passent par email | ECART-20, ECART-23 |
| Modération avant publication | Les annonces sont publiées immédiatement et modérées après coup | ECART-35 |
| Langues autres que le français, devises autres que le GNF | — | — |
| Visites virtuelles, vidéos, plans | Photos uniquement | Module 03 |
| Estimation de prix, crédit immobilier, mise en relation avec des notaires | — | — |
| Alertes de recherche enregistrées | — | — |
| Avis et notes sur les annonceurs | — | — |
| Fonctionnement hors ligne | Une connexion est nécessaire pour tout écran | §10 |

### 1.2 Indicateurs de succès *(proposés)*

| Objectif | Indicateur | Cible proposée | Calculable aujourd'hui ? |
|---|---|---|---|
| 1. Publier | Délai entre l'activation du compte et la première annonce | médiane < 3 jours | Partiellement (pas de date d'activation stockée) |
| 1. Publier | Taux d'abandon de l'assistant de publication | < 40 % | Non (pas de mesure d'audience) |
| 2. Trouver | Recherches sans résultat | < 15 % | Non |
| 3. Mettre en relation | Annonces ayant reçu au moins un contact dans les 30 jours | > 30 % | Messages oui ; appels et WhatsApp non |
| 4. Confiance | Délai de traitement d'une pièce d'identité | 90 % en < 72 h (DEC-25) | Non (date de décision absente) ; oui avec EVO-01 (RG-02-31) |
| 4. Confiance | Dossiers rejetés pour un selfie qui ne correspond pas à la pièce | suivi mensuel | Avec EVO-01 (motif de rejet RG-02-30) |
| 4. Confiance | Délai de traitement d'un signalement | 90 % en < 72 h | Oui (`date`, `date_traitement`) |
| 5. Professionnels | Entreprises actives avec au moins une annonce en ligne | suivi mensuel | Oui |
| 6. Monétiser | Comptes bloqués par la licence qui activent une clé | suivi mensuel | Oui |
| Qualité de l'offre | Annonces clôturées « VENDU » ou « LOUE » sur l'ensemble des clôtures | suivi mensuel | Oui (motif de clôture) |

> Aucune mesure d'audience n'est intégrée (ni dans l'app, ni sur le site). Les indicateurs marqués « Non » demandent d'ajouter des événements ou des dates.
>
> 🆕 **Retenu (DEC-29)** : un outil de mesure d'audience **sans cookies** (Plausible ou Matomo auto-hébergé) pour le site et l'app ; les indicateurs métier (délais, contacts, clôtures) sont calculés depuis la base. Les recherches sans résultat sont journalisées par l'API, sans donnée personnelle.

## 2. Acteurs et rôles

| Acteur | Rôle technique | Origine du compte | Description |
|---|---|---|---|
| Visiteur | *(non connecté)* | — | Consulte le catalogue, les fiches, les profils publics d'entreprise et les pages de partage. |
| Particulier | `PARTICULIER` | Inscription libre | Publie ses propres annonces, gère ses favoris, contacte les annonceurs, signale du contenu. |
| Professionnel | `PROFESSIONNEL` | Inscription libre | Propriétaire d'une agence : crée **une** entreprise, invite des agents, publie, consulte un tableau de bord d'équipe. |
| Agent professionnel | `AGENT_PROFESSIONNEL` | Créé par un professionnel | Publie au nom de l'entreprise. Mot de passe temporaire à changer à la première connexion. |
| Modérateur | `MODERATEUR` | Attribué par un administrateur | Modère les annonces, les signalements, les messages et les pièces d'identité, et émet des avertissements. |
| Administrateur | `ADMINISTRATEUR` | Créé au premier démarrage (variables `ADMIN_*`) | Toutes les capacités du modérateur, plus : rôles, suppression de comptes, masquage des comptes, licences, quotas, localisations, entreprises. |
| Système | — | — | Tâches planifiées : expiration des annonces (03:00), anonymisation (03:30), purges techniques toutes les 10 min. |

> Un compte porte **un seul rôle** (`account.role_id`). L'API d'administration « octroyer / révoquer un rôle » remplace donc le rôle courant (voir ECART-22).

## 3. Cartographie des modules

| # | Module | Document | Contenu principal |
|---|---|---|---|
| 01 | Authentification et comptes | [01-authentification-comptes.md](01-authentification-comptes.md) | Inscription, activation, connexion (email ou téléphone), jetons, mot de passe, réactivation |
| 02 | Profil utilisateur et RGPD | [02-profil-utilisateur-rgpd.md](02-profil-utilisateur-rgpd.md) | Profil, photo, pièce d'identité, export, suppression et anonymisation |
| 03 | Annonces et biens | [03-annonces-biens.md](03-annonces-biens.md) | Publication, modification, médias, cycle de vie, clôture, expiration, historique |
| 04 | Recherche, exploration et favoris | [04-recherche-exploration-favoris.md](04-recherche-exploration-favoris.md) | Catalogue, filtres, plein texte, proximité, zones actives, similaires, vues, favoris |
| 05 | Localisation | [05-localisation.md](05-localisation.md) | Référentiel Région > Préfecture > Commune > Quartier |
| 06 | Messagerie | [06-messagerie.md](06-messagerie.md) | Conversations par annonce, messages, lecture, présence, signalement de message |
| 07 | Espace professionnel | [07-espace-professionnel.md](07-espace-professionnel.md) | Entreprise, agents, profil public, tableau de bord |
| 08 | Licences et quotas | [08-licences-quotas.md](08-licences-quotas.md) | Mode licence, clés, annonces gratuites, quotas d'entreprise |
| 09 | Modération et signalements | [09-moderation-signalements.md](09-moderation-signalements.md) | Signalements d'annonces et de messages, décisions, avertissements |
| 10 | Administration | [10-administration.md](10-administration.md) | Back-office : utilisateurs, rôles, entreprises, statistiques, paramètres |
| 11 | Notifications et emails | [11-notifications-emails.md](11-notifications-emails.md) | Catalogue des emails et de leurs déclencheurs |
| 12 | Partage, web et SEO | [12-partage-web-seo.md](12-partage-web-seo.md) | Pages Open Graph, URL canoniques, pages légales, APK, différences web / mobile |
| 99 | Écarts et incohérences | [99-ecarts-incoherences.md](99-ecarts-incoherences.md) | Éléments manquants, incohérences, priorisation, matrice de traçabilité, questions à arbitrer |

## 4. Architecture fonctionnelle

```
 Visiteurs / utilisateurs
   │  App Android (APK)      Site web www.anoventix.com (export statique Expo)
   └──────────────┬──────────────────────┘
                  ▼  HTTPS (TLS 1.2 / 1.3, HSTS)
            nginx (anoventix.com)
     /api/**  → API REST Spring Boot (JWT)
     /uploads/public/** → photos (public)       /uploads/private/** → interdit
     /annonce/<slug>-<publicId> (www) → /share/annonce/* (page + balises Open Graph)
     /cgu, /confidentialite → pages légales statiques
     /downloads/anoventix.apk
                  ▼
           PostgreSQL 17 (schéma piloté par Hibernate en dev, Flyway V1→V13 + validation en prod)
           Fichiers : volume Docker local `anoventix_uploads` (photos, pièces d'identité, 🆕 selfies de vérification)
           Emails SMTP (asynchrones, sans file de relance)

 Côté client : cartes Leaflet + tuiles OpenStreetMap (WebView sur Android), géolocalisation de l'appareil (expo-location)
```

- **Authentification** : JWT sans état. Jeton d'accès de 15 min et jeton de rafraîchissement de 7 jours. Liste de révocation, limitation de débit, verrouillage des comptes, présence et compteur de vues sont **gardés en mémoire** (perdus au redémarrage, non distribués).
- **Échanges temps réel** : aucun. La messagerie fonctionne par interrogation périodique (toutes les 5 s dans une conversation ouverte). Aucune notification push.
- **Montée en charge** : l'état en mémoire et le stockage des fichiers sur disque local imposent **une seule instance** de l'API. Passer à plusieurs instances demande un stockage partagé des fichiers (stockage objet) et un état partagé (base ou cache).

### 4.1 Dépendances externes

| Dépendance | Usage | Configuration | Risque / point d'attention |
|---|---|---|---|
| Serveur SMTP | Tous les emails (module 11) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` | Fournisseur non documenté. Sans file de relance, un email en échec est perdu (activation, réinitialisation). Délivrabilité (SPF, DKIM, DMARC) à vérifier. 🆕 Retenu (DEC-31) : un service transactionnel (Brevo, Mailjet ou Amazon SES), avec SPF, DKIM et DMARC et le suivi des échecs.|
| Tuiles OpenStreetMap (`tile.openstreetmap.org`) | Cartes (fiche, sélecteur de position, écran « À proximité ») | En dur dans `APP/src/components/ui/leaflet-html.ts` | La politique d'usage des serveurs publics d'OSM n'autorise pas un service à fort trafic : prévoir un fournisseur de tuiles ou un serveur dédié avant la montée en charge. Attribution OSM obligatoire. 🆕 Retenu (DEC-30) : un fournisseur de tuiles OSM (MapTiler, Stadia ou équivalent), avec clé d'API et attribution.|
| CDN `unpkg.com` (Leaflet 1.9.4) | Bibliothèque de cartes chargée à chaque affichage d'une carte | En dur dans `leaflet-html.ts` | Si le CDN est inaccessible, aucune carte ne s'affiche ; prévoir d'embarquer la bibliothèque dans l'app et le site. |
| 🆕 Envoi de SMS ou WhatsApp (DEC-05) | Codes de vérification du téléphone | À choisir (fournisseur SMS local ou WhatsApp Business) | Coût par envoi : limites d'envoi par numéro et par jour (module 01, RG-01-43). |
| 🆕 Service de notifications push (DEC-13) | Nouveaux messages, alertes de recherche | Service d'envoi d'Expo (`expo-notifications`) | Jetons d'appareil à stocker et purger ; aucune notification sur le site web dans un premier temps. |
| Géolocalisation de l'appareil | Recherche autour de soi, position de l'annonce | Permission « pendant l'utilisation » | Refus de la permission à gérer (repli sur la saisie du quartier). |
| WhatsApp et téléphone | Contact de l'annonceur | Liens `wa.me` / `tel:` | Le numéro de l'annonceur est public (ECART-31). |
| Polices Google (Nunito) | Interface | Embarquées dans l'APK | — |

### 4.2 Environnements, déploiement et distribution

| Sujet | Situation constatée | À définir |
|---|---|---|
| Environnements | Dev (`docker-compose.override.yml`, `default.dev.conf`) et prod (`docker-compose.yml`) | Environnement de recette, jeu de données de test |
| Déploiement de l'API | Docker Compose sur un serveur unique | Procédure écrite, retour arrière, migrations Flyway en prod (ECART-04) |
| Site web | Export statique Expo servi par nginx | — |
| Application Android | APK publié sous `/downloads/anoventix.apk`, version `1.0.0` dans `app.json` | 🆕 **Cible DEC-20 : publication sur le Play Store**, qui assure les mises à jour (module 12, RG-12-21). D'ici là, **mise à jour des utilisateurs** : pas de Play Store ni de mise à jour à distance, donc l'utilisateur doit retélécharger l'APK. Il faut définir comment l'avertir et comment l'API traite une version d'app trop ancienne (version minimale exigée). |
| Sauvegardes | Base + fichiers chaque jour à 02:00, conservation 14 jours, **sur le même serveur** (`scripts/backup.sh`) | Copie hors serveur, test de restauration régulier 🆕 Retenu (DEC-32) : copie quotidienne hors serveur et test de restauration chaque trimestre.|
| Supervision | `spring-boot-starter-actuator` présent | Alertes (API arrêtée, disque plein, échecs SMTP, sauvegarde en échec), centralisation des journaux |

## 5. Parcours de bout en bout

Les parcours relient les modules. Chaque étape renvoie à la règle qui la gouverne.

### P1 — D'un visiteur à sa première annonce (particulier)

| # | Étape | Écran / action | Règles | Blocage possible |
|---|---|---|---|---|
| 1 | Consulte le catalogue, veut publier | Onglet Publier → connexion demandée | Module 04 | — |
| 2 | S'inscrit (rôle Particulier) | Inscription, acceptation des CGU | RG-01-01 à RG-01-07 | Mot de passe refusé (ECART-01), email ou téléphone déjà utilisé |
| 3 | Active son compte | Lien reçu par email, valable 48 h | RG-01-08 | Email non reçu → renvoi (3 max / 15 min) |
| 4 | Se connecte | Email ou téléphone + mot de passe | RG-01-16 | Verrouillage 15 min après 5 échecs |
| 5 | Envoie sa pièce d'identité 🆕 et prend un selfie en tenant sa pièce (appareil photo uniquement) | Profil → vérification d'identité | RG-02-07, 🆕 RG-02-23 à RG-02-28 | Permission caméra refusée ; ordinateur sans webcam |
| 6 | Attend la validation | Email de validation ou de refus avec motif | RG-02-08, 🆕 RG-02-29 | 🆕 traitement en **72 h au plus** pour 90 % des dossiers (DEC-25) ; refus → nouvel envoi de la pièce et du selfie |
| 7 | Publie | Assistant en 5 étapes | RG-03-01 à RG-03-07 | Licence si le mode licence est actif et les annonces gratuites épuisées (module 08) |
| 8 | L'annonce est en ligne immédiatement | Mes annonces | RG-03-07 | — |
| 9 | Reçoit des contacts | Messagerie, appels, WhatsApp | Module 06 | Pas de notification de nouveau message (ECART-23) |
| 10 | Clôture (vendu, loué, retiré) ou laisse expirer à 180 jours | Mes annonces | RG-03-19 à RG-03-21 | — |

### P2 — Mise en place d'une agence

| # | Étape | Acteur | Règles |
|---|---|---|---|
| 1 | Inscription avec le rôle Professionnel, activation, pièce validée | Professionnel | P1, étapes 2 à 6 |
| 2 | Création de l'entreprise (nom, RCCM unique, téléphone unique) | Professionnel | Module 07 |
| 3 | Invitation d'un agent : compte créé, mot de passe temporaire envoyé par email | Professionnel | RG-07-09, RG-07-10 |
| 4 | Première connexion de l'agent : changement de mot de passe obligatoire | Agent | RG-01-24 |
| 5 | L'agent fait valider sa propre pièce d'identité (🆕 avec son selfie) | Agent, modération | RG-02-10, 🆕 RG-02-23 |
| 6 | L'agent publie dans la limite du quota de l'entreprise | Agent | RG-03-01 (5), module 08 |
| 7 | Suivi de l'équipe dans le tableau de bord ; suspension ou retrait d'agents | Professionnel | Module 07 |

### P3 — Chercher et contacter

| # | Étape | Règles |
|---|---|---|
| 1 | Recherche (plein texte, filtres, autour de soi, carte, zones actives) | Module 04 |
| 2 | Consulte une fiche (une vue comptée par lecteur et par 24 h) | RG-03-24 |
| 3 | Ajoute aux favoris (particulier uniquement dans l'app) | Module 04, ECART-34 |
| 4 | Contacte : connexion requise, puis message, appel ou WhatsApp | Module 06 |
| 5 | Partage la fiche (lien `www.anoventix.com/annonce/<slug>-<publicId>`) | Module 12 |

### P4 — Boucle de modération

| # | Étape | Acteur | Règles |
|---|---|---|---|
| 1 | Signale une annonce (une fois par annonce) ou un message | Utilisateur | RG-09-02, RG-06-10 |
| 2 | Traite la file : masquer, rejeter, remettre en ligne ou classer sans suite, avec note interne | Modérateur | RG-09-06, RG-09-08 |
| 3 | Le propriétaire reçoit le motif par email et le voit dans Mes annonces | Système | RG-09-11, RG-09-12 |
| 4 | Le propriétaire ne peut pas corriger : il contacte le support | Propriétaire | RG-09-14, ECART-03 |
| 5 | Avertissement gradué ; au 3e (GRAVE), suspension automatique | Modérateur | RG-09-22 |
| 6 | Cas grave : masquage de toutes les annonces du compte, ou suppression du compte | Administrateur | RG-09-15, module 10 |
| 7 | Le signaleur suit le statut dans « Mes signalements » | Utilisateur | RG-09-05 |

### P5 — Départ d'un utilisateur

| # | Étape | Règles |
|---|---|---|
| 1 | Exporte ses données (JSON) | Module 02 |
| 2 | Demande la suppression : annonces hors ligne, compte INACTIF ; pour un pro, entreprise et agents désactivés | RG-02-17 |
| 3 | Peut se réactiver pendant 30 jours (les annonces restent hors ligne) | RG-01-25 à RG-01-27 |
| 4 | Au-delà de 30 jours, anonymisation définitive | RG-02-19, ECART-15 |

## 6. Matrice rôles × fonctionnalités

Légende : ✅ autorisé · ⚠️ autorisé sous condition · ❌ interdit · *(UI)* = masqué dans l'application alors que l'API l'autorise.

| Fonctionnalité | Visiteur | Particulier | Professionnel | Agent | Modérateur | Admin |
|---|---|---|---|---|---|---|
| Consulter le catalogue, les fiches publiques, les similaires, la carte | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contacter un annonceur (message, appel, WhatsApp) | ❌ (connexion demandée) | ✅ | ✅ | ✅ | ❌ *(UI)* | ❌ *(UI)* |
| Favoris (🆕 ouverts à tous les comptes connectés avec DEC-15) | ❌ | ✅ | ❌ *(UI)* | ❌ *(UI)* | ❌ *(UI)* | ❌ *(UI)* |
| Signaler une annonce ou un message | ❌ | ✅ | ✅ | ✅ | ❌ *(UI)* | ❌ *(UI)* |
| Publier une annonce | ❌ | ⚠️ pièce validée | ⚠️ pièce validée + entreprise active + quota | ⚠️ pièce validée + entreprise active + quota | ⚠️ *(API seulement)* | ⚠️ *(API seulement)* |
| Modifier / supprimer ses annonces | — | ✅ | ✅ | ✅ | ✅ toutes | ✅ toutes |
| Masquer / réafficher une annonce d'agent | — | — | ✅ | — | ✅ | ✅ |
| Consulter l'historique d'une annonce | — | ⚠️ les siennes | ⚠️ les siennes | ⚠️ les siennes | ✅ | ✅ |
| Consulter les vues d'une annonce | — | ⚠️ les siennes | ⚠️ les siennes et celles de ses agents | ⚠️ les siennes | ✅ | ✅ |
| Créer et gérer l'entreprise et les agents | — | — | ✅ | ❌ | ⚠️ suspendre / réactiver un agent | ✅ désactiver / réactiver |
| Tableau de bord pro | — | — | ✅ (avec équipe) | ✅ (sans équipe) | — | — |
| Licence (consulter / activer) | — | ✅ | ✅ | consulter (licence du pro) | — | — |
| Modérer annonces, signalements, pièces | — | — | — | — | ✅ | ✅ |
| Lire et supprimer les messages signalés | — | — | — | — | ✅ | ✅ |
| Statistiques de la plateforme (tableau de bord admin) | — | — | — | — | ✅ | ✅ |
| Avertir / changer le statut d'un compte | — | — | — | — | ⚠️ pas un autre modérateur ni un admin | ⚠️ pas un autre admin |
| Rôles, suppression de compte, masquage d'un compte | — | — | — | — | ❌ | ✅ |
| Licences (clés, mode, tarifs), quotas (écriture), localisations (écriture) | — | — | — | — | ❌ (quotas en lecture) | ✅ |
| Export / suppression de son propre compte | — | ✅ | ✅ | ✅ | ❌ suppression | ❌ suppression |

## 7. Modèle de données métier

```
Role(1) ──< User >── Entreprise (1 propriétaire PRO, n agents)
                │  └── parentUser (PRO créateur d'un agent)
                ├──< Annonce(BienImmo) >── Localisation
                │        ├──< Media (1..10)
                │        ├──< HistoriqueAnnonce
                │        ├──< Signalement >── User(reporter, traitePar)
                │        └──< Conversation (annonce, participantOne, participantTwo) ──< Message
                │                                                   (signalement porté par le message : signalePar)
                ├── favoris  (account_favoris, n–n avec Annonce)
                ├──< Avertissement >── User(emitPar)
                └──< Licence (clé annuelle)
ParametrePlateforme (clé / valeur : mode licence, tarifs, quotas globaux)
```

| Entité | Table | Rôle | Points clés |
|---|---|---|---|
| `User` | `account` | Compte | Email unique (≤ 50), téléphone unique au format international, un rôle, statut, pièce d'identité (🆕 selfie, dates et auteur de la décision : EVO-01), indicateurs RGPD et masquage |
| `Role` | `roles` | Référentiel des 5 rôles | Créé au démarrage (`DataLoader`) |
| `Entreprise` | `entreprises` | Agence | Nom, description, RCCM unique, téléphone unique, email, photo, quotas propres facultatifs, `active`, 🆕 statut de vérification et justificatif RCCM (DEC-04) |
| `Annonce` / `BienImmo` | `annonce` / `bien_immo` (héritage JOINED) | Annonce immobilière | `publicId` (12 caractères hexadécimaux), référence `VE/LO/BA-MMjj-XXXX`, prix, type d'annonce, type de bien, usage, composition, localisation, GPS, statut de modération, `actif`, clôture, expiration, vues |
| `Media` | `medias` | Photo d'annonce | URL, type MIME, ordre (non exploité) |
| `HistoriqueAnnonce` | `historique_annonce` | Traçabilité | Un enregistrement par champ modifié (titre, prix, description, statut, motif) |
| `Signalement` | `signalements` | Signalement d'annonce | Un seul par couple (annonce, signaleur), retrait possible, statut, modérateur et note interne |
| `Conversation` / `Message` | `conversation` / `message` | Messagerie | Unique par (annonce, participants), messages ≤ 4000 caractères, lecture. Le **signalement d'un message** n'est pas une entité : ce sont des colonnes du message (`signale`, motif, date, signaleur), donc un seul signalement par message. Suppression par la modération (contenu conservé) |
| `Avertissement` | `avertissements` | Sanction graduée | Niveau calculé selon le rang (LÉGER, MODÉRÉ, GRAVE), émetteur, suspension automatique |
| `Licence` | `licence` | Clé annuelle | Type PARTICULIER / PROFESSIONNEL, titulaire, dates de début et de fin |
| `Localisation` | `localisation` | Référentiel géographique | Région, préfecture, commune, quartier, type de commune (urbaine / rurale) ; 743 quartiers fournis (34 préfectures, 369 communes) |
| `ParametrePlateforme` | `parametre_plateforme` | Réglages | `licence.mode-actif`, `licence.prix-*`, `licence.contact-telephone`, `quota.agents.defaut`, `quota.annonces.defaut` |

> Données **non persistées** (en mémoire) : révocations de jetons, tentatives de connexion, compteurs de débit, présence, déduplication des vues.

### 7.1 Énumérations de référence

| Énumération | Valeurs |
|---|---|
| `TypeAnnonce` | VENTE (préfixe VE), LOCATION (LO), BAIL (BA) |
| `TypeBien` | APPARTEMENT, MAISON, VILLA, TERRAIN, DOMAINE, MAGASIN, BUREAU, ENTREPOT, AUTRE |
| `TypeUsage` | AGRICOLE, HABITATION, COMMERCIAL, LOISIR, PROFESSIONNEL, AUTRE |
| `StatutAnnonce` (modération) | PUBLIEE, MASQUEE, REJETEE, DESACTIVEE |
| `MotifCloture` | VENDU, LOUE, RETIRE, EXPIREE |
| `StatutUtilisateur` | EN_ATTENTE_ACTIVATION, ACTIF, INACTIF, SUSPENDU |
| `StatutPieceIdentite` | EN_ATTENTE, VALIDEE, REJETEE |
| `TypePieceIdentite` | CARTE_IDENTITE, PASSEPORT, PERMIS_DE_CONDUIRE, AUTRE |
| `StatutSignalement` | EN_ATTENTE, TRAITE, IGNORE |
| `MotifSignalement` (annonce) | CONTENU_INAPPROPRIE, DEJA_VENDU_LOUE, ARNAQUE_FRAUDE, ANNONCE_EN_DOUBLE, INFOS_INCORRECTES, MAUVAISE_CATEGORIE, PROBLEME_LOCALISATION, AUTRE |
| `MotifSignalementMessage` | ARNAQUE, PROPOS_INSULTANTS, HARCELEMENT, SPAM, AUTRE |
| `NiveauAvertissement` | LEGER, MODERE, GRAVE |
| `TypeLicence` | PARTICULIER, PROFESSIONNEL |
| Documents disponibles *(liste côté app seulement)* | TITRE_FONCIER, DONATION, ACTE_DE_VENTE, CERTIFICAT_USAGE_FONCIER, AUTRE |

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
`actif = true` **ET** `statutModeration = PUBLIEE` **ET** le compte propriétaire n'est pas masqué par l'administrateur (`annoncesMasquees = false`).
Source : `Annonce.estVisiblePubliquement()` (`API/entities/Annonce.java:189`). La règle est reprise dans toutes les requêtes publiques : catalogue, filtres, plein texte, proximité, zones actives, similaires, profil d'entreprise, favoris, pages de partage.

> 🆕 **Règle cible (DEC-01)** : s'y ajoute une quatrième condition, **le compte propriétaire est ACTIF**. Une suspension ou une désactivation par la modération retire donc toutes les annonces du compte de toutes les vues publiques, sans modifier les annonces ; la levée les rend visibles dans leur état antérieur (module 01, RG-01-35).
>
> 🆕 **Règle cible (DEC-12)** : s'y ajoute une cinquième condition, **si le propriétaire est membre d'une entreprise, celle-ci est active**. La désactivation d'une entreprise retire du public les annonces de tous ses membres (module 07, RG-07-22).

| Lecteur | Ce qu'il voit d'une annonce |
|---|---|
| Public | Annonces visibles publiquement uniquement |
| Propriétaire | Toutes ses annonces, **sauf celles qu'il a supprimées** (DESACTIVEE) |
| Modérateur / admin | Tout, y compris les annonces supprimées |

## 9. Cycles de vie (synthèse)

Les diagrammes détaillés sont dans les modules. Les tableaux ci-dessous donnent, pour chaque état, ce qu'il signifie et **qui peut en sortir**.

### 9.1 Annonce

L'état réel combine trois champs : `statutModeration`, `actif` et `motifCloture` (diagramme : [module 03 §5](03-annonces-biens.md)).

| État affiché | `statutModeration` | `actif` | `motifCloture` | Visible du public | Modifiable par le propriétaire | Sortie possible, et par qui |
|---|---|---|---|---|---|---|
| En ligne | PUBLIEE | vrai | — | ✅ (sauf compte masqué) | ✅ | Propriétaire : masquer, clôturer, supprimer · Modération : masquer, rejeter · Système : expiration |
| Masquée par le propriétaire | PUBLIEE | faux | — | ❌ | ❌ | Propriétaire ou PRO parent : réafficher (contrôles quota, licence, masquage) |
| Clôturée | PUBLIEE | faux | VENDU / LOUE / RETIRE | ❌ | ❌ | Propriétaire : réactiver (nouvelle validité de 180 j) |
| Expirée | PUBLIEE | faux | EXPIREE | ❌ | ❌ | Propriétaire : prolonger (= réactiver) |
| Masquée par la modération | MASQUEE | faux | conservé | ❌ | ❌ (ECART-03) ; 🆕 ✅ avec DEC-09 | Modération uniquement : remettre en ligne · 🆕 propriétaire : corriger et demander un réexamen (DEC-09, RG-03-29) |
| Rejetée | REJETEE | faux | conservé | ❌ | ❌ | Modération uniquement (ECART-17) · 🆕 aucune : rejet définitif (DEC-10, RG-09-32) |
| Supprimée | DESACTIVEE | faux | effacé | ❌ (invisible aussi pour le propriétaire) | ❌ | Modération uniquement |
| *(superposé)* Compte masqué | inchangé | inchangé | inchangé | ❌ | ❌ | Administrateur : lever le masquage |

### 9.2 Compte utilisateur

Diagramme : [module 01 §8](01-authentification-comptes.md).

| État | Connexion | Annonces | Sortie possible, et par qui |
|---|---|---|---|
| EN_ATTENTE_ACTIVATION | ❌ (sauf agent avec mot de passe temporaire) | — | Utilisateur : lien d'activation (48 h) · Agent : changement du mot de passe |
| ACTIF | ✅ | selon les règles | Utilisateur : demande de suppression · Modération : suspension, désactivation · Système : 3e avertissement · Admin : suppression |
| SUSPENDU | ❌ (jetons refusés dès la requête suivante) | **restent visibles du public** (ECART-52) | Modération : levée · Entreprise : levée de ses propres suspensions d'agent |
| INACTIF, suppression demandée | ❌ (réactivation proposée) | passées hors ligne | Utilisateur : réactivation sous 30 j · Système : anonymisation après 30 j |
| INACTIF, désactivé par la modération | ❌ | **restent visibles du public** (ECART-52) | Modération uniquement |
| INACTIF, agent retiré par son entreprise | ❌ | annonces en ligne transférées au professionnel, les autres restent rattachées à l'agent (ECART-16) | Modération uniquement |
| INACTIF anonymisé | ❌ | conservées hors ligne, photos non supprimées (ECART-15) | Aucune (définitif) |
| *(superposé)* Annonces masquées par l'admin | ✅ | invisibles du public, publication et modification bloquées | Administrateur |
| *(superposé)* Publication bloquée par la licence | ✅ | publication et modification bloquées | Utilisateur : activer une clé |

### 9.3 Pièce d'identité, signalement, entreprise

| Objet | Cycle | Détail |
|---|---|---|
| Pièce d'identité (🆕 dossier pièce + selfie) | (aucune) → EN_ATTENTE → VALIDEE (figée) ou REJETEE (motif) → nouvel envoi. 🆕 Validation impossible sans selfie ; une pièce validée avant la mise en service reste valide | [module 02 §8](02-profil-utilisateur-rgpd.md) |
| Signalement d'annonce | EN_ATTENTE → TRAITE ou IGNORE (une fois) ; retrait possible par le signaleur ; un nouveau signalement le rouvre | [module 09 §8](09-moderation-signalements.md) |
| Signalement de message | non signalé → signalé (une fois) → message supprimé par la modération ou laissé | [module 06](06-messagerie.md), ECART-29 |
| Entreprise | active → désactivée (par le professionnel, par l'admin ou par la suppression du compte) → réactivée par l'admin uniquement · 🆕 vérification (DEC-04) : NON_VERIFIEE → EN_ATTENTE → VERIFIEE ou REJETEE (RG-07-23) | [module 07](07-espace-professionnel.md), ECART-14 |

## 10. Exigences non fonctionnelles

La colonne « Constaté » décrit le code. La colonne « Cible proposée » est à arbitrer.

| Domaine | Constaté | Cible proposée |
|---|---|---|
| Sécurité | Mots de passe BCrypt (coût 12). JWT signé (secret ≥ 32 octets). Jetons révoqués au changement de mot de passe (`password_changed_at`). Pièces d'identité stockées hors zone publique et servies seulement au titulaire et à la modération. Protection contre le parcours de répertoire. Messages anti-énumération. TLS 1.2 / 1.3, HSTS, `X-Frame-Options DENY`, `nosniff`. CORS limité aux origines configurées (`APP_CORS_ALLOWED_ORIGINS`). Jetons conservés dans le stockage sécurisé sur Android, mais dans le `localStorage` sur le web (ECART-54). Suspension et désactivation effectives dès la requête suivante (module 01, RG-01-28). | Chiffrement des pièces d'identité stockées sur disque et dans les sauvegardes. Journal d'audit des actions de modération et d'administration (qui, quoi, quand) consultable par l'admin (ECART-63 ; état actuel : module 09 §4.7). Politique de sécurité du contenu (CSP) sur le site. |
| Anti-abus | Limitation par IP : 10 requêtes/min (connexion, inscription, déconnexion) et 5 requêtes/15 min (mot de passe oublié, réinitialisation, rafraîchissement, réactivation, renvoi d'activation, activation). Verrouillage d'un identifiant pendant 15 min après 5 échecs. 3 renvois d'activation par adresse et par fenêtre. | Limiter aussi la création d'annonces, l'envoi de messages et les signalements par compte. |
| Performance | Pagination plafonnée à 50 éléments (100 pour les localisations). Images ≤ 10 Mo par fichier, ≤ 100 Mo par requête, ≤ 50 mégapixels, réencodées en 1920 px de large, **sans miniature** (ECART-55). | API : 95 % des lectures en < 500 ms et des publications en < 3 s (hors envoi des photos). Première page du catalogue affichée en < 3 s sur une connexion 3G. |
| Réseau et données mobiles | Aucune exigence formalisée. | Vignettes du catalogue ≤ 100 Ko. Envoi des photos qui reprend après une coupure, ou réessai simple. Messages d'erreur clairs en cas de réseau absent. Taille de l'APK suivie (cible < 50 Mo). |
| Volumétrie | Non documentée. | À fixer sur la première année (ordre de grandeur proposé : 50 000 comptes, 20 000 annonces en ligne, 200 000 photos), pour dimensionner disque et sauvegardes. |
| Disponibilité | Instance unique. L'état en mémoire est perdu au redémarrage. | Disponibilité mensuelle ≥ 99 %. Page de maintenance servie par nginx pendant les déploiements. |
| Sauvegarde et reprise | Base et fichiers chaque jour à 02:00, conservation 14 jours, sur le même serveur. | **Perte de données maximale acceptable : 24 h** (déjà le cas). **Remise en service : < 8 h**. Copie quotidienne hors serveur. Test de restauration chaque trimestre. |
| Supervision | Actuator présent, aucune alerte. | Alertes sur l'arrêt de l'API, le disque plein (> 80 %), l'échec de la sauvegarde et les échecs SMTP. Journaux conservés 90 jours. |
| RGPD et données personnelles | Export JSON des données. Suppression avec 30 jours de grâce puis anonymisation. Suppression immédiate par un administrateur. Consentement aux CGU demandé dans l'app, mais non conservé côté serveur (ECART-41). | Voir §11. |
| Accessibilité / UX | Libellés d'accessibilité, cibles tactiles ≥ 44 px, retour haptique, mode web responsive (barre du haut sur ordinateur, onglets sur mobile). | Viser le niveau AA des WCAG 2.1 pour le site web. Contraste et taille de texte réglable sur Android. |
| Plateformes | Android (APK hors Play Store) et web. **Pas d'application iOS publiée.** Version Android minimale non fixée explicitement (valeur par défaut d'Expo). | Android minimal à fixer et à documenter. Navigateurs : 2 dernières versions de Chrome, Firefox, Safari et Edge, et Chrome Android. |
| Compatibilité app / API | Aucune gestion de version. | L'API renvoie une version d'app minimale ; l'app invite à télécharger le nouvel APK si elle est trop ancienne. |
| Langue / devise | Français uniquement, GNF, dates au format `jj/mm/aaaa`. | Montants avec séparateur de milliers (`1 500 000 GNF`), téléphones affichés au format `+224 …`. |

> 🆕 **Cibles retenues (DEC-32)** : la colonne « Cible proposée » ci-dessus est adoptée telle quelle pour la performance, la disponibilité, la sauvegarde et la reprise, la supervision et la compatibilité. Les autres lignes restent des propositions.

## 11. Données personnelles : cadre légal et conservation

### 11.1 Cadre légal

Les documents parlent de « RGPD », mais le service vise la Guinée. Le cadre applicable est à confirmer par un juriste :

- **Droit guinéen** : loi L/2016/037/AN relative à la cybersécurité et à la protection des données à caractère personnel *(référence à confirmer)*, et éventuelles formalités auprès de l'autorité compétente pour le traitement de pièces d'identité.
- **RGPD européen** : seulement s'il s'applique (utilisateurs de la diaspora installés dans l'Union européenne et ciblés par le service). Les mécanismes actuels (export, effacement, délai de grâce) en suivent déjà l'esprit.
- **Documents à produire** : politique de confidentialité (absente, ECART-06), registre des traitements, preuve du consentement aux CGU (ECART-41).

> 🆕 **Retenu (DEC-19)** : le droit guinéen comme base, et le standard RGPD pour couvrir les utilisateurs installés en Europe. Choix à faire valider par un juriste, qui validera aussi les durées du §11.2 (DEC-26).

### 11.2 Durées de conservation *(proposées)*

| Donnée | Aujourd'hui | 🆕 Durée cible (DEC-26, sous réserve du juriste) |
|---|---|---|
| Compte actif | Tant que le compte existe | Inchangé |
| Compte inactif sans connexion | Sans limite | Relance après 2 ans sans connexion, anonymisation 3 mois plus tard |
| Pièce d'identité (fichier) | Conservée tant que le compte existe ; supprimée à l'anonymisation | **Fichier supprimé 30 jours après la validation**, en ne gardant que le type, le numéro, le statut et la date de décision. Pièce rejetée : supprimée 30 jours après le rejet. |
| 🆕 Selfie de vérification (EVO-01) | — (fonction à développer) | Même durée que le fichier de la pièce : supprimé 30 jours après la décision, ainsi qu'à l'anonymisation et à la suppression par un administrateur (RG-02-35) |
| Photos d'une annonce supprimée, clôturée ou d'un compte anonymisé | Conservées (ECART-15) | Supprimées 12 mois après la clôture ou la suppression |
| Messages | Conservés sans limite, y compris après l'anonymisation d'un participant | 2 ans après le dernier message de la conversation. Messages signalés : durée du traitement + 1 an |
| Signalements, avertissements, notes internes | Sans limite | 3 ans après la décision |
| Historique des annonces | Sans limite | Durée de vie de l'annonce + 1 an |
| Journaux techniques (adresses IP) | Non définis | 90 jours |
| Sauvegardes | 14 jours | 14 jours sur le serveur, 30 jours hors serveur. Une donnée effacée disparaît des sauvegardes à l'expiration de celles-ci. |

## 12. Tâches planifiées

| Heure | Tâche | Effet |
|---|---|---|
| 02:00 tous les jours | `scripts/backup.sh` (cron du serveur, hors application) | Sauvegarde de la base et des fichiers, purge des sauvegardes de plus de 14 jours |
| 03:00 tous les jours | `AnnonceExpirationService.traiterExpirations` | Relance par email 7 jours avant l'échéance, puis clôture (motif EXPIREE) des annonces échues |
| 03:30 tous les jours | `CompteSuppressionService.anonymiserComptesExpires` | Anonymise les comptes dont la suppression a été demandée il y a plus de 30 jours |
| 🆕 03:15 tous les jours (DEC-06) | Purge des comptes non activés | Relance à J+5 (E19), puis suppression des comptes jamais activés depuis plus de 7 jours (module 01, RG-01-47) |
| 🆕 04:00 tous les jours (DEC-26) | Purges de conservation | Suppression des fichiers et données arrivés au terme de leur durée de conservation (§11.2) : fichiers d'identité, photos d'annonces retirées, conversations, journaux |
| Toutes les 10 min | Purges techniques | Révocations expirées, tentatives de connexion, compteurs de débit, vues dédupliquées |

## 13. Paramètres de la plateforme

| Paramètre | Source | Défaut | Modifiable |
|---|---|---|---|
| Durée de validité d'une annonce | `ANNONCE_DUREE_VALIDITE_JOURS` | 180 jours | Configuration serveur |
| Relance avant expiration | `ANNONCE_RELANCE_JOURS_AVANT` | 7 jours | Configuration serveur |
| Annonces gratuites (mode licence) | `LICENCE_ANNONCES_GRATUITES` | 5 | Configuration serveur |
| Mode licence | `licence.mode-actif` | désactivé | Admin (app) |
| Tarifs et contact de vente des licences | `licence.prix-*`, `licence.contact-telephone` | non renseignés | Admin (app) |
| Quota global d'agents par entreprise | `quota.agents.defaut` | 5 | Admin (app) |
| Quota global d'annonces actives par entreprise | `quota.annonces.defaut` | 50 | Admin (app) |
| 🆕 Seuil de masquage automatique (DEC-11) | `moderation.seuil-masquage-auto` | 3 signalements « arnaque / fraude » | Admin (app) |
| Délai de grâce de suppression du compte | constante `User.DELAI_GRACE_SUPPRESSION_JOURS` | 30 jours | Code |
| Durée de validité du lien d'activation | constante | 48 h | Code |
| Durée de validité du code de réinitialisation | constante | 15 min (8 chiffres) | Code |
| Photos par annonce | constante | 1 à 10 | Code |
| Origines autorisées (CORS) | `APP_CORS_ALLOWED_ORIGINS` | origines locales de développement | Configuration serveur |
| Conservation des sauvegardes | `RETENTION_JOURS` (script) | 14 jours | Serveur |

## 14. Glossaire

| Terme | Définition |
|---|---|
| Agent | Compte AGENT_PROFESSIONNEL créé par un professionnel et rattaché à son entreprise ; il publie au nom de l'entreprise et consomme son quota |
| 🆕 Agence vérifiée | Entreprise dont le justificatif RCCM a été contrôlé par la modération ; seule à porter le badge « Agence vérifiée » (DEC-04, module 07 §4.5) |
| Annonce visible | Annonce répondant à la règle du §8 |
| Clôture | Retrait volontaire (vendu, loué, retiré) ou automatique (expirée) d'une annonce, réversible par le propriétaire |
| Entreprise active | Entreprise dont le drapeau `active` est vrai ; condition pour que le professionnel et ses agents publient |
| Identifiant public (`publicId`) | Identifiant aléatoire de 12 caractères hexadécimaux utilisé dans les liens partagés, à la place de l'identifiant interne |
| Licence | Droit annuel acquis par une clé `ANX-XXXX-XXXX-XXXX`, exigé au-delà des annonces gratuites quand le mode licence est actif |
| Masquage (annonce) | Retrait temporaire, soit par le propriétaire (réversible par lui), soit par la modération avec un motif communiqué (réversible par la modération) |
| Masquage système d'un compte | Drapeau posé par l'administrateur : toutes les annonces du compte disparaissent du public sans être modifiées, publication et modification sont suspendues |
| Pièce validée | Pièce d'identité au statut VALIDEE ; condition pour publier, et qui fige le nom, le prénom et le numéro de pièce. 🆕 Avec EVO-01, désigne un dossier de vérification validé (pièce + selfie) |
| 🆕 Selfie de vérification | Photo prise en direct du titulaire tenant sa pièce d'identité à côté de son visage, comparée par la modération à la photo de la pièce (EVO-01, module 02 §4.6) |
| Publication bloquée (licence) | Compte qui dépasse les annonces gratuites sans licence valide : il ne peut plus publier ni modifier |
| Quartier | Niveau le plus fin du référentiel de localisation (Région > Préfecture > Commune > Quartier) ; obligatoire pour chaque annonce |
| Quota | Nombre maximal d'agents ou d'annonces actives d'une entreprise |
| RCCM | Registre du Commerce et du Crédit Mobilier (identifiant légal d'une entreprise) |
| Référence d'annonce | Code lisible `VE/LO/BA-MMjj-XXXX` affiché à l'annonceur et utilisable dans la recherche de l'administration |
| Rejet | Retrait par la modération pour infraction, avec un motif communiqué. Réversible par la modération uniquement |
| Suppression (annonce) | Désactivation par le propriétaire : statut DESACTIVEE, invisible pour lui, restaurable uniquement par la modération |
| Zone active | Commune qui compte le plus d'annonces visibles, proposée comme raccourci de recherche sur l'accueil (module 04, RG-04-07) |

## 15. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-29 ; Q2 → DEC-25 ; Q3 → DEC-19 et DEC-26 ; Q4 → DEC-30 et DEC-31 ; Q5 → DEC-20 ; Q6 → DEC-32 ; Q7 → DEC-07.

Les arbitrages métier attendus sont tenus à jour dans [99 §7](99-ecarts-incoherences.md). S'y ajoutent les questions soulevées par ce document :

1. Les indicateurs du §1.2 et leurs cibles sont-ils les bons ? Faut-il intégrer un outil de mesure d'audience ?
2. Quel **délai maximal de validation** d'une pièce d'identité s'engage-t-on à tenir (étape bloquante du parcours P1) ?
3. Quel cadre légal s'applique (§11.1) ? Les durées de conservation du §11.2 sont-elles acceptées ?
4. Quel fournisseur de **tuiles de carte** et quel fournisseur **SMTP** retenir pour la production ?
5. Comment les utilisateurs de l'APK sont-ils **prévenus des mises à jour** (§4.2) ? Une publication sur le Play Store est-elle envisagée ?
6. Les cibles de performance, de disponibilité et de reprise du §10 sont-elles acceptées ?
7. Faut-il demander le selfie aux comptes déjà validés avant la mise en service d'EVO-01 (module 02 §11) ?

## 16. Évolutions spécifiées

Fonctions décidées mais **pas encore développées**. Dans les modules, leurs règles sont repérées par 🆕.

| ID | Évolution | Spécification | Modules touchés | Statut |
|---|---|---|---|---|
| EVO-01 | Selfie de vérification obligatoire, pris en direct avec la pièce tenue à côté du visage, en complément de la photo de la pièce d'identité | [module 02 §4.6](02-profil-utilisateur-rgpd.md) (RG-02-23 à RG-02-37, CA-02-06 à CA-02-13) | 00, 02, 03 (RG-03-01), 07 (US-07-08), 10 (file et fiche), 11 (E4, E5), 12 (RG-12-12) | À développer |

## 17. Décisions arrêtées

Arbitrages rendus par le responsable produit le **17/10/2026**. Ils fixent le comportement cible : les règles des modules décrivent encore le code actuel, et chaque décision sera reportée dans les règles concernées lors de sa spécification détaillée. Les écarts du document 99 restent ouverts tant que le code n'est pas corrigé. Règles cibles déjà rédigées dans les modules (marquées 🆕) : toutes, de DEC-01 à DEC-32.

| ID | Décision | Écarts, questions | Modules | Conséquences à prévoir |
|---|---|---|---|---|
| DEC-01 | Une suspension ou une désactivation par la modération **masque automatiquement** toutes les annonces du compte ; la levée les réaffiche. | ECART-52 · 99 §7 Q11 | 01, 03, 04, 09 | Ajouter « compte ACTIF » à la règle de visibilité (§8) ou poser le masquage système ; revoir le tableau 03 §4.6 et le comparatif 09 §4.6. |
| DEC-02 | La modération ne lit que les conversations qui contiennent un **message signalé**, et chaque lecture est **journalisée** ; la politique de confidentialité le mentionne. | ECART-60 | 06, 09 | Contrôle d'accès sur `GET /api/admin/conversations/{id}/messages` ; s'appuie sur le journal d'audit (ECART-63). |
| DEC-03 | **Double authentification par code email** pour les administrateurs et modérateurs. | ECART-64 | 01, 10 | Dépend d'un envoi d'email fiable (file avec nouvel essai, module 11 §7 Q4). |
| DEC-04 | **Vérification des entreprises** (justificatif RCCM contrôlé par la modération) ; badge « Agence vérifiée » réservé aux entreprises vérifiées ; RCCM figé après vérification. | ECART-61 | 07, 10 | Nouvelle file de modération, sur le modèle du dossier d'identité (module 02). |
| DEC-05 | Téléphone **obligatoire et vérifié par code** (SMS ou WhatsApp) à l'inscription. | ECART-36, ECART-53 · 99 §7 Q6, Q12 | 01, 02 | Nouveau fournisseur d'envoi de SMS ou WhatsApp (§4.1) ; parcours pour les comptes existants à définir. |
| DEC-06 | Un compte jamais activé est **supprimé après 7 jours**. | ECART-53 · 99 §7 Q12 | 01 | Nouvelle tâche planifiée (§12). |
| DEC-07 | Selfie (EVO-01) : les comptes **déjà validés restent valides**, sans blocage rétroactif. | EVO-01 · §15 Q7 | 02 | Conforme à RG-02-33. |
| DEC-08 | **Chaque agent** fait vérifier sa propre identité (pièce + selfie). | ECART-28 · 99 §7 Q5 | 02, 07 | Conforme à RG-02-10 et RG-02-23. |
| DEC-09 | Le propriétaire peut **corriger** une annonce masquée par la modération et **demander un réexamen** ; elle revient alors dans la file. | ECART-03 · 99 §7 Q2 | 03, 09 | Nouvel indicateur « réexamen demandé » ; l'annonce reste invisible jusqu'à la décision. |
| DEC-10 | Le **rejet est définitif** : une annonce rejetée ne peut plus être remise en ligne. | ECART-17 · 99 §7 Q2 | 03, 09 | Interdire `publier` sur REJETEE ; le masquage reste l'outil des cas corrigeables. |
| DEC-11 | Pas de modération préalable ; **masquage automatique** d'une annonce dès **3 signalements « arnaque / fraude »** de signaleurs distincts, en attente de décision. | ECART-35 · 99 §7 Q7 | 03, 09 | Masquage avec un motif système ; email au propriétaire ; priorité en tête de la file (ECART-26). |
| DEC-12 | La **désactivation d'une entreprise masque ses annonces et bloque ses agents** ; tout revient à la réactivation (toujours réservée à l'admin). | ECART-14 · 99 §7 Q3 | 07, 10 | Corrige aussi le texte de confirmation de l'administration (RG-10-11). |
| DEC-13 | Nouveaux messages signalés par **notification push**. | ECART-23 | 06, 11 | `expo-notifications`, enregistrement des appareils, service d'envoi ; rien sur le site web dans un premier temps. |
| DEC-14 | Le téléphone de l'annonceur n'est visible qu'**après connexion** (appel et WhatsApp conservés). | ECART-31 · 99 §7 Q6 | 03, 06, 12 | Masquer le numéro dans les réponses publiques de l'API et sur les pages de partage. |
| DEC-15 | **Favoris ouverts à tous** les rôles connectés. | ECART-34 · 99 §7 Q9 | 04 | Afficher l'onglet Favoris pour les pros et les agents. |
| DEC-16 | **Alertes de recherche**, à construire **après** la mise en place des notifications (DEC-13). | 04 §9 Q1 | 04, 11 | Recherches enregistrées, tâche d'envoi. |
| DEC-17 | Licences : **clé nominative** et **trace de chaque vente** (acheteur, montant, moyen et référence de paiement, administrateur), activable seulement par l'acheteur, **reçu par email**. | ECART-62 | 08 | Nouvelles colonnes de `licence`, écran de génération enrichi. |
| DEC-18 | Activation du mode licence : **préavis de 30 jours** avec email aux comptes au-delà des annonces gratuites. | 08 §10 Q2 | 08, 11 | Date d'effet distincte de la date d'activation. |
| DEC-19 | Cadre des données personnelles : **droit guinéen + standard RGPD**, à faire valider par un juriste. | ECART-06 · §15 Q3 | 00, 02, 12 | Base de la politique de confidentialité ; les durées de conservation (§11.2) restent à valider. |
| DEC-20 | **Publication sur le Play Store**. | §15 Q5 · 12 §6 Q2 | 00, 12 | Suppose la politique de confidentialité publiée (ECART-06) et la déclaration des données sensibles (pièces, selfies, position). |
| DEC-21 | **Profil public minimal** d'un particulier : prénom, initiale du nom, « membre depuis », identité vérifiée, annonces en ligne ; ni téléphone ni email. | ECART-02 · 99 §7 Q1 | 02, 04 | Nouvel endpoint public dédié (l'écran appelle aujourd'hui un endpoint réservé à la modération). |
| DEC-22 | Quartier manquant : **demande d'ajout** saisie par l'annonceur ; annonce **publiée sur la commune**, puis rattachée au quartier une fois ajouté. | ECART-58 | 03, 05, 10 | Rattachement possible à une commune sans quartier ; file de demandes dans l'administration. |
| DEC-23 | Locations : **loyer mensuel + caution / avance** (nombre de mois). | ECART-42 · 99 §7 Q8 | 03, 04, 12 | Nouveaux champs d'annonce, affichage sur la fiche et les pages de partage. |
| DEC-24 | Référencement : **bases d'abord** (`sitemap.xml`, `robots.txt`, aperçu des pages d'agence) ; pages par commune et rendu serveur plus tard. | ECART-65 | 12 | Endpoint `sitemap.xml` généré par l'API. |
| DEC-25 | Vérification d'identité (pièce + selfie) traitée en **72 h au plus** pour 90 % des dossiers. | §15 Q2 | 00, 02, 10 | Remplace la cible de 48 h du §1.2 ; suppose la date d'envoi et de décision (RG-02-31). |
| DEC-26 | Les **durées de conservation du §11.2** deviennent la cible, sous réserve de validation par le juriste (DEC-19). | §15 Q3 | 00, 02, 03, 06 | Tâches de purge à créer (fichiers d'identité, photos, messages, journaux). |
| DEC-27 | Le professionnel a **tous les droits** sur les annonces de ses agents : modifier, clôturer, supprimer, voir l'historique. | ECART-13 · 99 §7 Q4 | 03, 07 | Étend RG-07-21 et le tableau des droits du module 03 §2. |
| DEC-28 | Une clé de licence **peut être activée quand le mode est inactif** ; son année de validité ne démarre qu'à l'activation du mode. | ECART-25 · 99 §7 Q10 | 08 | Licence « en attente de démarrage » ; dates calculées à l'ouverture du mode. |
| DEC-29 | Mesure d'audience par un **outil sans cookies** (Plausible ou Matomo auto-hébergé) ; les indicateurs métier sont calculés depuis la base. | §15 Q1 | 00, 04, 12 | Pas de bandeau de consentement ; mentionner l'outil dans la politique de confidentialité. |
| DEC-30 | Tuiles de carte servies par un **fournisseur de tuiles OpenStreetMap** (MapTiler, Stadia ou équivalent). | §15 Q4 | 00, 05 | Clé d'API à configurer ; Leaflet conservé ; attribution à afficher. |
| DEC-31 | Emails envoyés par un **service transactionnel** (Brevo, Mailjet ou Amazon SES), avec SPF, DKIM et DMARC. | §15 Q4 | 00, 11 | Suivi des échecs ; base de la file d'envoi avec nouvel essai. |
| DEC-32 | Les **cibles d'exploitation du §10** sont retenues (lectures < 500 ms, disponibilité ≥ 99 %, perte maximale 24 h, remise en service < 8 h, copie de sauvegarde hors serveur). | §15 Q6 | 00 | Copie hors serveur et test de restauration à mettre en place. |

**Restent ouvertes** : les questions secondaires de chaque module qui ne renvoient pas à une décision ci-dessus. Toutes les questions du §15 et du 99 §7 sont tranchées.
