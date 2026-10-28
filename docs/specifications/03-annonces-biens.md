# Module 03 — Annonces et biens immobiliers

[← Vue d'ensemble](00-SFG-vue-ensemble.md) · Évolutions : [98](98-evolutions.md)

## 1. Objectif et périmètre

Gérer le cycle de vie complet d'une annonce immobilière : création par un assistant, modification, photos, mise hors ligne et remise en ligne, clôture (vendu, loué, retiré), expiration automatique, suppression, correction et réexamen après un masquage par la modération, historique et compteur de vues. L'entité `BienImmo` couvre tous les types de biens (habitations, terrains, locaux).

Les règles de licence et de quota appelées ici sont détaillées au module 08 ; la modération (masquage, rejet) au module 09. La synthèse des états d'une annonce figure dans la SFG §9.1, la règle de visibilité publique dans la SFG §8.

Hors périmètre : vidéos, plans et visites virtuelles ; mise en avant payante ; duplication d'une annonce ; publication programmée ; brouillon enregistré sur le serveur (le brouillon est local à l'appareil, RG-03-26) ; modération préalable et détection automatique de doublons (DEC-11 : modération a posteriori) ; charte de contenu contrôlée automatiquement.

## 2. Acteurs et droits

| Action | Propriétaire | Professionnel (annonce d'un de ses agents, DEC-27) | Modérateur / admin |
|---|---|---|---|
| Créer | ✅ (conditions RG-03-01) | — | API seulement, pas d'écran |
| Modifier (contenu, photos), réordonner les photos | ✅ (en ligne, ou masquée par la modération) | ✅ (mêmes conditions) | ✅ si l'annonce est en ligne |
| Masquer / réafficher (`toggle-actif`) | ✅ | ✅ | ✅ |
| Clôturer / réactiver après clôture | ✅ | ✅ | ❌ |
| Supprimer | ✅ | ✅ | ✅ |
| Demander un réexamen (annonce masquée par la modération) | ✅ | ✅ | — |
| Voir l'historique | ✅ | ✅ | ✅ |

Les actions du professionnel sur les annonces de ses agents sont inscrites dans l'historique avec son nom.

## 3. User stories

| ID | User story |
|---|---|
| US-03-01 | En tant qu'annonceur vérifié, je publie une annonce en 5 étapes : Photos → Type → Lieu → Détails → Aperçu. |
| US-03-02 | En tant qu'annonceur, je modifie le contenu et les photos de mon annonce, et je choisis la photo principale. |
| US-03-03 | En tant qu'annonceur, je masque temporairement mon annonce puis la réaffiche. |
| US-03-04 | En tant qu'annonceur, je clôture mon annonce en indiquant si le bien est vendu, loué ou retiré, et je peux la remettre en ligne plus tard. |
| US-03-05 | En tant qu'annonceur, je suis prévenu 7 jours avant l'expiration de mon annonce et je la prolonge gratuitement après son expiration. |
| US-03-06 | En tant qu'annonceur, je supprime une annonce dont je n'ai plus besoin. |
| US-03-07 | En tant qu'annonceur, je vois dans « Mes annonces » l'état de chacune : en ligne, masquée, clôturée, expirée, masquée ou rejetée par la modération (avec le motif), date d'expiration, nombre de vues. |
| US-03-08 | En tant que propriétaire ou modérateur, je consulte l'historique des modifications d'une annonce. |
| US-03-09 | En tant qu'annonceur dont l'annonce est masquée par la modération, je la corrige et je demande un réexamen. |

## 4. Règles de gestion

### 4.1 Création

| ID | Règle | Source |
|---|---|---|
| RG-03-01 | **Préconditions, dans cet ordre** : (1) au moins une photo ; (2) dossier de vérification VALIDEE (pièce et selfie, module 02) ; (3) un PROFESSIONNEL doit avoir créé son entreprise ; (4) annonces du compte non masquées par l'admin ; (5) entreprise active et quota d'annonces actives non atteint (pro et agents) ; (6) licence (si le mode licence est actif et que les annonces gratuites sont épuisées). | `BienImmoServiceImpl.create` |
| RG-03-02 | Champs obligatoires : titre (5 à 100 caractères), description (20 à 2000), prix > 0, quartier (`localisationId` existant), type d'annonce, type de bien, usage, documents disponibles (au moins un). Les mêmes contrôles s'appliquent à la modification. | `AnnonceRequest.java`, `BienImmoRequest.java`, `usePublierForm.ts` |
| RG-03-03 | Champs facultatifs : prix révisé (> 0, API seulement), frais d'honoraires (≥ 0, 0 par défaut), surface totale (m²), complément d'adresse, latitude et longitude (via un sélecteur de carte, centré sur le quartier choisi s'il a un point de référence, module 05), nombre de pièces (1 à 100), de chambres (0 à 50), de salles de bain (0 à 50), caution et avance (RG-03-34). | idem |
| RG-03-03b | **Sens du prix** : pour une VENTE, prix de vente ; pour une LOCATION ou un BAIL, **loyer mensuel** (libellé « Loyer mensuel (GNF) », suffixe « par mois » / « / mois » à l'affichage et dans les pages de partage). Le **prix révisé**, s'il existe, devient le prix affiché avec un indicateur de baisse ; l'assistant ne permet pas de le saisir et les filtres, le tri et les similaires utilisent le prix initial. | `src/lib/bien.ts`, `components/annonce/Prix.tsx`, `SharePageService.java` |
| RG-03-04 | Compatibilités type d'annonce → type de bien → usage : voir la SFG §7.2. Une combinaison incompatible renvoie 400. L'app ne propose que les combinaisons valides. | `BienImmoServiceImpl.validerHierarchie`, `features/publier/constants.ts` |
| RG-03-05 | Composition : remise à vide pour un bien non bâti (TERRAIN, DOMAINE). Pour un bien bâti, le nombre de chambres ne peut pas dépasser le nombre de pièces. | `BienImmoServiceImpl.normaliserComposition` |
| RG-03-06 | Documents disponibles (DEC-35) : **liste fermée** (TITRE_FONCIER, DONATION, ACTE_DE_VENTE, CERTIFICAT_USAGE_FONCIER, AUTRE), choix multiple, stockés en codes séparés par des virgules dans l'ordre de la liste ; un libellé saisi (« Titre foncier ») est converti en code, une valeur inconnue est refusée (400). | `DocumentDisponible.normaliser` |
| RG-03-07 | À la création : statut PUBLIEE, `actif = true` (publication **immédiate, sans modération préalable**), validité de **180 jours**, identifiant public aléatoire de 12 caractères hexadécimaux. | `BienImmoServiceImpl.create`, `Annonce.java` |
| RG-03-08 | Référence : `<préfixe>-<aammjj>-<4 caractères aléatoires>` (VE, LO ou BA), unique parmi toutes les annonces. Les références antérieures, sans l'année (`<MMjj>`), restent valides. | `Utility.generateUniqueReference` |

### 4.2 Photos

| ID | Règle | Source |
|---|---|---|
| RG-03-09 | 1 à **10 photos** par annonce. Création : au moins une. Ajout ultérieur : total ≤ 10. Suppression : impossible s'il ne reste qu'une photo. | `MediaService.java` |
| RG-03-10 | Formats : images uniquement (type MIME `image/*`, format lisible), ≤ 50 mégapixels, ≤ 10 Mo par fichier et ≤ 100 Mo par requête. Les images sont réencodées en JPEG (qualité 0,80, 1920 px de large), ce qui supprime leurs métadonnées. Deux variantes sont produites à côté de l'original : **miniature** (400 px, suffixe `_t`) pour les listes et les cartes, **moyenne** (1080 px, suffixe `_m`) pour la fiche sur mobile. Une tâche horaire produit les variantes des photos qui n'en ont pas. | `MediaService.java`, `VariantesPhoto.java`, `MiniaturesRattrapageService.java` |
| RG-03-11 | Les photos sont numérotées 1..n dans l'ordre d'envoi. Le propriétaire, son professionnel ou la modération peuvent les **réordonner** (`PUT /{id}/medias/ordre`, avec tous les identifiants) : la première est la **photo principale** (vignette, image de partage). Une suppression renumérote les suivantes. Dans l'assistant, une nouvelle annonce choisit sa photo principale en touchant une photo ; en modification, un appui sur une photo propose « Définir comme photo principale » et le déplacement à gauche ou à droite. | `MediaService.reordonnerMedias`, `app/(tabs)/publier.tsx` |
| RG-03-12 | Ajouter, supprimer ou réordonner des photos est refusé si les annonces du compte sont masquées ou si l'annonce est rejetée ; l'ajout est aussi refusé si la publication est bloquée par la licence. | `MediaService.java` |

### 4.3 Modification et historique

| ID | Règle | Source |
|---|---|---|
| RG-03-13 | Sont modifiables les annonces **en ligne** (`actif = true`) et, par leur propriétaire ou son professionnel, les annonces **masquées par la modération** (RG-03-29). Une annonce masquée par son propriétaire, clôturée, expirée, rejetée ou supprimée ne l'est pas (404). | `BienImmoServiceImpl.update` |
| RG-03-14 | Modification refusée si les annonces du compte sont masquées par l'admin ou si la publication est bloquée par la licence (402). | idem |
| RG-03-15 | La modification applique les mêmes validations que la création (RG-03-02), puis revérifie les compatibilités, la composition et les documents. | `BienImmoController` (`@Valid`) |
| RG-03-16 | **Historique** : une ligne par champ modifié pour le titre, le prix et la description (ancienne valeur, nouvelle valeur, auteur, date) ; les décisions de modération et les demandes de réexamen ajoutent `statutModeration`, `raison` et `reexamen`. Il se consulte depuis « Mes annonces » et depuis la liste des annonces de l'administration (écran « Historique »). | `BienImmoServiceImpl.getHistoriqueAnnonce`, `app/annonce-historique/[id].tsx` |

### 4.4 Visibilité, clôture, expiration, suppression

| ID | Règle | Source |
|---|---|---|
| RG-03-17 | **Masquer** (`toggle-actif` sur une annonce en ligne) : `actif = false`, statut inchangé. L'annonce reste dans « Mes annonces ». | `BienImmoServiceImpl.toggleActif` |
| RG-03-18 | **Réafficher** (`toggle-actif` sur une annonce hors ligne) : interdit si REJETEE ; interdit au propriétaire si MASQUEE par la modération (il passe par le réexamen) ou DESACTIVEE (supprimée). Pour un non-staff, les contrôles de quota, de masquage et de licence s'appliquent. La clôture éventuelle est levée et une nouvelle validité de 180 jours démarre. Un modérateur qui réaffiche une annonce DESACTIVEE la repasse PUBLIEE. | idem |
| RG-03-19 | **Clôturer** (propriétaire ou son professionnel, annonce en ligne) : motif VENDU, LOUE ou RETIRE ; `actif = false`, date de clôture renseignée. | `BienImmoServiceImpl.cloturerAnnonce` |
| RG-03-20 | **Réactiver après clôture** (propriétaire ou son professionnel) : l'annonce doit être clôturée et au statut PUBLIEE ; contrôles de quota, de masquage et de licence ; nouvelle validité de 180 jours. C'est aussi le chemin de **prolongation** d'une annonce expirée. | `BienImmoServiceImpl.reactiver` |
| RG-03-21 | **Expiration** (tâche de 03:00) : 7 jours avant l'échéance, un email de relance est envoyé une seule fois (E11, annonces visibles du public). À l'échéance, l'annonce **en ligne** est clôturée avec le motif EXPIREE et le propriétaire est prévenu par email (E12). Une annonce hors ligne n'expire pas : son échéance est recalculée à 180 jours quand elle est réaffichée (RG-03-18). | `AnnonceExpirationService.java` |
| RG-03-22 | **Supprimer** : depuis n'importe quel état, statut DESACTIVEE, `actif = false`, clôture effacée. L'annonce devient invisible pour son propriétaire et n'est restaurable que par la modération. Elle reste dans les favoris des autres utilisateurs (non affichée) et dans les conversations. | `BienImmoServiceImpl.deleteAnnonce` |
| RG-03-23 | La modération peut aussi masquer, rejeter (définitivement, DEC-10) ou remettre en ligne une annonce masquée (module 09). Une remise en ligne par la modération ne réactive pas une annonce clôturée par son propriétaire. | `ModerationAnnonceService.java` |

### 4.5 Vues

| ID | Règle | Source |
|---|---|---|
| RG-03-24 | Une vue est comptée à la consultation d'une fiche accessible, **jamais pour le propriétaire**, et une seule fois par lecteur (utilisateur connecté ou adresse IP) et par 24 h. Le compteur n'augmente que si l'annonce est en ligne. | `BienImmoController.getById`, `VueCountTracker.java` |
| RG-03-25 | Le nombre de vues est fourni par l'annonce (`vueCount`) et affiché sur sa carte dans « Mes annonces » ; le tableau de bord professionnel en fait la somme (module 07). | `AnnonceDTO.vueCount` |

### 4.6 Effets des événements du compte et de l'entreprise sur les annonces

Synthèse des règles réparties dans les autres modules. Elle sert de référence quand une règle change dans l'un d'eux.

| Événement | Effet sur les annonces | Visibles du public ? | Contact possible ? | Règle |
|---|---|---|---|---|
| Compte suspendu ou désactivé par la modération (y compris par un avertissement grave) | État inchangé ; retirées du public tant que le compte n'est pas ACTIF (DEC-01) | ❌ | ❌ (messagerie refusée, fiche invisible) | RG-01-31 |
| Masquage système du compte (admin) | État inchangé ; publication, modification et photos refusées ; relances d'expiration suspendues | ❌ | ❌ | RG-09-15 |
| Publication bloquée par la licence | Modification et ajout de photos refusés ; clôture et suppression possibles | ✅ | ✅ | RG-08-04, RG-03-14 |
| Entreprise désactivée (DEC-12) | Annonces du professionnel et des agents retirées du public ; publication bloquée ; agents sans accès | ❌ | ❌ | RG-07-12, RG-01-34 |
| Agent retiré par son entreprise (DEC-34) | Toutes ses annonces, en ligne ou non, passent au professionnel | ✅ pour celles qui étaient en ligne | ✅ (avec le professionnel) | RG-07-14 |
| Suppression demandée par le titulaire | Annonces en ligne passées hors ligne ; pour un professionnel, aussi celles de ses agents | ❌ | ❌ | RG-02-18 |
| Réactivation pendant le délai de grâce | Les annonces restent hors ligne ; le titulaire les réaffiche une par une | ❌ jusqu'au réaffichage | — | RG-01-28 |
| Anonymisation (fin du délai de grâce, inactivité, suppression par un administrateur) | Annonces DESACTIVEE, photos supprimées, retirées des favoris | ❌ | ❌ | RG-02-20 |
| Dossier de vérification rejeté après validation | Impossible : un dossier validé est figé | — | — | RG-02-07 |

### 4.7 Brouillon de création

| ID | Règle | Source |
|---|---|---|
| RG-03-26 | Pendant une création, l'app enregistre les champs saisis **sur l'appareil** (`AsyncStorage`, clé propre au compte), 0,8 s après la dernière modification, dès qu'un type, une région, un titre, une description ou un prix est renseigné. Les photos ne sont pas enregistrées. Aucun brouillon n'est tenu en mode modification. | `APP/src/features/publier/usePublierForm.ts`, `brouillon.ts` |
| RG-03-27 | À la réouverture de l'assistant, l'app propose « Reprendre votre annonce ? » (« Les photos seront à ajouter de nouveau. ») avec « Reprendre » ou « Recommencer ». Le brouillon est effacé après une publication réussie ou un choix « Recommencer ». | idem |
| RG-03-28 | Le brouillon est rattaché au compte et **effacé à la déconnexion** : sur un appareil partagé, l'utilisateur suivant ne le voit pas. Il n'est pas synchronisé entre appareils, ni entre le site et l'app. | `brouillon.ts`, `auth.store.ts` |

### 4.8 Correction et réexamen d'une annonce masquée (DEC-09)

| ID | Règle | Source |
|---|---|---|
| RG-03-29 | Une annonce **masquée par la modération** (MASQUEE) est **modifiable par son propriétaire** ou son professionnel (contenu et photos). Elle reste invisible du public. Les contrôles de RG-03-14 s'appliquent. Une annonce **rejetée** n'est pas modifiable (DEC-10). | `BienImmoServiceImpl.update` |
| RG-03-30 | Le propriétaire demande un réexamen, avec un message facultatif (≤ 500 caractères). L'annonce reçoit l'indicateur `reexamenDemande` et la date de la demande, et entre dans la file « Réexamens » de la modération (module 09). Une seule demande en cours par annonce. | `BienImmoServiceImpl.demanderReexamen` |
| RG-03-31 | Au plus **3 demandes de réexamen** par annonce ; au-delà, seul le support peut intervenir. Chaque demande et chaque décision sont inscrites dans l'historique. | idem |
| RG-03-32 | Issue du réexamen : **remise en ligne** (email E8, nouvelle validité de 180 jours) ; **masquage maintenu** avec un nouveau motif (email E16), l'annonce restant corrigeable ; ou **rejet** définitif (email E7). | `ModerationAnnonceService.java` |
| RG-03-33 | Dans « Mes annonces », une annonce masquée affiche le motif, « Modifier » et « Demander un réexamen » (« Réexamen en cours » après la demande). Une annonce rejetée ne propose ni l'un ni l'autre. | `features/mes-annonces/AnnonceCard.tsx` |

### 4.9 Caution et avance (DEC-23)

| ID | Règle | Source |
|---|---|---|
| RG-03-34 | Pour une LOCATION ou un BAIL, deux champs facultatifs s'ajoutent au loyer mensuel : **caution** (0 à 12 mois) et **avance** (0 à 24 mois), saisis à l'étape « Détails ». Sans objet pour une VENTE. | `AnnonceRequest.java` |
| RG-03-35 | Affichage sur la fiche, les cartes de liste et la description des pages de partage : « Loyer 3 500 000 GNF / mois · Caution 2 mois · Avance 3 mois ». Un champ vide n'est pas affiché. La périodicité du loyer reste mensuelle. | `src/lib/bien.ts`, `SharePageService.java` |

### 4.10 Conservation des photos (DEC-26)

| ID | Règle | Source |
|---|---|---|
| RG-03-36 | Les photos (et leurs variantes) d'une annonce clôturée ou supprimée depuis plus de **12 mois** sont supprimées du disque (tâche de 04:00, SFG §12). L'annonce garde son texte pour les conversations, les signalements et l'historique ; elle ne peut plus être réactivée sans nouvelle photo. | `PurgeConservationService.purgerPhotos` |

## 5. Cycle de vie d'une annonce

État = (`statutModeration`, `actif`, `motifCloture`).

```
                    création (photos + dossier validé + quota + licence)
                                   │
                                   ▼
      ┌──────────────── EN LIGNE (PUBLIEE, actif) ◄──────────────────────────────┐
      │ toggle (propriétaire)    │ clôturer (VENDU/LOUE/RETIRE)  │ job 03:00      │
      ▼                          ▼                               ▼                │
 MASQUÉE PAR LE PROPRIÉTAIRE   CLÔTURÉE                      EXPIRÉE (EXPIREE)    │
 (PUBLIEE, inactif)            (PUBLIEE, inactif, motif)     (PUBLIEE, inactif)   │
      │ toggle ────────────────────┴── réactiver / toggle ───────┴────────────────┘
      │
 Depuis tout état :
   modération « masquer » ─► MASQUEE (inactif, motif) ─► correction + réexamen ─► remise en ligne, masquage maintenu ou rejet
   modération « rejeter » ─► REJETEE (définitif)
   propriétaire « supprimer » ─► DESACTIVEE (inactif) ─► toggle par la modération ─► en ligne
   admin « masquer le compte » ─► état inchangé, mais invisible au public tant que le masquage dure
```

Côté app, le statut CLOTUREE est **dérivé** quand `motifCloture` est renseigné sur une annonce PUBLIEE (`src/api/annonce.api.ts`). Les pastilles de « Mes annonces » (`src/lib/annonce-statut.ts`) sont : aucune pour une annonce en ligne, « Clôturée · <motif> » (y compris Expirée), « Masquée » (par la modération ou par le propriétaire), « Rejetée ».

## 6. Écrans

| Écran | Route | Contenu clé |
|---|---|---|
| Publier / modifier | `app/(tabs)/publier.tsx` + `features/publier/usePublierForm.ts` | Assistant en 5 étapes, contrôle à la sortie de chaque champ, retour à l'étape de l'erreur renvoyée par l'API, pré-remplissage en mode modification, gestion des photos existantes (ajout, suppression, ordre, photo principale), carte de prévisualisation, sélecteur de position sur carte (`MapPickerModal`). Bandeau si le dossier de vérification n'est pas validé. Garde licence (`useLicenceGate`). |
| Mes annonces | `app/(tabs)/mes-annonces.tsx` (onglet pour les agents ; pour les autres, accès depuis le profil) | Cartes avec statut, référence, date d'expiration, vues, motif de modération ; actions Modifier, Demander un réexamen, Masquer / Afficher, Clôturer, Réactiver, Prolonger, Historique, Supprimer ; avis « Annonces masquées ». |
| Historique | `app/annonce-historique/[id].tsx` | Modifications de la plus récente à la plus ancienne : champ, ancienne et nouvelle valeur, auteur, date. |
| Fiche annonce | `app/annonce/[id].tsx` | Galerie (carrousel sur mobile, mosaïque et visionneuse sur ordinateur), prix, type, localisation (« Ouvrir dans Maps »), points forts, description (« Voir plus »), documents, dates, carte de l'annonceur, contact, signalement, similaires. Pour le propriétaire : « Modifier l'annonce » et bandeau d'état. |

## 7. API

| Méthode | URL | Accès | Description |
|---|---|---|---|
| POST | `/api/biens-immo` (multipart) | connecté | Créer (champs + `medias[]`) → 201 |
| PUT | `/api/biens-immo/{id}` (JSON) | propriétaire / professionnel / modération | Modifier (sans les photos) |
| DELETE | `/api/biens-immo/{id}` | propriétaire / professionnel / modération | Supprimer (DESACTIVEE) → 204 |
| PUT | `/api/biens-immo/{id}/toggle-actif` | propriétaire / professionnel / modération | Masquer ou réafficher |
| PUT | `/api/biens-immo/{id}/cloturer?motif=` | propriétaire / professionnel | Clôturer |
| PUT | `/api/biens-immo/{id}/reactiver` | propriétaire / professionnel | Réactiver ou prolonger |
| POST | `/api/biens-immo/{id}/reexamen` | propriétaire / professionnel | Demander un réexamen (message facultatif) |
| PUT | `/api/biens-immo/{id}/medias` (multipart `medias`) | propriétaire / professionnel / modération | Ajouter des photos |
| PUT | `/api/biens-immo/{id}/medias/ordre` (JSON `{mediaIds}`) | idem | Réordonner ; la première est la photo principale |
| DELETE | `/api/biens-immo/{id}/medias/{mediaId}` | idem | Supprimer une photo |
| GET | `/api/biens-immo/{id}` · `/api/biens-immo/public/p/{publicId}` | public (règle de visibilité) | Fiche (compte une vue) |
| GET | `/api/biens-immo/user` | connecté | Mes annonces (sauf supprimées), paginé |
| GET | `/api/biens-immo/{id}/historique` | voir §2 | Historique |

Codes d'erreur métier : 400 (validation, compatibilité, document inconnu), 402 (licence requise), 403 (droits, compte masqué), 404 (annonce introuvable, invisible ou non modifiable), 409 (modification concurrente, verrou optimiste `@Version`), 413 (fichier trop volumineux), 422 (dossier non validé, entreprise manquante ou désactivée, quota atteint, transition interdite).

## 8. Données

Table `annonce` : `id`, `version`, `public_id`, `reference_annonce` (unique), `titre`, `description` (≤ 2000), `prix`, `prix_revise`, `frais_honoraire`, `caution_mois`, `avance_mois`, `localisation_id`, `complement_adresse`, `latitude` / `longitude` (9,6), `type_annonce`, `type_bien`, `documents_disponibles` (codes), `date_creation`, `date_modification`, `actif`, `statut_moderation`, `motif_moderation` (≤ 500), `reexamen_demande`, `motif_cloture`, `date_cloture`, `date_expiration`, `relance_expiration_envoyee`, `vue_count`, `visible_public`, `visible_depuis`, `recherche_doc` (texte de recherche indexé, module 04), `owner_id`.
Table `bien_immo` : `surface_total`, `type_usage` (NOT NULL), `nb_pieces`, `nb_chambres`, `nb_salles_bain`.
Table `medias` : `url`, `type_mime`, `ordre` (1..n, photo principale = 1), `variantes`, `annonce_id`.

## 9. Critères d'acceptation

| ID | Critère |
|---|---|
| CA-03-01 | Une annonce LOCATION de type DOMAINE est refusée (400) ; une annonce BAIL de type MAGASIN avec l'usage COMMERCIAL est acceptée. |
| CA-03-02 | Une création sans photo renvoie 400 « Ajoutez au moins une photo à votre annonce. » ; une 11e photo renvoie 400. |
| CA-03-03 | Clôturer puis réactiver une annonce repousse son échéance de 180 jours à partir de la réactivation. |
| CA-03-04 | Une annonce supprimée n'apparaît plus dans « Mes annonces » mais reste visible pour un modérateur dans Administration > Annonces > Désactivées. |
| CA-03-05 | Consulter sa propre annonce n'augmente pas le compteur de vues ; deux consultations par la même IP en 24 h comptent pour une vue. |
| CA-03-06 | À J-7 de l'échéance, un seul email de relance est envoyé ; à l'échéance, l'annonce passe « Expirée » et peut être prolongée. |
| CA-03-07 | Une annonce masquée par son propriétaire depuis plus de 180 jours n'est pas expirée ; réaffichée, elle reçoit une nouvelle échéance à 180 jours. |
| CA-03-08 | Un modérateur ne peut pas modifier le contenu d'une annonce masquée, rejetée ou clôturée (404). |
| CA-03-09 | Un compte bloqué par la licence peut clôturer et supprimer ses annonces, mais pas les modifier ni ajouter de photos (402). |
| CA-03-10 | Après la suppression d'une annonce, ses conversations restent accessibles aux participants, avec l'indication que l'annonce n'est plus disponible. |
| CA-03-11 | Une création interrompue puis rouverte propose « Reprendre votre annonce ? » avec tous les champs sauf les photos ; après une déconnexion, le brouillon a disparu. |
| CA-03-12 | Une photo de 12 Mo est refusée (413) ; une photo envoyée avec des coordonnées GPS dans ses métadonnées est stockée sans métadonnées, avec sa miniature et sa version moyenne. |
| CA-03-13 | Une annonce masquée par la modération peut être modifiée par son propriétaire, reste invisible du public, et apparaît dans la file « Réexamens » après « Demander un réexamen ». |
| CA-03-14 | Une 4e demande de réexamen sur la même annonce est refusée ; une annonce rejetée ne propose ni « Modifier » ni « Demander un réexamen ». |
| CA-03-15 | Une location avec caution 2 et avance 3 affiche « Caution 2 mois · Avance 3 mois » sur la fiche et dans l'aperçu WhatsApp ; une vente ne propose pas ces champs. |
| CA-03-16 | Après un réordonnancement, la photo choisie en premier devient la vignette de l'annonce ; une liste qui oublie ou duplique une photo est refusée (400). |
| CA-03-17 | Une annonce créée avec « Titre foncier, donation » est enregistrée avec `TITRE_FONCIER,DONATION` ; « Plan cadastral » est refusé (400). |
| CA-03-18 | Un visiteur non connecté ouvre une annonce visible par son lien partagé (`/public/p/{publicId}`). |
