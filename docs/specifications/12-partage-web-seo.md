# Module 12 — Partage, web, SEO et pages légales

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Rendre les annonces partageables (WhatsApp, Facebook, LinkedIn, X) avec un aperçu riche, offrir des URL stables et non devinables, servir le site web (export statique de l'app Expo) et l'APK Android, et publier les pages légales.

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
| RG-12-01 | URL canonique d'une annonce : `https://www.anoventix.com/annonce/<slug-du-titre>-<publicId>`. Le `publicId` (12 caractères hexadécimaux aléatoires) remplace l'identifiant numérique pour éviter l'énumération des annonces. | `SharePageService.java:122-124`, `V13__public_id_annonce.sql`, `src/lib/annonce-url.ts` |
| RG-12-02 | nginx envoie `/annonce/<segment>` à l'API (`/share/annonce/<segment>`). Un segment numérique (ancien lien) ou un slug obsolète (titre modifié) est **redirigé de façon permanente (301)** vers l'URL canonique. | `SharePageService.java:102-119`, `nginx/default.conf:59-71` |
| RG-12-03 | Pour une annonce **visible publiquement**, l'API sert la page de l'app enrichie : `<title>` « Titre \| AnoventiX », description, lien canonique, balises Open Graph (`og:type`, `og:site_name`, `og:locale fr_FR`, `og:url`, `og:title`, `og:description`, `og:image` = première photo) et Twitter (`summary_large_image` avec photo, `summary` sinon). | `SharePageService.java:126-155` |
| RG-12-04 | Description d'aperçu : « À vendre / À louer… · Type de bien · Prix GNF (/ mois si location ou bail, prix révisé prioritaire) · Surface m² · Quartier, Commune, Préfecture — début de la description », tronquée. | `SharePageService.java:158-185` |
| RG-12-05 | Annonce introuvable ou non visible : page générique servie avec le code **404** ; l'app, une fois chargée, affiche l'annonce à son propriétaire connecté s'il y a droit. | `ShareController.java:41-45` |
| RG-12-06 | La page est servie sans cache (`no-cache`) pour qu'un nouveau déploiement soit visible tout de suite ; le gabarit HTML est relu seulement quand la version déployée change. | `ShareController.java:40-44`, `SharePageService.java:201-220` |
| RG-12-07 | Le même HTML est servi à tous (pas de détection du robot) ; le navigateur charge ensuite l'app normalement. | `SharePageService.java:35-42` |

### 3.2 Site web et application

| ID | Règle | Source |
|---|---|---|
| RG-12-08 | Le site `www.anoventix.com` est l'export statique de l'app Expo ; nginx sert chaque route dynamique (`/profil/…`, `/entreprise-publique/…`, `/messagerie/…`, `/administration/…`) avec son gabarit HTML. Les trois dernières versions sont conservées pour un retour arrière (`deploy-web.ps1`). | `nginx/default.conf:75-82`, `README.md §5` |
| RG-12-09 | Sur ordinateur : barre du haut (`WebTopBar`) et colonne centrale ; sur mobile : barre d'onglets. La visibilité des rubriques suit les rôles (`src/lib/nav-items.ts`). | `components/web/*`, `src/lib/responsive.tsx` |
| RG-12-10 | Invitation à installer l'app : seulement sur un navigateur **Android**, 2 s après l'affichage, au plus une fois tous les **7 jours** (« Installer l'application », « Télécharger l'… », « Continuer sur le site »). Pas d'invitation sur iOS (APK non installable) ni sur ordinateur (lien dans la barre du haut). | `components/web/AppDownloadPrompt.tsx` |
| RG-12-11 | L'APK est distribué hors Play Store, à l'adresse `https://www.anoventix.com/downloads/anoventix.apk`, déposé à la main sur le serveur. **Il n'y a pas d'application iOS.** | `src/constants/download.ts`, `README.md §6` |
| RG-12-12 | Les photos publiques sont servies par nginx depuis `/uploads/` ; `/uploads/private/` (pièces d'identité) est refusé par nginx et par l'API. Swagger et `/actuator/` sont fermés en production. | `nginx/default.conf:112-131`, `SecurityConfig` |

### 3.3 Pages légales et support

| ID | Règle | Source |
|---|---|---|
| RG-12-13 | CGU : `https://www.anoventix.com/cgu` (`landing/cgu.html`). Elles prévoient notamment l'inscription réservée aux personnes majeures, la licence annuelle (distincte particulier / professionnel, couvrant les agents d'un pro), et le blocage de la publication et de la modification au-delà des annonces gratuites. | `landing/cgu.html` |
| RG-12-14 | Politique de confidentialité : lien `https://www.anoventix.com/confidentialite` présent dans l'app et routé par nginx, mais **le fichier `confidentialite.html` n'existe pas** (404) (ECART-06). | `src/constants/legal.ts`, `nginx/default.conf:48` |
| RG-12-15 | Support : email `contact@anoventix.com` (« Contacter le support », achat de licence). Pas de formulaire de contact, de FAQ ni de suivi des demandes. | `src/constants/legal.ts` |

## 4. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-12-01 | Un partage WhatsApp d'une annonce visible affiche sa première photo, son titre et un résumé avec le prix. |
| CA-12-02 | `/annonce/30` renvoie 301 vers `/annonce/<slug>-<publicId>` si l'annonce 30 est visible. |
| CA-12-03 | `/annonce/<slug>-<publicId>` d'une annonce masquée renvoie la page générique en 404, sans titre ni photo de l'annonce. |
| CA-12-04 | `/uploads/private/...` renvoie 403 ou 404, quel que soit le chemin. |
| CA-12-05 | Les liens CGU et Politique de confidentialité de l'app renvoient une page (aujourd'hui en échec pour la confidentialité). |

## 5. Écarts propres au module

ECART-06 (politique de confidentialité absente), ECART-20 (route `/ws-native` sans service), ECART-42 (prix révisé et périodicité du loyer), ECART-38 (documentation).
