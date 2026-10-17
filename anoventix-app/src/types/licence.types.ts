export type StatutLicence = 'ACTIVE' | 'EXPIREE' | 'AUCUNE';

export type TypeLicence = 'PARTICULIER' | 'PROFESSIONNEL';

export const TYPE_LICENCE_LABELS: Record<TypeLicence, string> = {
  PARTICULIER: 'Particulier',
  PROFESSIONNEL: 'Professionnel',
};

export const STATUT_LICENCE_LABELS: Record<StatutLicence, string> = {
  ACTIVE: 'Active',
  EXPIREE: 'Expirée',
  AUCUNE: 'Non activée',
};

export interface Licence {
  /** Mode licence activé par l'administrateur. Faux : publication libre. */
  modeActif: boolean;
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

export type StatutCleLicence = 'LIBRE' | 'ACTIVE' | 'EXPIREE';

export const STATUT_CLE_LABELS: Record<StatutCleLicence, string> = {
  LIBRE: 'Libre',
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
  dateDebut: string | null;
  dateFin: string | null;
  createdAt: string;
}
