import { getStatutChip } from './annonce-statut';

describe('getStatutChip', () => {
  it("n'affiche rien pour une annonce publiée et active", () => {
    expect(getStatutChip({ statutModeration: 'PUBLIEE', motifCloture: null, actif: true })).toBeNull();
  });

  it('précise le motif de clôture', () => {
    expect(getStatutChip({ statutModeration: 'CLOTUREE', motifCloture: 'VENDU', actif: true })?.text).toBe('Clôturée · Vendu');
    expect(getStatutChip({ statutModeration: 'CLOTUREE', motifCloture: null, actif: true })?.text).toBe('Clôturée');
  });

  it('signale la modération avant l\'état actif', () => {
    expect(getStatutChip({ statutModeration: 'REJETEE', motifCloture: null, actif: false })?.text).toBe('Rejetée');
  });

  it("signale une annonce publiée mais inactive", () => {
    expect(getStatutChip({ statutModeration: 'PUBLIEE', motifCloture: null, actif: false })?.text).toBe('Masquée');
  });
});

describe('réexamen d’une annonce masquée (DEC-09, DEC-10)', () => {
  const { getEtatReexamen, estCorrigeable, estRejetee } = require('./annonce-statut');

  it('propose le réexamen sur une annonce masquée tant qu’il reste des demandes', () => {
    expect(getEtatReexamen({ statutModeration: 'MASQUEE', reexamenDemande: false, nbReexamens: 0 })).toBe('DISPONIBLE');
    expect(getEtatReexamen({ statutModeration: 'MASQUEE', reexamenDemande: false, nbReexamens: 2 })).toBe('DISPONIBLE');
  });

  it('signale un réexamen en cours, puis l’épuisement des trois demandes', () => {
    expect(getEtatReexamen({ statutModeration: 'MASQUEE', reexamenDemande: true, nbReexamens: 1 })).toBe('EN_COURS');
    expect(getEtatReexamen({ statutModeration: 'MASQUEE', reexamenDemande: false, nbReexamens: 3 })).toBe('EPUISE');
  });

  it('ne propose rien pour une annonce rejetée ou en ligne', () => {
    expect(getEtatReexamen({ statutModeration: 'REJETEE', reexamenDemande: false, nbReexamens: 0 })).toBe('AUCUN');
    expect(getEtatReexamen({ statutModeration: 'PUBLIEE', reexamenDemande: false, nbReexamens: 0 })).toBe('AUCUN');
    expect(estCorrigeable({ statutModeration: 'MASQUEE' })).toBe(true);
    expect(estRejetee({ statutModeration: 'REJETEE' })).toBe(true);
  });
});
