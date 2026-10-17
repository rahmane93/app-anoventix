# Module 12 — Partage, web, SEO et pages légales

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Rendre les annonces partageables (WhatsApp, Facebook, LinkedIn, X) avec un aperçu riche, offrir des URL stables et non devinables, servir le site web (export statique de l'app Expo) et l'APK Android, et publier les pages légales.

Hors périmètre (non implémenté) : application iOS, publication sur le Play Store, `robots.txt` et `sitemap.xml`, pages de référencement par commune ou par type de bien, rendu côté serveur du contenu des pages, aperçu enrichi des pages d'agence, page de mentions légales, FAQ et formulaire de contact.

## 2. User stories

| ID | User story |
|---|---|
| US-12-01 | En tant qu'annonceur ou visiteur, je partage le lien d'une annonce et l'aperçu montre la photo, le titre, le prix et le lieu. |
| US-12-02 | En tant que visiteur, un ancien lien `/annonce/30` m'emmène sur l'URL canonique de l'annonce. |
| US-12-03 | En tant que visiteur sur un navigateur Android, on me propose d'installer l'application. |
| US-12-04 | En tant qu'utilisateur, je consulte les CGU et la politique de confidentialité. |

## 3. Règles de gestion

### 3.1 URL et pages de partage

| ID | Règle | Source |
|---|---|---|
| RG-12-01 | URL canonique d'une annonce : `https://www.anoventix.com/annonce/<slug-du-titre>-<publicId>`. Le `publicId` (12 caractères hexadécimaux aléatoires) remplace l'identifiant numérique pour éviter l'énumération des annonces. **Limite** : l'identifiant numérique reste utilisable, par la redirection des anciens liens (RG-12-02) et par l'API publique `GET /api/biens-immo/{id}` (module 03). On peut donc toujours parcourir les annonces visibles une à une ; les annonces non visibles, elles, ne sont pas révélées (404). | `SharePageService.java:122-124`, `V13__public_id_annonce.sql`, `src/lib/annonce-url.ts` |
| RG-12-02 | nginx envoie `/annonce/<segment>` à l'API (`/share/annonce/<segment>`). Un segment numérique (ancien lien) ou un slug obsolète (titre modifié) est **redirigé de façon permanente (301)** vers l'URL canonique. | `SharePageService.java:102-119`, `nginx/default.conf:59-71` |
| RG-12-03 | Pour une annonce **visible publiquement**, l'API sert la page de l'app enrichie : `<title>` « Titre \| AnoventiX », description, lien canonique, balises Open Graph (`og:type`, `og:site_name`, `og:locale fr_FR`, `og:url`, `og:title`, `og:description`, `og:image` = première photo) et Twitter (`summary_large_image` avec photo, `summary` sinon). | `SharePageService.java:126-155` |
| RG-12-04 | Description d'aperçu : « À vendre / À louer… · Type de bien · Prix GNF (/ mois si location ou bail, prix révisé prioritaire) · Surface m² · Quartier, Commune, Préfecture — début de la description », tronquée. | `SharePageService.java:158-185` |
| RG-12-05 | Annonce introuvable ou non visible : page générique servie avec le code **404** ; l'app, une fois chargée, affiche l'annonce à son propriétaire connecté s'il y a droit. | `ShareController.java:41-45` |
| RG-12-06 | La page est servie sans cache (`no-cache`) pour qu'un nouveau déploiement soit visible tout de suite ; le gabarit HTML est relu seulement quand la version déployée change. | `ShareController.java:40-44`, `SharePageService.java:201-220` |
| RG-12-07 | Le même HTML est servi à tous (pas de détection du robot) ; le navigateur charge ensuite l'app normalement. | `SharePageService.java:35-42` |
| RG-12-16 | Seules les **annonces** ont une page enrichie. Les pages d'agence (`/entreprise-publique/…`) et de profil sont servies avec le gabarit générique de l'app : leur partage affiche un aperçu générique, sans nom ni photo de l'agence. | `nginx/default.conf:75-77` |
| RG-12-17 | **Référencement** : pas de `robots.txt` ni de `sitemap.xml` ; le contenu des pages (liste, fiche, agence) est produit par JavaScript dans le navigateur, seuls le titre et la description des fiches d'annonce sont dans le HTML initial ; aucune page par commune ou par type de bien. Les moteurs de recherche découvrent donc mal le catalogue (ECART-65). | `nginx/default.conf`, `landing/` |
| RG-12-18 | Les annonces d'un compte suspendu restent partageables avec leur aperçu complet, comme elles restent visibles (ECART-52). | SFG §8 |

### 3.2 Site web et application

| ID | Règle | Source |
|---|---|---|
| RG-12-08 | Le site `www.anoventix.com` est l'export statique de l'app Expo ; nginx sert chaque route dynamique (`/profil/…`, `/entreprise-publique/…`, `/messagerie/…`, `/administration/…`) avec son gabarit HTML. Les trois dernières versions sont conservées pour un retour arrière (`deploy-web.ps1`). | `nginx/default.conf:75-82`, `README.md §5` |
| RG-12-09 | Sur ordinateur : barre du haut (`WebTopBar`) et colonne centrale ; sur mobile : barre d'onglets. La visibilité des rubriques suit les rôles (`src/lib/nav-items.ts`). | `components/web/*`, `src/lib/responsive.tsx` |
| RG-12-10 | Invitation à installer l'app : seulement sur un navigateur **Android**, 2 s après l'affichage, au plus une fois tous les **7 jours** (« Installer l'application », « Télécharger l'… », « Continuer sur le site »). Pas d'invitation sur iOS (APK non installable) ni sur ordinateur (lien dans la barre du haut). | `components/web/AppDownloadPrompt.tsx` |
| RG-12-11 | L'APK est distribué hors Play Store, à l'adresse `https://www.anoventix.com/downloads/anoventix.apk`, déposé à la main sur le serveur. **Il n'y a pas d'application iOS.** | `src/constants/download.ts`, `README.md §6` |
| RG-12-12 | Les photos publiques sont servies par nginx depuis `/uploads/` ; `/uploads/private/` (pièces d'identité, 🆕 selfies de vérification) est refusé par nginx et par l'API. Swagger et `/actuator/` sont fermés en production. | `nginx/default.conf:112-131`, `SecurityConfig` |

### 3.3 Pages légales et support

| ID | Règle | Source |
|---|---|---|
| RG-12-13 | CGU : `https://www.anoventix.com/cgu` (`landing/cgu.html`). Elles prévoient notamment l'inscription réservée aux personnes majeures, la licence annuelle (distincte particulier / professionnel, couvrant les agents d'un pro), et le blocage de la publication et de la modification au-delà des annonces gratuites. | `landing/cgu.html` |
| RG-12-14 | Politique de confidentialité : lien `https://www.anoventix.com/confidentialite` présent dans l'app et routé par nginx, mais **le fichier `confidentialite.html` n'existe pas** (404) (ECART-06). | `src/constants/legal.ts`, `nginx/default.conf:48` |
| RG-12-15 | Support : email `contact@anoventix.com` (« Contacter le support », achat de licence). Pas de formulaire de contact, de FAQ ni de suivi des demandes. | `src/constants/legal.ts` |
| RG-12-19 | **Mentions légales** : aucune page n'identifie l'éditeur du service (raison sociale, adresse, responsable de publication) ni l'hébergeur (ECART-06). | `landing/` |

### 3.4 Différences entre le site web et l'app Android

Synthèse des comportements qui diffèrent selon la plateforme, relevés dans les modules.

| Sujet | App Android | Site web | Renvoi |
|---|---|---|---|
| Stockage des jetons de session | Stockage sécurisé (`expo-secure-store`) | `localStorage`, lisible par tout script de la page | 01 §5, ECART-54 |
| Brouillon de publication | `AsyncStorage` de l'appareil | `localStorage` du navigateur ; même absence de rattachement au compte | 03 RG-03-26, ECART-56 |
| Cartes | Leaflet dans une WebView | Leaflet directement dans la page | 05 RG-05-15 |
| Géolocalisation | Permission Android | Permission du navigateur (HTTPS requis) | 04 RG-04-09 |
| Photos d'annonce et pièce d'identité | Galerie de l'appareil | Sélecteur de fichiers | 03, 02 |
| 🆕 Selfie de vérification | Appareil photo (caméra frontale) | Webcam ; sans webcam, renvoi vers l'app ou un téléphone | 02 RG-02-24 |
| Navigation | Barre d'onglets | Barre du haut sur ordinateur, onglets sur mobile | RG-12-09 |
| Installation et mises à jour | APK téléchargé à la main, aucune mise à jour automatique | Toujours la dernière version déployée | RG-12-11, SFG §4.2 |
| Lien profond `anoventixapp://` (page d'activation) | Ouvre l'app | Sans effet | 11 RG-11-07 |
| Retour haptique | Oui | Non | SFG §10 |
| Notifications push | Aucune | Aucune | 11 §4.1 |

### 3.5 🆕 Cibles (DEC-14, DEC-20, DEC-24)

| ID | Règle | Source |
|---|---|---|
| 🆕 RG-12-20 | Les pages de partage et le HTML des fiches ne contiennent jamais le téléphone de l'annonceur (module 06, RG-06-24). | DEC-14 |
| 🆕 RG-12-21 | **Play Store** : l'app est publiée sur le Play Store, ce qui suppose la politique de confidentialité publiée (ECART-06) et la déclaration des données sensibles (pièces, selfies, position). L'APK direct reste disponible pendant une période de transition ; l'app vérifie au démarrage la version minimale exigée par l'API et invite à mettre à jour. | DEC-20 |
| 🆕 RG-12-22 | **Référencement, bases** : l'API sert `https://www.anoventix.com/sitemap.xml` (URL canoniques des annonces visibles avec leur date de modification, pages des agences vérifiées, CGU et confidentialité), régénéré au plus toutes les heures, et `robots.txt` (exclut `/administration/`, `/messagerie/`, `/conversation/`, `/api/` et `/uploads/private/`, et indique le sitemap). | DEC-24, ECART-65 |
| 🆕 RG-12-23 | Les pages d'agence ont leur propre aperçu de partage, comme les annonces : nom, photo, nombre d'annonces en ligne, badge « Agence vérifiée » le cas échéant (DEC-04). Pages par commune et rendu côté serveur : plus tard. | DEC-24 |
| 🆕 RG-12-24 | Mesure d'audience par un outil **sans cookies** (Plausible ou Matomo auto-hébergé), sur le site et dans l'app : pages vues, sources de trafic, étapes de l'assistant de publication. Aucun bandeau de consentement ; l'outil est cité dans la politique de confidentialité. | DEC-29 |

## 4. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-12-01 | Un partage WhatsApp d'une annonce visible affiche sa première photo, son titre et un résumé avec le prix. |
| CA-12-02 | `/annonce/30` renvoie 301 vers `/annonce/<slug>-<publicId>` si l'annonce 30 est visible. |
| CA-12-03 | `/annonce/<slug>-<publicId>` d'une annonce masquée renvoie la page générique en 404, sans titre ni photo de l'annonce. |
| CA-12-04 | `/uploads/private/...` renvoie 403 ou 404, quel que soit le chemin. |
| CA-12-05 | Les liens CGU et Politique de confidentialité de l'app renvoient une page (aujourd'hui en échec pour la confidentialité). |
| CA-12-06 | Modifier le titre d'une annonce puis ouvrir l'ancien lien redirige (301) vers le nouveau slug. |
| CA-12-07 | *Cible (ECART-65)* : `https://www.anoventix.com/sitemap.xml` liste les URL canoniques de toutes les annonces visibles, et `robots.txt` y renvoie en excluant `/administration/`, `/messagerie/` et `/conversation/`. |
| CA-12-08 | Sur un navigateur Android, l'invitation à installer l'app ne réapparaît pas avant 7 jours après « Continuer sur le site ». |
| 🆕 CA-12-09 | `robots.txt` interdit `/administration/` et renvoie au sitemap ; une annonce masquée n'apparaît pas dans `sitemap.xml`. |
| 🆕 CA-12-10 | Le partage WhatsApp d'une page d'agence affiche son nom et sa photo. |

## 5. Écarts propres au module

ECART-06 (politique de confidentialité et mentions légales absentes), ECART-20 (route `/ws-native` sans service), ECART-38 (documentation), ECART-42 (prix révisé et périodicité du loyer), ECART-52 (annonces d'un compte suspendu partageables), ECART-54 (jetons dans le `localStorage`), ECART-56 (brouillon), ECART-65 (référencement).

## 6. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-24 ; Q2 → DEC-20.

1. Le référencement naturel est-il un canal d'acquisition visé ? Si oui : sitemap, pages par commune et type de bien, rendu côté serveur des fiches (ECART-65).
2. Faut-il publier l'app sur le Play Store, ce qui règle les mises à jour (SFG §4.2) mais impose ses règles (politique de confidentialité, données sensibles) ?
3. Une application iOS est-elle prévue, ou le site web reste-t-il la seule offre pour les utilisateurs d'iPhone ?
4. Les pages d'agence doivent-elles avoir leur propre aperçu de partage (nom, photo, nombre d'annonces) ?
