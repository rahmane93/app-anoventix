import type { AnnonceFilterParams, BienImmo, CreateBienImmoRequest, MotifCloture, NearbyParams, PageResponse, UpdateBienImmoRequest } from '../types/annonce.types';
import { API_BASE_URL, apiClient, rethrowApiError } from './client';
import { multipartPost, multipartPut } from './multipart';

// ─── Helper URL médias ────────────────────────────────────────────────────────

/**
 * Les URLs des médias sont relatives (/uploads/...).
 * Cette fonction préfixe avec API_BASE_URL si nécessaire. Toute URI qui a déjà
 * un schéma reste telle quelle : http(s), mais aussi les photos locales
 * (file://, content://, ph://) de l'aperçu avant publication.
 */
export function buildMediaUrl(url: string): string {
  if (!url) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Normalise les URLs des medias et dérive le statut CLOTUREE (motifCloture != null).
 * Une décision de modération (MASQUEE / REJETEE) prime sur la clôture : sinon l'annonce
 * s'afficherait « Clôturée » avec un bouton Réactiver que le serveur refuse.
 */
export function normalizeMediaUrls(item: BienImmo): BienImmo {
  return {
    ...item,
    statutModeration:
      item.motifCloture != null && item.statutModeration === 'PUBLIEE' ? 'CLOTUREE' : item.statutModeration,
    medias: (item.medias ?? []).map(urlsAbsolues),
  };
}

/** URL absolues d'une photo et de ses variantes. */
export function urlsAbsolues<T extends { url: string; urlMiniature?: string | null; urlMoyenne?: string | null }>(m: T): T {
  return {
    ...m,
    url: buildMediaUrl(m.url),
    urlMiniature: m.urlMiniature ? buildMediaUrl(m.urlMiniature) : null,
    urlMoyenne: m.urlMoyenne ? buildMediaUrl(m.urlMoyenne) : null,
  };
}

/** Miniature pour les listes et les cartes, repli sur la photo d'origine. */
export const vignette = (m: { url: string; urlMiniature?: string | null }): string => m.urlMiniature || m.url;

/** Version moyenne pour la fiche, repli sur la photo d'origine. */
export const photoMoyenne = (m: { url: string; urlMoyenne?: string | null }): string => m.urlMoyenne || m.url;

// ─── Annonce API ──────────────────────────────────────────────────────────────

/**
 * Crée une nouvelle annonce immobilière avec sa photo principale (l'API exige
 * au moins une photo), puis uploade les suivantes une par une pour éviter les
 * erreurs 413 nginx liées aux requêtes multipart trop lourdes.
 */
export const createBienImmo = async (
  req: CreateBienImmoRequest,
  onPhotoUploaded?: (done: number, total: number) => void,
): Promise<BienImmo> => {
  const formData = new FormData();

  formData.append('titre', req.titre);
  formData.append('description', req.description);
  formData.append('prix', String(req.prix));
  formData.append('typeAnnonce', req.typeAnnonce);
  formData.append('typeBien', req.typeBien);
  formData.append('localisationId', req.localisationId);
  if (req.quartierSaisi) formData.append('quartierSaisi', req.quartierSaisi);

  if (req.typeUsage) formData.append('typeUsage', req.typeUsage);
  if (req.documentsDisponibles) formData.append('documentsDisponibles', req.documentsDisponibles);
  if (req.fraisHonoraire != null) formData.append('fraisHonoraire', String(req.fraisHonoraire));
  if (req.cautionMois != null) formData.append('cautionMois', String(req.cautionMois));
  if (req.avanceMois != null) formData.append('avanceMois', String(req.avanceMois));
  if (req.surfaceTotal != null) formData.append('surfaceTotal', String(req.surfaceTotal));
  if (req.nbPieces != null) formData.append('nbPieces', String(req.nbPieces));
  if (req.nbChambres != null) formData.append('nbChambres', String(req.nbChambres));
  if (req.nbSallesBain != null) formData.append('nbSallesBain', String(req.nbSallesBain));
  if (req.complementAdresse) formData.append('complementAdresse', req.complementAdresse);
  if (req.latitude != null) formData.append('latitude', String(req.latitude));
  if (req.longitude != null) formData.append('longitude', String(req.longitude));

  const [principale, ...suivantes] = req.medias;
  if (principale) {
    formData.append('medias', { uri: principale.uri, name: principale.name, type: principale.type } as any);
  }

  onPhotoUploaded?.(0, req.medias.length);
  const created = await multipartPost<BienImmo>('/api/biens-immo', formData);
  if (principale) onPhotoUploaded?.(1, req.medias.length);

  // Upload de chaque photo dans une requête séparée, en continuant même si
  // un fichier échoue (évite un état partiel silencieux).
  const uploadErrors: string[] = [];
  for (const [i, file] of suivantes.entries()) {
    try {
      await addBienImmoMedias(created.id, [file]);
    } catch (err: any) {
      uploadErrors.push(err?.message ?? file.name);
    }
    onPhotoUploaded?.(i + 2, req.medias.length);
  }
  if (uploadErrors.length > 0) {
    throw { message: `Annonce créée, mais ${uploadErrors.length} photo(s) n'ont pas pu être uploadée(s) : ${uploadErrors.join(', ')}`, partial: true, annonceId: created.id };
  }

  return normalizeMediaUrls(created);
};

/**
 * Met à jour une annonce immobilière (hors images).
 * Les images sont gérées séparément (pas de multipart ici).
 */
export const updateBienImmo = async (id: number, req: UpdateBienImmoRequest): Promise<BienImmo> => {
  try {
    const { medias: _ignored, ...payload } = req;
    const res = await apiClient.put<BienImmo>(`/api/biens-immo/${id}`, payload);
    return normalizeMediaUrls(res.data);
  } catch (err) {
    rethrowApiError(err, "Impossible de modifier l'annonce.");
  }
};

/**
 * Ajoute une ou plusieurs images à une annonce existante (multipart).
 * Endpoint : PUT /api/biens-immo/{id}/medias (champ fichiers: medias)
 */
export const addBienImmoMedias = async (
  id: number,
  medias: { uri: string; name: string; type: string }[],
): Promise<void> => {
  // Upload une photo à la fois pour éviter le 413 nginx
  for (const file of medias) {
    try {
      const formData = new FormData();
      formData.append('medias', { uri: file.uri, name: file.name, type: file.type } as any);
      await multipartPut<unknown>(`/api/biens-immo/${id}/medias`, formData);
    } catch (err) {
      rethrowApiError(err, "Impossible d'ajouter les images.");
    }
  }
};

/**
 * Nouvel ordre des photos (tous les identifiants) ; la première devient la photo principale.
 * Endpoint : PUT /api/biens-immo/{id}/medias/ordre
 */
export const reordonnerBienImmoMedias = async (id: number, mediaIds: number[]): Promise<void> => {
  try {
    await apiClient.put(`/api/biens-immo/${id}/medias/ordre`, { mediaIds });
  } catch (err) {
    rethrowApiError(err, "Impossible de modifier l'ordre des photos.");
  }
};

/**
 * Supprime un média par son ID.
 * Endpoint : DELETE /api/biens-immo/{id}/medias/{mediaId}
 */
export const deleteBienImmoMedia = async (id: number, mediaId: number): Promise<void> => {
  try {
    await apiClient.delete(`/api/biens-immo/${id}/medias/${mediaId}`);
  } catch (err) {
    rethrowApiError(err, 'Impossible de supprimer le média.');
  }
};

/**
 * Récupère les annonces de l'utilisateur connecté (paginé).
 * Endpoint : GET /api/biens-immo/user?page=0&size=10
 */
export const getMesAnnonces = async (
  page = 0,
  size = 20,
): Promise<PageResponse<BienImmo>> => {
  const res = await apiClient.get<PageResponse<BienImmo>>('/api/biens-immo/user', {
    params: { page, size },
  });
  // Normalise les URLs relatives des médias
  const data = (res.data.data ?? []).map(normalizeMediaUrls);
  return { ...res.data, data };
};

/**
 * Récupère le catalogue principal d'annonces publiées (paginé).
 * Endpoint : GET /api/biens-immo (spec ref). Public.
 */
export const getPublicAnnonces = async (
  page = 0,
  size = 20,
  sort?: 'dateCreation' | 'prix' | 'vueCount',
  direction?: 'asc' | 'desc',
): Promise<PageResponse<BienImmo>> => {
  const res = await apiClient.get<PageResponse<BienImmo>>('/api/biens-immo', {
    params: { page, size, ...(sort && { sort }), ...(direction && { direction }) },
  });
  const data = (res.data.data ?? []).map(normalizeMediaUrls);
  return { ...res.data, data };
};

/**
 * Filtre les annonces avec des critères cumulables.
 * Endpoint : GET /api/biens-immo/filter?typeAnnonce=VENTE&quartier=...
 */
export const filterAnnonces = async (
  params: AnnonceFilterParams & { page?: number; size?: number },
): Promise<PageResponse<BienImmo>> => {
  const qs = new URLSearchParams();
  if (params.reference) qs.set('reference', params.reference);
  if (params.typeAnnonce) qs.set('typeAnnonce', params.typeAnnonce);
  if (params.typeBien) qs.set('typeBien', params.typeBien);
  if (params.typeUsage) qs.set('typeUsage', params.typeUsage);
  if (params.prixMin != null) qs.set('prixMin', String(params.prixMin));
  if (params.prixMax != null) qs.set('prixMax', String(params.prixMax));
  if (params.region) qs.set('region', params.region);
  if (params.prefecture) qs.set('prefecture', params.prefecture);
  if (params.commune) qs.set('commune', params.commune);
  if (params.quartier) qs.set('quartier', params.quartier);
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.nbPiecesMin != null) qs.set('nbPiecesMin', String(params.nbPiecesMin));
  if (params.nbChambresMin != null) qs.set('nbChambresMin', String(params.nbChambresMin));
  if (params.surfaceMin != null) qs.set('surfaceMin', String(params.surfaceMin));
  if (params.surfaceMax != null) qs.set('surfaceMax', String(params.surfaceMax));
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));
  if (params.sort) qs.set('sort', params.sort);
  if (params.direction) qs.set('direction', params.direction);
  if (params.userId) qs.set('userId', params.userId);

  const res = await apiClient.get<PageResponse<BienImmo>>(
    `/api/biens-immo/filter?${qs.toString()}`,
  );
  const data = (res.data.data ?? []).map(normalizeMediaUrls);
  return { ...res.data, data };
};

/** Modification enregistrée sur une annonce (propriétaire, modération). */
export interface HistoriqueAnnonce {
  id: number;
  annonceId: number;
  champ: string;
  ancienneValeur: string | null;
  nouvelleValeur: string | null;
  modifiePar: string | null;
  dateModification: string;
}

/** Historique d'une annonce : propriétaire, son professionnel, ou modération (ECART-30). */
export const getHistoriqueAnnonce = async (id: number): Promise<HistoriqueAnnonce[]> =>
  (await apiClient.get<HistoriqueAnnonce[]>(`/api/biens-immo/${id}/historique`)).data;

/**
 * Récupère une annonce par son ID.
 */
export const getAnnonceById = async (id: number): Promise<BienImmo> => {
  const res = await apiClient.get<BienImmo>(`/api/biens-immo/${id}`);
  return normalizeMediaUrls(res.data);
};

/**
 * Récupère une annonce par son identifiant public (celui des URLs partagées).
 */
export const getAnnonceByPublicId = async (publicId: string): Promise<BienImmo> => {
  const res = await apiClient.get<BienImmo>(`/api/biens-immo/public/p/${encodeURIComponent(publicId)}`);
  return normalizeMediaUrls(res.data);
};

// ─── Signalements ─────────────────────────────────────────────────────────────

export type MotifSignalement =
  | 'CONTENU_INAPPROPRIE'
  | 'DEJA_VENDU_LOUE'
  | 'ARNAQUE_FRAUDE'
  | 'ANNONCE_EN_DOUBLE'
  | 'INFOS_INCORRECTES'
  | 'MAUVAISE_CATEGORIE'
  | 'PROBLEME_LOCALISATION'
  | 'AUTRE';

export const MOTIF_LABELS: Record<MotifSignalement, string> = {
  CONTENU_INAPPROPRIE: 'Contenu inapproprié',
  DEJA_VENDU_LOUE: 'Déjà vendu / loué',
  ARNAQUE_FRAUDE: 'Arnaque / fraude',
  ANNONCE_EN_DOUBLE: 'Annonce en double',
  INFOS_INCORRECTES: 'Infos incorrectes',
  MAUVAISE_CATEGORIE: 'Mauvaise catégorie',
  PROBLEME_LOCALISATION: 'Problème de localisation',
  AUTRE: 'Autre',
};

export const signalerAnnonce = async (
  annonceId: number,
  payload: { motif: MotifSignalement; commentaire?: string },
): Promise<void> => {
  await apiClient.post(`/api/biens-immo/${annonceId}/signaler`, payload);
};

/** POST /api/biens-immo/{id}/reexamen → 201. Message facultatif, 500 caractères au plus. */
export const demanderReexamen = async (annonceId: number, message?: string): Promise<void> => {
  const texte = message?.trim();
  await apiClient.post(`/api/biens-immo/${annonceId}/reexamen`, texte ? { message: texte } : {});
};

export const retirerSignalement = async (annonceId: number): Promise<void> => {
  await apiClient.delete(`/api/biens-immo/${annonceId}/signaler`);
};

export interface UserSignalement {
  id: number;
  annonceId: number;
  titreAnnonce: string;
  referenceAnnonce: string;
  motif: MotifSignalement;
  commentaire: string | null;
  date: string;
  annule: boolean;
}

export const getMesSignalements = async (
  page = 0,
  size = 20,
): Promise<PageResponse<UserSignalement>> => {
  const res = await apiClient.get<PageResponse<UserSignalement>>(
    '/api/biens-immo/user/signalements',
    { params: { page, size } },
  );
  return res.data;
};

export const deleteAnnonce = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/biens-immo/${id}`);
};

// ─── Endpoints enrichis (backend v2) ──────────────────────────────────────────────────────────────

/**
 * Recherche géospatiale par proximité.
 * GET /api/biens-immo/nearby?lat=&lng=&rayon=&page=&size=
 */
export const getAnnoncesNearby = async (
  params: NearbyParams,
): Promise<PageResponse<BienImmo>> => {
  const qs = new URLSearchParams();
  qs.set('lat', String(params.lat));
  qs.set('lng', String(params.lng));
  if (params.rayon != null) qs.set('rayon', String(params.rayon));
  if (params.typeAnnonce) qs.set('typeAnnonce', params.typeAnnonce);
  if (params.typeBien) qs.set('typeBien', params.typeBien);
  if (params.prixMin != null) qs.set('prixMin', String(params.prixMin));
  if (params.prixMax != null) qs.set('prixMax', String(params.prixMax));
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 10));

  const res = await apiClient.get<PageResponse<BienImmo>>(
    `/api/biens-immo/nearby?${qs.toString()}`,
  );
  const data = (res.data.data ?? []).map(normalizeMediaUrls);
  return { ...res.data, data };
};

/** Commune et nombre d'annonces publiées (sélecteur de zones d'Explorer). */
export interface ZoneActive {
  region: string;
  prefecture: string;
  commune: string;
  nbAnnonces: number;
}

/**
 * Communes les plus actives, toutes régions confondues.
 * GET /api/biens-immo/zones-actives?limit=8. Public.
 */
export const getZonesActives = async (limit = 8): Promise<ZoneActive[]> => {
  const res = await apiClient.get<ZoneActive[]>('/api/biens-immo/zones-actives', { params: { limit } });
  return Array.isArray(res.data) ? res.data : [];
};

/**
 * Annonces similaires (même type/commune, prix ±30 %).
 * GET /api/biens-immo/{id}/similaires?max=5. Public (token injecté si présent).
 */
export const getAnnonceSimilaires = async (
  id: number,
  max = 5,
): Promise<BienImmo[]> => {
  const res = await apiClient.get<BienImmo[]>(`/api/biens-immo/${id}/similaires`, {
    params: { max },
  });
  return (Array.isArray(res.data) ? res.data : []).map(normalizeMediaUrls);
};

/**
 * Clôture une annonce avec un motif (VENDU, LOUE, RETIRE).
 * PUT /api/biens-immo/{id}/cloturer?motif= → 204 No Content (pas de corps).
 */
export const cloturerAnnonce = async (id: number, motif: MotifCloture): Promise<void> => {
  await apiClient.put(`/api/biens-immo/${id}/cloturer`, null, { params: { motif } });
};

/**
 * Masque / réaffiche une annonce (propriétaire). L'annonce masquée reste dans
 * « Mes annonces » (statut PUBLIEE, actif=false) ; une annonce supprimée ne peut
 * pas être réaffichée (422).
 * PUT /api/biens-immo/{id}/toggle-actif → 204 No Content.
 */
export const toggleActifAnnonce = async (id: number): Promise<void> => {
  await apiClient.put(`/api/biens-immo/${id}/toggle-actif`);
};

/**
 * Réactive une annonce précédemment clôturée (ou expirée : prolongation gratuite).
 * PUT /api/biens-immo/{id}/reactiver → 204 No Content (pas de corps).
 */
export const reactiverAnnonce = async (id: number): Promise<void> => {
  await apiClient.put(`/api/biens-immo/${id}/reactiver`);
};
