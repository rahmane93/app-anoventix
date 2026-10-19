import type { TypeAnnonce, TypeBien } from '@/src/types/annonce.types';

// ─── Règles métier liées au type de bien ─────────────────────────────────────
// Source unique partagée par la publication, les filtres, les cartes et la
// fiche annonce (miroir de TypeBien.estBati() côté API).

/** Biens non bâtis : vendus ou loués en l'état, sans pièces ni chambres. */
export const BIENS_NON_BATIS: readonly TypeBien[] = ['TERRAIN', 'DOMAINE'];

/** Biens d'habitation : pièces, chambres et salles de bain pertinentes. */
export const BIENS_HABITATION: readonly TypeBien[] = ['APPARTEMENT', 'MAISON', 'VILLA'];

export function isBienBati(typeBien?: TypeBien | '' | null): boolean {
  return !!typeBien && !BIENS_NON_BATIS.includes(typeBien);
}

export type ChampComposition = 'nbPieces' | 'nbChambres' | 'nbSallesBain';

/**
 * Champs de composition à proposer pour un type de bien :
 * habitation → pièces, chambres, salles de bain ; bureau / autre bâti → pièces ;
 * magasin, entrepôt → aucun ; terrain, domaine → aucun (vendu/loué en l'état).
 */
export function champsComposition(typeBien?: TypeBien | '' | null): ChampComposition[] {
  if (!typeBien || !isBienBati(typeBien)) return [];
  if (BIENS_HABITATION.includes(typeBien)) return ['nbPieces', 'nbChambres', 'nbSallesBain'];
  if (typeBien === 'BUREAU' || typeBien === 'AUTRE') return ['nbPieces'];
  return [];
}

/** Location et bail commercial se paient au mois. */
/**
 * « Caution 2 mois · Avance 3 mois » (RG-03-35). Un champ vide ou nul n'est pas affiché ;
 * rien pour une vente.
 */
export function libelleCautionAvance(
  a: { typeAnnonce?: TypeAnnonce | '' | null; cautionMois?: number | null; avanceMois?: number | null },
): string {
  if (!isLoyerMensuel(a.typeAnnonce)) return '';
  const parties: string[] = [];
  if (a.cautionMois) parties.push(`Caution ${a.cautionMois} mois`);
  if (a.avanceMois) parties.push(`Avance ${a.avanceMois} mois`);
  return parties.join(' · ');
}

export function isLoyerMensuel(typeAnnonce?: TypeAnnonce | '' | null): boolean {
  return typeAnnonce === 'LOCATION' || typeAnnonce === 'BAIL';
}

/** Libellé du champ prix selon la transaction. */
export function prixLabel(typeAnnonce?: TypeAnnonce | '' | null): string {
  return isLoyerMensuel(typeAnnonce) ? 'Loyer mensuel (GNF)' : 'Prix de vente (GNF)';
}

/** Libellé de la surface : superficie pour un terrain, surface habitable/utile sinon. */
export function surfaceLabel(typeBien?: TypeBien | '' | null): string {
  if (typeBien && !isBienBati(typeBien)) return 'Superficie du terrain (m²)';
  return 'Surface (m²)';
}

/** Résumé court de composition : « 4 pièces · 3 ch. · 2 sdb ». */
export function formatComposition(b: {
  typeBien: TypeBien;
  nbPieces?: number | null;
  nbChambres?: number | null;
  nbSallesBain?: number | null;
}): string {
  if (!isBienBati(b.typeBien)) return '';
  const parts: string[] = [];
  if (b.nbPieces != null) parts.push(`${b.nbPieces} pièce${b.nbPieces > 1 ? 's' : ''}`);
  if (b.nbChambres != null) parts.push(`${b.nbChambres} ch.`);
  if (b.nbSallesBain != null) parts.push(`${b.nbSallesBain} sdb`);
  return parts.join(' · ');
}
