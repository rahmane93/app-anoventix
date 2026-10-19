# Module 11 — Notifications et emails

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Informer les utilisateurs des événements qui les concernent. Le seul canal implémenté est l'**email transactionnel** (SMTP). Il n'existe ni notification push, ni notification dans l'application, ni SMS.

## 2. Principes techniques et fonctionnels

| ID | Règle | Source |
|---|---|---|
| RG-11-01 | Envoi **asynchrone**, en « meilleur effort » : un échec est journalisé sans nouvel essai, sans file d'attente et sans prévenir l'utilisateur. 🆕 Retenu (DEC-31) : envoi par un service transactionnel, dont le suivi des échecs (rebonds, refus) est consultable ; le nouvel essai automatique reste à décider (§7, question 4). | `NotificationService.java` |
| RG-11-02 | Les notifications métier sont envoyées **après la validation de la transaction**, pour ne jamais annoncer une action annulée. Exception : l'email d'identifiants d'un agent part avant la validation (ECART-47). | `EmailNotificationService.java:46-55`, `EntrepriseServiceImpl.java:301` |
| RG-11-03 | Aucun email n'est envoyé à une adresse anonymisée (`@anonyme.invalid`). | `EmailNotificationService.java:36-38` |
| RG-11-04 | Gabarits HTML communs (`email-layout.html`) avec un texte d'aperçu et une mention de bas de page ; le code de réinitialisation et le lien d'activation ne sont jamais journalisés. | `resources/templates/*`, `Utility.renderEmail` |
| RG-11-05 | Expéditeur : `SMTP_FROM` (`no-reply@anoventix.com`). Aucun lien de désabonnement : tous les emails sont transactionnels. | `application.yml`, `.env.example` |
| RG-11-06 | **Liens** : le pied de page renvoie vers le site, `contact@anoventix.com` et les CGU, mais **pas vers la politique de confidentialité** (ECART-06). Les emails E4 à E12 ne contiennent **aucun lien vers l'annonce ou l'action attendue** (prolonger, corriger, ouvrir « Ma licence ») : l'utilisateur doit retrouver l'écran lui-même. E3 et la page d'activation pointent vers `/telecharger/anoventix.apk`, ancienne adresse redirigée par nginx vers `/downloads/anoventix.apk`. | `templates/email-layout.html:26-53`, `email-temporary-password.html:51`, `nginx/default.conf:41-44` |
| RG-11-07 | **Page d'activation** : après succès, le bouton ouvre l'app par le lien `anoventixapp://login` ; sur ordinateur ou sans l'app installée, ce lien ne mène nulle part, d'où un second bouton de téléchargement de l'APK. | `templates/page-activation-success.html:5-6` |
| RG-11-08 | **Un seul canal, sans préférences** : l'utilisateur ne peut choisir ni le canal (email, push, SMS, WhatsApp) ni les types de notifications reçus. | — |
| 🆕 RG-11-09 | **Cible DEC-13** : un second canal, la **notification push** (app Android), sert aux nouveaux messages (module 06, RG-06-22) puis aux alertes de recherche (module 04, RG-04-21). Le profil propose deux interrupteurs : « Nouveaux messages » et « Alertes de recherche ». Les emails transactionnels restent obligatoires. | DEC-13, DEC-16 |

## 3. Catalogue des emails existants

| # | Déclencheur | Destinataire | Objet / contenu | Gabarit | Source |
|---|---|---|---|---|---|
| E1 | Inscription, renvoi du lien | Nouvel inscrit | Lien d'activation valable 48 h | `email-activation.html` | `AuthServiceImpl.java:353-362` |
| E2 | Mot de passe oublié | Titulaire | Code à 8 chiffres valable 15 min | `email-password-reset.html` | `AuthServiceImpl.java:423-424` |
| E3 | Création d'un agent | Agent | « Vos accès agent AnoventiX » : email, mot de passe temporaire, entreprise, nom du responsable | `email-temporary-password.html` | `EntrepriseServiceImpl.java:291-305` |
| E4 | Pièce d'identité validée | Titulaire | « Votre pièce d'identité a été validée » : vous pouvez publier | `email-notification.html` | `UserServiceImpl.java:253-257` |
| E5 | Pièce d'identité refusée | Titulaire | « Votre pièce d'identité a été refusée » + motif | idem | `UserServiceImpl.java:259-263` |
| E6 | Annonce masquée par la modération | Propriétaire | Titre, référence, motif | idem | `AdminServiceImpl.java:206-207` |
| E7 | Annonce rejetée | Propriétaire | Titre, référence, motif | idem | `AdminServiceImpl.java:223-224` |
| E8 | Annonce remise en ligne par la modération | Propriétaire | « Votre annonce est de nouveau en ligne » | idem | `AdminServiceImpl.java:243-244` |
| E9 | Masquage système du compte | Titulaire | « Vos annonces ont été masquées » + motif, publication et modification suspendues | idem | `AdminServiceImpl.java:263-266` |
| E10 | Levée du masquage | Titulaire | « Vos annonces sont de nouveau visibles » | idem | `AdminServiceImpl.java:283-285` |
| E11 | J-7 avant l'expiration (tâche de 03:00) | Propriétaire | « Votre annonce expire bientôt » + date + rappel de prolongation | idem | `AnnonceExpirationService.java:75-81` |
| E12 | Expiration (tâche de 03:00) | Propriétaire | « Votre annonce a expiré » + rappel de prolongation (ou mention du masquage en cours) | idem | `AnnonceExpirationService.java:96-104` |
| 🆕 E14 | Connexion d'un compte du staff (DEC-03) | Administrateur, modérateur | Code de connexion à 6 chiffres, valable 10 min | à créer | module 01, RG-01-36 |
| 🆕 E15 | Connexion réussie d'un compte du staff (DEC-03) | Administrateur, modérateur | Alerte : date, appareil, adresse IP approximative, adresse du support | à créer | module 01, RG-01-40 |
| 🆕 E16 | Réexamen terminé, masquage maintenu (DEC-09) | Propriétaire | « Votre annonce reste masquée » + nouveau motif + rappel qu'elle reste corrigeable | à créer | module 03, RG-03-32 |
| 🆕 E17 | Entreprise vérifiée (DEC-04) | Professionnel | « Votre agence est vérifiée » : le badge est affiché | à créer | module 07, RG-07-25 |
| 🆕 E18 | Vérification de l'entreprise refusée (DEC-04) | Professionnel | Motif et justificatif à renvoyer | à créer | module 07, RG-07-25 |
| 🆕 E19 | Compte non activé à J+5 (DEC-06) | Inscrit | Nouveau lien d'activation ; suppression du compte à J+7 sans activation | à créer | module 01, RG-01-47 |
| 🆕 E20 | Clé de licence générée (DEC-17) | Acheteur | Reçu : clé, type, montant, moyen et référence de paiement, date | à créer | module 08, RG-08-25 |
| 🆕 E21 | Activation du mode licence (DEC-18) | Comptes au-delà des annonces gratuites | Date d'effet (J+30), prix, contact de vente | à créer | module 08, RG-08-27 |
| 🆕 E22 | Avertissement reçu (DEC-33) | Titulaire | Niveau, motif, validité de 6 mois ; suspension éventuelle et moyen de la contester | `AdminServiceImpl.notifierAvertissement` | module 09, RG-09-24 |

Pages HTML associées (hors emails) : `page-activation-success.html`, `page-activation-error.html` (lien d'activation ouvert dans un navigateur).

> 🆕 **EVO-01 (selfie de vérification, module 02 §4.6)** : E4 et E5 portent sur le dossier pièce + selfie. Objets proposés : « Votre identité a été vérifiée » et « Votre vérification d'identité a été refusée ». E5 précise ce qu'il faut refaire (pièce, selfie ou les deux, RG-02-30). Un email E13 est ajouté à la mise en service, pour les dossiers en attente sans selfie : « Ajoutez un selfie pour terminer votre vérification ».

## 4. Notifications manquantes (à arbitrer)

Liste consolidée des événements sans information de la personne concernée, relevés dans l'ensemble des modules (ECART-23 sauf mention contraire).

| Événement | Destinataire attendu | Priorité suggérée | Module, écart |
|---|---|---|---|
| Nouveau message reçu (au moins un résumé par email, idéalement une notification push) | Participant | **Haute** : clé de la conversion acheteur → vendeur | 06 RG-06-12 |
| Suspension, réactivation ou désactivation du compte par la modération | Titulaire | **Haute** | 01 RG-01-31, 09 RG-09-27 |
| ~~Avertissement reçu (et suspension automatique)~~ ✅ E22 | Titulaire | — | 09 RG-09-24, ECART-24 |
| Demande de suppression du compte (confirmation, date limite de réactivation) puis anonymisation | Titulaire | **Haute** (données personnelles) | 02 RG-02-17 |
| Changement ou réinitialisation du mot de passe (alerte de sécurité) | Titulaire | **Haute** | 01 §5.1 |
| Connexion d'un compte du staff | Administrateur ou modérateur concerné | **Haute** (sécurité) | 10 RG-10-17, ECART-64 |
| Activation du mode licence (préavis) | Comptes au-delà des annonces gratuites | **Haute** si le mode est activé | 08 RG-08-20 |
| Reçu d'achat de licence, licence activée | Acheteur | Moyenne | 08, ECART-62 |
| Licence bientôt expirée (J-30, J-7), licence expirée | Titulaire / PRO | Moyenne | 08 RG-08-21, ECART-25 |
| Nouvelle annonce correspondant à une recherche enregistrée (alerte) | Acheteur | Moyenne (fonction à créer) | 04 §9 |
| Favori clôturé, vendu ou en baisse de prix | Acheteur | Basse | 04 RG-04-18 |
| Entreprise désactivée ou réactivée | PRO et agents | Moyenne | 07 RG-07-05 |
| Agent suspendu, réactivé ou retiré | Agent | Moyenne | 07 §4.2 bis |
| Changement de rôle | Titulaire | Moyenne | 10 RG-10-12 |
| Relance d'un compte non activé avant sa purge | Inscrit | Moyenne (si la purge est retenue) | 01 RG-01-32, ECART-53 |
| Demande d'ajout de quartier traitée | Annonceur | Basse (fonction à créer) | 05, ECART-58 |
| Décision sur une demande de réexamen | Propriétaire | Basse (fonction à créer) | 09 RG-09-28 |
| Signalement traité | Signaleur | Basse | 09 RG-09-10, ECART-26 |
| Nouvelle pièce d'identité à vérifier, nouveau signalement | Modération | Basse (le tableau de bord suffit) | 10 §4.1 |

### 4.1 Canaux possibles

| Canal | Atouts | Contraintes |
|---|---|---|
| Email (existant) | Déjà en place, gratuit | Peu consulté par une partie du public visé ; délivrabilité à surveiller (SFG §4.1) |
| Notification push (Expo) | Immédiat, gratuit, adapté aux nouveaux messages | Suppose `expo-notifications`, l'enregistrement des appareils et un service d'envoi ; rien sur le site web sans travail supplémentaire |
| SMS | Atteint tous les téléphones | Coût par message ; numéro aujourd'hui non vérifié (ECART-53) |
| WhatsApp Business | Canal très utilisé en Guinée | Coût, modèles de messages à faire valider, numéro vérifié nécessaire |

## 5. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-11-01 | Une indisponibilité du serveur SMTP n'empêche ni l'inscription ni aucune action de modération. |
| CA-11-02 | Si l'action de modération échoue (retour arrière), aucun email n'est envoyé. |
| CA-11-03 | Les emails E6 à E12 contiennent le titre et la référence de l'annonce concernée. |
| CA-11-04 | Aucun email n'est envoyé à un compte anonymisé, y compris les relances d'expiration de ses anciennes annonces. |
| CA-11-05 | Le lien `/telecharger/anoventix.apk` des emails aboutit au téléchargement de l'APK (redirection permanente vers `/downloads/`). |
| CA-11-06 | *Cible* : les emails E6 à E12 contiennent un lien qui ouvre l'annonce concernée (site ou app). |

## 6. Écarts propres au module

ECART-06 (pas de lien vers la politique de confidentialité), ECART-23 (notifications manquantes, pas de push), ECART-24 (avertissements non notifiés), ECART-25 (pas de relance de licence), ECART-47 (email d'agent avant validation, mot de passe en clair), ECART-62 (pas de reçu de licence), ECART-64 (pas d'alerte de connexion du staff).

## 7. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-13.

1. Quel canal en priorité pour les nouveaux messages : notification push ou email groupé (module 06 §10) ?
2. Faut-il un canal SMS ou WhatsApp pour les événements critiques (activation, réinitialisation, suspension), compte tenu de l'usage local de l'email ?
3. Faut-il une page de préférences de notification, au moins pour les alertes et les favoris ?
4. Faut-il une file d'envoi avec nouvel essai pour les emails critiques (activation, code de réinitialisation) au lieu de l'envoi en « meilleur effort » ?
