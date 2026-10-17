import {
  champsComposition,
  formatComposition,
  isBienBati,
  isLoyerMensuel,
  prixLabel,
  surfaceLabel,
} from './bien';

describe('règles par type de bien', () => {
  it('traite terrain et domaine comme non bâtis (vendus ou loués en l’état)', () => {
    expect(isBienBati('TERRAIN')).toBe(false);
    expect(isBienBati('DOMAINE')).toBe(false);
    expect(isBienBati('MAISON')).toBe(true);
    expect(isBienBati('')).toBe(false);
  });

  it('ne propose aucun champ de composition pour un terrain', () => {
    expect(champsComposition('TERRAIN')).toEqual([]);
    expect(champsComposition('DOMAINE')).toEqual([]);
  });

  it('propose pièces, chambres et sdb pour une habitation, pièces seules pour un bureau', () => {
    expect(champsComposition('APPARTEMENT')).toEqual(['nbPieces', 'nbChambres', 'nbSallesBain']);
    expect(champsComposition('BUREAU')).toEqual(['nbPieces']);
    expect(champsComposition('ENTREPOT')).toEqual([]);
  });

  it('considère location et bail comme des loyers mensuels', () => {
    expect(isLoyerMensuel('LOCATION')).toBe(true);
    expect(isLoyerMensuel('BAIL')).toBe(true);
    expect(isLoyerMensuel('VENTE')).toBe(false);
    expect(prixLabel('LOCATION')).toBe('Loyer mensuel (GNF)');
    expect(prixLabel('VENTE')).toBe('Prix de vente (GNF)');
  });

  it('parle de superficie pour un terrain', () => {
    expect(surfaceLabel('TERRAIN')).toBe('Superficie du terrain (m²)');
    expect(surfaceLabel('VILLA')).toBe('Surface (m²)');
  });

  it('résume la composition, jamais pour un terrain même si des valeurs traînent', () => {
    expect(formatComposition({ typeBien: 'MAISON', nbPieces: 4, nbChambres: 3, nbSallesBain: 2 }))
      .toBe('4 pièces · 3 ch. · 2 sdb');
    expect(formatComposition({ typeBien: 'TERRAIN', nbPieces: 4 })).toBe('');
    expect(formatComposition({ typeBien: 'APPARTEMENT', nbPieces: 1 })).toBe('1 pièce');
  });
});
