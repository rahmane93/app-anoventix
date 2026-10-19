# Module 01 — Authentification et comptes

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à un visiteur de créer un compte (particulier ou professionnel), de l'activer par email, de se connecter avec son **email ou son numéro de téléphone**, de gérer son mot de passe et de maintenir une session sécurisée. Le module couvre aussi la première connexion des agents (mot de passe temporaire) et la réactivation d'un compte dont la suppression est en cours.

Hors périmètre (rien de tout cela n'est implémenté) :

- connexion via un réseau social, connexion sans mot de passe (lien magique, code SMS), double authentification ;
- vérification du téléphone, alors qu'il sert d'identifiant (ECART-53) ;
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

## 4. Règles de gestion

### 4.1 Inscription

| ID | Règle | Source |
|---|---|---|
| RG-01-01 | Champs obligatoires : email (≤ 50, format valide), nom (≤ 50), prénom (≤ 50), mot de passe (8 à 40 caractères). Le téléphone est facultatif ; s'il est fourni, il doit être au format international `+` ou `00` suivi de 7 à 15 chiffres. | `SignupRequest.java` |
| RG-01-02 | L'email est mis en minuscules et doit être unique. | `AuthServiceImpl.java:271-279` |
| RG-01-03 | Le téléphone est normalisé (espaces, tirets, points et parenthèses supprimés, `00` remplacé par `+`) et doit être unique, car il sert aussi d'identifiant de connexion. | `AuthServiceImpl.java:282-285`, `Identifiants.java` |
| RG-01-04 | Rôles autorisés à l'inscription : PARTICULIER (par défaut) ou PROFESSIONNEL. MODERATEUR et ADMINISTRATEUR sont refusés, toute autre valeur aussi. | `AuthServiceImpl.java:287-321` |
| RG-01-05 | **Force du mot de passe (API)** : au moins 8 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial parmi `! @ # $ % ^ & * ( ) +` (l'expression `[!@#$%^&*()-+]` définit une plage `)` à `+` : le tiret, le point, le soulignement et le point d'interrogation sont refusés). | `AuthServiceImpl.java:562-568` |
| RG-01-06 | **Force du mot de passe (application)** : au moins 8 caractères, une majuscule, un chiffre et un caractère spécial *quelconque*. La règle diffère de RG-01-05 → **ECART-01**. | `APP/src/lib/validation.ts:15-27` |
| RG-01-07 | L'utilisateur doit accepter les CGU dans l'application. Cette acceptation n'est ni transmise ni conservée par l'API (**ECART-41**). | `validation.ts` (`acceptCgu`) |
| RG-01-08 | Le compte est créé au statut EN_ATTENTE_ACTIVATION. Un lien d'activation valable **48 h** (`/activate?token=<UUID>`) est envoyé par email. | `AuthServiceImpl.java:353-362` |
| RG-01-09 | Si l'envoi de l'email échoue, l'inscription n'est pas annulée (envoi asynchrone, erreur seulement journalisée). | `NotificationService.java:86-101` |

### 4.2 Activation

| ID | Règle | Source |
|---|---|---|
| RG-01-10 | Deux points d'entrée partagent la même logique : la page HTML `GET /activate?token=` (lien de l'email) et l'API JSON `GET /api/auth/activate?token=` (lien profond de l'app). | `ActivationController.java`, `AuthController.java:51` |
| RG-01-11 | Jeton absent, inconnu ou déjà utilisé → « Lien d'activation invalide ou déjà utilisé. » ; jeton expiré → « Lien d'activation expiré. Demandez un nouveau lien d'activation. » | `AuthServiceImpl.java:365-390` |
| RG-01-12 | En cas de succès, le compte passe ACTIF et le jeton est effacé (usage unique). | idem |
| RG-01-13 | Renvoi du lien : réponse identique que le compte existe ou non. Au plus **3 renvois par adresse** sur 15 min. Aucun envoi si le compte n'est pas EN_ATTENTE_ACTIVATION ou s'il s'agit d'un agent. | `AuthServiceImpl.java:328-350` |

### 4.3 Connexion et session

| ID | Règle | Source |
|---|---|---|
| RG-01-14 | L'identifiant est un email (s'il contient `@`) ou un téléphone, normalisés. Un repli sur la saisie brute est prévu pour les comptes anciens non normalisés. | `AuthServiceImpl.java:542-554` |
| RG-01-15 | Après **5 échecs en 15 min** sur un même identifiant, celui-ci est verrouillé jusqu'à la fin de la fenêtre (429). Les identifiants inconnus comptent comme des échecs (anti-énumération). | `LoginAttemptTracker.java` |
| RG-01-16 | Statut et connexion : ACTIF → autorisé ; EN_ATTENTE_ACTIVATION → refusé (« Votre compte n'est pas activé… »), **sauf pour un agent qui doit changer son mot de passe** ; SUSPENDU → refusé ; INACTIF → refusé, avec la date limite de réactivation si une suppression a été demandée et que le mot de passe est correct. | `AuthServiceImpl.java:100-128` |
| RG-01-17 | Une connexion réussie renvoie : identifiant, email, jeton d'accès (15 min), jeton de rafraîchissement (7 j), rôles (`ROLE_xxx`) et l'indicateur `mustChangePassword`. | `AuthServiceImpl.java:148-154` |
| RG-01-18 | Rafraîchissement (corrigé, ECART-21 et ECART-51) : chaque jeton de rafraîchissement est enregistré en base (`refresh_token`) et **ne sert qu'une fois** : le rafraîchissement renvoie un nouveau jeton d'accès **et** un nouveau jeton de rafraîchissement de la même session (rotation). Le compte doit être actif et le jeton émis après le dernier changement de mot de passe. Un jeton déjà utilisé, présenté plus de 10 secondes après (deux onglets ou un réessai réseau rapproché sont tolérés), est un **rejeu** : toute la session est révoquée. Les jetons émis avant ce mécanisme sont acceptés une dernière fois, jusqu'à leur expiration. | `SessionService.java`, migration V22 |
| RG-01-19 | Déconnexion : la session de l'appareil est révoquée **en base** (elle survit à un redémarrage de l'API) et le jeton d'accès (15 min) est mis en liste noire en mémoire. Un changement de mot de passe, une suspension, une désactivation ou une suppression de compte révoquent toutes les sessions du compte. | `SessionService.java`, `AuthController.java` |
| RG-01-20 | Limitation par IP (corrigé, ECART-05) : 30 req/min sur la connexion, l'inscription et la déconnexion ; **120 req/min sur le rafraîchissement** (les opérateurs mobiles partagent une IP entre de nombreux abonnés) ; 5 req/15 min sur mot de passe oublié, réinitialisation, réactivation, renvoi d'activation et activation. L'essai de mots de passe reste limité par compte (RG-01-14). | `RateLimitFilter.java` |

### 4.4 Mot de passe

| ID | Règle | Source |
|---|---|---|
| RG-01-21 | Mot de passe oublié : réponse identique que l'email existe ou non. Un **code à 8 chiffres valable 15 min** est envoyé par email. Chaque nouveau code remet à zéro le compteur d'essais. | `AuthServiceImpl.java:393-426` |
| RG-01-22 | Réinitialisation : email + code + nouveau mot de passe. Au plus 5 codes erronés par email sur 15 min. En cas de succès, le code est effacé et **toutes les sessions sont invalidées**. | `AuthServiceImpl.java:429-468` |
| RG-01-23 | Changement (connecté) : l'ancien mot de passe doit être correct ; le nouveau respecte RG-01-05. Toutes les sessions sont invalidées et de nouveaux jetons sont renvoyés à l'appelant. L'application impose en plus que le nouveau mot de passe soit différent de l'ancien. | `AuthServiceImpl.java:471-518`, `validation.ts` |
| RG-01-24 | Mot de passe à changer (administrateur initial, et agents invités avant l'invitation par lien, ECART-47) : tant que `mustChangePassword = true`, toute requête renvoie **423 Locked**, sauf changement de mot de passe, déconnexion, rafraîchissement et `GET /api/users/me`. L'application redirige d'office vers l'écran de changement. Après le changement, l'agent passe ACTIF. | `MustChangePasswordFilter.java`, `APP/app/_layout.tsx:96` |

### 4.5 Réactivation d'un compte en cours de suppression

| ID | Règle | Source |
|---|---|---|
| RG-01-25 | `POST /api/auth/reactivate` (identifiant + mot de passe). Le mot de passe est vérifié avant tout message sur le statut. | `AuthServiceImpl.java:163-226` |
| RG-01-26 | Seul un compte INACTIF dont la suppression a été demandée par son titulaire il y a **moins de 30 jours** est réactivable. Un compte désactivé par un administrateur ne l'est pas. | idem |
| RG-01-27 | La réactivation rétablit le statut ACTIF, réactive l'entreprise et les agents désactivés par la suppression (pour un pro), **mais pas les annonces**, qui restent hors ligne et doivent être réaffichées une par une. | `CompteSuppressionService.java:101-116` |

### 4.6 Effet d'un changement de statut sur une session ouverte

| ID | Règle | Source |
|---|---|---|
| RG-01-28 | Chaque requête authentifiée relit le compte en base. Si le compte n'est plus utilisable (statut autre que ACTIF, sauf l'agent en attente de changement de mot de passe), ou si le jeton a été émis avant le dernier changement de mot de passe, la requête est traitée comme anonyme : les écrans protégés reçoivent 401. Une suspension, une désactivation ou une suppression prend donc effet **dès la requête suivante**, sans attendre l'expiration du jeton d'accès. | `AuthTokenFilter.java:43-60`, `UserDetailsImpl.java:106-110` |
| RG-01-29 | Sur un 401, l'app tente un rafraîchissement. S'il est refusé (401 jeton révoqué ou expiré, 403 compte suspendu ou désactivé), les jetons sont effacés et l'utilisateur est déconnecté. Une coupure réseau ou un 429 **ne déconnecte pas** : les jetons sont gardés pour réessayer. | `APP/src/api/client.ts:240-282` |
| RG-01-30 | Un compte suspendu ou désactivé perd l'accès, mais **ses annonces restent visibles du public** (ECART-52). Une nouvelle conversation est refusée (RG-06-01), mais l'appel, WhatsApp et les conversations déjà ouvertes restent possibles (module 03 §4.6). Seuls le masquage système (module 09, RG-09-15) et la suppression demandée par le titulaire (module 02, RG-02-17) les retirent. | `UserServiceImpl.java:310-329`, SFG §8 |
| RG-01-31 | Le changement de statut par la modération n'envoie **aucun email** : le titulaire découvre la suspension en se connectant (« Votre compte est temporairement suspendu… ») (ECART-23). | module 11 |
| 🆕 RG-01-35 | **Cible DEC-01** : la règle de visibilité exige un compte propriétaire ACTIF (SFG §8). Une suspension ou une désactivation par la modération, y compris la suspension automatique au 3e avertissement, retire aussitôt toutes les annonces du compte du public, sans changer leur état ; la levée les rend visibles telles qu'avant. Pendant ce temps, les relances d'expiration sont suspendues, comme pour un masquage système (RG-09-15), et l'échéance continue de courir. Un agent revenu EN_ATTENTE_ACTIVATION (RG-07-13) n'a pas d'annonce visible tant qu'il n'a pas changé son mot de passe. Les annonces restent comptées dans les annonces gratuites et le quota (RG-08-22). | DEC-01 (SFG §17) |

### 4.7 Comptes non activés et identifiants

| ID | Règle | Source |
|---|---|---|
| RG-01-32 | Un compte qui n'est jamais activé reste EN_ATTENTE_ACTIVATION **sans limite de durée** : aucune tâche ne le purge. Son email et son téléphone restent réservés (ECART-53). | SFG §12 |
| RG-01-33 | Le téléphone n'est pas vérifié. Si un tiers a réservé un numéro, son vrai titulaire ne peut ni s'inscrire avec ce numéro ni le récupérer. Pour l'email, le vrai titulaire reçoit les liens : il peut activer le compte (renvoi du lien) ou en reprendre la main (mot de passe oublié) (ECART-53). | `AuthServiceImpl.java:282-285` |
| RG-01-34 | Mot de passe oublié et réinitialisation ne contrôlent pas le statut du compte : un compte suspendu ou désactivé peut recevoir un code et changer son mot de passe, sans pouvoir se connecter ensuite (ECART-36). La réinitialisation ne lève pas l'obligation de changement d'un agent (`mustChangePassword`), seul le changement de mot de passe connecté le fait. | `AuthServiceImpl.java:393-468, 495-501` |

### 4.8 Double authentification du staff (DEC-03) — développée

> **Développée** (phase 2). Écarts avec le texte initial : le renvoi du code est une route dédiée (`/verification-code/renvoyer`), et la régénération des codes de secours redemande le mot de passe. L'administrateur initial doit changer son mot de passe à sa première connexion (RG-01-41). Le contrôle est actif par défaut ; seule la configuration de test le désactive.

| ID | Règle | Source |
|---|---|---|
| 🆕 RG-01-36 | Concerne les comptes MODERATEUR et ADMINISTRATEUR, à **chaque connexion**. Après un identifiant et un mot de passe corrects, l'API ne renvoie pas de jetons mais une demande de code (202, avec un identifiant de vérification) ; un **code à 6 chiffres** est envoyé par email (E14), valable **10 minutes**. | DEC-03 |
| 🆕 RG-01-37 | Saisie du code : 5 essais au plus par code, au-delà le code est annulé et il faut se reconnecter ; renvoi possible 3 fois par 15 minutes. Le code est à usage unique et n'est jamais journalisé. | DEC-03 |
| 🆕 RG-01-38 | Les jetons ne sont délivrés qu'après le code. Le jeton de rafraîchissement d'un compte du staff dure **24 h** au lieu de 7 jours ; au-delà, nouvelle connexion avec code. | DEC-03 |
| 🆕 RG-01-39 | **Codes de secours** : à la première connexion avec double authentification, 8 codes à usage unique sont affichés une seule fois, pour se connecter si l'email est indisponible. Ils sont stockés hachés et régénérables depuis le profil, ce qui annule les précédents. | DEC-03 |
| 🆕 RG-01-40 | Chaque connexion réussie d'un compte du staff déclenche un **email d'alerte** (E15 : date, appareil, adresse IP approximative, et l'adresse du support à contacter si ce n'était pas lui). | DEC-03, ECART-64 |
| 🆕 RG-01-41 | Un compte promu modérateur passe à la double authentification dès sa connexion suivante ; ses sessions en cours sont fermées au changement de rôle. L'administrateur initial (RG-10-14) doit en plus changer son mot de passe à sa première connexion. | DEC-03, ECART-64 |

### 4.9 🆕 Connexion d'un membre d'une entreprise désactivée (cible DEC-12)

| ID | Règle | Source |
|---|---|---|
| 🆕 RG-01-42 | Quand son entreprise est désactivée, un **agent** ne peut plus se connecter (« L'entreprise <nom> est désactivée. Contactez votre responsable. ») et ses sessions en cours sont refusées dès la requête suivante, comme pour un compte suspendu (RG-01-28). Son statut n'est pas modifié : il retrouve l'accès à la réactivation. Le **professionnel** propriétaire garde l'accès, pour consulter sa situation et contacter le support, mais ne peut ni publier ni réafficher. | DEC-12 (SFG §17) |

### 4.10 🆕 Téléphone vérifié (cible DEC-05)

| ID | Règle | Source |
|---|---|---|
| 🆕 RG-01-43 | Le téléphone devient **obligatoire** à l'inscription (format international, normalisé). Il est vérifié par un **code à 6 chiffres** envoyé par SMS ou, au choix de l'utilisateur, par WhatsApp, valable **10 minutes**, 5 essais par code. Envois limités à 3 par 15 minutes et 10 par jour pour un même numéro. | DEC-05 (SFG §17) |
| 🆕 RG-01-44 | Un compte devient ACTIF quand **l'email est activé et le téléphone vérifié**, dans n'importe quel ordre. Une connexion avec l'email avant la vérification du téléphone mène directement à la saisie du code. | DEC-05 |
| 🆕 RG-01-45 | Seul un numéro **vérifié** est réservé et sert d'identifiant de connexion. Un numéro saisi mais non vérifié ne bloque personne : si un autre compte le vérifie, il est retiré du compte qui ne l'avait pas vérifié. Règle le cas du numéro réservé par un tiers (ECART-53). | DEC-05 |
| 🆕 RG-01-46 | **Changer de téléphone** (profil, module 02) demande la vérification du nouveau numéro ; l'ancien reste actif jusqu'à cette vérification. **Comptes existants** : à la connexion suivante, un bandeau invite l'utilisateur à vérifier son numéro (ou à en saisir un) ; la vérification n'est **pas exigée** et il garde tous ses droits (choix validé le 17/10/2026). Tant que son numéro n'est pas vérifié, il ne sert pas d'identifiant de connexion et peut être récupéré par un compte qui le vérifie (RG-01-45). Les agents vérifient leur numéro juste après le changement de leur mot de passe temporaire. | DEC-05 |

### 4.11 🆕 Purge des comptes non activés (cible DEC-06)

| ID | Règle | Source |
|---|---|---|
| 🆕 RG-01-47 | Tâche quotidienne (03:15) : à **J+5** après l'inscription, un compte toujours non activé reçoit une relance avec un nouveau lien d'activation (E19) ; à **J+7**, il est **supprimé définitivement** (aucune donnée à conserver : ni annonce, ni message). Son email et son téléphone redeviennent libres. Les agents créés par une entreprise ne sont pas concernés : leur sort dépend du professionnel (module 07). | DEC-06 (SFG §17) |

## 5. Écrans et parcours

| Écran | Route | Contenu | Validations / comportements |
|---|---|---|---|
| Connexion | `app/(auth)/login.tsx` | Email ou téléphone, mot de passe | Messages : identifiants incorrects, compte non activé (bouton « Renvoyer le lien d'activation »), suppression en cours (bouton « Réactiver mon compte ») |
| Inscription | `app/(auth)/register.tsx` | Type de compte (Particulier « Acheteur ou vendeur individuel » / Professionnel « Agent immobilier ou agence »), prénom, nom, email, téléphone (« recommandé », préfixe +224), mot de passe et confirmation, CGU | Schéma Zod `signupSchema`, liste de contrôle du mot de passe affichée sous le champ |
| Activation | `app/(auth)/activate.tsx` | Résultat de l'activation par lien profond | « Compte activé ! » ou « Activation échouée » |
| Mot de passe oublié | `app/(auth)/forgot-password.tsx` | Email | Bouton « Recevoir le code » |
| Réinitialisation | `app/(auth)/reset-password.tsx` | Email, code, nouveau mot de passe et confirmation | « Code invalide ou expiré. Demandez un nouveau code. » |
| Changement de mot de passe | `app/(auth)/change-password.tsx` | Mot de passe actuel, nouveau mot de passe et confirmation | Mode « Mot de passe temporaire » pour l'agent, avec bouton « Se déconnecter » |

Parcours de garde (`app/_layout.tsx`) : un utilisateur connecté qui arrive sur un écran d'authentification est renvoyé vers les onglets ; si `mustChangePassword` vaut vrai, il est renvoyé vers le changement de mot de passe. Après une connexion demandée depuis une fiche, l'utilisateur revient sur la fiche (`src/lib/auth-redirect.ts`).

Côté client (`src/api/client.ts`) : le jeton est rafraîchi automatiquement sur une réponse 401, puis la requête est rejouée ; une seule demande de rafraîchissement part à la fois, les requêtes concurrentes l'attendent (RG-01-29). Sur Android, les jetons sont dans `expo-secure-store`. Sur le **web**, seul le jeton d'accès (15 min) est dans le `localStorage` ; le jeton de rafraîchissement est dans un **cookie `HttpOnly`, `Secure`, `SameSite=Strict`** limité à `/api/auth`, posé par l'API quand la requête porte l'en-tête `X-Client: web` (ECART-54 corrigé). Un ancien jeton resté dans le `localStorage` est converti en cookie au premier rafraîchissement, puis supprimé.

### 5.1 Emails du module

| Événement | Email | Renvoi |
|---|---|---|
| Inscription, renvoi du lien | E1 : lien d'activation valable 48 h | module 11 |
| Mot de passe oublié | E2 : code à 8 chiffres valable 15 min | module 11 |
| Création d'un agent | E3 : identifiants avec mot de passe temporaire | module 07, ECART-47 |
| Changement ou réinitialisation du mot de passe, demande de suppression, réactivation, suspension, désactivation | **aucun** : l'utilisateur n'est pas averti, même si l'action vient d'un tiers qui a pris le contrôle de sa boîte mail | ECART-23 |

## 6. API

| Méthode | URL | Accès | Entrée | Sortie / erreurs |
|---|---|---|---|---|
| POST | `/api/auth/signup` | public | `SignupRequest` | 201 message ; 400 (email déjà utilisé, téléphone déjà utilisé, rôle interdit, mot de passe trop faible) |
| GET | `/api/auth/activate?token=` | public | jeton | 200 / 400 |
| GET | `/activate?token=` | public | jeton | Page HTML de succès ou d'erreur |
| POST | `/api/auth/resend-activation` | public | `{email}` | 200 (toujours) / 429 |
| POST | `/api/auth/signin` | public | `{identifier, password}` | 200 `JwtResponse` ; 401 ; 403 (compte inactif) ; 429 |
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

`account` : `email`, `password` (BCrypt), `telephone`, `statut`, `activation_code`, `activation_code_expiry` (ms), `reset_password_token`, `reset_password_token_expiry` (ms), `password_changed_at` (ms), `must_change_password`, `motif_statut`, `date_suppression_demandee` (migrations V2, V5, V6).

## 8. Cycle de vie du compte

```
           inscription                 activation (lien 48 h)
 (néant) ─────────────► EN_ATTENTE_ACTIVATION ──────────────► ACTIF
                               │ agent : 1er changement du mot de passe ─┘
 ACTIF ── suspension (modération, 3e avertissement, entreprise) ──► SUSPENDU ── levée ──► ACTIF
 ACTIF ── suppression demandée par le titulaire ──► INACTIF (30 j réactivable) ── job 03:30 ──► INACTIF anonymisé (définitif)
 ACTIF ── désactivation par la modération ──► INACTIF (non réactivable par le titulaire)
 tout statut ── suppression par l'administrateur ──► INACTIF anonymisé (définitif)
```

Pour chaque état, ce que deviennent la connexion et les annonces, et qui peut en sortir : voir le tableau de synthèse de la SFG §9.2. À retenir : la suspension et la désactivation par la modération coupent l'accès mais **laissent les annonces en ligne** (RG-01-30), alors que la suppression demandée par le titulaire les retire (RG-02-17).

## 9. Messages utilisateur principaux

« Votre compte a été créé. Le code d'activation a été envoyé par email. » (alors que c'est un lien : ECART-48) · « Identifiant ou mot de passe incorrect. » · « Trop de tentatives de connexion. Réessayez dans 15 minutes. » · « Votre compte est temporairement suspendu. Contactez l'administrateur. » · « Votre compte est en cours de suppression. Vous pouvez le réactiver jusqu'au jj/mm/aaaa. » · « Erreur: Mot de passe trop faible. » · « Session expirée suite à un changement de mot de passe. Veuillez vous reconnecter. »

## 10. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-01-01 | Un mot de passe accepté par la liste de contrôle de l'app est **toujours** accepté par l'API, et inversement (aujourd'hui non vérifié : ECART-01). |
| CA-01-02 | Après 5 mots de passe erronés, la 6e tentative renvoie 429, y compris pour un identifiant inexistant. |
| CA-01-03 | Un lien d'activation utilisé deux fois renvoie « invalide ou déjà utilisé ». Un lien de plus de 48 h renvoie « expiré ». |
| CA-01-04 | Après un changement ou une réinitialisation du mot de passe, un ancien jeton de rafraîchissement est refusé. |
| CA-01-05 | Un agent avec mot de passe temporaire reçoit 423 sur `GET /api/biens-immo/user` et 200 sur `GET /api/users/me`. |
| CA-01-06 | Un compte supprimé depuis 29 jours est réactivable ; à 31 jours, il est anonymisé et la réactivation échoue. |
| CA-01-07 | Un utilisateur connecté que la modération suspend reçoit 401 à sa requête suivante, son rafraîchissement renvoie 403, et l'app le ramène à l'écran de connexion. |
| CA-01-08 | Après une déconnexion, le jeton de rafraîchissement utilisé est refusé (401), tant que le serveur n'a pas redémarré (ECART-21). |
| CA-01-09 | La réactivation d'un professionnel rétablit son entreprise et les agents désactivés par sa suppression ; ses annonces et celles de ses agents restent hors ligne. |
| CA-01-10 | Un renvoi du lien d'activation pour un agent, un compte actif ou un email inconnu renvoie 200 sans envoyer d'email. |
| CA-01-11 | Une connexion par téléphone accepte indifféremment `+224 6xx xx xx xx`, `00224 6xxxxxxxx` et `+2246xxxxxxxx` pour le même compte. |
| CA-01-12 | Une coupure réseau pendant un rafraîchissement ne déconnecte pas l'utilisateur. |
| 🆕 CA-01-13 | Un modérateur dont le mot de passe est correct ne reçoit aucun jeton tant qu'il n'a pas saisi le code reçu par email ; un code de plus de 10 minutes est refusé, et un code de secours déjà utilisé aussi. |
| 🆕 CA-01-14 | Après la suspension d'un particulier, aucune de ses annonces n'apparaît dans le catalogue, la recherche ni sur leur page de partage ; après la levée, elles réapparaissent dans leur état antérieur. |
| 🆕 CA-01-15 | Un nouveau compte dont l'email est activé mais le téléphone non vérifié reste en attente : sa connexion mène à la saisie du code. Un compte existant sans téléphone vérifié publie et écrit normalement, avec un bandeau d'invitation. Un compte B qui vérifie le numéro saisi par un compte A non vérifié le récupère. |
| 🆕 CA-01-16 | Un compte inscrit il y a 8 jours et jamais activé n'existe plus ; son email peut servir à une nouvelle inscription. |

## 11. Écarts propres au module

ECART-01 (règles de mot de passe), ECART-05 (limitation du rafraîchissement par IP), ECART-21 (révocations perdues au redémarrage), ECART-23 (aucun email sur les décisions qui touchent le compte), ECART-36 (motif du rôle, téléphone facultatif, réinitialisation possible sur un compte suspendu), ECART-41 (consentement CGU non tracé), ECART-47 (mot de passe temporaire des agents), ECART-48 (libellé « code » au lieu de « lien »), ECART-51 (pas de rotation du jeton de rafraîchissement), ECART-52 (annonces d'un compte suspendu toujours visibles), ECART-53 (comptes non activés jamais purgés, téléphone non vérifié), ECART-54 (jetons dans le `localStorage` sur le web).

## 12. Questions ouvertes

> **Arbitrages du 17/10/2026** (registre : [SFG §17](00-SFG-vue-ensemble.md)) : Q1 → DEC-05 ; Q2 → DEC-06 ; Q3 → DEC-01.

1. Le téléphone doit-il devenir obligatoire et vérifié (SMS ou WhatsApp) ? Voir le 99 §7, questions 6 et 12.
2. Au bout de combien de jours un compte non activé est-il supprimé (proposé : 7 jours) ?
3. La suspension doit-elle retirer les annonces du public (99 §7, question 11) ?
4. Quels événements de compte doivent déclencher un email de sécurité (proposé : changement et réinitialisation du mot de passe, suspension, demande de suppression) ?
5. Faut-il permettre à un particulier de devenir professionnel sans passer par l'administrateur ?
