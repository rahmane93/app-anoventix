import { Dimensions, Platform, StatusBar, useWindowDimensions } from 'react-native';

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
export const IMG_HEIGHT = Math.round(SCREEN_W * 0.72);
export const STATUS_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

/**
 * Dimensions de galerie. Natif : valeurs figées au lancement (portrait verrouillé).
 * Web : suivent la fenêtre, redimensionnable à tout moment.
 */
export function useScreenDims() {
  const win = useWindowDimensions();
  if (Platform.OS !== 'web') return { screenW: SCREEN_W, screenH: SCREEN_H, imgHeight: IMG_HEIGHT };
  return { screenW: win.width, screenH: win.height, imgHeight: Math.round(win.width * 0.72) };
}
