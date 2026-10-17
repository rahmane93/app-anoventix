import { countActiveFilters, sanitizeFilters } from './filters';

describe('filtres Explorer', () => {
  it('ne compte pas le tri comme un filtre', () => {
    expect(countActiveFilters({ sort: 'prix', direction: 'asc' })).toBe(0);
    expect(countActiveFilters({ typeAnnonce: 'VENTE', prixMin: 1, prixMax: 2 })).toBe(2);
  });

  it('retire les chambres quand le bien est un terrain', () => {
    expect(sanitizeFilters({ typeBien: 'TERRAIN', nbChambresMin: 3 })).toEqual({ typeBien: 'TERRAIN' });
    expect(sanitizeFilters({ typeBien: 'VILLA', nbChambresMin: 3 })).toEqual({ typeBien: 'VILLA', nbChambresMin: 3 });
  });

  it('retire un type de bien impossible pour la transaction', () => {
    expect(sanitizeFilters({ typeAnnonce: 'BAIL', typeBien: 'TERRAIN' })).toEqual({ typeAnnonce: 'BAIL' });
    expect(sanitizeFilters({ typeAnnonce: 'LOCATION', typeBien: 'TERRAIN' }))
      .toEqual({ typeAnnonce: 'LOCATION', typeBien: 'TERRAIN' });
  });

  it('inverse des bornes min / max saisies à l’envers', () => {
    expect(sanitizeFilters({ prixMin: 500, prixMax: 100 })).toEqual({ prixMin: 100, prixMax: 500 });
  });
});
