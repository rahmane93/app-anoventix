# AnoventiX — Évolutions et reste à faire

[← Vue d'ensemble](00-SFG-vue-ensemble.md)

Ce document remplace le document des écarts (archivé dans l'historique git, étiquette `fin-des-ecarts`). Les modules 01 à 12 décrivent le comportement actuel du code ; ce document liste ce qui reste à faire : décisions non encore appliquées, préparation de la mise en production, et améliorations relevées pendant les corrections. Un point traité est retiré d'ici et décrit dans son module.

Priorité : 🔴 avant la mise en production · 🟠 au lancement ou peu après · 🟡 amélioration.

## 1. Mise en production

| # | Point | Priorité | Décision | Détail |
|---|---|---|---|---|
| P-01 | Validation juridique de la politique de confidentialité, des mentions légales et des durées de conservation ; registre des traitements | 🔴 | DEC-19, DEC-26 | Pages publiées (module 12), cadre droit guinéen + RGPD. Prérequis du Play Store. |
| P-02 | Service d'envoi des emails | 🔴 | DEC-31 | Choisir Brevo, Mailjet ou Amazon SES ; configurer SPF, DKIM et DMARC sur le domaine ; renseigner les variables `SMTP_*`. La file d'envoi avec nouvel essai est en place (module 11). |
| P-03 | Fournisseur de tuiles de carte | 🔴 | DEC-30 | **En test : LFMaps** (tuiles vectorielles OpenFreeMap, gratuites, sans clé ni quota), affichées avec MapLibre GL et activées par `EXPO_PUBLIC_MAP_PROVIDER=lfmaps` (`APP/src/components/ui/leaflet-html.ts`). CSP déjà ouverte à `data.lfmaps.fr`. Reste à valider le rendu WebGL sur un Android d'entrée de gamme. Si le test échoue : MapTiler, Stadia ou équivalent en raster avec Leaflet (clé d'API restreinte par domaine). Les serveurs publics d'OpenStreetMap interdisent l'usage intensif. |
| P-04 | Variables de production | 🔴 | — | `APP_CORS_ALLOWED_ORIGINS`, `APP_BASE_URL`, `COOKIE_SECURE=true`, `APP_VERSION_MINIMALE`, `APP_URL_MISE_A_JOUR`, `CGU_VERSION`, `ADMIN_EMAIL` / `ADMIN_PASSWORD`, secret JWT. |
| P-05 | Sauvegardes hors serveur et test de restauration | 🔴 | DEC-32 | Copie quotidienne hors serveur (30 jours), restauration testée chaque trimestre. Aujourd'hui : 14 jours sur le même serveur. |
| P-06 | Supervision | 🟠 | DEC-32 | Alertes : API arrêtée, disque > 80 %, sauvegarde en échec, emails abandonnés (journalisés en erreur), échecs des tâches planifiées. Journaux conservés 90 jours. |
| P-07 | Publication sur le Play Store | 🟠 | DEC-20 | Compte Google Play développeur, build EAS, fiche, déclaration des données sensibles (pièces, selfies, position). La version minimale de l'app est déjà contrôlée (module 12). |
| P-08 | Mesure d'audience sans cookies | 🟠 | DEC-29 | Plausible ou Matomo auto-hébergé sur le site et l'app ; à citer dans la politique de confidentialité. |
| P-09 | Politique de sécurité du contenu imposée | 🟠 | — | Passer de `Content-Security-Policy-Report-Only` à `Content-Security-Policy` après observation des rapports. |
| P-10 | Email d'invitation aux entreprises existantes | 🟠 | DEC-04 | À la mise en service de la vérification, inviter les propriétaires des entreprises existantes à envoyer leur justificatif RCCM. |
| P-11 | Environnement de recette et procédure de déploiement | 🟡 | — | Jeu de données de test, procédure écrite, retour arrière. |
| P-12 | Dépendances | 🟡 | — | Mises à jour de correctifs du SDK Expo (`npx expo install --check`) ; collection Postman à mettre à jour (endpoints retirés en phase 7). |

## 2. Décision reportée : vérification du téléphone (DEC-05)

Reportée le 19/10/2026, non bloquante. Tant qu'elle n'est pas faite, un tiers peut réserver le numéro d'une autre personne (module 01, RG-01-35). Règles cibles déjà validées :

- **Inscription** : téléphone obligatoire (format international, normalisé), vérifié par un code à 6 chiffres envoyé par SMS ou, au choix, par WhatsApp ; code valable 10 minutes, 5 essais par code ; envois limités à 3 par 15 minutes et 10 par jour pour un même numéro.
- **Activation** : un compte devient ACTIF quand l'email est activé **et** le téléphone vérifié, dans n'importe quel ordre ; une connexion par email avant la vérification mène à la saisie du code.
- **Réservation** : seul un numéro vérifié est réservé et sert d'identifiant de connexion ; un numéro saisi mais non vérifié est retiré du compte qui ne l'avait pas vérifié dès qu'un autre compte le vérifie.
- **Changement de téléphone** : le nouveau numéro doit être vérifié ; l'ancien reste actif jusque-là.
- **Comptes existants** : invités par un bandeau à vérifier leur numéro, sans restriction ; les agents le vérifient après avoir choisi leur mot de passe.
- **Prérequis** : un fournisseur d'envoi de SMS ou WhatsApp Business et son budget.

## 3. Améliorations relevées

### 3.1 Notifications

| # | Point | Priorité | Module |
|---|---|---|---|
| N-01 | Emails de sécurité du compte : changement ou réinitialisation du mot de passe, demande de suppression (avec date limite de réactivation), anonymisation | 🟠 | 01, 02, 11 |
| N-02 | Email au titulaire lors d'une suspension, d'une réactivation ou d'une désactivation par la modération | 🟠 | 09, 11 |
| N-03 | Relance avant la fin d'une licence (J-30, J-7) et à son expiration | 🟠 | 08, 11 |
| N-04 | Liens vers l'annonce ou l'action attendue dans les emails E6 à E12 ; lien vers la politique de confidentialité dans le pied des emails | 🟡 | 11 |
| N-05 | Notifications aux agents (suspension, réactivation, retrait) et aux membres d'une entreprise désactivée ou réactivée | 🟡 | 07, 11 |
| N-06 | Information du signaleur après une décision ; décision sur une demande d'ajout de quartier | 🟡 | 05, 09, 11 |
| N-07 | Favori clôturé, vendu ou en baisse de prix | 🟡 | 04, 11 |

### 3.2 Licences

| # | Point | Priorité | Module |
|---|---|---|---|
| L-01 | Révocation d'une clé (erreur de vente, remboursement), avec trace | 🟡 | 08 |
| L-02 | Contrôle du type de licence après un changement de rôle (un particulier devenu professionnel garde une licence PARTICULIER valide) | 🟡 | 08, 10 |
| L-03 | Email de vente réglable par l'administrateur, comme le téléphone | 🟡 | 08 |

### 3.3 Modération et messagerie

| # | Point | Priorité | Module |
|---|---|---|---|
| M-01 | Motif obligatoire pour le signalement d'un message dans l'API (accepté absent pour les anciennes versions de l'app) | 🟡 | 06 |
| M-02 | Un signalement de message classé ne devrait pas pouvoir être reposé à l'identique par le même utilisateur | 🟡 | 06, 09 |
| M-03 | Suppression logique des signalements d'annonce (aujourd'hui physique) | 🟡 | 09 |
| M-04 | Regroupement des signalements par annonce dans la file, avec leur nombre | 🟡 | 09 |
| M-05 | Suspension temporaire avec date de fin ; voie de recours pour un compte suspendu | 🟡 | 09 |
| M-06 | Mise en évidence des dossiers d'identité en attente depuis plus de 48 h (engagement de 72 h, DEC-25) | 🟡 | 02, 10 |
| M-07 | Écran de gestion de ses blocages dans l'app (l'API les liste déjà) | 🟡 | 06 |

### 3.4 Données et référentiel

| # | Point | Priorité | Module |
|---|---|---|---|
| D-01 | Tables Région / Préfecture / Commune avec identifiants, à la place des libellés comme clés ; utile pour les pages de référencement par commune (DEC-24) | 🟡 | 05, 12 |
| D-02 | Points de référence des quartiers à renseigner (les colonnes existent, aucune valeur n'est fournie) | 🟡 | 05 |
| D-03 | Pages de référencement par commune et par type de bien ; rendu côté serveur des fiches | 🟡 | 12 |
| D-04 | Parcourir les annonces par leur identifiant numérique reste possible (`GET /api/biens-immo/{id}`) | 🟡 | 03, 12 |

### 3.5 Technique

| # | Point | Priorité | Module |
|---|---|---|---|
| T-01 | État en mémoire (liste noire des jetons d'accès, tentatives de connexion, débits, présence, vues) et fichiers sur disque local : une seule instance possible | 🟡 | SFG §4 |
| T-02 | Chiffrement des fichiers d'identité sur disque et dans les sauvegardes | 🟡 | 02 |
| T-03 | Version Android minimale à fixer et documenter ; décision sur une application iOS | 🟡 | 12 |
| T-04 | Limites par compte sur la création d'annonces et les signalements | 🟡 | SFG §10 |
| T-05 | Notification unique par conversation (remplacée à chaque message) : non permise par Expo ; à revoir avec un autre service d'envoi si besoin | 🟡 | 06 |
