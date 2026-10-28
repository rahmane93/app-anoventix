# Module 12 — Partage, web, SEO et pages légales

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Rendre les annonces et les agences partageables (WhatsApp, Facebook, LinkedIn, X) avec un aperçu riche, offrir des URL stables et non devinables, servir le site web (export statique de l'app Expo) et l'APK Android, publier les pages légales, et donner aux moteurs de recherche un plan du site.

Hors périmètre : application iOS, pages de référencement par commune ou par type de bien, rendu côté serveur du contenu des pages, FAQ et formulaire de contact. La publication sur le Play Store (DEC-20) et la mesure d'audience (DEC-29) sont à faire au lancement ([98](98-evolutions.md)).

## 2. User stories

| ID | User story |
|---|---|
| US-12-01 | En tant qu'annonceur ou visiteur, je partage le lien d'une annonce et l'aperçu montre la photo, le titre, le prix et le lieu. |
| US-12-02 | En tant que visiteur, un ancien lien `/annonce/30` m'emmène sur l'URL canonique de l'annonce. |
| US-12-03 | En tant que visiteur sur un navigateur Android, on me propose d'installer l'application. |
| US-12-04 | En tant qu'utilisateur, je consulte les CGU, la politique de confidentialité et les mentions légales. |
| US-12-05 | En tant qu'agence, le partage du lien de ma page montre mon nom, ma photo et mon badge de vérification. |
| US-12-06 | En tant qu'utilisateur d'une ancienne version de l'app, je suis invité à la mettre à jour. |

## 3. Règles de gestion

### 3.1 URL et pages de partage

| ID | Règle | Source |
|---|---|---|
| RG-12-01 | URL canonique d'une annonce : `https://www.anoventix.com/annonce/<slug-du-titre>-<publicId>`. Le `publicId` (12 caractères hexadécimaux aléatoires) remplace l'identifiant numérique pour éviter l'énumération des annonces. **Limite** : l'identifiant numérique reste utilisable, par la redirection des anciens liens (RG-12-02) et par l'API publique `GET /api/biens-immo/{id}` (module 03) ; les annonces non visibles, elles, ne sont pas révélées (404). | `SharePageService.java`, `src/lib/annonce-url.ts` |
| RG-12-02 | nginx envoie `/annonce/<segment>` à l'API (`/share/annonce/<segment>`). Un segment numérique (ancien lien) ou un slug obsolète (titre modifié) est **redirigé de façon permanente (301)** vers l'URL canonique. | `SharePageService.java`, `nginx/default.conf` |
| RG-12-03 | Pour une annonce **visible publiquement**, l'API sert la page de l'app enrichie : `<title>` « Titre \| AnoventiX », description, lien canonique, balises Open Graph (`og:type`, `og:site_name`, `og:locale fr_FR`, `og:url`, `og:title`, `og:description`, `og:image` = photo principale) et Twitter (`summary_large_image` avec photo, `summary` sinon). | `SharePageService.java` |
| RG-12-04 | Description d'aperçu : « À vendre / À louer… · Type de bien · Prix GNF (/ mois si location ou bail, prix révisé prioritaire, caution et avance) · Surface m² · Quartier, Commune, Préfecture — début de la description », tronquée. Jamais le téléphone de l'annonceur (DEC-14). | idem |
| RG-12-05 | Annonce introuvable ou non visible : page générique servie avec le code **404** ; l'app, une fois chargée, affiche l'annonce à son propriétaire connecté s'il y a droit. | `ShareController.java` |
| RG-12-06 | La page est servie sans cache (`no-cache`) pour qu'un nouveau déploiement soit visible tout de suite ; le gabarit HTML est relu seulement quand la version déployée change. Le même HTML est servi à tous (pas de détection du robot) ; le navigateur charge ensuite l'app normalement. | `ShareController.java`, `SharePageService.java` |
| RG-12-07 | **Pages d'agence** (DEC-24) : `/share/agence/<id>` sert un aperçu de partage avec le nom, la photo, le nombre d'annonces en ligne et le badge « Agence vérifiée » le cas échéant. Une agence désactivée répond 404. | `SharePageService.java` |

### 3.2 Référencement (DEC-24)

| ID | Règle | Source |
|---|---|---|
| RG-12-08 | L'API sert `https://www.anoventix.com/sitemap.xml` (URL canoniques des annonces visibles avec leur date de modification, pages des agences vérifiées, CGU et confidentialité), régénéré au plus toutes les heures, et `robots.txt` (exclut `/administration/`, `/messagerie/`, `/conversation/`, `/api/` et `/uploads/private/`, et indique le sitemap). | `ShareController`, `SharePageService.java` |
| RG-12-09 | Le contenu des pages (liste, fiche, agence) est produit par JavaScript dans le navigateur ; seuls le titre, la description et l'image des fiches d'annonce et des pages d'agence sont dans le HTML initial. Pages par commune et rendu côté serveur : plus tard. | — |

### 3.3 Site web et application

| ID | Règle | Source |
|---|---|---|
| RG-12-10 | Le site `www.anoventix.com` est l'export statique de l'app Expo ; nginx sert chaque route dynamique (`/profil/…`, `/entreprise-publique/…`, `/messagerie/…`, `/administration/…`) avec son gabarit HTML. Les trois dernières versions sont conservées pour un retour arrière (`deploy-web.ps1`). | `nginx/default.conf`, `README.md` |
| RG-12-11 | Sur ordinateur : barre du haut (`WebTopBar`) et colonne centrale ; sur mobile : barre d'onglets. La visibilité des rubriques suit les rôles (`src/lib/nav-items.ts`). | `components/web/*`, `src/lib/responsive.tsx` |
| RG-12-12 | Invitation à installer l'app : seulement sur un navigateur **Android**, 2 s après l'affichage, au plus une fois tous les **7 jours** (« Installer l'application », « Télécharger l'… », « Continuer sur le site »). Pas d'invitation sur iOS (APK non installable) ni sur ordinateur (lien dans la barre du haut). | `components/web/AppDownloadPrompt.tsx` |
| RG-12-13 | L'APK est distribué hors Play Store, à l'adresse `https://www.anoventix.com/downloads/anoventix.apk`, déposé à la main sur le serveur. **Il n'y a pas d'application iOS.** | `src/constants/download.ts`, `README.md` |
| RG-12-14 | **Version minimale** : au démarrage, l'app Android lit la version minimale exigée (`GET /api/app/version`, public ; réglée par `APP_VERSION_MINIMALE`, 1.0.0 par défaut, et `APP_URL_MISE_A_JOUR`). Si sa version est plus ancienne, elle bloque sur un écran « Mise à jour requise » avec un bouton vers l'APK. Une API injoignable ne bloque jamais l'app ; le site web n'est pas concerné. | `AppVersionController.java`, `features/version/MiseAJourRequise.tsx` |
| RG-12-15 | Les photos publiques sont servies par nginx depuis `/uploads/` ; `/uploads/private/` (pièces d'identité, selfies, justificatifs) est refusé par nginx et par l'API. Swagger et `/actuator/` sont fermés en production. | `nginx/default.conf`, `SecurityConfig` |
| RG-12-16 | **Politique de sécurité du contenu** : publiée en mode rapport seulement (`Content-Security-Policy-Report-Only`), pour observer les violations avant de l'imposer ([98](98-evolutions.md)). | `nginx/default.conf` |

### 3.4 Pages légales et support

| ID | Règle | Source |
|---|---|---|
| RG-12-17 | CGU : `https://www.anoventix.com/cgu`. Elles prévoient notamment l'inscription réservée aux personnes majeures, la licence annuelle (distincte particulier / professionnel, couvrant les agents d'un pro), et le blocage de la publication et de la modification au-delà des annonces gratuites. Leur version est enregistrée avec le consentement à l'inscription. | `landing/cgu.html` |
| RG-12-18 | Politique de confidentialité (`/confidentialite`) et mentions légales (`/mentions-legales`) : pages publiées, rédigées sur la base du droit guinéen et du RGPD (DEC-19), **à faire valider par un juriste** avant la mise en production ([98](98-evolutions.md)). Elles mentionnent la vérification d'identité (pièce, selfie), la lecture des conversations signalées par la modération et les durées de conservation. | `landing/confidentialite.html`, `landing/mentions-legales.html` |
| RG-12-19 | Support : email `contact@anoventix.com` (« Contacter le support », achat de licence). Pas de formulaire de contact, de FAQ ni de suivi des demandes. | `src/constants/legal.ts` |

### 3.5 Différences entre le site web et l'app Android

| Sujet | App Android | Site web | Renvoi |
|---|---|---|---|
| Stockage des jetons de session | Stockage sécurisé (`expo-secure-store`) | Jeton d'accès dans le `localStorage`, jeton de rafraîchissement dans un cookie `HttpOnly` | 01 §5 |
| Brouillon de publication | `AsyncStorage` de l'appareil, propre au compte | `localStorage` du navigateur, propre au compte ; effacé à la déconnexion | 03 RG-03-26 |
| Cartes | Leaflet dans une WebView | Leaflet directement dans la page | 05 RG-05-15 |
| Géolocalisation | Permission Android | Permission du navigateur (HTTPS requis) | 04 RG-04-10 |
| Photos d'annonce et pièce d'identité | Galerie de l'appareil | Sélecteur de fichiers | 03, 02 |
| Selfie de vérification | Appareil photo (caméra frontale) | Webcam ; sans webcam, renvoi vers l'app ou un téléphone | 02 RG-02-24 |
| Navigation | Barre d'onglets | Barre du haut sur ordinateur, onglets sur mobile | RG-12-11 |
| Installation et mises à jour | APK téléchargé à la main ; version minimale contrôlée au démarrage | Toujours la dernière version déployée | RG-12-13, RG-12-14 |
| Lien profond `anoventixapp://` (page d'activation) | Ouvre l'app | Sans effet | 11 RG-11-06 |
| Notifications push | Messages et alertes de recherche | Aucune | 11 §4 |

## 4. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-12-01 | Un partage WhatsApp d'une annonce visible affiche sa photo principale, son titre et un résumé avec le prix, sans téléphone. |
| CA-12-02 | `/annonce/30` renvoie 301 vers `/annonce/<slug>-<publicId>` si l'annonce 30 est visible. |
| CA-12-03 | `/annonce/<slug>-<publicId>` d'une annonce masquée renvoie la page générique en 404, sans titre ni photo de l'annonce. |
| CA-12-04 | `/uploads/private/...` renvoie 403 ou 404, quel que soit le chemin. |
| CA-12-05 | Les liens CGU, Politique de confidentialité et Mentions légales de l'app renvoient chacun une page. |
| CA-12-06 | Modifier le titre d'une annonce puis ouvrir l'ancien lien redirige (301) vers le nouveau slug. |
| CA-12-07 | `sitemap.xml` liste les URL canoniques de toutes les annonces visibles et pas celles des annonces masquées ; `robots.txt` interdit `/administration/` et renvoie au sitemap. |
| CA-12-08 | Sur un navigateur Android, l'invitation à installer l'app ne réapparaît pas avant 7 jours après « Continuer sur le site ». |
| CA-12-09 | Le partage WhatsApp d'une page d'agence affiche son nom et sa photo. |
| CA-12-10 | Avec `APP_VERSION_MINIMALE=1.1.0`, une app 1.0.0 affiche « Mise à jour requise » ; avec 1.0.0, elle démarre normalement. |
