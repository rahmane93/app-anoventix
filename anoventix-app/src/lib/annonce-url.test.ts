import { annonceHref, annonceShareUrl, parseAnnonceParam } from './annonce-url';

describe('annonce-url', () => {
  it('construit l’URL à partir du slug et du publicId', () => {
    expect(annonceHref({ id: 30, publicId: 'k3x9a2bz7q4m', slug: 'terrain-kaloum' }))
      .toBe('/annonce/terrain-kaloum-k3x9a2bz7q4m');
    expect(annonceShareUrl({ id: 30, publicId: 'k3x9a2bz7q4m', slug: 'terrain-kaloum' }))
      .toBe('https://www.anoventix.com/annonce/terrain-kaloum-k3x9a2bz7q4m');
  });

  it('retombe sur l’id numérique sans publicId', () => {
    expect(annonceHref({ id: 30 })).toBe('/annonce/30');
  });

  it('lit le publicId après le dernier tiret, ou un ancien id numérique', () => {
    expect(parseAnnonceParam('terrain-a-vendre-k3x9a2bz7q4m')).toEqual({ kind: 'publicId', publicId: 'k3x9a2bz7q4m' });
    expect(parseAnnonceParam('k3x9a2bz7q4m')).toEqual({ kind: 'publicId', publicId: 'k3x9a2bz7q4m' });
    expect(parseAnnonceParam('30')).toEqual({ kind: 'id', id: 30 });
  });
});
