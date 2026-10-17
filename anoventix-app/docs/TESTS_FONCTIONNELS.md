# Anoventix — Plan de tests fonctionnels

**Version :** 1.0
**Date :** 2026-05-23
**Périmètre :** Application mobile Expo/React Native (iOS + Android)
**Backend cible :** `https://anoventix.com` (Spring Boot, RBAC)

---

## 1. Analyse globale de l'application

### 1.1 Nature
Marketplace immobilière pour la Guinée. Permet la publication, recherche, mise en relation et modération d'annonces de biens immobiliers (Vente / Location / Bail). Prix en GNF, UI 100 % en français.

### 1.2 Stack technique
- **Frontend :** Expo SDK 57, React Native 0.86, Expo Router (file-based), Zustand pour le state, React Hook Form + Zod pour la validation, Axios + Fetch pour l'API.
- **Messagerie :** REST uniquement (pas de WebSocket). Mise à jour via pull/refresh + rechargement à l'ouverture d'écran.
- **Persistance locale :** `expo-secure-store` (tokens), `AsyncStorage`.
- **Police :** Nunito (400/500/600/700/800).

### 1.3 Rôles RBAC (Spring Security)
| Rôle | Capacités principales |
|---|---|
| `ROLE_PARTICULIER` | Publier en propre, favoris, messagerie, signaler |
| `ROLE_PROFESSIONNEL` | Gérer son entreprise, agents, dashboard, publier, messagerie |
| `ROLE_AGENT_PROFESSIONNEL` | Publier au nom de l'entreprise, dashboard, messagerie |
| `ROLE_MODERATEUR` | Accès Administration (modération annonces, signalements, messages) |
| `ROLE_ADMINISTRATEUR` | Toutes les capacités modérateur + gestion utilisateurs, licences, entreprises |

### 1.4 Architecture des écrans (Expo Router)
```
app/
├── index.tsx                      → redirige vers /(tabs)/explore
├── _layout.tsx                    → RootLayout + auth gate
├── (auth)/                        → login, register, forgot/reset/change password, activate
├── (tabs)/                        → tab bar dynamique (selon rôle)
│   ├── explore.tsx                → catalogue public + filtres + recherche
│   ├── messagerie/                → liste conv. + détail conv.
│   ├── favoris.tsx                → particulier
│   ├── publier.tsx                → création d'annonce (modale)
│   ├── mes-annonces.tsx           → agent pro
│   ├── entreprise.tsx             → pro
│   ├── dashboard.tsx              → pro + agent
│   ├── profile.tsx                → profil + paramètres
│   └── administration/            → admin + modérateur (sous-stack)
├── annonce/[id].tsx               → détail annonce + actions
├── entreprise-publique/           → fiche entreprise + ses agents
├── profil/[userId].tsx            → profil public
├── edit-profile.tsx
├── mes-signalements.tsx
├── licence.tsx                    → ma licence (visible si mode licence actif)
└── modal.tsx
```

### 1.5 Modules métier
1. **Authentification** — signup, signin, activation par lien reçu par email, reset par code reçu par email, change password obligatoire à la première connexion (`mustChangePassword`).
2. **Catalogue & recherche** — explore, filtres (typeAnnonce, typeBien, prix, localisation), tri, recherche full-text, nearby (GPS), similaires.
3. **Annonces** — CRUD, médias (upload 1 par 1 pour éviter 413 nginx), clôture (VENDU/LOUE/RETIRE), réactivation, toggle visibilité, historique modifications, stats vues.
4. **Favoris** — particulier uniquement.
5. **Messagerie** — conversations, messages (REST, refresh manuel / au focus), lus/non-lus, signalement.
6. **Entreprise** — création, gestion d'agents, fiche publique, pièces d'identité.
7. **Licence** — 5 annonces actives gratuites par compte (partagées dans une entreprise), licence annuelle au-delà (type particulier / professionnel, activée par clé). Mode licence activé par l'administrateur ; désactivé = publication illimitée.
8. **Signalements** — annonces et messages, gestion par modération.
9. **Administration** — utilisateurs, annonces, signalements, pièces d'identité, entreprises, messages.

### 1.6 Points sensibles repérés
- `Text.defaultProps` est patché globalement (legacy, à migrer vers `<AppText>`).
- Hydratation auth → appel `/me` bloquant avant `isAuthenticated=true` (évite WS prématuré).
- Upload média séparé par fichier pour contourner 413 nginx.
- Token TLS sensible (cf. mémoire `backend_cert_mismatch_symptom`).
- `mustChangePassword` force la redirection `/(auth)/change-password`.

---

## 2. Stratégie de test

### 2.1 Environnements
| Env | URL | Usage |
|---|---|---|
| Local | `http://10.0.2.2:8080` (Android) / `http://localhost:8080` (iOS sim) | Dev |
| Staging | (à définir) | Pré-prod, données réinitialisables |
| Prod | `https://anoventix.com` | Smoke tests uniquement |

### 2.2 Comptes de test requis (à provisionner en staging)
- `particulier@test.gn` — Particulier vérifié
- `pro@test.gn` — Professionnel avec entreprise + 2 agents
- `agent@test.gn` — Agent rattaché à l'entreprise ci-dessus
- `mod@test.gn` — Modérateur
- `admin@test.gn` — Administrateur
- `nouveau@test.gn` — Compte non activé (pour tests d'activation)
- `forcepwd@test.gn` — Compte avec `mustChangePassword=true`

### 2.3 Données de référence
- Au moins 20 annonces publiées (mix VENTE/LOCATION/BAIL, types, prix, communes).
- 3 annonces EN_ATTENTE, 1 REJETEE, 1 MASQUEE, 1 CLOTUREE.
- 2 conversations existantes pour `particulier@test.gn`.
- 5 signalements ouverts (différents motifs).

### 2.4 Matrice device / OS
| Device | OS | Priorité |
|---|---|---|
| Pixel 6 émulateur | Android 14 | P0 |
| Samsung Galaxy A14 physique | Android 13 | P0 |
| iPhone 15 simulateur | iOS 17 | P1 |
| iPhone 12 physique | iOS 16 | P1 |
| Web (Expo web) | Chrome desktop | P2 — best effort |

### 2.5 Critères de sévérité
- **P0 — Bloquant :** parcours d'inscription/connexion, publication, paiement, sécurité RBAC.
- **P1 — Majeur :** filtres, messagerie, favoris, modération.
- **P2 — Mineur :** UI/UX, libellés, animations.

---

## 3. Scénarios de test — Parcours utilisateur

> **Convention :** chaque test suit le format `Préconditions → Étapes → Résultat attendu`.

### 3.1 Authentification

#### TC-AUTH-01 — Inscription Particulier (P0)
**Préconditions :** Email non utilisé. App lancée déconnectée.
**Étapes :**
1. Ouvrir l'app → tab "Connexion".
2. Tap "Créer un compte".
3. Saisir nom, prénom, email valide, téléphone (format Guinée +224), mot de passe respectant la politique.
4. Accepter CGU.
5. Tap "S'inscrire".

**Résultat attendu :**
- Toast/écran de succès indiquant qu'un email d'activation est envoyé.
- Redirection vers écran d'activation ou login.
- Aucun token stocké tant que le compte n'est pas activé.

#### TC-AUTH-02 — Activation par code (P0)
**Préconditions :** Inscription effectuée, code reçu par email.
**Étapes :** Saisir le code à l'écran `/activate` → Valider.
**Attendu :** Message de succès, redirection vers `/login`.

#### TC-AUTH-03 — Connexion réussie (P0)
**Étapes :** Login avec `particulier@test.gn` + mot de passe valide.
**Attendu :**
- Token + refresh stockés en SecureStore.
- `isAuthenticated=true`, `user.roles` contient `ROLE_PARTICULIER`.
- Redirection vers `/(tabs)/explore`.
- Tab "Favoris" visible, "Administration" cachée.

#### TC-AUTH-04 — Connexion échec (mauvais mot de passe) (P0)
**Attendu :** Message d'erreur clair (FR), pas de redirection, pas de token stocké.

#### TC-AUTH-05 — Connexion avec `mustChangePassword=true` (P0)
**Préconditions :** Compte `forcepwd@test.gn`.
**Attendu :**
- Après login, redirection forcée vers `/(auth)/change-password`.
- Impossible d'accéder à `/(tabs)/*` tant que le mot de passe n'est pas changé.
- Après changement → redirection vers `/(tabs)/explore`.

#### TC-AUTH-06 — Mot de passe oublié → reset (P0)
**Étapes :**
1. Login → "Mot de passe oublié".
2. Saisir email → recevoir token par email.
3. Saisir token + nouveau mot de passe.
**Attendu :** Confirmation, possibilité de se connecter avec le nouveau mot de passe.

#### TC-AUTH-07 — Persistance de session (P0)
**Étapes :** Connexion → fermer l'app → relancer.
**Attendu :**
- Splash visible pendant l'hydratation.
- `/me` appelé, session restaurée si token valide.
- Si token expiré/révoqué → déconnexion silencieuse, retour à `/explore` public.

#### TC-AUTH-08 — Déconnexion (P1)
**Étapes :** Profil → Déconnexion.
**Attendu :** Token supprimé, `useUserStore` reset, tab bar repassée en mode invité, retour à `/explore`.

---

### 3.2 Explore / Recherche / Filtres (public)

#### TC-EXPL-01 — Chargement initial (P0)
**Attendu :** Liste paginée d'annonces PUBLIEE, médias affichés via URL absolue (préfixe `API_BASE_URL`), prix formaté en GNF.

#### TC-EXPL-02 — Pagination infinie (P1)
**Attendu :** Scroll → `page+1`, pas de doublons, indicateur de chargement.

#### TC-EXPL-03 — Filtre type d'annonce (P1)
**Étapes :** Chip "VENTE" → seules les annonces VENTE listées. Désélectionner → reset.

#### TC-EXPL-04 — Filtre type de bien (P1)
Tester chaque chip (Appartement, Maison, Villa, Terrain, Magasin, Bureau, Entrepôt, Autre).

#### TC-EXPL-05 — Filtre prix (P1)
Saisir prixMin / prixMax → résultats bornés. Saisir prixMin > prixMax → erreur ou correction auto.

#### TC-EXPL-06 — Filtre localisation cascadé (P1)
**Étapes :** Région → Préfecture → Commune → Quartier. Chaque niveau dépend du précédent.
**Attendu :** Liste de quartiers filtrée par commune sélectionnée. Désélection d'un niveau supérieur vide les niveaux inférieurs.

#### TC-EXPL-07 — Tri (P1)
Vérifier les 3 tris : Prix ↑, Prix ↓, Plus récent.

#### TC-EXPL-08 — Recherche full-text (P1)
**Étapes :** Saisir "Kaloum" dans la barre.
**Attendu :** Résultats pertinents (titre ou description). Recherche vide → catalogue complet.

#### TC-EXPL-09 — Compteur de filtres actifs (P2)
`countActiveFilters` doit correspondre au nombre de chips actifs.

#### TC-EXPL-10 — État vide (P2)
Filtre sans résultat → message "Aucune annonce" et bouton "Réinitialiser".

#### TC-EXPL-11 — Offline (P1)
Couper le réseau → message d'erreur réseau explicite, pas de crash.

---

### 3.3 Détail annonce

#### TC-ANN-01 — Affichage détail (P0)
**Étapes :** Tap sur une carte → `/annonce/[id]`.
**Attendu :** Carousel médias, titre, prix, prix révisé si présent, type, surface, localisation complète, description, badge annonceur (couleur selon rôle), bouton contact.

#### TC-ANN-02 — Annonces similaires (P1)
Section "Annonces similaires" affichée (max 6), mêmes critères type/commune ±30 % prix.

#### TC-ANN-03 — Incrémentation `vueCount` (P2)
Backend doit incrémenter à la consultation (vérifier via dashboard PRO).

#### TC-ANN-04 — Ajout / retrait favori (particulier connecté) (P0)
Tap cœur → ajout. Re-tap → retrait. Persistance après refresh.

#### TC-ANN-05 — Favori non disponible si invité (P1)
Invité → tap cœur → redirection login.

#### TC-ANN-06 — Contacter l'annonceur (P0)
Tap "Contacter" → ouvre/crée conversation → écran `/messagerie/[conversationId]`.

#### TC-ANN-07 — Signaler une annonce (P1)
Modal "Signaler" → choix motif (8 motifs disponibles) + commentaire → envoi. Retrait possible.

#### TC-ANN-08 — Voir l'entreprise (P1)
Si annonceur est PRO/AGENT → lien vers `/entreprise-publique/[entrepriseId]`.

#### TC-ANN-09 — Annonce inexistante (P2)
`/annonce/999999` → état d'erreur "Annonce introuvable".

---

### 3.4 Publication d'annonce

#### TC-PUB-01 — Publication par Particulier (P0)
**Préconditions :** Connecté particulier.
**Étapes :**
1. Tab + → `/publier`.
2. Remplir titre, description, prix, type annonce, type bien, surface, localisation cascadée.
3. Ajouter 3 photos depuis la galerie.
4. Soumettre.

**Attendu :**
- Création API multipart, photos uploadées **une par une**.
- Toast succès, redirection vers `/mes-annonces` ou détail.
- Statut initial `EN_ATTENTE`.

#### TC-PUB-02 — Validation formulaire (P0)
Champs manquants → erreurs Zod inline. Prix négatif refusé.

#### TC-PUB-03 — Upload photo >10 MB (P1)
**Attendu :** Compression auto OU message d'erreur clair (pas de 413 silencieux).

#### TC-PUB-04 — Annulation publication (P2)
Quitter le formulaire avec modifications → confirmation "Abandonner ?"

#### TC-PUB-05 — Publication par Agent au nom de l'entreprise (P0)
**Préconditions :** Connecté `agent@test.gn`.
**Attendu :** Champ "entreprise" pré-rempli/forcé, annonce rattachée à l'entreprise du parent.

#### TC-PUB-06 — Capacités selon rôle (P0)
- Modérateur/Admin → bouton publier non visible (`canPublishAnnonce`).
- Particulier/Pro/Agent → bouton visible.

---

### 3.5 Mes annonces (agent pro)

#### TC-MESANN-01 — Liste paginée (P0)
**Attendu :** Toutes les annonces de l'utilisateur (tous statuts).

#### TC-MESANN-02 — Modifier annonce (P0)
Tap "Modifier" → formulaire pré-rempli → sauvegarder → diff visible dans historique.

#### TC-MESANN-03 — Ajouter / supprimer médias (P1)
Ajouter une photo (1 par 1). Supprimer un média existant → confirmation.

#### TC-MESANN-04 — Limite gratuite (P0)
Mode licence actif, 5 annonces actives, sans licence : publier / Réactiver / Afficher une 6ᵉ → message « Vous avez atteint vos 5 annonces gratuites… ». Clôturer une annonce libère une place. Mode désactivé : aucune limite.

#### TC-MESANN-04b — Compte limité (P0)
Mode actif, plus de 5 annonces actives, licence expirée ou absente (pour un agent : licence du pro) :
- à l'ouverture de l'app et au retour au premier plan → redirection vers « Ma licence » (bandeau « Compte limité », contact, activation, « Gérer mes annonces ») ; le retour arrière reste possible ;
- Publier / Modifier / Tableau de bord → écran « Compte limité » ; Réactiver / Afficher / ajout de photo → refus 402 et redirection ;
- toujours possibles : messagerie, navigation, favoris, profil, clôturer / masquer / supprimer ; annonces toujours visibles ;
- clôturer jusqu'à 5 annonces actives ou activer une licence → accès rétabli ;
- licence expirée avec 5 annonces actives ou moins → pas de blocage (retour au gratuit).

#### TC-MESANN-05 — Clôturer (P0)
Choisir motif VENDU / LOUE / RETIRE → annonce passe en `CLOTUREE` côté UI.

#### TC-MESANN-06 — Réactiver (P1)
Annonce clôturée → "Réactiver" → repasse en PUBLIEE.

#### TC-MESANN-07 — Toggle visibilité (P1)
Bascule `actif` ↔ masqué.

#### TC-MESANN-08 — Supprimer annonce (P0)
Confirmation requise. Suppression définitive.

#### TC-MESANN-09 — Historique modifications (P2)
Voir toutes les modifs (champ, ancienne valeur, nouvelle valeur, date, auteur).

#### TC-MESANN-10 — Stats vues (P1)
Affiche le `vueCount` actuel.

---

### 3.6 Favoris (particulier)

#### TC-FAV-01 — Liste favoris (P1)
**Attendu :** Toutes les annonces favorisées, ordre date d'ajout desc.

#### TC-FAV-02 — Retrait depuis la liste (P1)
Swipe / tap cœur → retrait optimiste, rollback si erreur API.

#### TC-FAV-03 — Liste vide (P2)
Message + CTA "Découvrir des annonces".

#### TC-FAV-04 — Tab cachée pour les non-particuliers (P0)
Connecté pro/agent/admin/mod → tab "Favoris" absente.

---

### 3.7 Messagerie

#### TC-MSG-01 — Liste conversations (P0)
**Attendu :** Tri par `lastMessageAt desc`, aperçu dernier message, badge non-lu, photo interlocuteur.

#### TC-MSG-02 — Badge non-lu agrégé (P1)
Badge sur l'icône onglet messagerie = somme des `unreadCount`.

#### TC-MSG-03 — Ouverture conversation (P0)
**Attendu :** Messages chargés ASC, marqués lus côté serveur (`markConversationAsRead`).

#### TC-MSG-04 — Envoi message (P0)
Saisir + envoyer → message apparaît immédiatement (optimiste), persisté serveur.

#### TC-MSG-05 — Réception d'un nouveau message (refresh) (P0)
**Préconditions :** 2 utilisateurs connectés (A et B).
**Étapes :** A envoie un message à B. B tire vers le bas (pull-to-refresh) ou rouvre l'écran.
**Attendu :** B voit le nouveau message. Badge non-lu mis à jour au refresh de la liste des conversations.

#### TC-MSG-06 — Pas de WebSocket actif (P1)
Vérifier (via logs / Network) qu'aucune connexion `ws://` ou `wss://` n'est ouverte par l'app. Tout passe par HTTP/REST.

#### TC-MSG-07 — Signaler message (P1)
Long-press / menu → "Signaler" → motif → backend reçoit.

#### TC-MSG-08 — Pagination historique (P1)
Scroll vers le haut → charge messages plus anciens.

#### TC-MSG-09 — Création nouvelle conversation depuis annonce (P0)
Voir TC-ANN-06. Si conv. déjà existante avec ce contact pour cette annonce, réutilisée.

#### TC-MSG-10 — Tab cachée pour rôles non autorisés (P1)
La tab est masquée si non authentifié.

---

### 3.8 Entreprise

#### TC-ENT-01 — Création entreprise (PRO) (P0)
**Préconditions :** Pro connecté sans entreprise.
**Étapes :** Onglet Entreprise → "Créer" → formulaire (nom, RCCM, adresse, logo, etc.) → soumettre.
**Attendu :** Entreprise créée, statut "en attente de validation" si workflow modération.

#### TC-ENT-02 — Modifier entreprise (P1)
Modification des infos, upload nouveau logo.

#### TC-ENT-03 — Inviter un agent (P0)
Saisir email d'un compte existant ou créer un compte agent → invitation envoyée → agent visible dans la liste.

#### TC-ENT-04 — Désactiver un agent (P1)
L'agent ne peut plus publier au nom de l'entreprise.

#### TC-ENT-05 — Fiche publique entreprise (P1)
`/entreprise-publique/[entrepriseId]` → infos, liste des annonces de l'entreprise, liste des agents (lien profil).

#### TC-ENT-06 — Profil agent public (P2)
`/entreprise-publique/user/[userId]` → infos publiques + annonces de l'agent.

#### TC-ENT-07 — Upload pièces d'identité (P0)
Compte PRO/AGENT doit pouvoir uploader pièces (CNI, RCCM) → statut "EN_ATTENTE" → traité par admin.

---

### 3.9 Dashboard PRO

#### TC-DASH-01 — Indicateurs (P1)
Affiche : nb annonces (par statut), vues totales, nb favoris reçus, nb messages. Bloc conformité : quota entreprise, ou — mode licence actif sans licence valide — « Annonces gratuites (sans licence) » sur 5 avec lien « Voir ma licence ».

#### TC-DASH-02 — Données isolées par entreprise (P0 — sécurité)
Un PRO/agent ne voit JAMAIS les données d'une autre entreprise.

#### TC-DASH-03 — Mise à jour temps réel (P2)
Après publication d'une annonce, le compteur s'incrémente.

---

### 3.10 Profil

#### TC-PROF-01 — Voir mon profil (P1)
Photo, nom, rôles (libellés via `getRoleLabel`), email, téléphone.

#### TC-PROF-02 — Éditer profil (P1)
`/edit-profile` → modifier nom, prénom, téléphone, photo → sauvegarde.

#### TC-PROF-03 — Changer mot de passe (P1)
Depuis profil → change password → ancien + nouveau + confirmation.

#### TC-PROF-04 — Profil public d'un autre utilisateur (P2)
Tap sur badge annonceur → `/profil/[userId]` → annonces publiques de cet utilisateur.

#### TC-PROF-05 — Mes signalements (P2)
Liste de tous mes signalements (annonces + messages), statut "actif/annulé".

#### TC-PROF-06 — Ma licence (P1)
Mode désactivé : pas de ligne « Ma licence » dans le profil. Mode actif (particulier / pro) : ligne visible avec statut → `/licence` → bloc « Obtenir une licence » : prix du type de compte, boutons WhatsApp (message pré-rempli) / Appeler, ou email de support si aucun numéro → saisir une clé → « Active » jusqu'à J+1 an. Erreurs : clé inconnue, déjà utilisée, type incompatible (clé pro sur compte particulier). Renouvellement : prolonge depuis la fin en cours. Agent : lecture seule de la licence du pro.

---

### 3.11 Administration (admin + modérateur)

#### TC-ADM-01 — Accès restreint (P0 — sécurité)
Particulier qui tape une deep link vers `/(tabs)/administration` → redirect vers `/explore`.

#### TC-ADM-02 — Liste utilisateurs (admin seul) (P1)
Recherche, filtre par rôle, statut (actif/suspendu).

#### TC-ADM-03 — Détail utilisateur + actions admin (P0)
- Activer / désactiver / suspendre.
- Changer rôle.
- Reset password.

#### TC-ADM-03a — Masquage système des annonces d'un compte (admin seul) (P0)
Fiche utilisateur → « Annonces du compte » → « Masquer toutes ses annonces » → motif obligatoire → état « Masquées par la modération depuis le … · motif », un email au propriétaire. Les annonces elles-mêmes ne changent pas (statut, visibilité propre, clôture) :
- absentes d'Explorer, recherche, filtres, carte, similaires, profil public d'entreprise ; détail 404 pour un tiers ; impossible d'ouvrir une nouvelle conversation, de les ajouter en favori ou de les signaler ; conversations existantes toujours accessibles ;
- propriétaire : bandeau dans « Mes annonces », puce « Masquée (compte) », boutons Modifier / Réactiver / Afficher absents, Publier remplacé par un écran d'information ; clôturer, masquer, supprimer restent possibles (API : 403 sur publier / modifier / photos / réafficher) ;
- admin : puce « Compte masqué » dans la liste des annonces.
« Réafficher ses annonces » (confirmation) → retour exact à l'état antérieur (une annonce masquée ou clôturée par le propriétaire reste hors ligne). Pour un PRO, les annonces de ses agents ne sont pas touchées. Modérateur : section absente (API 403). Compte administrateur : section absente.

#### TC-ADM-03b — Licences (admin seul) (P0)
Administration → Licences : activer / désactiver le mode (confirmation) ; renseigner les prix particulier / professionnel et le numéro de vente (vide = non renseigné, numéro invalide refusé) ; générer une clé PARTICULIER ou PROFESSIONNEL, la partager ; liste des clés filtrée (Toutes / Libres / Actives / Expirées), recherche par clé ou email, « Charger plus ».

#### TC-ADM-04 — Modération annonces (P0)
Liste annonces EN_ATTENTE → tap → approuver (passe en PUBLIEE) ou rejeter (motif). Notification utilisateur.

#### TC-ADM-05 — Signalements (P0)
Liste avec motif, annonce concernée, signaleur → traiter (clore, ignorer, masquer l'annonce).

#### TC-ADM-06 — Pièces d'identité (P0)
Liste EN_ATTENTE → consulter pièce uploadée → valider / rejeter.

#### TC-ADM-07 — Entreprises (P1)
Validation des entreprises créées (KYC).

#### TC-ADM-08 — Messages signalés (P1)
Conversation entière consultable → décision modération.

#### TC-ADM-09 — Modérateur vs Admin (P0 — sécurité)
Le modérateur ne doit PAS voir/agir sur les utilisateurs ni la carte Licences.

---

### 3.12 Sécurité & RBAC

#### TC-SEC-01 — Token expiré (P0)
Token volontairement falsifié → tout appel API → 401 → déconnexion auto.

#### TC-SEC-02 — Pas d'accès admin via deep link (P0)
Voir TC-ADM-01.

#### TC-SEC-03 — Stockage token sécurisé (P0)
Token uniquement dans `expo-secure-store`, jamais dans AsyncStorage non chiffré ni logs.

#### TC-SEC-04 — Certificat TLS (P0)
Connexion uniquement HTTPS sur `anoventix.com`. Cf. mémoire : un mismatch certif = "Network Error" côté app alors que Postman OK → bug serveur.

#### TC-SEC-05 — RBAC côté UI (P0)
Aucune action sensible (modération, suppression) ne doit être visible si le rôle ne le permet pas. La sécurité reste **toujours doublée côté backend**.

#### TC-SEC-06 — Injection / payload malformé (P1)
Tester saisie avec `<script>`, emojis, chaînes longues (>5000 car.) dans titre/description → backend doit refuser proprement.

---

### 3.13 Performance & robustesse

#### TC-PERF-01 — Cold start (P1)
Temps splash → écran utilisable < 3 s sur device milieu de gamme.

#### TC-PERF-02 — Liste 100+ annonces (P1)
Scroll fluide (>50 FPS), pas de fuite mémoire.

#### TC-PERF-03 — Réseau lent (3G simulé) (P1)
Indicateurs de chargement visibles, pas de double-tap qui déclenche 2 requêtes.

#### TC-PERF-04 — Background → foreground (P1)
App en background 5 min → retour → session OK, listes rafraîchies au focus.

#### TC-PERF-05 — Rotation device (P2)
Pas de crash, état préservé (selon orientation supportée).

---

### 3.14 Accessibilité (P2)

- TC-A11Y-01 — VoiceOver/TalkBack annonce les boutons critiques (publier, envoyer message, etc.).
- TC-A11Y-02 — Contraste texte / fond ≥ 4.5:1.
- TC-A11Y-03 — Tap targets ≥ 44×44 dp.
- TC-A11Y-04 — Champs formulaire avec label associé.

---

### 3.15 Internationalisation & formatage

#### TC-I18N-01 — Tous textes en français (P1)
Aucune chaîne anglaise visible. Vérifier libellés statuts (`STATUT_ANNONCE_LABELS`), motifs (`MOTIF_LABELS`), rôles.

#### TC-I18N-02 — Prix en GNF (P1)
Format avec séparateur de milliers, devise affichée (ex. `1 500 000 GNF`).

#### TC-I18N-03 — Dates relatives (P2)
"Il y a 2 h", "Hier", etc. cohérent avec timezone Conakry (UTC+0).

#### TC-I18N-04 — Téléphone format +224 (P2)
Affichage / validation côté formulaires.

---

## 4. Parcours utilisateur de bout en bout (smoke E2E)

### 4.1 Parcours "Particulier vendeur" (P0)
1. Inscription → activation → login.
2. Publication d'une annonce VENTE avec 3 photos.
3. Attendre modération (admin valide en parallèle).
4. Réception d'un message d'un acheteur intéressé.
5. Échange de 3 messages dans la conversation.
6. Clôture annonce avec motif VENDU.

### 4.2 Parcours "Particulier acheteur" (P0)
1. Browse explore en invité.
2. Filtrer Conakry / VENTE / Maison / 50–200 M GNF.
3. Ajout en favori d'une annonce → invité → login → favori conservé.
4. Contacter l'annonceur.
5. Envoyer message + signaler une autre annonce.

### 4.3 Parcours "Professionnel" (P0)
1. Login pro → créer entreprise → upload RCCM.
2. Inviter un agent.
3. Agent publie une annonce au nom de l'entreprise.
4. Pro consulte dashboard → vues + favoris reçus.
5. Pro active une licence professionnelle (mode licence actif).
6. Reçoit 2 messages → répond.

### 4.4 Parcours "Modérateur" (P0)
1. Login modérateur.
2. Onglet Administration → annonces EN_ATTENTE → valider 3, rejeter 1 (motif).
3. Traiter 2 signalements (masquer 1 annonce, ignorer 1).
4. Consulter une conversation signalée.

### 4.5 Parcours "Administrateur" (P0)
1. Login admin.
2. Valider une entreprise en attente.
3. Valider 2 pièces d'identité.
4. Activer le mode licence et générer une clé.
5. Suspendre un utilisateur malveillant.

---

## 5. Tableau de couverture par module

| Module | TC P0 | TC P1 | TC P2 | Total |
|---|---|---|---|---|
| Authentification | 6 | 1 | 1 | 8 |
| Explore / Recherche | 2 | 7 | 2 | 11 |
| Détail annonce | 3 | 3 | 3 | 9 |
| Publication | 4 | 1 | 1 | 6 |
| Mes annonces | 5 | 3 | 2 | 10 |
| Favoris | 1 | 2 | 1 | 4 |
| Messagerie | 4 | 5 | 0 | 9 |
| Entreprise | 3 | 3 | 1 | 7 |
| Dashboard | 1 | 1 | 1 | 3 |
| Profil | 0 | 3 | 3 | 6 |
| Administration | 6 | 3 | 0 | 9 |
| Sécurité | 5 | 1 | 0 | 6 |
| Performance | 0 | 4 | 1 | 5 |
| Accessibilité | 0 | 0 | 4 | 4 |
| I18n | 0 | 2 | 2 | 4 |
| **Total** | **40** | **39** | **22** | **101** |

---

## 6. Critères de sortie (release gate)

- ✅ 100 % des P0 passants.
- ✅ ≥ 95 % des P1 passants (les P1 restants doivent avoir un ticket + workaround).
- ✅ Aucun crash sur les 5 parcours E2E §4.
- ✅ Smoke prod : login, explore, publication, messagerie OK sur 2 devices physiques.
- ✅ Temps de cold start < 3 s sur device de référence.

---

## 7. Modèle de fiche de bug

```
ID : BUG-YYYY-NNNN
Titre : <résumé en 1 ligne>
Sévérité : P0 / P1 / P2
Environnement : staging | prod | local
Device : <modèle + OS>
Version app : <version + buildNumber>
Préconditions : ...
Étapes : 1. ... 2. ... 3. ...
Résultat observé : ...
Résultat attendu : ...
Logs / Screenshots : <liens>
TC lié : TC-XXX-NN
```

---

## 8. Annexes — Points spécifiques à surveiller

- **Upload média :** vérifier qu'aucune régression ne ré-introduit l'upload groupé multipart (cause de 413 nginx).
- **Hydratation auth :** `isAuthenticated` ne doit jamais passer à `true` avant la résolution de `/me` (évite tout appel API ultérieur avec un token périmé).
- **TLS :** si app affiche "Network Error" alors que Postman fonctionne, suspecter un mismatch de certificat côté serveur (cf. mémoire projet) avant de toucher l'app.
- **Domaine API :** confirmer que toutes les requêtes pointent sur `anoventix.com` (et plus sur `api.anoventix.com` — migration effectuée).
