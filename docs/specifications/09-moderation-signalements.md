# Module 09 — Modération et signalements

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Garantir la qualité et la sécurité du contenu **a posteriori** (DEC-11) : les annonces sont publiées sans validation préalable, puis les utilisateurs signalent les contenus problématiques. Une annonce qui reçoit plusieurs signalements de fraude est masquée automatiquement en attendant la décision. L'équipe de modération masque, rejette ou remet en ligne les annonces, traite les demandes de réexamen, supprime les messages abusifs et sanctionne les comptes (avertissements, suspension, masquage de toutes les annonces d'un compte). Toutes les décisions sont inscrites au journal d'audit (module 10). La vérification d'identité est décrite au module 02.

Hors périmètre : modération avant publication et détection automatique (doublons, mots-clés, photos réutilisées) ; suspension temporaire avec date de fin ; recours d'un compte suspendu ; information du signaleur ; regroupement des signalements par annonce (évolutions : [98](98-evolutions.md)).

## 2. Acteurs et droits

| Action | Utilisateur | Modérateur | Admin |
|---|---|---|---|
| Signaler une annonce, retirer son signalement, voir ses signalements | ✅ | — | — |
| Signaler un message | ✅ (participant) | — | — |
| Décider d'un signalement, supprimer un signalement | — | ✅ | ✅ |
| Masquer, rejeter, remettre en ligne une annonce ; traiter un réexamen | — | ✅ | ✅ |
| Supprimer un message, classer un signalement de message, lire une conversation signalée | — | ✅ | ✅ |
| Émettre un avertissement | — | ✅ (pas sur un modérateur ni un admin) | ✅ (pas sur un admin) |
| Lever un avertissement | — | ❌ | ✅ |
| Changer le statut d'un compte | — | ✅ (pas sur un modérateur ni un admin) | ✅ (pas sur un admin) |
| Masquer / réafficher toutes les annonces d'un compte | — | ❌ | ✅ (pas sur un admin) |
| Régler le seuil de masquage automatique | — | ❌ | ✅ (module 10) |

## 3. User stories

| ID | User story |
|---|---|
| US-09-01 | En tant qu'utilisateur, je signale une annonce en choisissant un motif et en ajoutant un commentaire facultatif (≤ 500 caractères). |
| US-09-02 | En tant qu'utilisateur, je consulte « Mes signalements » avec leur statut et je retire un signalement. |
| US-09-03 | En tant que modérateur, je traite la file des signalements : je décide de masquer, rejeter ou remettre en ligne l'annonce, ou je classe sans suite, avec une note interne facultative. |
| US-09-04 | En tant que modérateur, je masque ou rejette une annonce avec un motif communiqué au propriétaire. |
| US-09-05 | En tant que modérateur, je traite la file des réexamens demandés par les propriétaires d'annonces masquées. |
| US-09-06 | En tant que modérateur, je traite les messages signalés : supprimer le contenu ou classer le signalement, et je consulte la conversation. |
| US-09-07 | En tant que modérateur, j'émets un avertissement ; le niveau suit le rang, ou je choisis GRAVE pour une fraude avérée, qui suspend le compte. |
| US-09-08 | En tant qu'administrateur, je masque d'un coup toutes les annonces d'un compte problématique, puis je lève ce masquage. |

## 4. Règles de gestion

### 4.1 Signalement d'annonce

| ID | Règle | Source |
|---|---|---|
| RG-09-01 | Seule une annonce **visible publiquement** peut être signalée, et pas par son propriétaire. | `BienImmoServiceImpl.signalerAnnonce` |
| RG-09-02 | **Un seul signalement par (annonce, utilisateur)** (contrainte en base). Un signalement actif bloque un nouveau signalement (« Vous avez déjà signalé cette annonce. ») ; un signalement retiré est rouvert (EN_ATTENTE, décision effacée). | idem, `Signalement.java` |
| RG-09-03 | Motifs : contenu inapproprié, déjà vendu / loué, arnaque / fraude, annonce en double, infos incorrectes, mauvaise catégorie, problème de localisation, autre. Le **code** du motif est enregistré (pour les règles, dont le masquage automatique) avec son libellé (pour l'affichage). | `MotifSignalement.java`, `Signalement.codeMotif` |
| RG-09-04 | Retrait : le signaleur annule son signalement actif (retrait logique avec date). | `BienImmoServiceImpl.retirerSignalement` |
| RG-09-05 | « Mes signalements » montre le statut et la date de traitement, mais ni l'identité du modérateur ni sa note interne. Le signaleur n'est pas prévenu de la décision. | `BienImmoServiceImpl.getMesSignalements` |

### 4.2 Masquage automatique (DEC-11)

| ID | Règle | Source |
|---|---|---|
| RG-09-06 | Dès qu'une annonce visible reçoit **3 signalements « arnaque / fraude »** en attente et non retirés, de signaleurs distincts, elle est masquée automatiquement avec le motif « Masquée automatiquement après plusieurs signalements, en attente de vérification ». L'historique et le journal d'audit indiquent l'auteur « Système » ; le propriétaire reçoit l'email E6. Le seuil se règle dans l'écran Paramètres de l'administration (0 désactive ; défaut : `moderation.seuil-masquage-auto`, 3). | `ModerationAnnonceService.evaluerSignalements` |
| RG-09-07 | Les signalements restent EN_ATTENTE. L'annonce masquée automatiquement passe **en tête de la file** des signalements. | `SignalementRepository` (tri) |
| RG-09-08 | Une annonce masquée automatiquement est corrigeable par son propriétaire, qui peut demander un réexamen (DEC-09). Une annonce remise en ligne par la modération n'est plus masquée automatiquement par les signalements antérieurs à cette décision. | `ModerationAnnonceService` |

### 4.3 Traitement des signalements

| ID | Règle | Source |
|---|---|---|
| RG-09-09 | **Décision** (`PUT /signalements/{id}/decision`), en une seule opération : masquer, rejeter ou remettre en ligne l'annonce, ou classer sans suite ; tous les signalements en attente de l'annonce sont clos ensemble (TRAITE, ou IGNORE pour un classement ou une remise en ligne), avec l'auteur, la date et une note interne facultative. Le motif est obligatoire pour masquer ou rejeter et il est affiché au propriétaire. | `AdminServiceImpl.deciderSignalement` |
| RG-09-10 | Décisions proposées dans l'app : Masquer (« Retirée du public temporairement »), Rejeter (« Retirée définitivement »), Remettre en ligne (« Annule un masquage »), Classer sans suite (« Signalement infondé »). « Remettre en ligne » n'est pas proposé pour une annonce rejetée. | `app/(tabs)/administration/signalements.tsx` |
| RG-09-11 | La suppression d'un signalement est **physique** et irréversible ; elle est journalisée. | `AdminServiceImpl.supprimerSignalement` |
| RG-09-12 | **Ordre de la file** : annonces masquées automatiquement en tête, puis signalements du plus récent au plus ancien, une carte par signalement. | `SignalementRepository.java` |

### 4.4 Décisions sur les annonces

| ID | Règle | Source |
|---|---|---|
| RG-09-13 | **Masquer** : statut MASQUEE, `actif = false`, motif obligatoire (≤ 500 caractères) enregistré sur l'annonce et dans l'historique, email au propriétaire (E6). L'annonce reste corrigeable par son propriétaire (module 03, RG-03-29). | `ModerationAnnonceService.masquer` |
| RG-09-14 | **Rejeter** (DEC-10) : statut REJETEE, `actif = false`, même gestion du motif, email E7. Le rejet est **définitif** : ni `publier` (409 « Une annonce rejetée ne peut pas être remise en ligne. »), ni `toggle-actif` ne la remettent en ligne ; le propriétaire peut seulement la supprimer. Il est réservé aux infractions graves (fraude, contenu illicite) ; une annonce corrigeable est masquée. | `ModerationAnnonceService.rejeter` |
| RG-09-15 | **Remettre en ligne** une annonce masquée : statut PUBLIEE, motif effacé ; si l'annonce n'est pas clôturée, `actif = true` et nouvelle validité de 180 jours ; email E8. Aucun contrôle de quota ni de licence. | `ModerationAnnonceService.remettreEnLigne` |
| RG-09-16 | **File « Réexamens »** (DEC-09) : annonces masquées dont le propriétaire a demandé un réexamen, de la plus ancienne à la plus récente, avec le motif initial, le message du propriétaire et l'historique. Décisions : remettre en ligne (E8), maintenir le masquage avec un nouveau motif (E16) ou rejeter (E7). | `AdminServiceImpl.getReexamens`, `ModerationAnnonceService` |
| RG-09-17 | **Masquage système d'un compte** (admin) : motif obligatoire ; drapeau posé sur le compte sans modifier les annonces ; elles disparaissent de toutes les vues publiques ; publier, modifier et gérer les photos sont refusés au titulaire ; email au titulaire (E9). La levée (E10) rend à chaque annonce sa visibilité antérieure. Ne s'applique pas aux annonces des autres membres de l'entreprise. Les relances d'expiration sont suspendues pendant le masquage. | `AdminServiceImpl.masquerAnnoncesCompte`, `MasquageCompte.java` |

### 4.5 Modération des messages

| ID | Règle | Source |
|---|---|---|
| RG-09-18 | Règles de signalement d'un message : module 06, RG-06-14. | — |
| RG-09-19 | File de modération : messages signalés non supprimés, avec l'annonce, l'auteur, le signaleur, le motif et la date. | `AdminServiceImpl.getMessagesSignales` |
| RG-09-20 | **Supprimer** : le contenu est conservé en base mais remplacé à l'affichage par « [Message supprimé par la modération] » ; auteur et date de la suppression enregistrés, action journalisée. | `AdminServiceImpl.supprimerMessage` |
| RG-09-21 | **Classer** : le message redevient non signalé (le motif, la date et le signaleur restent en base) ; il peut être signalé à nouveau. Action journalisée. | `AdminServiceImpl.ignorerSignalementMessage` |
| RG-09-22 | La modération ne lit que les conversations qui contiennent un message signalé, messages supprimés compris ; chaque lecture est journalisée (DEC-02, module 06, RG-06-15). | `AdminServiceImpl.getMessagesConversationAdmin` |

### 4.6 Avertissements et statut des comptes

| ID | Règle | Source |
|---|---|---|
| RG-09-23 | Avertissement (DEC-33) : motif obligatoire (≤ 200 caractères). Un avertissement **compte pendant 6 mois**. Le niveau proposé suit le rang parmi les avertissements **en vigueur** (ni expirés, ni levés) : 1er LÉGER, 2e MODÉRÉ, 3e et suivants GRAVE ; le modérateur peut **choisir le niveau** (GRAVE d'emblée pour une fraude avérée). Motifs proposés : annonces non conformes, comportement abusif, fraude avérée, avertissements répétés, ou texte libre. | `AdminServiceImpl.emettreAvertissement` |
| RG-09-24 | Au niveau GRAVE (rang ou choix), un compte qui n'est pas déjà SUSPENDU est **suspendu automatiquement** (« Suspension automatique suite à N avertissements. » ou « Suspension suite à un avertissement grave : motif »), ses sessions sont fermées et ses annonces quittent le public. | idem |
| RG-09-25 | Interdits : s'avertir soi-même, avertir un administrateur ; seul un administrateur avertit un modérateur. | idem |
| RG-09-26 | L'utilisateur averti est **prévenu par email** (E22) : niveau, motif, durée de validité et, le cas échéant, suspension. Il voit le nombre d'avertissements en vigueur sur son profil et son tableau de bord. | idem |
| RG-09-27 | Un **administrateur** peut **lever** un avertissement émis par erreur, avec un motif : il ne compte plus, reste dans l'historique et le journal d'audit (`AVERTISSEMENT_LEVE`) ; une suspension éventuelle n'est pas levée pour autant. | `AdminServiceImpl.leverAvertissement` |
| RG-09-28 | **Changement de statut** (ACTIF, SUSPENDU, INACTIF) avec un motif facultatif ; interdit sur un administrateur, et sur un modérateur sauf par un administrateur. Toute décision annule une suppression RGPD en cours et est journalisée (auteur, date, motif). Pas d'email au titulaire. Le titulaire perd l'accès dès sa requête suivante (module 01, RG-01-29) et ses annonces quittent le public tant qu'il n'est pas ACTIF (DEC-01, RG-01-31). | `UserServiceImpl.updateStatut` |
| RG-09-29 | Une suspension n'a **pas de durée** : elle dure jusqu'à sa levée manuelle. Le motif courant est conservé sur le compte (`motif_statut`, remplacé à chaque décision) ; l'historique complet est dans le journal d'audit. | idem |

### 4.7 Comparaison des sanctions

| Sanction | Qui | Accès du titulaire | Annonces visibles | Publication / modification | Email au titulaire | Levée |
|---|---|---|---|---|---|---|
| Avertissement léger ou modéré | Modération | ✅ | ✅ | ✅ | ✅ (E22) | Expiration après 6 mois ; levée par un administrateur |
| Avertissement grave (3e en 6 mois, ou choisi) | Modération | ❌ suspension automatique | ❌ | ❌ (pas d'accès) | ✅ (E22) | Levée de la suspension |
| Masquage d'une annonce | Modération | ✅ | ❌ pour cette annonce | Annonce corrigeable, réexamen possible | ✅ (E6) | Modération (remise en ligne après réexamen) |
| Rejet d'une annonce | Modération | ✅ | ❌ pour cette annonce | Annonce non modifiable | ✅ (E7) | Aucune (définitif) |
| Suspension du compte | Modération | ❌ | ❌ | ❌ | ❌ | Modération |
| Désactivation du compte (INACTIF) | Modération | ❌ (non réactivable par le titulaire) | ❌ | ❌ | ❌ | Modération |
| Masquage système du compte | Admin | ✅ | ❌ toutes | ❌ | ✅ (E9) | Admin (E10) |
| Suppression du compte | Admin | ❌ définitif | ❌ (DESACTIVEE) | ❌ | ❌ | Aucune |

### 4.8 Traçabilité des décisions

Chaque décision est inscrite au **journal d'audit** (auteur, rôle, date, cible, motif, adresse IP), consultable par l'administrateur (module 10). En plus :

| Décision | Trace sur l'objet |
|---|---|
| Masquer, rejeter, remettre en ligne une annonce, réexamen | historique de l'annonce (auteur, date, motif) |
| Décider d'un signalement | `traite_par`, `date_traitement`, note interne |
| Supprimer un message | `supprime_par`, `date_suppression` |
| Émettre ou lever un avertissement | `emit_par`, `date` ; `leve_par`, `date_levee`, `motif_levee` |
| Changer le statut d'un compte | `motif_statut` (dernier motif) |
| Décider d'un dossier de vérification d'identité ou d'entreprise | `decision_verification_par`, `date_decision_verification` |
| Lire une conversation signalée, consulter une pièce ou un justificatif | journal d'audit seulement |

## 5. Écrans

| Écran | Route | Contenu |
|---|---|---|
| Signaler (fiche) | `app/annonce/[id].tsx` | Fenêtre « Signaler cette annonce » : motif, commentaire facultatif, « Signalement envoyé, merci ! » |
| Mes signalements | `app/mes-signalements.tsx` | Liste, statut, « Retirer ce signalement » |
| Admin > Signalements | `app/(tabs)/administration/signalements.tsx` | Filtre (en attente par défaut), carte par signalement, mention « Masquée automatiquement », fenêtre « Décider du signalement », note interne, suppression |
| Admin > Réexamens | `app/(tabs)/administration/reexamens.tsx` | Annonces à réexaminer, message du propriétaire, décision |
| Admin > Annonces | `app/(tabs)/administration/annonces.tsx` | Onglets Publiées, Masquées, Rejetées, Clôturées, Désactivées ; recherche (titre, référence, propriétaire) ; actions masquer, rejeter, remettre en ligne, activer ou désactiver, historique ; mention « Compte masqué » |
| Admin > Messages signalés | `app/(tabs)/administration/messages.tsx`, `messages/[id].tsx` | File, « Supprimer le message », « Message conforme, classer le signalement », conversation |
| Admin > Fiche utilisateur | `app/(tabs)/administration/users/[id].tsx` | Avertissements (historique avec « Expiré » ou « Levé », émettre avec choix du niveau, lever pour l'admin), statut du compte avec motif, masquage des annonces, dossier de vérification, rôle, suppression |

## 6. API

| Méthode | URL | Accès |
|---|---|---|
| POST / DELETE | `/api/biens-immo/{id}/signaler` | connecté |
| GET | `/api/biens-immo/user/signalements` | connecté |
| GET | `/api/admin/signalements?statut=` | modération |
| PUT | `/api/admin/signalements/{id}/decision` `{decision, motif, noteAdmin}` | modération |
| PUT | `/api/admin/signalements/{id}/traiter` `{statut, noteAdmin}` | modération (clôture seule) |
| DELETE | `/api/admin/signalements/{id}` | modération |
| GET | `/api/admin/reexamens` | modération |
| PUT | `/api/admin/annonces/{id}/masquer?raison=` · `/rejeter?raison=` · `/publier` | modération |
| PUT | `/api/admin/utilisateurs/{id}/annonces/masquer?raison=` · `/afficher` | admin |
| GET | `/api/admin/messages/signales` | modération |
| PUT | `/api/admin/messages/{id}/supprimer` · `/ignorer` | modération |
| GET | `/api/admin/conversations/{id}/messages` | modération (conversation signalée) |
| POST / GET | `/api/admin/utilisateurs/{id}/avertissements` | modération |
| POST | `/api/admin/utilisateurs/{id}/avertissements/{avertissementId}/lever` `{motif}` | admin |
| PUT | `/api/users/{id}/statut` `{statut, motif}` | modération |

## 7. Données

`signalements` : `annonce_id`, `reporter_id` (unique ensemble), `motif` (libellé), `code_motif`, `commentaire`, `date`, `annule`, `date_annulation`, `statut`, `traite_par`, `date_traitement`, `note_admin`.
`avertissements` : `utilisateur_id`, `motif` (≤ 200), `emit_par`, `niveau`, `suspendu_automatiquement`, `date`, `date_levee`, `leve_par`, `motif_levee`.
`annonce` : `motif_moderation` (≤ 500), `masquage_automatique`, `reexamen_demande` ; `account` : `annonces_masquees`, `motif_masquage_annonces`, `date_masquage_annonces`, `motif_statut`.

## 8. Statuts

```
Signalement :  EN_ATTENTE ──décision──► TRAITE | IGNORE        (retrait : annule = true ; nouveau signalement : retour EN_ATTENTE)
Message :      normal ──signaler──► signalé ──supprimer──► supprimé
                                       └──classer──► normal (re-signalable)
Avertissement : en vigueur 6 mois ──► expiré ; levée par l'admin ──► levé (ne compte plus)
               niveau : LEGER → MODERE → GRAVE (rang), ou choisi ; GRAVE ⇒ suspension
```

## 9. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-09-01 | Un masquage sans motif renvoie 400 « Le motif est obligatoire… » ; un motif de 501 caractères renvoie 400. |
| CA-09-02 | Après un masquage, le propriétaire reçoit un email avec le titre, la référence et le motif ; l'annonce disparaît du catalogue. |
| CA-09-03 | Le 3e avertissement en 6 mois suspend le compte ; la connexion suivante renvoie « Votre compte est temporairement suspendu… ». Deux avertissements de plus de 6 mois ne comptent plus : le suivant est LÉGER. |
| CA-09-04 | Un modérateur ne peut pas avertir un autre modérateur (403), ni lever un avertissement (403). |
| CA-09-05 | Après un masquage de compte, aucune annonce du compte n'apparaît dans les résultats publics ; après la levée, seules celles qui étaient en ligne réapparaissent. |
| CA-09-06 | Masquer une annonce qui a trois signalements en attente clôt les trois signalements. |
| CA-09-07 | Une annonce remise en ligne par la modération reçoit une nouvelle échéance à 180 jours, même si son propriétaire a atteint son quota ou ses annonces gratuites. |
| CA-09-08 | Le journal d'audit indique qui a suspendu un compte, quand et pourquoi. |
| CA-09-09 | Le 3e signalement « arnaque / fraude » d'une annonce, par un 3e signaleur distinct, la masque aussitôt ; deux signalements « arnaque » et un « autre » ne la masquent pas ; avec un seuil réglé à 0, aucun masquage automatique. |
| CA-09-10 | `PUT /api/admin/annonces/{id}/publier` sur une annonce rejetée renvoie 409. |
| CA-09-11 | Remettre en ligne une annonce masquée automatiquement classe ses 3 signalements en IGNORE et la retire de la file. |
| CA-09-12 | Un avertissement GRAVE choisi pour un premier avertissement suspend le compte et l'email reçu l'indique. |
