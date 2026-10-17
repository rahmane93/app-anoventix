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
    expect(getStatutChip({ statutModeration: 'EN_ATTENTE', motifCloture: null, actif: true })?.text).toBe('En attente');
  });

  it("signale une annonce publiée mais inactive", () => {
    expect(getStatutChip({ statutModeration: 'PUBLIEE', motifCloture: null, actif: false })?.text).toBe('Masquée');
  });
});
