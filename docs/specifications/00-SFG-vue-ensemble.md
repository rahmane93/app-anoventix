# AnoventiX — Spécifications fonctionnelles générales (SFG)

| | |
|---|---|
| **Version** | 1.0 (rétro-ingénierie du code source) |
| **Date** | 16/10/2026 |
| **Périmètre** | API `anoventix-api` (Spring Boot 3 / Java 21 / PostgreSQL 17) et application `anoventix-app` (Expo / React Native : Android + site web) |
| **Méthode** | Spécifications reconstituées à partir du code, des migrations Flyway, de la configuration et des documents existants (`README.md`, `anoventix-app/docs/TESTS_FONCTIONNELS.md`). Les écarts relevés sont consolidés dans [99-ecarts-incoherences.md](99-ecarts-incoherences.md). |

> **Conventions de référence.** `API/` désigne `anoventix-api/src/main/java/com/app/AnnoncesAPI/` et `APP/` désigne `anoventix-app/`. Les identifiants suivent le schéma `US-<module>-nn` (user story), `RG-<module>-nn` (règle de gestion), `CA-<module>-nn` (critère d'acceptation) et `ECART-nn` (écart, voir le document 99).

---

## 1. Contexte et objectifs

AnoventiX est une **place de marché immobilière dédiée à la Guinée**. Elle met en relation des annonceurs (particuliers, agences immobilières et leurs agents) avec des personnes qui cherchent un bien à **acheter, louer ou prendre à bail**. Les prix sont exprimés en **francs guinéens (GNF)** et toute l'interface est en français.

Objectifs métier identifiés dans le code :

1. **Publier** rapidement une annonce illustrée (assistant en 5 étapes, 1 à 10 photos, localisation jusqu'au quartier).
2. **Trouver** un bien : catalogue public, recherche plein texte, filtres multicritères, recherche autour de soi, annonces similaires.
3. **Mettre en relation** : messagerie interne, appel et WhatsApp.
4. **Garantir la confiance** : vérification de la pièce d'identité avant toute publication, signalements, modération, avertissements gradués, suspension.
5. **Structurer l'offre professionnelle** : entreprise, agents, quotas, tableau de bord.
6. **Monétiser** (optionnel, activable par l'administrateur) : licence annuelle au-delà d'un nombre d'annonces gratuites.
7. **Respecter la vie privée** : export des données, suppression du compte avec délai de grâce de 30 jours, anonymisation.

## 2. Acteurs et rôles

| Acteur | Rôle technique | Origine du compte | Description |
|---|---|---|---|
| Visiteur | *(non connecté)* | — | Consulte le catalogue, les fiches, les profils publics d'entreprise et les pages de partage. |
| Particulier | `PARTICULIER` | Inscription libre | Publie ses propres annonces, gère ses favoris, contacte les annonceurs, signale du contenu. |
| Professionnel | `PROFESSIONNEL` | Inscription libre | Propriétaire d'une agence : crée **une** entreprise, invite des agents, publie, consulte un tableau de bord d'équipe. |
| Agent professionnel | `AGENT_PROFESSIONNEL` | Créé par un professionnel | Publie au nom de l'entreprise. Mot de passe temporaire à changer à la première connexion. |
| Modérateur | `MODERATEUR` | Attribué par un administrateur | Modère les annonces, les signalements, les messages et les pièces d'identité, et émet des avertissements. |
| Administrateur | `ADMINISTRATEUR` | Créé au premier démarrage (variables `ADMIN_*`) | Toutes les capacités du modérateur, plus : rôles, suppression de comptes, masquage des comptes, licences, quotas, localisations, entreprises. |
| Système | — | — | Tâches planifiées : expiration des annonces (03:00), anonymisation RGPD (03:30), purges techniques toutes les 10 min. |

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
| 99 | Écarts et incohérences | [99-ecarts-incoherences.md](99-ecarts-incoherences.md) | Éléments manquants, incohérences, priorisation, matrice de traçabilité |

## 4. Architecture fonctionnelle

```
 Visiteurs / utilisateurs
   │  App Android (APK)      Site web www.anoventix.com (export statique Expo)
   └──────────────┬──────────────────────┘
                  ▼  HTTPS
            nginx (anoventix.com)
     /api/**  → API REST Spring Boot (JWT)
     /uploads/public/** → photos (public)       /uploads/private/** → interdit
     /annonce/<slug>-<publicId> (www) → /share/annonce/* (page + balises Open Graph)
     /cgu, /confidentialite → pages légales statiques
     /downloads/anoventix.apk
                  ▼
           PostgreSQL 17 (schéma piloté par Hibernate en dev, Flyway V1→V13 + validation en prod)
           Emails SMTP (asynchrones, sans file de relance)
```

- **Authentification** : JWT sans état. Jeton d'accès de 15 min et jeton de rafraîchissement de 7 jours. Liste de révocation, limitation de débit, verrouillage des comptes, présence et compteur de vues sont **gardés en mémoire** (perdus au redémarrage, non distribués).
- **Échanges temps réel** : aucun. La messagerie fonctionne par interrogation périodique (toutes les 5 s dans une conversation ouverte). Aucune notification push.

## 5. Matrice rôles × fonctionnalités

Légende : ✅ autorisé · ⚠️ autorisé sous condition · ❌ interdit · *(UI)* = masqué dans l'application alors que l'API l'autorise.

| Fonctionnalité | Visiteur | Particulier | Professionnel | Agent | Modérateur | Admin |
|---|---|---|---|---|---|---|
| Consulter le catalogue, les fiches publiques, les similaires, la carte | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contacter un annonceur (message, appel, WhatsApp) | ❌ (connexion demandée) | ✅ | ✅ | ✅ | ❌ *(UI)* | ❌ *(UI)* |
| Favoris | ❌ | ✅ | ❌ *(UI)* | ❌ *(UI)* | ❌ *(UI)* | ❌ *(UI)* |
| Signaler une annonce ou un message | ❌ | ✅ | ✅ | ✅ | ❌ *(UI)* | ❌ *(UI)* |
| Publier une annonce | ❌ | ⚠️ pièce validée | ⚠️ pièce validée + entreprise active + quota | ⚠️ pièce validée + entreprise active + quota | ⚠️ *(API seulement)* | ⚠️ *(API seulement)* |
| Modifier / supprimer ses annonces | — | ✅ | ✅ | ✅ | ✅ toutes | ✅ toutes |
| Masquer / réafficher une annonce d'agent | — | — | ✅ | — | ✅ | ✅ |
| Créer et gérer l'entreprise et les agents | — | — | ✅ | ❌ | ⚠️ suspendre / réactiver un agent | ✅ désactiver / réactiver |
| Tableau de bord pro | — | — | ✅ (avec équipe) | ✅ (sans équipe) | — | — |
| Licence (consulter / activer) | — | ✅ | ✅ | consulter (licence du pro) | — | — |
| Modérer annonces, signalements, messages, pièces | — | — | — | — | ✅ | ✅ |
| Avertir / changer le statut d'un compte | — | — | — | — | ⚠️ pas un autre modérateur ni un admin | ⚠️ pas un autre admin |
| Rôles, suppression de compte, masquage d'un compte | — | — | — | — | ❌ | ✅ |
| Licences (clés, mode, tarifs), quotas (écriture), localisations (écriture) | — | — | — | — | ❌ (quotas en lecture) | ✅ |
| Export / suppression de son propre compte | — | ✅ | ✅ | ✅ | ❌ suppression | ❌ suppression |

## 6. Modèle de données métier

```
Role(1) ──< User >── Entreprise (1 propriétaire PRO, n agents)
                │  └── parentUser (PRO créateur d'un agent)
                ├──< Annonce(BienImmo) >── Localisation
                │        ├──< Media (1..10)
                │        ├──< HistoriqueAnnonce
                │        ├──< Signalement >── User(reporter)
                │        └──< Conversation (annonce, participantOne, participantTwo) ──< Message
                ├── favoris  (account_favoris, n–n avec Annonce)
                ├──< Avertissement
                └──< Licence (clé annuelle)
ParametrePlateforme (clé / valeur : mode licence, tarifs, quotas globaux)
```

| Entité | Table | Rôle | Points clés |
|---|---|---|---|
| `User` | `account` | Compte | Email unique (≤ 50), téléphone unique au format international, un rôle, statut, pièce d'identité, indicateurs RGPD et masquage |
| `Role` | `roles` | Référentiel des 5 rôles | Créé au démarrage (`DataLoader`) |
| `Entreprise` | `entreprises` | Agence | Nom, description, RCCM unique, téléphone unique, email, photo, quotas propres facultatifs, `active` |
| `Annonce` / `BienImmo` | `annonce` / `bien_immo` (héritage JOINED) | Annonce immobilière | `publicId` (12 caractères hexadécimaux), référence `VE/LO/BA-MMjj-XXXX`, prix, type d'annonce, type de bien, usage, composition, localisation, GPS, statut de modération, `actif`, clôture, expiration, vues |
| `Media` | `medias` | Photo d'annonce | URL, type MIME, ordre (non exploité) |
| `HistoriqueAnnonce` | `historique_annonce` | Traçabilité | Un enregistrement par champ modifié (titre, prix, description, statut, motif) |
| `Signalement` | `signalements` | Signalement d'annonce | Un seul par couple (annonce, signaleur), retrait possible, statut |
| `Conversation` / `Message` | `conversation` / `message` | Messagerie | Unique par (annonce, participants), messages ≤ 4000 caractères, lecture, signalement, suppression par la modération |
| `Avertissement` | `avertissements` | Sanction graduée | Niveau calculé selon le rang (LÉGER, MODÉRÉ, GRAVE) |
| `Licence` | `licence` | Clé annuelle | Type PARTICULIER / PROFESSIONNEL, titulaire, dates de début et de fin |
| `Localisation` | `localisation` | Référentiel géographique | Région, préfecture, commune, quartier, type de commune (urbaine / rurale) ; environ 745 quartiers fournis |
| `ParametrePlateforme` | `parametre_plateforme` | Réglages | `licence.mode-actif`, `licence.prix-*`, `licence.contact-telephone`, `quota.agents.defaut`, `quota.annonces.defaut` |

### 6.1 Énumérations de référence

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

### 6.2 Compatibilités type d'annonce → type de bien → usage

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

## 7. Règle transverse de visibilité publique

Une annonce est **visible du public** si et seulement si :
`actif = true` **ET** `statutModeration = PUBLIEE` **ET** le compte propriétaire n'est pas masqué par l'administrateur (`annoncesMasquees = false`).
Source : `Annonce.estVisiblePubliquement()` (`API/entities/Annonce.java:189`). La règle est reprise dans toutes les requêtes publiques : catalogue, filtres, plein texte, proximité, zones actives, similaires, profil d'entreprise, favoris, pages de partage.

| Lecteur | Ce qu'il voit d'une annonce |
|---|---|
| Public | Annonces visibles publiquement uniquement |
| Propriétaire | Toutes ses annonces, **sauf celles qu'il a supprimées** (DESACTIVEE) |
| Modérateur / admin | Tout, y compris les annonces supprimées |

## 8. Exigences non fonctionnelles observées

| Domaine | Exigence constatée |
|---|---|
| Sécurité | Mots de passe BCrypt (coût 12). JWT signé (secret ≥ 32 octets). Jetons révoqués au changement de mot de passe (`password_changed_at`). Pièces d'identité stockées hors zone publique et servies seulement au titulaire et à la modération. Protection contre le parcours de répertoire. Messages anti-énumération (mot de passe oublié, renvoi d'activation, connexion). |
| Anti-abus | Limitation par IP : 10 requêtes/min (connexion, inscription, déconnexion) et 5 requêtes/15 min (mot de passe oublié, réinitialisation, rafraîchissement, réactivation, renvoi d'activation, activation). Verrouillage d'un identifiant pendant 15 min après 5 échecs. 3 renvois d'activation par adresse et par fenêtre. |
| Performance | Pagination plafonnée à 50 éléments (100 pour les localisations). Images ≤ 10 Mo par fichier, ≤ 100 Mo par requête, ≤ 50 mégapixels, recompressées. |
| Disponibilité | Instance unique. L'état en mémoire est perdu au redémarrage. Sauvegarde quotidienne de la base et des fichiers à 02:00 (`scripts/backup.sh`). |
| RGPD | Export JSON des données. Suppression avec 30 jours de grâce puis anonymisation. Suppression immédiate par un administrateur. Consentement aux CGU demandé dans l'app (non conservé côté serveur, voir ECART-41). |
| Accessibilité / UX | Libellés d'accessibilité, retour haptique, mode web responsive (barre du haut sur ordinateur, onglets sur mobile). |
| Plateformes | Android (APK hors Play Store) et web. **Pas d'application iOS publiée.** |
| Langue / devise | Français uniquement, GNF, dates au format `jj/mm/aaaa`. |

## 9. Tâches planifiées

| Heure | Tâche | Effet |
|---|---|---|
| 03:00 tous les jours | `AnnonceExpirationService.traiterExpirations` | Relance par email 7 jours avant l'échéance, puis clôture (motif EXPIREE) des annonces échues |
| 03:30 tous les jours | `CompteSuppressionService.anonymiserComptesExpires` | Anonymise les comptes dont la suppression a été demandée il y a plus de 30 jours |
| Toutes les 10 min | Purges techniques | Révocations expirées, tentatives de connexion, compteurs de débit, vues dédupliquées |

## 10. Paramètres de la plateforme

| Paramètre | Source | Défaut | Modifiable |
|---|---|---|---|
| Durée de validité d'une annonce | `ANNONCE_DUREE_VALIDITE_JOURS` | 180 jours | Configuration serveur |
| Relance avant expiration | `ANNONCE_RELANCE_JOURS_AVANT` | 7 jours | Configuration serveur |
| Annonces gratuites (mode licence) | `LICENCE_ANNONCES_GRATUITES` | 5 | Configuration serveur |
| Mode licence | `licence.mode-actif` | désactivé | Admin (app) |
| Tarifs et contact de vente des licences | `licence.prix-*`, `licence.contact-telephone` | non renseignés | Admin (app) |
| Quota global d'agents par entreprise | `quota.agents.defaut` | 5 | Admin (app) |
| Quota global d'annonces actives par entreprise | `quota.annonces.defaut` | 50 | Admin (app) |
| Délai de grâce de suppression du compte | constante `User.DELAI_GRACE_SUPPRESSION_JOURS` | 30 jours | Code |
| Durée de validité du lien d'activation | constante | 48 h | Code |
| Durée de validité du code de réinitialisation | constante | 15 min (8 chiffres) | Code |
| Photos par annonce | constante | 1 à 10 | Code |

## 11. Glossaire

| Terme | Définition |
|---|---|
| Annonce visible | Annonce répondant à la règle du §7 |
| Clôture | Retrait volontaire (vendu, loué, retiré) ou automatique (expirée) d'une annonce, réversible par le propriétaire |
| Masquage (annonce) | Retrait temporaire par la modération, avec un motif communiqué au propriétaire |
| Rejet | Retrait par la modération pour infraction, avec un motif communiqué. Réversible par la modération uniquement |
| Suppression (annonce) | Désactivation par le propriétaire : statut DESACTIVEE, invisible pour lui, restaurable uniquement par la modération |
| Masquage système d'un compte | Drapeau posé par l'administrateur : toutes les annonces du compte disparaissent du public sans être modifiées, publication et modification sont suspendues |
| Licence | Droit annuel acquis par une clé `ANX-XXXX-XXXX-XXXX`, exigé au-delà des annonces gratuites quand le mode licence est actif |
| Quota | Nombre maximal d'agents ou d'annonces actives d'une entreprise |
| RCCM | Registre du Commerce et du Crédit Mobilier (identifiant légal d'une entreprise) |
| Publication bloquée (licence) | Compte qui dépasse les annonces gratuites sans licence valide : il ne peut plus publier ni modifier |
