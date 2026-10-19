# Module 01 — Authentification et comptes

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Permettre à un visiteur de créer un compte (particulier ou professionnel), de l'activer par email, de se connecter avec son **email ou son numéro de téléphone**, de gérer son mot de passe et de maintenir une session sécurisée. Le module couvre aussi la première connexion des agents, la double authentification du staff, la réactivation d'un compte dont la suppression est en cours et la purge des comptes jamais activés.

Hors périmètre :

- connexion via un réseau social, connexion sans mot de passe (lien magique, code SMS) ;
- vérification du téléphone par SMS ou WhatsApp (DEC-05, reportée : [98](98-evolutions.md)) ;
- changement d'email par l'utilisateur (module 02, RG-02-01) ;
- passage d'un compte particulier à professionnel, ou l'inverse, par l'utilisateur : seul un administrateur change un rôle, avec des garde-fous (module 10, DEC-37) ;
- liste des sessions ouvertes et déconnexion d'un appareil précis : le seul moyen est de changer de mot de passe, ce qui ferme toutes les sessions.

Parcours de bout en bout concernés : SFG §5, P1 (inscription et activation), P2 (première connexion d'un agent) et P5 (réactivation).

## 2. Acteurs et droits

| Action | Visiteur | Connecté | Agent (mot de passe temporaire) |
|---|---|---|---|
| S'inscrire, activer, renvoyer le lien, mot de passe oublié, réinitialiser | ✅ | ✅ | ✅ |
| Se connecter, réactiver son compte | ✅ | — | ✅ |
| Changer son mot de passe | — | ✅ | ✅ (obligatoire) |
| Rafraîchir le jeton, se déconnecter | — | ✅ | ✅ |
| Toute autre action | — | ✅ | ❌ (réponse 423 tant que le mot de passe n'est pas changé) |

## 3. User stories

| ID | En tant que… | je veux… | afin de… |
|---|---|---|---|
| US-01-01 | visiteur | créer un compte particulier ou professionnel | publier et contacter des annonceurs |
| US-01-02 | nouvel inscrit | activer mon compte depuis le lien reçu par email | prouver que l'adresse m'appartient |
| US-01-03 | inscrit non activé | recevoir un nouveau lien d'activation | finir mon inscription si le lien a expiré |
| US-01-04 | utilisateur | me connecter avec mon email ou mon téléphone | accéder à mon espace |
| US-01-05 | utilisateur | recevoir un code pour réinitialiser mon mot de passe | retrouver l'accès à mon compte |
| US-01-06 | utilisateur connecté | changer mon mot de passe | sécuriser mon compte (toutes mes autres sessions sont fermées) |
| US-01-07 | agent | remplacer mon mot de passe temporaire à la première connexion | accéder à l'application |
| US-01-08 | utilisateur ayant demandé la suppression de son compte | réactiver mon compte pendant 30 jours | revenir sur ma décision |
| US-01-09 | utilisateur | rester connecté sans ressaisir mes identifiants et me déconnecter | gagner du temps en sécurité |
| US-01-10 | modérateur ou administrateur | confirmer chaque connexion par un code reçu par email | protéger les accès de l'administration |

## 4. Règles de gestion

### 4.1 Inscription

| ID | Règle | Source |
|---|---|---|
| RG-01-01 | Champs obligatoires : email (≤ 100, format valide), nom (≤ 50), prénom (≤ 50), mot de passe (8 à 64 caractères), acceptation des CGU. Le téléphone est facultatif ; s'il est fourni, il doit être au format international `+` ou `00` suivi de 7 à 15 chiffres. | `SignupRequest.java` |
| RG-01-02 | L'email est mis en minuscules et doit être unique. | `AuthServiceImpl.signup` |
| RG-01-03 | Le téléphone est normalisé (espaces, tirets, points et parenthèses supprimés, `00` remplacé par `+`) et doit être unique, car il sert aussi d'identifiant de connexion. | `AuthServiceImpl.signup`, `Identifiants.java` |
| RG-01-04 | Rôles autorisés à l'inscription : PARTICULIER (par défaut) ou PROFESSIONNEL, quelle que soit la casse. MODERATEUR, ADMINISTRATEUR et toute autre valeur sont refusés. | `SignupRequest.java`, `AuthServiceImpl.signup` |
| RG-01-05 | **Force du mot de passe**, identique dans l'API et dans l'app : 8 à 64 caractères, au moins une minuscule, une majuscule, un chiffre et un caractère spécial quelconque (tout caractère qui n'est ni une lettre non accentuée ni un chiffre). | `MotDePasse.java`, `APP/src/lib/validation.ts` |
| RG-01-06 | L'acceptation des CGU est obligatoire ; l'API enregistre sa date et la version des CGU en vigueur (`app.cgu.version`). | `User.cguAccepteesLe`, `cguVersion` |
| RG-01-07 | Le compte est créé au statut EN_ATTENTE_ACTIVATION. Un lien d'activation valable **48 h** (`/activate?token=<UUID>`) est envoyé par email (E1). | `AuthServiceImpl.signup` |
| RG-01-08 | Les emails partent par la file d'envoi avec nouvel essai : un échec d'envoi n'annule pas l'inscription. | `NotificationService`, `EnvoiEmailsPlanifie` |

### 4.2 Activation

| ID | Règle | Source |
|---|---|---|
| RG-01-10 | Deux points d'entrée partagent la même logique : la page HTML `GET /activate?token=` (lien de l'email) et l'API JSON `GET /api/auth/activate?token=` (lien profond de l'app). | `ActivationController.java`, `AuthController.java` |
| RG-01-11 | Jeton absent, inconnu ou déjà utilisé → « Lien d'activation invalide ou déjà utilisé. » ; jeton expiré → « Lien d'activation expiré. Demandez un nouveau lien d'activation. » | `AuthServiceImpl.activateAccount` |
| RG-01-12 | En cas de succès, le compte passe ACTIF et le jeton est effacé (usage unique). | idem |
| RG-01-13 | Renvoi du lien : réponse identique que le compte existe ou non. Au plus **3 renvois par adresse** sur 15 min. Aucun envoi si le compte n'est pas EN_ATTENTE_ACTIVATION ou s'il s'agit d'un agent. | `AuthServiceImpl.resendActivation` |

### 4.3 Connexion et session

| ID | Règle | Source |
|---|---|---|
| RG-01-14 | L'identifiant est un email (s'il contient `@`) ou un téléphone, normalisés. Un repli sur la saisie brute est prévu pour les comptes anciens non normalisés. | `AuthServiceImpl` |
| RG-01-15 | Après **5 échecs en 15 min** sur un même identifiant, celui-ci est verrouillé jusqu'à la fin de la fenêtre (429). Les identifiants inconnus comptent comme des échecs (anti-énumération). Les compteurs sont gardés en mémoire : un redémarrage de l'API les remet à zéro, et ils ne sont pas partagés entre plusieurs instances. | `LoginAttemptTracker.java` |
| RG-01-16 | Statut et connexion : ACTIF → autorisé ; EN_ATTENTE_ACTIVATION → refusé (« Votre compte n'est pas activé… »), **sauf pour un agent qui doit changer son mot de passe** ; SUSPENDU → refusé ; INACTIF → refusé, avec la date limite de réactivation si une suppression a été demandée et que le mot de passe est correct. | `AuthServiceImpl.signin` |
| RG-01-17 | Une connexion réussie renvoie : identifiant, email, jeton d'accès (15 min), jeton de rafraîchissement (7 jours ; 24 h pour le staff, RG-01-38), rôles (`ROLE_xxx`) et l'indicateur `mustChangePassword`. | idem |
| RG-01-18 | Rafraîchissement : chaque jeton de rafraîchissement est enregistré en base (`refresh_token`) et **ne sert qu'une fois** : le rafraîchissement renvoie un nouveau jeton d'accès **et** un nouveau jeton de rafraîchissement de la même session (rotation). Le compte doit être actif et le jeton émis après le dernier changement de mot de passe. Un jeton déjà utilisé, présenté plus de 10 secondes après (deux onglets ou un réessai réseau rapproché sont tolérés), est un **rejeu** : toute la session est révoquée. | `SessionService.java` |
| RG-01-19 | Déconnexion : la session de l'appareil est révoquée **en base** (elle survit à un redémarrage de l'API) et le jeton d'accès (15 min) est mis en liste noire. Un changement de mot de passe, une suspension, une désactivation, un changement de rôle ou une suppression de compte révoquent toutes les sessions du compte. | `SessionService.java`, `AuthController.java` |
| RG-01-20 | Limitation par IP : 30 req/min sur la connexion, l'inscription et la déconnexion ; **120 req/min sur le rafraîchissement** (les opérateurs mobiles partagent une IP entre de nombreux abonnés) ; 5 req/15 min sur mot de passe oublié, réinitialisation, réactivation, renvoi d'activation et activation. L'essai de mots de passe reste limité par compte (RG-01-15). | `RateLimitFilter.java` |
| RG-01-21 | Toute ouverture ou rotation de session enregistre la **dernière activité** du compte (`derniere_connexion`), base de la purge des comptes inactifs (module 02, RG-02-40). | `SessionService.emettre` |

### 4.4 Mot de passe

| ID | Règle | Source |
|---|---|---|
| RG-01-22 | Mot de passe oublié : réponse identique que l'email existe ou non. Un **code à 8 chiffres valable 15 min** est envoyé par email (E2), seulement pour un compte ACTIF ou un agent en attente de changement de mot de passe : la demande pour un compte suspendu ou désactivé est ignorée sans le signaler. Chaque nouveau code remet à zéro le compteur d'essais. | `AuthServiceImpl.forgotPassword` |
| RG-01-23 | Réinitialisation : email + code + nouveau mot de passe (RG-01-05). Au plus 5 codes erronés par email sur 15 min. En cas de succès, le code est effacé et **toutes les sessions sont invalidées**. | `AuthServiceImpl.resetPassword` |
| RG-01-24 | Changement (connecté) : l'ancien mot de passe doit être correct ; le nouveau respecte RG-01-05. Toutes les sessions sont invalidées et de nouveaux jetons sont renvoyés à l'appelant. L'application impose en plus que le nouveau mot de passe soit différent de l'ancien. | `AuthServiceImpl.changePassword`, `validation.ts` |
| RG-01-25 | Mot de passe à changer (administrateur initial, RG-01-41) : tant que `mustChangePassword = true`, toute requête renvoie **423 Locked**, sauf changement de mot de passe, déconnexion, rafraîchissement et `GET /api/users/me`. L'application redirige d'office vers l'écran de changement. Les agents, invités par lien, choisissent leur mot de passe en acceptant l'invitation (module 07). | `MustChangePasswordFilter.java`, `APP/app/_layout.tsx` |

### 4.5 Réactivation d'un compte en cours de suppression

| ID | Règle | Source |
|---|---|---|
| RG-01-26 | `POST /api/auth/reactivate` (identifiant + mot de passe). Le mot de passe est vérifié avant tout message sur le statut. | `AuthServiceImpl.reactivate` |
| RG-01-27 | Seul un compte INACTIF dont la suppression a été demandée par son titulaire il y a **moins de 30 jours** est réactivable. Un compte désactivé par la modération ne l'est pas. | idem |
| RG-01-28 | La réactivation rétablit le statut ACTIF, réactive l'entreprise et les agents désactivés par la suppression (pour un professionnel), **mais pas les annonces**, qui restent hors ligne et doivent être réaffichées une par une. | `CompteSuppressionService.restaurerApresReactivation` |

### 4.6 Effet d'un changement de statut

| ID | Règle | Source |
|---|---|---|
| RG-01-29 | Chaque requête authentifiée relit le compte en base. Si le compte n'est plus utilisable (statut autre que ACTIF, sauf l'agent en attente de changement de mot de passe), si son entreprise est désactivée (agent, RG-01-34), ou si le jeton a été émis avant le dernier changement de mot de passe, la requête est traitée comme anonyme : les écrans protégés reçoivent 401. Une suspension, une désactivation ou une suppression prend donc effet **dès la requête suivante**. | `AuthTokenFilter.java`, `UserDetailsImpl.java` |
| RG-01-30 | Sur un 401, l'app tente un rafraîchissement. S'il est refusé (401 jeton révoqué ou expiré, 403 compte suspendu ou désactivé), les jetons sont effacés et l'utilisateur est déconnecté. Une coupure réseau ou un 429 **ne déconnecte pas** : les jetons sont gardés pour réessayer. | `APP/src/api/client.ts` |
| RG-01-31 | La règle de visibilité exige un compte propriétaire ACTIF (SFG §8, DEC-01). Une suspension ou une désactivation par la modération, y compris la suspension par avertissement grave, retire aussitôt toutes les annonces du compte du public, sans changer leur état ; la levée les rend visibles telles qu'avant. Pendant ce temps, les relances d'expiration sont suspendues et l'échéance continue de courir. Les annonces restent comptées dans les annonces gratuites et le quota (RG-08-22). La messagerie refuse d'écrire à un compte qui n'est pas ACTIF (module 06). | `fonction annonce_est_visible` (V15, V25) |
| RG-01-32 | Le changement de statut d'un compte par la modération n'envoie pas d'email au titulaire : il découvre la suspension en se connectant (« Votre compte est temporairement suspendu… »). Les emails de sécurité sur les événements du compte sont une évolution ([98](98-evolutions.md)). Seuls l'avertissement (E22) et la suspension qui l'accompagne sont notifiés (module 09). | module 11 |

### 4.7 Comptes non activés et identifiants

| ID | Règle | Source |
|---|---|---|
| RG-01-33 | **Purge des comptes non activés** (DEC-06) : tâche quotidienne (03:15). À **J+5** après l'inscription, un compte toujours non activé reçoit une relance avec un nouveau lien d'activation (E19) ; à **J+7**, il est **supprimé définitivement** (aucune donnée à conserver). Son email et son téléphone redeviennent libres. Les agents créés par une entreprise ne sont pas concernés. | `PurgeComptesNonActivesService.java` |
| RG-01-34 | Quand son entreprise est désactivée (DEC-12), un **agent** ne peut plus se connecter (« L'entreprise <nom> est désactivée. Contactez votre responsable. ») et ses sessions en cours sont refusées dès la requête suivante. Son statut n'est pas modifié : il retrouve l'accès à la réactivation. Le **professionnel** propriétaire garde l'accès, pour consulter sa situation et contacter le support, mais ne peut ni publier ni réafficher. | `AuthServiceImpl.signin`, `AuthTokenFilter.java` |
| RG-01-35 | Le téléphone n'est pas vérifié. Si un tiers a réservé un numéro, son vrai titulaire ne peut ni s'inscrire avec ce numéro ni le récupérer (règle cible DEC-05 : [98](98-evolutions.md)). Pour l'email, le vrai titulaire reçoit les liens : il peut activer le compte (renvoi du lien) ou en reprendre la main (mot de passe oublié). | `AuthServiceImpl.signup` |

### 4.8 Double authentification du staff (DEC-03)

Le contrôle est actif par défaut ; seule la configuration de test le désactive (`app.security.staff-2fa-actif`).

| ID | Règle | Source |
|---|---|---|
| RG-01-36 | Concerne les comptes MODERATEUR et ADMINISTRATEUR, à **chaque connexion**. Après un identifiant et un mot de passe corrects, l'API ne renvoie pas de jetons mais une demande de code (202, avec un identifiant de vérification) ; un **code à 6 chiffres** est envoyé par email (E14), valable **10 minutes**. | `VerificationConnexionService.java` |
| RG-01-37 | Saisie du code : 5 essais au plus par code, au-delà le code est annulé et il faut se reconnecter ; renvoi possible 3 fois par 15 minutes (`/verification-code/renvoyer`). Le code est à usage unique et n'est jamais journalisé. | idem |
| RG-01-38 | Les jetons ne sont délivrés qu'après le code. Le jeton de rafraîchissement d'un compte du staff dure **24 h** au lieu de 7 jours ; au-delà, nouvelle connexion avec code. | idem, `SessionService.dureeSession` |
| RG-01-39 | **Codes de secours** : à la première connexion avec double authentification, 8 codes à usage unique sont affichés une seule fois, pour se connecter si l'email est indisponible. Ils sont stockés hachés et régénérables depuis le profil, en redonnant le mot de passe ; la régénération annule les précédents. | idem |
| RG-01-40 | Chaque connexion réussie d'un compte du staff déclenche un **email d'alerte** (E15 : date, appareil, adresse IP approximative, et l'adresse du support à contacter si ce n'était pas lui). | idem |
| RG-01-41 | Un compte promu modérateur passe à la double authentification dès sa connexion suivante ; ses sessions en cours sont fermées au changement de rôle. L'administrateur initial (RG-10-14) doit en plus changer son mot de passe à sa première connexion. | `AdminServiceImpl.changerRole` |

## 5. Écrans et parcours

| Écran | Route | Contenu | Validations / comportements |
|---|---|---|---|
| Connexion | `app/(auth)/login.tsx` | Email ou téléphone, mot de passe | Messages : identifiants incorrects, compte non activé (bouton « Renvoyer le lien d'activation »), suppression en cours (bouton « Réactiver mon compte ») ; saisie du code pour le staff |
| Inscription | `app/(auth)/register.tsx` | Type de compte (Particulier « Acheteur ou vendeur individuel » / Professionnel « Agent immobilier ou agence »), prénom, nom, email, téléphone (« recommandé », préfixe +224), mot de passe et confirmation, CGU | Schéma Zod `signupSchema`, liste de contrôle du mot de passe affichée sous le champ |
| Activation | `app/(auth)/activate.tsx` | Résultat de l'activation par lien profond | « Compte activé ! » ou « Activation échouée » |
| Mot de passe oublié | `app/(auth)/forgot-password.tsx` | Email | Bouton « Recevoir le code » |
| Réinitialisation | `app/(auth)/reset-password.tsx` | Email, code, nouveau mot de passe et confirmation | « Code invalide ou expiré. Demandez un nouveau code. » |
| Changement de mot de passe | `app/(auth)/change-password.tsx` | Mot de passe actuel, nouveau mot de passe et confirmation | Mode « Mot de passe temporaire » avec bouton « Se déconnecter » |
| Codes de secours | `app/regenerer-codes-secours.tsx` | Mot de passe, puis les 8 nouveaux codes | Staff seulement |

Parcours de garde (`app/_layout.tsx`) : un utilisateur connecté qui arrive sur un écran d'authentification est renvoyé vers les onglets ; si `mustChangePassword` vaut vrai, il est renvoyé vers le changement de mot de passe. Après une connexion demandée depuis une fiche, l'utilisateur revient sur la fiche (`src/lib/auth-redirect.ts`).

Côté client (`src/api/client.ts`) : le jeton est rafraîchi automatiquement sur une réponse 401, puis la requête est rejouée ; une seule demande de rafraîchissement part à la fois, les requêtes concurrentes l'attendent (RG-01-30). Sur Android, les jetons sont dans `expo-secure-store`. Sur le **web**, seul le jeton d'accès (15 min) est dans le `localStorage` ; le jeton de rafraîchissement est dans un **cookie `HttpOnly`, `Secure`, `SameSite=Strict`** limité à `/api/auth`, posé par l'API quand la requête porte l'en-tête `X-Client: web`.

### 5.1 Emails du module

| Événement | Email | Renvoi |
|---|---|---|
| Inscription, renvoi du lien | E1 : lien d'activation valable 48 h | module 11 |
| Compte non activé à J+5 | E19 : nouveau lien ; suppression à J+7 | module 11 |
| Mot de passe oublié | E2 : code à 8 chiffres valable 15 min | module 11 |
| Invitation d'un agent | lien pour choisir son mot de passe | module 07 |
| Connexion du staff | E14 : code de connexion ; E15 : alerte de connexion | module 11 |
| Changement ou réinitialisation du mot de passe, demande de suppression, réactivation, suspension, désactivation | aucun (évolution : [98](98-evolutions.md)) | — |

## 6. API

| Méthode | URL | Accès | Entrée | Sortie / erreurs |
|---|---|---|---|---|
| POST | `/api/auth/signup` | public | `SignupRequest` | 201 message ; 400 (email déjà utilisé, téléphone déjà utilisé, rôle interdit, mot de passe trop faible, CGU non acceptées) |
| GET | `/api/auth/activate?token=` | public | jeton | 200 / 400 |
| GET | `/activate?token=` | public | jeton | Page HTML de succès ou d'erreur |
| POST | `/api/auth/resend-activation` | public | `{email}` | 200 (toujours) / 429 |
| POST | `/api/auth/signin` | public | `{identifier, password}` | 200 `JwtResponse` ; 202 (code demandé, staff) ; 401 ; 403 (compte inactif) ; 429 |
| POST | `/api/auth/verification-code` | public | `{verificationId, code}` (code email ou code de secours) | 200 `JwtResponse` (+ `codesSecours` la première fois) ; 401 ; 403 |
| POST | `/api/auth/verification-code/renvoyer` | public | `{verificationId}` | 200 `{verificationId, …}` ; 401 ; 429 |
| POST | `/api/users/me/codes-secours` | modérateur, administrateur | `{password}` | 200 `{codesSecours}` ; 401 |
| POST | `/api/auth/accept-invitation` | public | `{token, password}` | 200 ; 400 |
| POST | `/api/auth/refresh` | public | `{refreshToken}` (application) ou cookie + `X-Client: web` (site) | 200 `{token, refreshToken, type}` (`refreshToken` absent pour le site, il est dans le cookie) ; 401 ; 403 |
| POST | `/api/auth/logout` | public | `{refreshToken}` facultatif | 200 |
| POST | `/api/auth/forgot-password` | public | `{email}` | 200 (toujours) |
| POST | `/api/auth/reset-password` | public | `{email, token, newPassword}` | 200 ; 400 ; 429 |
| POST | `/api/auth/change-password` | connecté | `{oldPassword, newPassword}` | 200 `{message, token, refreshToken, type}` ; 400 |
| POST | `/api/auth/reactivate` | public | `{identifier, password}` | 200 `JwtResponse` ; 401 ; 403 ; 422 (déjà actif) |

## 7. Données

`account` : `email`, `password` (BCrypt), `telephone`, `statut`, `activation_code`, `activation_code_expiry` (ms), `reset_password_token`, `reset_password_token_expiry` (ms), `password_changed_at` (ms), `must_change_password`, `motif_statut`, `date_suppression_demandee`, `relance_activation_envoyee`, `cgu_acceptees_le`, `cgu_version`, `derniere_connexion`, `date_relance_inactivite`. Sessions : `refresh_token` (V22). Double authentification : `verification_connexion`, `code_secours`.

## 8. Cycle de vie du compte

```
           inscription                 activation (lien 48 h)
 (néant) ─────────────► EN_ATTENTE_ACTIVATION ──────────────► ACTIF
                               │  J+7 sans activation : supprimé
 ACTIF ── suspension (modération, avertissement grave) ──► SUSPENDU ── levée ──► ACTIF
 ACTIF ── suppression demandée par le titulaire ──► INACTIF (30 j réactivable) ── job 03:30 ──► INACTIF anonymisé (définitif)
 ACTIF ── désactivation par la modération ──► INACTIF (non réactivable par le titulaire)
 ACTIF ── 2 ans sans connexion ──► relance (E23) ── 3 mois sans connexion ──► INACTIF anonymisé (définitif)
 tout statut ── suppression par l'administrateur ──► INACTIF anonymisé (définitif)
```

Pour chaque état, ce que deviennent la connexion et les annonces, et qui peut en sortir : voir le tableau de synthèse de la SFG §9.2. À retenir : un compte qui n'est pas ACTIF n'a aucune annonce visible du public (RG-01-31).

## 9. Messages utilisateur principaux

« Votre compte a été créé. Un lien d'activation vous a été envoyé par email. » · « Identifiant ou mot de passe incorrect. » · « Trop de tentatives de connexion. Réessayez dans 15 minutes. » · « Votre compte est temporairement suspendu. Contactez l'administrateur. » · « Votre compte est en cours de suppression. Vous pouvez le réactiver jusqu'au jj/mm/aaaa. » · « L'entreprise <nom> est désactivée. Contactez votre responsable. » · « Session expirée suite à un changement de mot de passe. Veuillez vous reconnecter. »

## 10. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-01-01 | Un mot de passe accepté par la liste de contrôle de l'app est **toujours** accepté par l'API, et inversement. |
| CA-01-02 | Après 5 mots de passe erronés, la 6e tentative renvoie 429, y compris pour un identifiant inexistant. |
| CA-01-03 | Un lien d'activation utilisé deux fois renvoie « invalide ou déjà utilisé ». Un lien de plus de 48 h renvoie « expiré ». |
| CA-01-04 | Après un changement ou une réinitialisation du mot de passe, un ancien jeton de rafraîchissement est refusé. |
| CA-01-05 | Un compte avec mot de passe à changer reçoit 423 sur `GET /api/biens-immo/user` et 200 sur `GET /api/users/me`. |
| CA-01-06 | Un compte supprimé depuis 29 jours est réactivable ; à 31 jours, il est anonymisé et la réactivation échoue. |
| CA-01-07 | Un utilisateur connecté que la modération suspend reçoit 401 à sa requête suivante, son rafraîchissement renvoie 403, et l'app le ramène à l'écran de connexion. |
| CA-01-08 | Après une déconnexion, le jeton de rafraîchissement utilisé est refusé (401), y compris après un redémarrage du serveur. |
| CA-01-09 | La réactivation d'un professionnel rétablit son entreprise et les agents désactivés par sa suppression ; ses annonces et celles de ses agents restent hors ligne. |
| CA-01-10 | Un renvoi du lien d'activation pour un agent, un compte actif ou un email inconnu renvoie 200 sans envoyer d'email. |
| CA-01-11 | Une connexion par téléphone accepte indifféremment `+224 6xx xx xx xx`, `00224 6xxxxxxxx` et `+2246xxxxxxxx` pour le même compte. |
| CA-01-12 | Une coupure réseau pendant un rafraîchissement ne déconnecte pas l'utilisateur. |
| CA-01-13 | Un modérateur dont le mot de passe est correct ne reçoit aucun jeton tant qu'il n'a pas saisi le code reçu par email ; un code de plus de 10 minutes est refusé, et un code de secours déjà utilisé aussi. |
| CA-01-14 | Après la suspension d'un particulier, aucune de ses annonces n'apparaît dans le catalogue, la recherche ni sur leur page de partage ; après la levée, elles réapparaissent dans leur état antérieur. |
| CA-01-15 | Un compte inscrit il y a 8 jours et jamais activé n'existe plus ; son email peut servir à une nouvelle inscription. |
| CA-01-16 | Une demande de mot de passe oublié pour un compte suspendu renvoie 200 sans envoyer de code. |
