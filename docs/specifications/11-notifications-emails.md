# Module 11 — Notifications et emails

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Informer les utilisateurs des événements qui les concernent. Le seul canal implémenté est l'**email transactionnel** (SMTP). Il n'existe ni notification push, ni notification dans l'application, ni SMS.

## 2. Principes techniques et fonctionnels

| ID | Règle | Source |
|---|---|---|
| RG-11-01 | Envoi **asynchrone**, en « meilleur effort » : un échec est journalisé sans nouvel essai, sans file d'attente et sans prévenir l'utilisateur. | `NotificationService.java` |
| RG-11-02 | Les notifications métier sont envoyées **après la validation de la transaction**, pour ne jamais annoncer une action annulée. Exception : l'email d'identifiants d'un agent part avant la validation (ECART-47). | `EmailNotificationService.java:46-55`, `EntrepriseServiceImpl.java:301` |
| RG-11-03 | Aucun email n'est envoyé à une adresse anonymisée (`@anonyme.invalid`). | `EmailNotificationService.java:36-38` |
| RG-11-04 | Gabarits HTML communs (`email-layout.html`) avec un texte d'aperçu et une mention de bas de page ; le code de réinitialisation et le lien d'activation ne sont jamais journalisés. | `resources/templates/*`, `Utility.renderEmail` |
| RG-11-05 | Expéditeur : `SMTP_FROM` (`no-reply@anoventix.com`). Aucun lien de désabonnement : tous les emails sont transactionnels. | `application.yml`, `.env.example` |

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

Pages HTML associées (hors emails) : `page-activation-success.html`, `page-activation-error.html` (lien d'activation ouvert dans un navigateur).

## 4. Notifications manquantes (à arbitrer)

Événements métier sans aucune information de l'utilisateur concerné (ECART-23) :

| Événement | Destinataire attendu | Priorité suggérée |
|---|---|---|
| Nouveau message reçu (au moins un résumé par email, idéalement une notification push) | Participant | Haute : clé de la conversion acheteur → vendeur |
| Suspension, réactivation ou désactivation du compte par la modération | Titulaire | Haute |
| Avertissement reçu (et suspension automatique) | Titulaire | Haute |
| Demande de suppression du compte (confirmation, date limite de réactivation) puis anonymisation | Titulaire | Haute (RGPD) |
| Changement ou réinitialisation du mot de passe (alerte de sécurité) | Titulaire | Haute |
| Licence activée, licence bientôt expirée, licence expirée | Titulaire / PRO | Moyenne |
| Entreprise désactivée ou réactivée | PRO et agents | Moyenne |
| Agent suspendu, réactivé ou retiré | Agent | Moyenne |
| Changement de rôle | Titulaire | Moyenne |
| Signalement traité | Signaleur | Basse |
| Nouvelle pièce d'identité à vérifier, nouveau signalement | Modération | Basse (le tableau de bord suffit) |

## 5. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-11-01 | Une indisponibilité du serveur SMTP n'empêche ni l'inscription ni aucune action de modération. |
| CA-11-02 | Si l'action de modération échoue (retour arrière), aucun email n'est envoyé. |
| CA-11-03 | Les emails E6 à E12 contiennent le titre et la référence de l'annonce concernée. |

## 6. Écarts propres au module

ECART-23 (notifications manquantes, pas de push), ECART-24 (avertissements non notifiés), ECART-47 (email d'agent avant validation, mot de passe en clair).
