import { getZonesActives } from '@/src/api/annonce.api';
import { getLocalisationsByRegion } from '@/src/api/localisation.api';
import { useEffect, useState } from 'react';

export interface Zone {
  region: string;
  prefecture: string;
  commune: string;
  /** Absent pour les zones de repli (pas de décompte disponible). */
  nbAnnonces?: number;
}

const LIMITE = 8;
/** Les volumes bougent lentement : on ne recharge pas à chaque retour sur Explorer. */
const TTL_MS = 10 * 60 * 1000;

let cache: { zones: Zone[]; at: number } | null = null;
let pending: Promise<Zone[]> | null = null;

/** Repli : communes de Conakry, quand aucun décompte n'est disponible. */
async function communesConakry(): Promise<Zone[]> {
  const locs = await getLocalisationsByRegion('Conakry');
  const byName = new Map<string, Zone>();
  for (const l of locs) {
    if (l.commune && !byName.has(l.commune)) {
      byName.set(l.commune, { region: l.region, prefecture: l.prefecture, commune: l.commune });
    }
  }
  return [...byName.values()].sort((a, b) => a.commune.localeCompare(b.commune, 'fr'));
}

async function charger(): Promise<Zone[]> {
  try {
    const actives = await getZonesActives(LIMITE);
    if (actives.length > 0) return actives;
  } catch {
    // backend indisponible ou ancien : repli ci-dessous
  }
  return communesConakry();
}

function loadZones(): Promise<Zone[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.zones);
  if (!pending) {
    pending = charger()
      .then((zones) => {
        cache = { zones, at: Date.now() };
        return zones;
      })
      .finally(() => { pending = null; });
  }
  return pending;
}

/**
 * Zones du sélecteur d'Explorer : les communes ayant le plus d'annonces
 * publiées, toutes régions confondues (les plus actives d'abord). Repli sur les
 * communes de Conakry si le décompte est vide ou indisponible. Liste vide
 * tant que rien n'est chargé : le sélecteur se réduit alors à « Partout ».
 */
export function useZonesActives(): Zone[] {
  const [zones, setZones] = useState<Zone[]>(cache?.zones ?? []);
  useEffect(() => {
    let alive = true;
    loadZones()
      .then((list) => { if (alive) setZones(list); })
      .catch(() => { /* sélecteur réduit à « Partout » */ });
    return () => { alive = false; };
  }, []);
  return zones;
}
