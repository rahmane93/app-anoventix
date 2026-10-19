export type StatutLicence = 'ACTIVE' | 'EN_ATTENTE' | 'EXPIREE' | 'AUCUNE';

export type TypeLicence = 'PARTICULIER' | 'PROFESSIONNEL';

export const TYPE_LICENCE_LABELS: Record<TypeLicence, string> = {
  PARTICULIER: 'Particulier',
  PROFESSIONNEL: 'Professionnel',
};

export const STATUT_LICENCE_LABELS: Record<StatutLicence, string> = {
  ACTIVE: 'Active',
  EN_ATTENTE: 'En attente de démarrage',
  EXPIREE: 'Expirée',
  AUCUNE: 'Non activée',
};

export interface Licence {
  /** Mode licence activé par l'administrateur. Faux : publication libre. */
  modeActif: boolean;
  /** Date à laquelle le mode licence s'applique (préavis de 30 jours, DEC-18). */
  dateEffet?: string | null;
  /** Mode activé mais pas encore en vigueur : la publication reste libre jusqu'à la date d'effet. */
  enPreavis?: boolean;
  statut: StatutLicence;
  type: TypeLicence | null;
  dateDebut: string | null;
  dateFin: string | null;
  /** Email du titulaire (le professionnel pour un agent). */
  compteOwner: string | null;
  /** Agent couvert par la licence de son professionnel. */
  partage: boolean;
  /** Annonces actives gratuites avant licence obligatoire. */
  annoncesGratuites: number;
  /** Annonces actives du compte (de l'entreprise pour un pro ou un agent). */
  annoncesActives: number;
  /** Au-delà du gratuit sans licence valide : fonctions d'annonceur bloquées. */
  bloque: boolean;
  /** Prix annuel (GNF) de la licence du type de compte ; null si non renseigné. */
  prix: number | null;
  /** Numéro (appel / WhatsApp) pour acheter une licence ; null si non renseigné. */
  contactTelephone: string | null;
}

/** Réglages de vente modifiables par l'administrateur (null = non renseigné). */
export interface ReglagesLicence {
  prixParticulier: number | null;
  prixProfessionnel: number | null;
  contactTelephone: string | null;
}

export type StatutCleLicence = 'LIBRE' | 'EN_ATTENTE' | 'ACTIVE' | 'EXPIREE';

export type MoyenPaiement = 'ORANGE_MONEY' | 'MTN_MOMO' | 'ESPECES' | 'VIREMENT' | 'AUTRE';

export const MOYEN_PAIEMENT_LABELS: Record<MoyenPaiement, string> = {
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  ESPECES: 'Espèces',
  VIREMENT: 'Virement',
  AUTRE: 'Autre',
};

/** Vente d'une clé nominative (DEC-17) : la référence est obligatoire sauf en espèces. */
export interface VenteLicence {
  acheteur: string;
  montant: number;
  moyenPaiement: MoyenPaiement;
  referencePaiement?: string;
}

export const STATUT_CLE_LABELS: Record<StatutCleLicence, string> = {
  LIBRE: 'Libre',
  EN_ATTENTE: 'En attente',
  ACTIVE: 'Active',
  EXPIREE: 'Expirée',
};

/** Clé de licence vue par l'administrateur. */
export interface LicenceAdmin {
  id: number;
  cle: string;
  type: TypeLicence;
  statut: StatutCleLicence;
  ownerEmail: string | null;
  /** Acheteur désigné ; nul pour une clé au porteur d'avant la mise en service. */
  acheteurEmail?: string | null;
  montant?: number | null;
  moyenPaiement?: MoyenPaiement | null;
  referencePaiement?: string | null;
  generePar?: string | null;
  dateVente?: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  createdAt: string;
}
