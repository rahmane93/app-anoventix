import {
  formatDate,
  formatFullLocalisation,
  formatMontantAbrege,
  formatNumericInput,
  formatPrix,
  formatPrixCompact,
  getErrorMessage,
  humanizeMediaError,
  isHibernateLazyError,
  parseOptionalNumber,
  sanitizeNumericInput,
} from './format';

describe('formatPrix', () => {
  it('groupe les milliers et suffixe GNF', () => {
    // L'espace de groupement varie selon ICU (U+00A0 / U+202F) :
    // on neutralise les espaces pour un test stable.
    expect(formatPrix(1200000).replace(/\s/g, '')).toBe('1200000GNF');
    expect(formatPrix(0).replace(/\s/g, '')).toBe('0GNF');
  });
});

describe('formatPrixCompact', () => {
  const clean = (s: string) => s.replace(/\s/g, ' ');
  it('abrège les millions et milliards', () => {
    expect(clean(formatPrixCompact(4_500_000))).toBe('4,5 M GNF');
    expect(clean(formatPrixCompact(2_800_000_000))).toBe('2,8 Md GNF');
    expect(clean(formatPrixCompact(1_250_000_000))).toBe('1,25 Md GNF');
    expect(clean(formatPrixCompact(3_000_000))).toBe('3 M GNF');
  });
  it('garde le montant complet sous le million', () => {
    expect(formatPrixCompact(850_000).replace(/\s/g, '')).toBe('850000GNF');
  });
});

describe('formatDate', () => {
  it('formate une date ISO en fr-FR (jour mois année)', () => {
    const out = formatDate('2026-05-16T12:00:00.000Z');
    expect(out).toContain('2026');
    expect(out.toLowerCase()).toContain('mai');
  });
});

describe('formatFullLocalisation', () => {
  it('joint quartier, commune, préfecture', () => {
    expect(
      formatFullLocalisation({
        quartier: 'Kipé',
        commune: 'Ratoma',
        prefecture: 'Conakry',
      }),
    ).toBe('Kipé, Ratoma, Conakry');
  });

  it('ignore les segments manquants', () => {
    expect(formatFullLocalisation({ commune: 'Ratoma' })).toBe('Ratoma');
  });

  it('retourne une chaîne vide si null/undefined', () => {
    expect(formatFullLocalisation(null)).toBe('');
    expect(formatFullLocalisation(undefined)).toBe('');
  });
});

describe('sanitizeNumericInput', () => {
  it('supprime tout caractère non numérique', () => {
    expect(sanitizeNumericInput('1 200a000 GNF')).toBe('1200000');
    expect(sanitizeNumericInput('abc')).toBe('');
  });
});

describe('formatNumericInput', () => {
  it('insère des espaces insécables tous les 3 chiffres', () => {
    expect(formatNumericInput('1200000')).toBe('1 200 000');
    expect(formatNumericInput('')).toBe('');
    expect(formatNumericInput('abc')).toBe('');
  });
});

describe('parseOptionalNumber', () => {
  it('parse une valeur formatée en nombre', () => {
    expect(parseOptionalNumber('1 200')).toBe(1200);
    expect(parseOptionalNumber('  300000  ')).toBe(300000);
  });

  it('retourne null pour une chaîne vide / espaces uniquement', () => {
    expect(parseOptionalNumber('')).toBeNull();
    expect(parseOptionalNumber('   ')).toBeNull();
  });

  it('retourne null pour une chaîne non numérique non vide', () => {
    expect(parseOptionalNumber('abc')).toBeNull();
  });
});

describe('getErrorMessage', () => {
  it('retourne le message d’une ApiError normalisée', () => {
    expect(getErrorMessage({ message: 'Boom serveur' })).toBe('Boom serveur');
  });

  it('mappe un 413 vers un message photos trop volumineuses', () => {
    expect(getErrorMessage({ status: 413 })).toMatch(/trop volumineuses/i);
    expect(getErrorMessage({ message: 'Request Entity Too Large' })).toMatch(
      /trop volumineuses/i,
    );
  });

  it('retombe sur le fallback si pas de message exploitable', () => {
    expect(getErrorMessage({}, 'repli')).toBe('repli');
    expect(getErrorMessage({ message: '' }, 'repli')).toBe('repli');
    expect(getErrorMessage(null, 'repli')).toBe('repli');
  });
});

describe('isHibernateLazyError', () => {
  it('détecte les erreurs de lazy-loading Hibernate', () => {
    expect(
      isHibernateLazyError({
        message: 'failed to lazily initialize a collection of role',
      }),
    ).toBe(true);
    expect(
      isHibernateLazyError({ message: 'could not initialize proxy - no Session' }),
    ).toBe(true);
  });

  it('retourne false pour une erreur quelconque', () => {
    expect(isHibernateLazyError({ message: 'Boom' })).toBe(false);
  });
});

describe('humanizeMediaError', () => {
  it('message dédié pour une erreur Hibernate lazy', () => {
    expect(
      humanizeMediaError(
        { message: 'failed to lazily initialize a collection' },
        'repli',
      ),
    ).toMatch(/médias/i);
  });

  it('message photos pour un 413', () => {
    expect(humanizeMediaError({ status: 413 }, 'repli')).toMatch(
      /trop volumineuses/i,
    );
  });

  it('sinon, retombe sur getErrorMessage/fallback', () => {
    expect(humanizeMediaError({}, 'repli')).toBe('repli');
  });
});

describe('formatMontantAbrege', () => {
  it('abrège millions et milliards', () => {
    expect(formatMontantAbrege(250_000_000)).toBe('250 millions');
    expect(formatMontantAbrege(2_500_000)).toBe('2,5 millions');
    expect(formatMontantAbrege(1_000_000)).toBe('1 million');
    expect(formatMontantAbrege(1_500_000_000)).toBe('1,5 milliard');
  });
  it('ne dit rien sous le million', () => {
    expect(formatMontantAbrege(750_000)).toBeNull();
  });
});
