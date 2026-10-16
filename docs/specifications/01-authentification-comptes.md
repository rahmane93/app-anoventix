# Module 01 — Authentification et comptes

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Écarts : [99](99-ecarts-incoherences.md)

## 1. Objectif et périmètre

Permettre à un visiteur de créer un compte (particulier ou professionnel), de l'activer par email, de se connecter avec son **email ou son numéro de téléphone**, de gérer son mot de passe et de maintenir une session sécurisée. Le module couvre aussi la première connexion des agents (mot de passe temporaire) et la réactivation d'un compte dont la suppression est en cours.

Hors périmètre : connexion via un réseau social, double authentification, vérification du téléphone par SMS (aucune n'est implémentée).

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
| RG-01-18 | Rafraîchissement : le jeton doit être de type « refresh », le compte doit être actif et le jeton émis après le dernier changement de mot de passe. Seul un nouveau jeton d'accès est renvoyé (pas de rotation du jeton de rafraîchissement). | `AuthServiceImpl.java:229-246` |
| RG-01-19 | Déconnexion : le jeton d'accès et, s'il est fourni, le jeton de rafraîchissement sont révoqués. La liste de révocation est gardée en mémoire (**ECART-21**). | `AuthController.java:109-123` |
| RG-01-20 | Limitation par IP : 10 req/min sur la connexion, l'inscription et la déconnexion ; 5 req/15 min sur mot de passe oublié, réinitialisation, **rafraîchissement**, réactivation, renvoi d'activation et activation (**ECART-05**). | `RateLimitFilter.java` |

### 4.4 Mot de passe

| ID | Règle | Source |
|---|---|---|
| RG-01-21 | Mot de passe oublié : réponse identique que l'email existe ou non. Un **code à 8 chiffres valable 15 min** est envoyé par email. Chaque nouveau code remet à zéro le compteur d'essais. | `AuthServiceImpl.java:393-426` |
| RG-01-22 | Réinitialisation : email + code + nouveau mot de passe. Au plus 5 codes erronés par email sur 15 min. En cas de succès, le code est effacé et **toutes les sessions sont invalidées**. | `AuthServiceImpl.java:429-468` |
| RG-01-23 | Changement (connecté) : l'ancien mot de passe doit être correct ; le nouveau respecte RG-01-05. Toutes les sessions sont invalidées et de nouveaux jetons sont renvoyés à l'appelant. L'application impose en plus que le nouveau mot de passe soit différent de l'ancien. | `AuthServiceImpl.java:471-518`, `validation.ts` |
| RG-01-24 | Mot de passe temporaire (agent) : tant que `mustChangePassword = true`, toute requête renvoie **423 Locked**, sauf changement de mot de passe, déconnexion, rafraîchissement et `GET /api/users/me`. L'application redirige d'office vers l'écran de changement. Après le changement, l'agent passe ACTIF. | `MustChangePasswordFilter.java`, `APP/app/_layout.tsx:96` |

### 4.5 Réactivation d'un compte en cours de suppression

| ID | Règle | Source |
|---|---|---|
| RG-01-25 | `POST /api/auth/reactivate` (identifiant + mot de passe). Le mot de passe est vérifié avant tout message sur le statut. | `AuthServiceImpl.java:163-226` |
| RG-01-26 | Seul un compte INACTIF dont la suppression a été demandée par son titulaire il y a **moins de 30 jours** est réactivable. Un compte désactivé par un administrateur ne l'est pas. | idem |
| RG-01-27 | La réactivation rétablit le statut ACTIF, réactive l'entreprise et les agents désactivés par la suppression (pour un pro), **mais pas les annonces**, qui restent hors ligne et doivent être réaffichées une par une. | `CompteSuppressionService.java:101-116` |

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

Côté client (`src/api/client.ts`) : le jeton est rafraîchi automatiquement sur une réponse 401, puis la requête est rejouée ; les jetons sont stockés dans `expo-secure-store`.

## 6. API

| Méthode | URL | Accès | Entrée | Sortie / erreurs |
|---|---|---|---|---|
| POST | `/api/auth/signup` | public | `SignupRequest` | 201 message ; 400 (email déjà utilisé, téléphone déjà utilisé, rôle interdit, mot de passe trop faible) |
| GET | `/api/auth/activate?token=` | public | jeton | 200 / 400 |
| GET | `/activate?token=` | public | jeton | Page HTML de succès ou d'erreur |
| POST | `/api/auth/resend-activation` | public | `{email}` | 200 (toujours) / 429 |
| POST | `/api/auth/signin` | public | `{identifier, password}` | 200 `JwtResponse` ; 401 ; 403 (compte inactif) ; 429 |
| POST | `/api/auth/refresh` | public | `{refreshToken}` | 200 `{token, type}` ; 401 ; 403 |
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

## 11. Écarts propres au module

ECART-01 (règles de mot de passe), ECART-05 (limitation du rafraîchissement par IP), ECART-21 (révocations perdues au redémarrage), ECART-36 (bornes de mot de passe et messages hétérogènes), ECART-41 (consentement CGU non tracé), ECART-48 (libellé « code » au lieu de « lien »), ECART-51 (pas de rotation du jeton de rafraîchissement, réinitialisation possible sur un compte suspendu).
