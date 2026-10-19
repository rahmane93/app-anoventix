// ─── User Profile ─────────────────────────────────────────────────────────────

export type TypePieceIdentite = 'CARTE_IDENTITE' | 'PASSEPORT' | 'PERMIS_DE_CONDUIRE' | 'AUTRE';
export type StatutCompte = 'EN_ATTENTE_ACTIVATION' | 'ACTIF' | 'INACTIF' | 'SUSPENDU';

// ─── Pièce d'identité ────────────────────────────────────────────────────────

/** Statut du document d'identité soumis par l'utilisateur. */
export type StatutPieceIdentite = 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';

export interface UserProfile {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  photoProfil: string | null;
  mustChangePassword: boolean;
  // Pièce d'identité — champs plats retournés par le backend
  typePieceIdentite: TypePieceIdentite | null;
  numeroPieceIdentite: string | null;
  pieceIdentiteUrl: string | null;
  statutPieceIdentite: StatutPieceIdentite | null;
  motifRejetPieceIdentite: string | null;
  /** Selfie de vérification enregistré (EVO-01). Faux pour un dossier d'avant la mise en service du selfie. */
  selfieFourni?: boolean;
  dateEnvoiVerification?: string | null;
  dateDecisionVerification?: string | null;
  statut: StatutCompte;
  motifStatut: string | null;
  /** Annonces du compte masquées par l'administrateur (masquage système). */
  annoncesMasquees?: boolean;
  motifMasquageAnnonces?: string | null;
  dateMasquageAnnonces?: string | null;
  roles?: string[];
  role?: string;
  createdAt: string;
  entrepriseId: string | null;
  entrepriseNom: string | null;
  parentUserId: string | null;
  parentUsername: string | null;
}

// ─── Update Profile Request ───────────────────────────────────────────────────

export interface UpdateProfileRequest {
  nom?: string;
  prenom?: string;
  telephone?: string;
  typePieceIdentite?: TypePieceIdentite;
  numeroPieceIdentite?: string;
}
