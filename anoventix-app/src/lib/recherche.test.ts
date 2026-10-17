import { parametresSaisie } from './recherche';

describe('parametresSaisie', () => {
  it.each(['VE-260317-K7QM', 'lo-0317-ab12', '  BA-251231-ZZ99  '])(
    'reconnaît la référence %p',
    (saisie) => {
      expect(parametresSaisie(saisie)).toEqual({ reference: saisie.trim().toUpperCase() });
    },
  );

  it.each(['villa Kipé', 'VE-317-K7QM', 'XX-260317-K7QM', 'VE-260317-K7QMX', ''])(
    'envoie %p en recherche plein texte',
    (saisie) => {
      expect(parametresSaisie(saisie)).toEqual({ q: saisie.trim() });
    },
  );
});
