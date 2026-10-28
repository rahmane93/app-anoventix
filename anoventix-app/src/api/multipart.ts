import { Platform } from 'react-native';
import { API_BASE_URL, fallbackMessageForStatus, getToken } from './client';

/** Fichier à envoyer en multipart : URI locale (image picker / caméra) + nom et type MIME. */
export type UploadFile = { uri: string; name: string; type: string };

/**
 * Ajoute un fichier à un FormData.
 *
 * Natif : le format React Native `{ uri, name, type }`, lu par le XMLHttpRequest de RN.
 * Web : ce format n'existe pas, le navigateur transformerait l'objet en texte
 * (« [object Object] ») et l'API répondrait « Failed to convert … MultipartFile ».
 * On récupère donc le contenu de l'URI (blob: ou data:) et on l'ajoute en Blob.
 */
export async function appendFile(formData: FormData, field: string, file: UploadFile): Promise<void> {
  if (Platform.OS !== 'web') {
    formData.append(field, { uri: file.uri, name: file.name, type: file.type } as any);
    return;
  }
  const blob = await (await fetch(file.uri)).blob();
  // Le type du blob peut être vide (data: sans type) : on impose celui du fichier.
  formData.append(field, blob.slice(0, blob.size, file.type || blob.type), file.name);
}

/** Délai d'un envoi de fichiers : plus long qu'un appel JSON (photos, réseau mobile). */
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Requête multipart/form-data (POST ou PUT) via XMLHttpRequest.
 *
 * Pourquoi pas fetch : depuis Expo SDK 52+, le `fetch` global est `expo/fetch`,
 * qui ne sait pas sérialiser les fichiers au format React Native
 * (`{ uri, name, type }`) et lève « Unsupported FormDataPart implementation ».
 * Le XMLHttpRequest de React Native lit ces fichiers nativement et génère le
 * boundary lui-même (ne JAMAIS définir Content-Type à la main).
 * Pourquoi pas axios : son adaptateur RN gère mal le boundary multipart.
 *
 * En cas d'erreur, throw `{ message, status, errors, raw }` : forme sur-ensemble
 * compatible avec `getErrorMessage` et les consommateurs qui lisent `.errors`
 * (création annonce) ou `.raw` (upload profil).
 */
export async function multipartRequest<T>(
  method: 'POST' | 'PUT',
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getToken();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_BASE_URL}${path}`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      const text = xhr.responseText ?? '';
      let json: any;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { message: text };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(json as T);
        return;
      }
      const serverMessage =
        json?.message ?? (xhr.status < 500 ? json?.error : null);
      if (__DEV__) console.error('[multipart error]', method, path, xhr.status, json);
      reject({
        message: serverMessage ?? fallbackMessageForStatus(xhr.status),
        status: xhr.status,
        errors: json?.errors ?? null,
        raw: json,
      });
    };

    xhr.onerror = () =>
      reject({
        message: 'Pas de connexion Internet. Vérifiez votre réseau et réessayez.',
        status: undefined,
        errors: null,
        raw: null,
        isNetworkError: true,
      });

    xhr.ontimeout = () =>
      reject({
        message: "L'envoi a pris trop de temps. Vérifiez votre connexion et réessayez.",
        status: undefined,
        errors: null,
        raw: null,
        isNetworkError: true,
      });

    xhr.send(formData);
  });
}

export const multipartPost = <T>(path: string, formData: FormData) =>
  multipartRequest<T>('POST', path, formData);

export const multipartPut = <T>(path: string, formData: FormData) =>
  multipartRequest<T>('PUT', path, formData);
