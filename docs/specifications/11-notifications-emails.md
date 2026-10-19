# Module 11 — Notifications et emails

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Informer les utilisateurs des événements qui les concernent, par deux canaux : l'**email transactionnel** (tous les comptes) et la **notification push** (app Android : nouveaux messages et alertes de recherche). Il n'existe ni notification dans l'application (centre de notifications), ni SMS, ni WhatsApp.

## 2. Principes techniques et fonctionnels

| ID | Règle | Source |
|---|---|---|
| RG-11-01 | **File d'envoi des emails** : chaque email est d'abord enregistré dans la file (`email_sortant`), puis envoyé par une tâche toutes les 10 secondes, par lots de 50, chaque email dans sa propre transaction (plusieurs instances n'envoient jamais deux fois). En cas d'échec : nouvel essai après 1 min, 5 min, 15 min, 1 h puis 6 h ; ensuite l'email est abandonné et l'abandon est journalisé en erreur. Les emails traités sont supprimés de la file après 30 jours. Le service d'envoi retenu est un service transactionnel (DEC-31), à configurer avec SPF, DKIM et DMARC. | `NotificationService.java`, `EnvoiEmailsPlanifie.java` |
| RG-11-02 | Les notifications métier sont mises en file **dans la transaction** de l'action : une action annulée n'envoie rien. Le contenu d'un email porteur d'un secret (code de connexion) est effacé de la file après l'envoi. | `EmailNotificationService.java` |
| RG-11-03 | Aucun email n'est envoyé à une adresse anonymisée (`@anonyme.invalid`). | idem |
| RG-11-04 | Gabarits HTML communs (`email-layout.html`) avec un texte d'aperçu et une mention de bas de page ; les codes et liens d'activation ne sont jamais journalisés. Le pied de page renvoie vers le site, `contact@anoventix.com` et les CGU. | `resources/templates/*`, `Utility.renderEmail` |
| RG-11-05 | Expéditeur : `SMTP_FROM` (`no-reply@anoventix.com`). Aucun lien de désabonnement : tous les emails sont transactionnels. | `application.yml` |
| RG-11-06 | **Page d'activation** : après succès, le bouton ouvre l'app par le lien `anoventixapp://login` ; sur ordinateur ou sans l'app installée, un second bouton propose de télécharger l'APK. | `templates/page-activation-success.html` |
| RG-11-07 | **Notifications push** (DEC-13) : envoyées par le service Expo après la validation de la transaction, de façon asynchrone. Le jeton de chaque appareil Android est enregistré à la connexion (si la permission est accordée) et supprimé à la déconnexion, à l'anonymisation ou quand Expo le déclare invalide. Elles ne fonctionnent que dans un build de développement ou l'APK, pas dans Expo Go. Désactivables côté serveur (`app.push.actif`). | `PushService.java`, `ExpoPushClient.java`, `src/lib/push.ts` |
| RG-11-08 | **Préférences** : le profil propose deux interrupteurs, « Nouveaux messages » et « Alertes de recherche », qui ne concernent que les notifications push. Les emails transactionnels ne se désactivent pas. | `NotificationsCard.tsx`, `account.notif_messages`, `notif_alertes` |

## 3. Catalogue des emails

| # | Déclencheur | Destinataire | Objet / contenu | Gabarit | Source |
|---|---|---|---|---|---|
| E1 | Inscription, renvoi du lien | Nouvel inscrit | Lien d'activation valable 48 h | `email-activation.html` | `AuthServiceImpl.signup` |
| E2 | Mot de passe oublié | Titulaire | Code à 8 chiffres valable 15 min | `email-password-reset.html` | `AuthServiceImpl.forgotPassword` |
| E3 | Invitation d'un agent, renvoi | Agent | Lien à usage unique (7 jours) pour choisir son mot de passe, entreprise, nom du responsable | `email-invitation-agent.html` | `InvitationAgentService.java` |
| E4 | Dossier d'identité validé | Titulaire | « Votre pièce d'identité a été validée » : vous pouvez publier | `email-notification.html` | `UserServiceImpl.validerPieceIdentite` |
| E5 | Dossier d'identité refusé | Titulaire | « Votre pièce d'identité a été refusée » + motif | idem | idem |
| E6 | Annonce masquée (par la modération ou automatiquement) | Propriétaire | Titre, référence, motif ; l'annonce reste corrigeable | idem | `ModerationAnnonceService.java` |
| E7 | Annonce rejetée | Propriétaire | Titre, référence, motif | idem | idem |
| E8 | Annonce remise en ligne par la modération | Propriétaire | « Votre annonce est de nouveau en ligne » | idem | idem |
| E9 | Masquage système du compte | Titulaire | « Vos annonces ont été masquées » + motif, publication et modification suspendues | idem | `AdminServiceImpl.masquerAnnoncesCompte` |
| E10 | Levée du masquage | Titulaire | « Vos annonces sont de nouveau visibles » | idem | `AdminServiceImpl.afficherAnnoncesCompte` |
| E11 | J-7 avant l'expiration (tâche de 03:00) | Propriétaire | « Votre annonce expire bientôt » + date + rappel de prolongation | idem | `AnnonceExpirationService.java` |
| E12 | Expiration (tâche de 03:00) | Propriétaire | « Votre annonce a expiré » + rappel de prolongation | idem | idem |
| E14 | Connexion d'un compte du staff | Administrateur, modérateur | Code de connexion à 6 chiffres, valable 10 min (effacé de la file après l'envoi) | idem | `VerificationConnexionService.java` |
| E15 | Connexion réussie d'un compte du staff | Administrateur, modérateur | Alerte : date, appareil, adresse IP approximative, adresse du support | idem | idem |
| E16 | Réexamen terminé, masquage maintenu | Propriétaire | « Votre annonce reste masquée » + nouveau motif + rappel qu'elle reste corrigeable | idem | `ModerationAnnonceService.java` |
| E17 | Entreprise vérifiée | Professionnel | « Votre agence est vérifiée » : le badge est affiché | idem | `VerificationEntrepriseService.java` |
| E18 | Vérification de l'entreprise refusée | Professionnel | Motif et justificatif à renvoyer | idem | idem |
| E19 | Compte non activé à J+5 | Inscrit | Nouveau lien d'activation ; suppression du compte à J+7 sans activation | `email-relance-activation.html` | `PurgeComptesNonActivesService.java` |
| E20 | Clé de licence vendue | Acheteur | Reçu : clé, type, montant, moyen et référence de paiement, date | `email-notification.html` | `LicenceServiceImpl.envoyerRecu` |
| E21 | Activation du mode licence | Comptes au-delà des annonces gratuites | Date d'effet (J+30), prix, contact de vente | idem | `LicenceServiceImpl.prevenirComptesConcernes` |
| E22 | Avertissement reçu | Titulaire | Niveau, motif, validité de 6 mois ; suspension éventuelle et moyen de la contester | idem | `AdminServiceImpl.notifierAvertissement` |
| E23 | Compte inactif depuis 2 ans | Titulaire | Suppression du compte dans 3 mois sans connexion ; se connecter suffit à le garder | idem | `InactiviteComptesService.relancer` |
| E24 | Changement de rôle | Titulaire | Nouveau rôle, reconnexion nécessaire | idem | `AdminServiceImpl.changerRole` |

Pages HTML associées (hors emails) : `page-activation-success.html`, `page-activation-error.html` (lien d'activation ouvert dans un navigateur).

## 4. Catalogue des notifications push

| Déclencheur | Destinataire | Contenu | Ouverture | Source |
|---|---|---|---|---|
| Nouveau message reçu (conversation non affichée à l'écran) | Participant | « Nouveau message de <prénom> à propos de « <titre> » », sans le contenu | La conversation | `MessagingServiceImpl.sendMessage`, module 06 |
| Nouvelles annonces pour une alerte (au plus une par alerte et par jour) | Titulaire de l'alerte | « N nouvelles annonces pour « <nom de l'alerte> » » | La liste des annonces de l'alerte | `AlerteRechercheService.java`, module 04 |

## 5. Événements sans notification

Les événements suivants n'informent pas encore la personne concernée ; ils sont repris dans les évolutions ([98](98-evolutions.md)) : suspension, réactivation ou désactivation d'un compte par la modération ; demande de suppression du compte et anonymisation ; changement ou réinitialisation du mot de passe ; licence bientôt expirée ; désactivation ou réactivation d'une entreprise ; suspension, réactivation ou retrait d'un agent ; décision sur une demande d'ajout de quartier ; décision sur un signalement (pour le signaleur) ; favori clôturé ou en baisse de prix. Les emails E6 à E12 ne contiennent pas de lien vers l'annonce, et le pied de page ne renvoie pas vers la politique de confidentialité.

## 6. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-11-01 | Une indisponibilité du serveur d'email n'empêche ni l'inscription ni aucune action de modération ; l'email part au nouvel essai suivant. |
| CA-11-02 | Si l'action de modération échoue (retour arrière), aucun email n'est envoyé. |
| CA-11-03 | Les emails E6 à E12 contiennent le titre et la référence de l'annonce concernée. |
| CA-11-04 | Aucun email n'est envoyé à un compte anonymisé, y compris les relances d'expiration de ses anciennes annonces. |
| CA-11-05 | Un email qui échoue cinq fois est abandonné et l'abandon apparaît dans les journaux en erreur. |
| CA-11-06 | Un utilisateur qui coupe « Alertes de recherche » ne reçoit plus de notification d'alerte, mais continue de recevoir les emails transactionnels. |
