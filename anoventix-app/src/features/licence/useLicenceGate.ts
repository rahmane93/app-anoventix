import { setOnLicenceRequise } from '@/src/api/client';
import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { useLicenceStore } from '@/src/stores/licence.store';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const ECRAN_LICENCE = '/licence';

/**
 * Compte bloqué (licence requise) : redirection systématique vers « Ma licence »
 * à l'ouverture de l'app, à la connexion, au retour au premier plan et sur tout
 * refus 402 de l'API. L'utilisateur peut revenir en arrière : messagerie,
 * navigation et réduction de ses annonces restent permises.
 */
export function useLicenceGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const roles = useAuthStore((s) => s.user?.roles);
  const { isAdministrateur, isModerateur } = getRoleFlags(roles);
  const concerne = isAuthenticated && !isLoading && !mustChangePassword && !isAdministrateur && !isModerateur;

  // Lu dans des callbacks asynchrones : toujours la route courante.
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    setOnLicenceRequise(() => {
      useLicenceStore.getState().load();
      if (pathRef.current !== ECRAN_LICENCE) router.push(ECRAN_LICENCE);
    });
    return () => setOnLicenceRequise(null);
  }, []);

  useEffect(() => {
    if (!concerne) {
      if (!isAuthenticated) useLicenceStore.getState().reset();
      return;
    }
    const verifier = async () => {
      const licence = await useLicenceStore.getState().load();
      if (licence?.bloque && pathRef.current !== ECRAN_LICENCE) router.push(ECRAN_LICENCE);
    };
    verifier();
    const sub = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') verifier();
    });
    return () => sub.remove();
  }, [concerne, isAuthenticated]);
}
