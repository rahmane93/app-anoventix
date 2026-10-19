import type { MotifCloture, StatutAnnonce } from './annonce.types';
import type { MotifSignalementMessage } from './messagerie.types';

// ─── Énumérations ─────────────────────────────────────────────────────────────

export type StatutUtilisateur =
  | 'ACTIF'
  | 'SUSPENDU'
  | 'INACTIF'
  | 'EN_ATTENTE_ACTIVATION';

export type StatutPieceIdentite = 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';

export type TypePieceIdentite = 'CARTE_IDENTITE' | 'PASSEPORT' | 'PERMIS_DE_CONDUIRE' | 'AUTRE';

export type StatutSignalement = 'EN_ATTENTE' | 'TRAITE' | 'IGNORE';

export type NiveauAvertissement = 'LEGER' | 'MODERE' | 'GRAVE';

export const STATUT_SIGNALEMENT_LABELS: Record<StatutSignalement, string> = {
  EN_ATTENTE: 'En attente',
  TRAITE: 'Traité',
  IGNORE: 'Ignoré',
};

export const NIVEAU_AVERTISSEMENT_LABELS: Record<NiveauAvertissement, string> = {
  LEGER: 'Léger',
  MODERE: 'Modéré',
  GRAVE: 'Grave',
};

export const NIVEAU_AVERTISSEMENT_COLORS: Record<NiveauAvertissement, string> = {
  LEGER: '#F59E0B',
  MODERE: '#EF4444',
  GRAVE: '#7C3AED',
};

export const STATUT_USER_LABELS: Record<StatutUtilisateur, string> = {
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  INACTIF: 'Inactif',
  EN_ATTENTE_ACTIVATION: 'En attente',
};

export const STATUT_PIECE_LABELS: Record<StatutPieceIdentite, string> = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  REJETEE: 'Refusée',
};

export const TYPE_PIECE_LABELS: Record<TypePieceIdentite, string> = {
  CARTE_IDENTITE: 'Carte nationale',
  PASSEPORT: 'Passeport',
  PERMIS_DE_CONDUIRE: 'Permis de conduire',
  AUTRE: 'Autre',
};

// ─── Payloads API ─────────────────────────────────────────────────────────────

export interface ChangeStatutUserRequest {
  statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF';
  /** Enregistré dans `motifStatut` ; effacé quand il est omis (ex. réactivation). */
  motif?: string | null;
}

export interface ChangePieceIdentiteStatutRequest {
  statut: 'VALIDEE' | 'REJETEE';
  motifRejet?: string | null;
}

/** Décision sur un signalement : l'annonce et tous ses signalements en attente sont traités ensemble. */
export interface DecisionSignalementRequest {
  decision: 'MASQUER' | 'REJETER' | 'REMETTRE_EN_LIGNE' | 'CLASSER';
  /** Obligatoire pour masquer ou rejeter : il est communiqué au propriétaire. */
  motif?: string;
  noteAdmin?: string | null;
}

export interface TraiterSignalementRequest {
  statut: 'TRAITE' | 'IGNORE';
  noteAdmin?: string | null;
}

export interface EmettrAvertissementRequest {
  motif: string;
}

// ─── DTO ──────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUtilisateurs: number;
  totalAnnoncesActives: number;
  totalSignalements: number;
  signalementsEnAttente?: number;
  totalEntreprises: number;
  utilisateursEnAttenteActivation: number;
  piecesIdentiteEnAttente: number;
  messagesSignalesEnAttente?: number;
  reexamensEnAttente?: number;
  entreprisesAVerifier?: number;
  quartiersDemandes?: number;
}

export interface Signalement {
  id: number;
  annonceId: number;
  referenceAnnonce: string;
  titreAnnonce: string;
  reporterId: string;
  reporterUsername: string;
  motif: string;
  commentaire: string;
  statut: StatutSignalement;
  noteAdmin: string | null;
  date: string;
  annule: boolean;
  dateAnnulation: string | null;
  /** L'annonce a été masquée par le système après plusieurs signalements (DEC-11). */
  annonceMasqueeAutomatiquement?: boolean;
}

export interface SignalementsPage {
  content: Signalement[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminUser {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  type: string | null;
  photoProfil: string | null;
  typePieceIdentite: TypePieceIdentite | null;
  numeroPieceIdentite: string | null;
  pieceIdentiteUrl: string | null;
  statutPieceIdentite: StatutPieceIdentite | null;
  motifRejetPieceIdentite: string | null;
  /** Le selfie de vérification est enregistré (EVO-01) ; absent d'un dossier d'avant sa mise en service. */
  selfieFourni?: boolean;
  dateEnvoiVerification?: string | null;
  dateDecisionVerification?: string | null;
  statut: StatutUtilisateur;
  motifStatut: string | null;
  role?: string;
  nbAvertissements: number;
  /** Annonces du compte masquées par l'administrateur (masquage système). */
  annoncesMasquees?: boolean;
  motifMasquageAnnonces?: string | null;
  dateMasquageAnnonces?: string | null;
  entrepriseId: string | null;
  entrepriseNom: string | null;
  parentUserId: string | null;
  parentUsername: string | null;
  createdAt: string;
}

export interface AdminAnnonceLocalisation {
  id: number;
  pays: string | null;
  region: string | null;
  commune: string | null;
  quartier: string | null;
  adresse: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface AdminAnnonceMedia {
  id: number;
  url: string;
  typeMedia: 'IMAGE' | 'VIDEO';
  ordre: number;
}

export interface AdminAnnonce {
  id: number;
  referenceAnnonce: string;
  titre: string;
  description: string | null;
  prix: number;
  surface: number | null;
  typeBien: string;
  typeAnnonce: string;
  typeTransaction?: string;
  actif: boolean;
  statutModeration: StatutAnnonce;
  motifCloture: MotifCloture | null;
  dateCloture: string | null;
  vueCount: number;
  dateCreation: string;
  localisation: AdminAnnonceLocalisation | null;
  medias: AdminAnnonceMedia[];
  proprietaireId: string;
  proprietaireEmail?: string | null;
  /** Prénom et nom du propriétaire. */
  proprietaireNom?: string | null;
  entrepriseId: string | null;
  /** Annonces du propriétaire masquées par l'administrateur (masquage système). */
  proprietaireMasque?: boolean;
  /** Motif communiqué au propriétaire (annonce masquée ou rejetée). */
  motifModeration?: string | null;
  masquageAutomatique?: boolean;
  /** Réexamen demandé par le propriétaire (file « Réexamens », DEC-09). */
  reexamenDemande?: boolean;
  dateReexamen?: string | null;
  messageReexamen?: string | null;
  nbReexamens?: number;
}

export interface AdminAnnoncesPage {
  data: AdminAnnonce[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PiecesIdentitePage {
  content: AdminUser[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminEntreprise {
  id: string;
  nom: string;
  description: string | null;
  numeroRCCM: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  photoProfil: string | null;
  quotaAnnonces: number;
  quotaAgents: number;
  active: boolean;
  dateCreation: string;
  dateModification: string | null;
  annonceurProfessionnelId: string;
  annonceurProfessionnelEmail: string;
  nombreAgents: number;
  annoncesRestantes: number;
  agentsRestants: number;
  /** Vrai si l'entreprise a sa propre valeur au lieu de la valeur globale. */
  quotaAgentsPersonnalise?: boolean;
  quotaAnnoncesPersonnalise?: boolean;
}

// ─── Avertissements ───────────────────────────────────────────────────────────

export interface Avertissement {
  id: number;
  utilisateurId: string;
  motif: string;
  niveau: NiveauAvertissement;
  suspenduAutomatiquement: boolean;
  emitPar: string;
  date: string;
}

/** Quotas des comptes pro ; en exception d'entreprise, null = valeur globale. */
export interface QuotasPro {
  quotaAgents: number | null;
  quotaAnnonces: number | null;
}

// ─── Messages signalés ────────────────────────────────────────────────────────

/** Message vu par la modération (file des signalés et conversation admin). */
export interface MessageSignale {
  id: number;
  conversationId: number;
  senderId: string;
  senderUsername: string;
  senderPhotoProfil: string | null;
  content: string;
  createdAt: string;
  signale: boolean;
  supprime: boolean;
  annonceId: number | null;
  annonceTitre: string | null;
  annonceReference: string | null;
  /** Null pour un signalement antérieur au motif obligatoire. */
  motifSignalement: MotifSignalementMessage | null;
  dateSignalement: string | null;
  signaleParId: string | null;
  signaleParUsername: string | null;
}

export interface MessagesSignalesPage {
  content: MessageSignale[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
