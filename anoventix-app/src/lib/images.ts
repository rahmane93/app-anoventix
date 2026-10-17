import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Fichier prêt pour un envoi multipart (format React Native). */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/** Côté le plus long envoyé : le serveur redimensionne à 1920 px de large. */
const MAX_SIDE = 1920;

/**
 * Convertit une image choisie en JPEG avant envoi.
 *
 * Pourquoi : le serveur (Java ImageIO / Thumbnailator) ne sait pas lire le HEIC,
 * format par défaut des iPhone (et de certains Android). L'option
 * `preferredAssetRepresentationMode: Compatible` du sélecteur n'est qu'une
 * préférence iOS, non garantie (photos iCloud, Live Photos…). Le décodage natif
 * du téléphone, lui, lit HEIC/HEIF, puis on réencode en JPEG.
 * Bonus : les grandes photos sont réduites avant l'envoi (moins de données mobiles).
 */
export async function toJpegUpload(
  asset: { uri: string; width?: number; height?: number },
  { quality = 0.85, baseName = 'photo' }: { quality?: number; baseName?: string } = {},
): Promise<UploadFile> {
  const context = ImageManipulator.manipulate(asset.uri);
  const { width = 0, height = 0 } = asset;
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  try {
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    return { uri: result.uri, name: `${baseName}-${Date.now()}.jpg`, type: 'image/jpeg' };
  } finally {
    // Objets natifs partagés : libérés tout de suite plutôt qu'au ramasse-miettes.
    image.release();
    context.release();
  }
}

/** Version liste (sélection multiple), dans l'ordre choisi. */
export async function toJpegUploads(
  assets: { uri: string; width?: number; height?: number }[],
  options?: { quality?: number; baseName?: string },
): Promise<UploadFile[]> {
  const files: UploadFile[] = [];
  // Séquentiel : évite de décoder 10 photos en parallèle en mémoire.
  for (const [i, a] of assets.entries()) {
    files.push(await toJpegUpload(a, { ...options, baseName: `${options?.baseName ?? 'photo'}-${i + 1}` }));
  }
  return files;
}
