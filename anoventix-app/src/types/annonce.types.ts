// ─── Localisation ─────────────────────────────────────────────────────────────

export interface Localisation {
  id: string;
  region: string;
  prefecture: string;
  commune: string;
  quartier: string;
  typeCommune?: string;
  /** Entrée « Autre quartier » : l'annonce s'affiche avec sa commune seule (DEC-22). */
  technique?: boolean;
  /** Point de référence du quartier, pour centrer la carte. */
  latitude?: number | null;
  longitude?: number | null;
}

// ─── Enums Annonce ────────────────────────────────────────────────────────────

export type TypeAnnonce = 'VENTE' | 'LOCATION' | 'BAIL';

export type TypeBien =
  // Habitations
  | 'APPARTEMENT'
  | 'MAISON'
  | 'VILLA'
  // Autres
  | 'TERRAIN'
  | 'DOMAINE'
  | 'MAGASIN'
  | 'BUREAU'
  | 'ENTREPOT'
  | 'AUTRE';

/**
 * Statut de modération côté backend (spec API).
 * `CLOTUREE` est dérivé côté client quand `motifCloture != null`.
 */
export type StatutAnnonce = 'PUBLIEE' | 'MASQUEE' | 'REJETEE' | 'CLOTUREE' | 'DESACTIVEE';

/** EXPIREE : clôture automatique en fin de validité (jamais choisie par l'utilisateur). */
export type MotifCloture = 'VENDU' | 'LOUE' | 'RETIRE' | 'EXPIREE';

export type TypeUsage =
  | 'AGRICOLE'
  | 'HABITATION'
  | 'COMMERCIAL'
  | 'LOISIR'
  | 'PROFESSIONNEL'
  | 'AUTRE';

export type DocumentsDisponibles =
  | 'TITRE_FONCIER'
  | 'DONATION'
  | 'ACTE_DE_VENTE'
  | 'CERTIFICAT_USAGE_FONCIER'
  | 'AUTRE';

// ─── Média ────────────────────────────────────────────────────────────────────

export interface Media {
  id: number;
  url: string;
  typeMime: string;
  ordre: number;
  /** Miniature d'environ 400 px (listes, cartes) ; absente d'une photo ancienne. */
  urlMiniature?: string | null;
  /** Version d'environ 1080 px (fiche) ; absente d'une photo ancienne. */
  urlMoyenne?: string | null;
}

// ─── Annonceur (info publique de l'auteur) ────────────────────────────────────

export type RoleAnnonceur = 'PARTICULIER' | 'PROFESSIONNEL' | 'AGENT_PROFESSIONNEL' | 'MODERATEUR' | 'ADMINISTRATEUR';

export interface Annonceur {
  id?: string;
  email?: string | null;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  photoProfil: string | null;
  role: RoleAnnonceur | null;
  entrepriseId?: string | null;
  entrepriseNom?: string | null;
  /** L'entreprise de l'annonceur est vérifiée : badge « Agence vérifiée » (DEC-04). */
  agenceVerifiee?: boolean;
}

// ─── BienImmo (réponse API) ───────────────────────────────────────────────────

export interface BienImmo {
  id: number;
  /** Identifiant public des URLs partagées (/annonce/<slug>-<publicId>), cf. src/lib/annonce-url.ts. */
  publicId?: string;
  slug?: string;
  referenceAnnonce: string;
  titre: string;
  description: string;
  prix: number;
  prixRevise: number | null;
  localisationId: string;
  localisation?: Localisation; // inclus si le backend l'embarque
  complementAdresse: string | null;
  longitude: number | null;
  latitude: number | null;
  typeAnnonce: TypeAnnonce;
  typeBien: TypeBien;
  typeUsage: TypeUsage | null;
  fraisHonoraire: number | null;
  /** Location / bail : caution et avance en mois de loyer (DEC-23). */
  cautionMois?: number | null;
  avanceMois?: number | null;
  documentsDisponibles: string | null;
  surfaceTotal: number | null;
  /** Composition — toujours null pour TERRAIN / DOMAINE (vendus ou loués en l'état). */
  nbPieces?: number | null;
  nbChambres?: number | null;
  nbSallesBain?: number | null;
  dateCreation: string;
  dateModification: string;
  actif: boolean;
  statutModeration: StatutAnnonce;
  /** Motif de clôture (non null = annonce clôturée → statut dérivé CLOTUREE). */
  motifCloture: MotifCloture | null;
  dateCloture: string | null;
  /** Motif communiqué par la modération (annonce masquée ou rejetée). */
  motifModeration?: string | null;
  /** Masquée par le système après plusieurs signalements (en attente de vérification). */
  masquageAutomatique?: boolean;
  /** Réexamen demandé par le propriétaire et pas encore tranché. */
  reexamenDemande?: boolean;
  dateReexamen?: string | null;
  messageReexamen?: string | null;
  /** Demandes de réexamen déjà faites sur cette annonce (3 au plus). */
  nbReexamens?: number;
  /** Fin de validité : clôture automatique (EXPIREE) à cette date, prolongeable gratuitement. */
  dateExpiration?: string | null;
  /** Annonces du propriétaire masquées par l'administrateur (vues propriétaire / admin). */
  proprietaireMasque?: boolean;
  userId: string;
  nbFavoris?: number;
  vueCount?: number;
  annonceur?: Annonceur;
  medias: Media[];
}

// ─── Requête création ─────────────────────────────────────────────────────────

export interface CreateBienImmoRequest {
  titre: string;
  description: string;
  prix: number;
  typeAnnonce: TypeAnnonce;
  typeBien: TypeBien;
  typeUsage?: TypeUsage;
  documentsDisponibles?: string;
  localisationId: string;
  /** Nom du quartier saisi quand il n'est pas dans la liste (DEC-22). */
  quartierSaisi?: string;
  fraisHonoraire?: number;
  cautionMois?: number;
  avanceMois?: number;
  surfaceTotal?: number;
  nbPieces?: number;
  nbChambres?: number;
  nbSallesBain?: number;
  complementAdresse?: string;
  latitude?: number;
  longitude?: number;
  medias: { uri: string; name: string; type: string }[];
}

// ─── Requête modification ─────────────────────────────────────────────────────

export interface UpdateBienImmoRequest {
  titre?: string;
  description?: string;
  prix?: number;
  prixRevise?: number;
  localisationId?: string;
  quartierSaisi?: string;
  complementAdresse?: string;
  longitude?: number;
  latitude?: number;
  typeAnnonce?: TypeAnnonce;
  fraisHonoraire?: number;
  cautionMois?: number;
  avanceMois?: number;
  typeBien?: TypeBien;
  typeUsage?: TypeUsage;
  documentsDisponibles?: string;
  surfaceTotal?: number;
  nbPieces?: number;
  nbChambres?: number;
  nbSallesBain?: number;
  /** Nouveaux médias à ajouter (optionnel). */
  medias?: { uri: string; name: string; type: string }[];
}

// ─── Filtres de recherche ─────────────────────────────────────────────────────

export interface AnnonceFilterParams {
  reference?: string;
  typeAnnonce?: TypeAnnonce;
  typeBien?: TypeBien;
  typeUsage?: TypeUsage;
  prixMin?: number;
  prixMax?: number;
  region?: string;
  prefecture?: string;
  commune?: string;
  quartier?: string;
  /** Recherche texte, combinable avec les autres critères. */
  q?: string;
  nbPiecesMin?: number;
  nbChambresMin?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  userId?: string;
}

// ─── Recherche géospatiale ────────────────────────────────────────────────────

export interface NearbyParams {
  lat: number;
  lng: number;
  rayon?: number; // km, défaut backend
  /** Filtres appliqués par l'API avant la pagination. */
  typeAnnonce?: TypeAnnonce;
  typeBien?: TypeBien;
  prixMin?: number;
  prixMax?: number;
  page?: number;
  size?: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Structure réelle retournée par le backend Anoventix */
export interface PageResponse<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

// ─── Labels UI ────────────────────────────────────────────────────────────────

export const TYPE_ANNONCE_LABELS: Record<TypeAnnonce, string> = {
  VENTE: 'Vente',
  LOCATION: 'Location',
  BAIL: 'Bail',
};

export const TYPE_BIEN_LABELS: Record<TypeBien, string> = {
  APPARTEMENT: 'Appartement',
  MAISON: 'Maison',
  VILLA: 'Villa',
  TERRAIN: 'Terrain',
  DOMAINE: 'Domaine',
  MAGASIN: 'Magasin',
  BUREAU: 'Bureau',
  ENTREPOT: 'Entrepôt',
  AUTRE: 'Autre',
};

export const STATUT_ANNONCE_LABELS: Record<StatutAnnonce, string> = {
  PUBLIEE: 'Publiée',
  MASQUEE: 'Masquée',
  REJETEE: 'Rejetée',
  CLOTUREE: 'Clôturée',
  DESACTIVEE: 'Désactivée',
};

export const MOTIF_CLOTURE_LABELS: Record<MotifCloture, string> = {
  VENDU: 'Vendu',
  LOUE: 'Loué',
  RETIRE: 'Retiré',
  EXPIREE: 'Expirée',
};

export const TYPE_USAGE_LABELS: Record<TypeUsage, string> = {
  AGRICOLE: 'Agricole',
  HABITATION: 'Habitation',
  COMMERCIAL: 'Commercial',
  LOISIR: 'Loisir',
  PROFESSIONNEL: 'Professionnel',
  AUTRE: 'Autre',
};

export const DOCUMENTS_LABELS: Record<DocumentsDisponibles, string> = {
  TITRE_FONCIER: 'Titre foncier',
  DONATION: 'Donation',
  ACTE_DE_VENTE: 'Acte de vente',
  CERTIFICAT_USAGE_FONCIER: 'Certificat d\'usage foncier',
  AUTRE: 'Autre',
};
