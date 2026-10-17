import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

/**
 * Demande la permission et récupère la position GPS courante.
 * Retourne les coordonnées, `'denied'` si la permission est refusée,
 * ou `null` en cas d'échec de localisation.
 */
export async function getCurrentCoords(): Promise<Coords | 'denied' | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return 'denied';
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}
