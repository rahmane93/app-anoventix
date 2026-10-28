# Rapport de test — web (Expo) + API locale — 28/10/2026

Portée : parcours de bout en bout sur `http://localhost:8081` (web desktop, 1536 px) contre l'API locale `http://localhost:80` (Docker : nginx, Spring, PostgreSQL 17).
Comptes de test (identifiants dans `anoventix-app/.env.test.local`, ignoré par git) : professionnel, particulier, agent invité, superadmin.

## Contournements utilisés (à garder en tête pour interpréter les résultats)

| Étape | Contournement | Raison |
|---|---|---|
| Activation du compte particulier et de l'agent | `UPDATE account SET statut='ACTIF'` en base locale | Lien d'activation envoyé par email, boîte non lisible |
| Pièce d'identité du pro, du particulier et de l'agent | `statut_piece_identite='VALIDEE'` en base locale | Le dossier exige un selfie pris en direct à la webcam |
| Mot de passe de l'agent | hash copié depuis le compte particulier | Mot de passe choisi par l'agent via l'email d'invitation |
| Création de 3 annonces (2 du pro, 1 de l'agent) | `curl` multipart sur `POST /api/biens-immo` | Bug web B1 (photos non envoyées) |
| Connexion superadmin | code reçu par email (donné par l'utilisateur), puis code de secours | 2FA par email |

Le mot de passe temporaire du superadmin a été remplacé (changement imposé par l'app à la première connexion).

## Résultats par fonctionnalité

### Comptes et accès
| Fonctionnalité | Résultat | Remarque |
|---|---|---|
| Inscription particulier et pro | OK | Email d'activation envoyé |
| Connexion, déconnexion (pro, particulier, agent, superadmin) | OK | |
| Connexion superadmin : code par email, code de secours, changement du mot de passe temporaire | OK | |
| Activation d'un compte en attente par le superadmin (fiche utilisateur) | OK | Texte « Réactiver le compte… motif de la sanction » inadapté (U14) |
| Rechargement ou lien direct sur une page protégée | KO puis corrigé | B3 |
| Mot de passe oublié (écran), validation du formulaire d'inscription | Partiel | Écran OK ; réinitialisation non testée (code par email), validation masquée par l'autoremplissage du navigateur |

### Profil
| Fonctionnalité | Résultat | Remarque |
|---|---|---|
| Modifier mes informations (téléphone) | OK | Formulaire vide en lien direct (B8, corrigé) |
| Dossier d'identité (type, numéro, recto) | Partiel | B1 corrigé ; verso et selfie impossibles sans webcam |
| Export des données personnelles | Partiel | Appel `GET /api/users/me/export` répond 200, « Export en cours… » ; fichier téléchargé non vérifié |
| Alertes de recherche : création depuis l'accueil | OK | Lien « Créer une alerte » quasi invisible (U15) |
| Mes signalements (liste vide) | OK | |

### Entreprise et agents
| Fonctionnalité | Résultat | Remarque |
|---|---|---|
| Création d'entreprise | OK | |
| Page publique de l'entreprise | OK | |
| Invitation d'un agent | OK avec réserve | Textes contradictoires (B7) |
| Suspendre / réactiver un agent | OK | L'annonce de l'agent suspendu reste en ligne (à confirmer avec la spécification) |
| Retirer un agent | OK | Compte `INACTIF`, annonce transférée au pro ; l'agent garde son `entreprise_id` |
| Connexion de l'agent, « Mes annonces », « Statistiques » | OK | |
| Extrait RCCM (vérification de l'agence) | Non testé | Dépend de l'envoi de fichiers (B1) |

### Annonces
| Fonctionnalité | Résultat | Remarque |
|---|---|---|
| Publication par le formulaire web | OK (après correction de B1) | Annonce publiée avec 2 photos ; écran de confirmation : boutons étirés sur toute la largeur (U21) |
| Publication par l'API | OK | Statut `PUBLIEE` |
| Accueil, filtres par commune, onglets Vente / Location / Bail | OK | |
| Recherche texte | OK | |
| Panneau de filtres avec compteur en direct | OK | |
| Fiche annonce | OK | |
| Favoris (ajout, liste, compteur) | OK | |
| Masquer / afficher | OK | |
| Modifier | OK | |
| Clôturer | OK avec réserve | U4 |
| Réactiver une annonce clôturée | OK | |
| Historique d'une annonce | OK avec réserve | « Aucune modification » malgré clôture et réactivation ; titre mal aligné (U16) |
| Signalement d'une annonce | OK en base | Pas de confirmation visible (U5) |
| Demande de réexamen après masquage par la modération | OK | |

### Messagerie
| Fonctionnalité | Résultat | Remarque |
|---|---|---|
| Premier message depuis la fiche | OK (après correction de B2) | Vérifié par l'API ; non revérifié dans l'interface |
| Échange dans la conversation, badge de non-lus | OK | |
| Archiver et restaurer | OK | |
| Bloquer et débloquer | OK | |
| Supprimer la conversation, signaler un message | Non testé | |

### Administration (superadmin)
| Fonctionnalité | Résultat | Remarque |
|---|---|---|
| Vue d'ensemble | OK | |
| Utilisateurs (liste, fiche, statut, rôles) | OK | |
| Entreprises | OK | Compteur « Annonces 0/50 » = annonces actives seulement |
| Annonces (liste, filtres, historique, activer) | OK | « Activer » proposé sur une annonce clôturée (à confirmer) |
| Signalements : décision « Masquer l'annonce » | OK | Email au propriétaire ; événement dans le journal |
| Journal d'audit | OK | Ne contient que 2 événements : changement de mot de passe, activation de compte et vente de licence absents (à confirmer) |
| Statistiques | OK | |
| Localisations (722 lignes) | OK | |
| Quotas des comptes pro | OK | Affichage seulement |
| Licences : vente d'une clé (mode licence désactivé) | OK | Reçu envoyé par email |
| Licences : activation de la clé par le pro | OK | « Démarrera à l'ouverture du mode licence » |
| Paramètres de modération | OK (après correction de B9) | |
| Réexamens, quartiers demandés, messages signalés, pièces d'identité, entreprises à vérifier | OK (files vides) | Décisions non testées faute de données |
| Mode « Licence obligatoire », quotas de 5 annonces gratuites | Non testé | |

### Pages publiques
| Fonctionnalité | Résultat | Remarque |
|---|---|---|
| Landing `landing/index.html` | OK avec réserves | U17 |
| Pages légales (CGU, confidentialité, mentions) | Non testé en navigation | Fichiers présents |
| Partage `/annonce/*` avec balises Open Graph, APK, `robots.txt` | Non testé | Non servis par la configuration nginx locale |

### Non testé
Mobile (iOS/Android), notifications push, réinitialisation du mot de passe (code par email), suppression de compte, régénération des codes de secours, extrait RCCM, décisions de modération sur réexamens, quartiers demandés, pièces d'identité en attente, mode licence obligatoire.

## Bugs

### B1 — Web : toutes les photos et pièces jointes échouent (critique) — CORRIGÉ
- **Symptôme** : publication d'annonce avec photos → « Erreur de validation : Failed to convert property value of type String to required type List for property medias ».
- **Cause** : `FormData.append('medias', { uri, name, type })` est un format React Native. Dans un navigateur, l'objet est converti en texte.
- **Fichiers** : `src/api/annonce.api.ts:85,136`, `src/api/user.api.ts:38,58-60,73`, `src/api/entreprise.api.ts:193`.
- **Conséquence** : le web ne peut ni publier d'annonce avec photos, ni envoyer une photo de profil, un dossier d'identité ou un extrait RCCM.
- **Piste** : sur le web, convertir l'URI en `Blob` (`fetch(uri).then(r => r.blob())`) et ajouter `formData.append('medias', blob, name)`.
- **Correction** : `appendFile()` dans `src/api/multipart.ts` envoie un `Blob` sur le web et garde le format `{ uri, name, type }` sur mobile ; utilisé par `annonce.api.ts`, `user.api.ts` et `entreprise.api.ts`.
- **Vérifié** : annonce « Maison test publiee depuis le web » publiée depuis le navigateur avec 2 photos, toutes deux enregistrées en base. Non revérifiés : photo de profil, dossier d'identité (selfie), extrait RCCM.

### B2 — Le premier message du formulaire « Contacter l'annonceur » est perdu (élevé) — CORRIGÉ
- **Symptôme** : après « Envoyer », la conversation s'ouvre vide et n'apparaît pas dans la messagerie (conversation sans message). Le formulaire est aussi rouvert prérempli quand on contacte à nouveau.
- **Cause** : l'app envoie `{ annonceId, message }`, mais `CreateConversationRequest` côté API ne contient que `annonceId` ; `message` est ignoré. Reproduit en appelant l'API directement.
- **Fichiers** : `anoventix-app/src/types/messagerie.types.ts:59-63` et `anoventix-api/.../payload/request/CreateConversationRequest.java`.
- **Correction** : `CreateConversationRequest` accepte un champ `message` facultatif ; `MessagingServiceImpl.createOrGetConversation` l'envoie avec `sendMessage` juste après l'ouverture (aussi pour une conversation déjà existante).
- **Vérifié** : après reconstruction de l'API, une conversation créée avec `message` contient ce message et apparaît dans la liste de l'utilisateur.

### B3 — Web : lien direct ou rechargement renvoie à l'accueil (élevé) — CORRIGÉ
- **Cause** : au rechargement, `isAuthenticated` vaut `false` tant que `/me` n'a pas répondu ; les écrans protégés redirigeaient vers la connexion, puis l'app renvoyait vers `/(tabs)`.
- **Correction** : `app/_layout.tsx` ne monte la navigation qu'une fois la session restaurée (`appReady`), et le splash reste affiché jusqu'à ce moment.
- **Vérifié** : `/administration/signalements`, `/profile`, `/licence`, `/mes-annonces`, `/entreprise-publique/…` chargés directement.

### B4 — Web : `<button>` imbriqués dans « Mes annonces » (moyen) — CORRIGÉ
- **Cause** : `AnnonceCard` (`src/features/mes-annonces/AnnonceCard.tsx`) plaçait des `Button` dans un `TouchableOpacity`.
- **Correction** : seule la zone photo, titre et prix ouvre la fiche ; les boutons d'action sont hors de ce bouton.
- **Vérifié** : l'alerte rouge n'apparaît plus.

### B5 — Cœur « favori » affiché sur ses propres annonces (faible)
- Le compte pro voit le cœur sur ses propres annonces de l'accueil. Le code prévoit de l'exclure (`canFav = !isOwner`), mais `isOwner` ne semble pas transmis dans cette liste.

### B6 — Conversation sans message invisible pour tous (faible)
- Conséquence de B2.

### B7 — Texte contradictoire à l'invitation d'un agent (faible)
- Formulaire : « L'agent recevra un email avec son mot de passe temporaire. Il devra le changer. »
- Confirmation : « Il y choisira son mot de passe. »

### B8 — Formulaire « Mes informations » vide en lien direct (moyen) — CORRIGÉ
- **Cause** : le profil n'est chargé que par le layout des onglets. Un enregistrement depuis un formulaire vide risquait d'écraser des données.
- **Correction** : `app/edit-profile.tsx` charge le profil s'il est absent.
- **Vérifié** : prénom, nom et email s'affichent après rechargement.

### B9 — API : `GET /api/admin/parametres` répond 500 (élevé) — CORRIGÉ
- **Symptôme** : l'écran « Paramètres » affiche « Une erreur interne est survenue ».
- **Cause** : `ModerationAnnonceService` est annoté `@Transactional(propagation = Propagation.MANDATORY)` au niveau de la classe, mais `AdminController.getParametres()` et `setParametres()` l'appellent sans transaction active → `IllegalTransactionStateException: No existing transaction found for transaction marked with propagation 'mandatory'`.
- **Correction** : `getSeuilMasquageAuto` en `@Transactional(REQUIRED, readOnly = true)` et `setSeuilMasquageAuto` en `@Transactional(REQUIRED)`.
- **Vérifié** : l'écran affiche le seuil (3), l'enregistrement d'une nouvelle valeur (4) fonctionne, puis remis à 3 ; plus aucune `IllegalTransactionStateException` dans les journaux.

## Écarts UI/UX relevés pendant le test

| Réf. | Constat | Écran |
|---|---|---|
| U1 | Les pastilles de communes passent sur deux lignes, « Autour de moi » seul sur la seconde (13 communes) | Accueil, bandeau |
| U2 | État vide trop pauvre : le bouton « Publier la première annonce » est petit, blanc et coupé en bas | Accueil sans annonce |
| U3 | Le menu déroulant de la commune est partiellement masqué par la barre fixe « Retour / Suivant » | Publier, étape Lieu |
| U4 | « Vendu » est présélectionné dans « Clôturer » pour une annonce en location | Mes annonces |
| U5 | Aucune confirmation visible après un signalement d'annonce | Fiche annonce |
| U6 | Sur la fiche d'un bien déjà contacté, « Envoyer un message » rouvre le formulaire prérempli au lieu d'ouvrir la conversation | Fiche annonce |
| U7 | La touche Entrée n'envoie pas le message (seul le bouton d'envoi fonctionne) | Messagerie |
| U8 | « Mon profil » : bannière grise vide, contenu qui défile sous un titre fixe, progression de sécurité peu visible | Profil |
| U9 | « Mon entreprise » : titre centré mais champs alignés à gauche sur 60 % de la largeur | Entreprise |
| U10 | Après un rechargement, l'avatar affiche l'initiale de l'email avant le chargement du profil | Barre du haut |
| U11 | ~~Les cartes d'une même ligne n'ont pas la même hauteur~~ : erreur de relevé, les cartes ont bien la même hauteur (seul le contenu intérieur varie) | Accueil, « Mes annonces » |
| U13 | Aucune indication des « 5 annonces gratuites » avant publication | Publier |
| U14 | Activation d'un compte en attente : message « Réactiver le compte… motif de la sanction sera effacé » | Admin, fiche utilisateur |
| U15 | Le lien « Créer une alerte » est en bleu foncé sur le bandeau bleu foncé : presque invisible ; message « Vous serez prévenu par notification » alors que le web n'a pas de notifications push | Accueil (web desktop) |
| U16 | Les blocs sous le titre (« Historique », « Mes alertes ») sont collés au bord gauche, hors de la colonne centrale | Historique, Mes alertes |
| U18 | Le menu de la conversation place « Annuler » en premier, et « Archiver » et « Bloquer » ont le même style | Messagerie |
| U19 | Les dialogues « Suspendre » et « Retirer » un agent n'indiquent pas ce qu'il advient de ses annonces | Entreprise |
| U21 | Écran « Annonce publiée » : les boutons « Voir mon annonce », « Publier une autre annonce » s'étirent d'un bord à l'autre, hors de la colonne centrale | Publier, confirmation |
| U20 | Le titre « Statistiques » est décalé par rapport à « Mes annonces » (largeurs de colonne différentes) | Navigation agent |

### U17 — Landing (`landing/index.html`) — hors périmètre
- La configuration nginx de production ne sert plus cette page : l'application web occupe la racine et seules les pages légales de `landing/` sont servies (`/cgu`, `/confidentialite`, `/mentions-legales`). Les constats ci-dessous concernent un fichier devenu inutilisé ; non corrigés.
- Le titre met un seul mot (« Guinée ») en or, avec une pastille « Bêta Android disponible maintenant » au-dessus.
- La maquette de téléphone montre « Test annonce 1 » et une date du « 12 mai 2026 » : contenu de test.
- Aucun lien vers l'application web, qui existe, seulement « Télécharger sur Android » et « Contact ».
- Police Inter et couleurs différentes de l'application (Nunito, `#1A3C6E` / `#D4A017`).
- Pas de `:focus-visible` ni de `prefers-reduced-motion`.

Voir aussi la revue de code initiale (mouvement non désactivable, textes de 9 à 11 px, nombre d'onglets mobile, couleurs en dur, duplication dans `explore.tsx`).

## Données laissées dans la base locale
3 annonces (villa masquée en réexamen, appartement en ligne, terrain transféré au pro), 2 conversations dont une vide, 1 signalement traité, 1 entreprise, 1 favori, 1 alerte, 1 licence vendue au pro, agent `INACTIF`, comptes de test. Le compte `rahaanebah93@gmail.com` (adresse mal saisie) a été activé par le superadmin.

## Améliorations de design appliquées (suite à la revue UI/UX)

Vérifiées dans le navigateur : accueil, profil, « Mes alertes ». Non vérifiées visuellement : « Annonce publiée » et « Historique » (même mécanisme, compilation TypeScript propre).

| Réf. | Changement | Fichiers |
|---|---|---|
| U15 | Lien « Créer une alerte » en blanc souligné sur le bandeau (web desktop) | `explore.tsx` |
| Pastilles de zone | Fond blanc à 14 %, bordure blanche à 45 %, compteur à 85 % | `explore.tsx` |
| U1 | Web desktop : 6 communes visibles plus la zone choisie, bouton « + N communes » / « Moins » | `explore.tsx` |
| Textes de 9 à 11 px | Passés à 12 px (badges de statut, « Vérifiée », libellés de section) ; compteur de l'onglet à 11 px | 9 fichiers |
| Placeholders | `colors.placeholder` `#9CA3AF` → `#6B7280` (contraste 4,8:1 au lieu de 2,5:1) | `theme/index.ts` |
| Puces | Hauteur minimale 36 → 40 px | `ui/chip.tsx` |
| Réduction des animations | Nouveau hook `useReduceMotion` ; squelette fixe et `LayoutAnimation` coupé si l'option système est active | `lib/reduce-motion.ts`, `skeleton-card.tsx`, `explore.tsx` |
| Cœur favori | Disque blanc translucide, cœur sombre ou rouge plein | `explore/AnnonceCard.tsx` |
| U16 | « Historique » et « Mes alertes » alignés sur la colonne du titre (`useWebContentStyle`) | `responsive.tsx`, `annonce-historique/[id].tsx`, `alertes.tsx` |
| U21 | « Annonce publiée » : colonne de 420 px au lieu de boutons sur toute la largeur | `publier.tsx`, `publier/styles.ts` |
| U8 | Bannière du profil sans photo : aplat bleu de marque, alignée sur les cartes en web desktop | `profile.tsx` |

### Suite : sections 3 à 7 de la revue UI/UX

Vérifiés dans le navigateur : accueil (nouveau titre), connexion, « Mes annonces » (motif « Loué »), envoi par Entrée, menu de conversation. Vérifiés seulement par compilation et tests (157 verts) : barre d'onglets mobile, ligne « Statistiques » du profil mobile, pastille sur « Publier », fenêtres de confirmation d'agent et d'activation de compte.

| Section | Changement | Fichiers |
|---|---|---|
| 3 | État vide de l'accueil : bouton plein « Publier la première annonce » | `explore.tsx` |
| 3 | Pastille rouge sur « Publier une annonce » tant que la pièce d'identité n'est pas validée (web) | `nav-items.ts`, `WebTopBar.tsx` |
| 3 / U5 | Signalement : confirmation durable (fenêtre « Signalement envoyé ») au lieu d'un message de 1,8 s | `useAnnonceDetail.ts` |
| 4 | Une seule accroche : « L'immobilier en Guinée, quartier par quartier » (accueil web, connexion) ; surtitre en capitales supprimé ; accroche masquée sur la connexion web large, où le panneau de marque la porte déjà | `explore.tsx`, `login.tsx` |
| 5 / U7 | Entrée envoie le message sur le web, Maj+Entrée passe à la ligne | `messagerie/[conversationId].tsx` |
| 5 / U4 | « Clôturer » présélectionne « Loué » pour une location ou un bail | `CloturerModal.tsx`, `mes-annonces/AnnonceCard.tsx` |
| 5 / U18 | Fenêtres à 3 actions ou plus : « Annuler » en dernier, choix en style secondaire, action destructive en contour rouge | `ui/app-alert.tsx` |
| 5 / U19 | Suspendre et retirer un agent : le dialogue dit ce qu'il advient de ses annonces | `useEntreprise.ts` |
| 5 / U14 | Admin : « Activer le compte ? » pour un compte jamais activé, au lieu de « Réactiver… sanction » | `administration/users/[id].tsx` |
| 6 | Mobile : « Statistiques » quitte la barre d'onglets (5 au plus) et passe dans Profil > Statistiques, avec bouton retour ; le web desktop la garde en haut | `(tabs)/_layout.tsx`, `profile.tsx` |
| 7 | Couleurs en dur remontées dans le thème : `photoPlaceholder`, `mapBackground`, `bubbleReceived`, `onDarkMuted`, `onDarkError` ; dégradé de l'accueil construit avec `colors.primaryDark` et `colors.primary` | `theme/index.ts` + 6 fichiers |

Non fait : échelle d'icônes (16/20/24), extraction du composant des zones de l'accueil (duplication mobile / desktop), photos d'annonce à ratio fixe, mode sombre.
