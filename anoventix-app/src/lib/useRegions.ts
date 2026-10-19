import { useEffect, useState } from 'react';
import { getRegions } from '@/src/api/localisation.api';
import { REGIONS_GUINEE } from '@/src/stores/annonce.store';

// Régions chargées depuis le référentiel (ECART-59) : une région ajoutée ou renommée en base apparaît sans
// nouvelle version de l'app. La liste connue sert en attendant la réponse, et si l'API est injoignable.
let cache: string[] | null = null;
let enCours: Promise<string[]> | null = null;

const charger = (): Promise<string[]> => {
  if (cache) return Promise.resolve(cache);
  enCours ??= getRegions()
    .then((r) => {
      cache = r.length > 0 ? r : REGIONS_GUINEE;
      return cache;
    })
    .catch(() => {
      enCours = null;
      return REGIONS_GUINEE;
    });
  return enCours;
};

export function useRegions(): string[] {
  const [regions, setRegions] = useState<string[]>(cache ?? REGIONS_GUINEE);
  useEffect(() => {
    let actif = true;
    charger().then((r) => {
      if (actif) setRegions(r);
    });
    return () => {
      actif = false;
    };
  }, []);
  return regions;
}
