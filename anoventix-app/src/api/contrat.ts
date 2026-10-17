/**
 * Types du contrat de l'API, générés depuis anoventix-api/openapi/openapi.json
 * (npm run api:types ; schema.d.ts ne se modifie jamais à la main).
 *
 * Pour un nouveau type d'échange avec l'API, partir de `Schema<'NomDuDto'>` plutôt
 * que d'écrire l'interface à la main : un champ renommé côté API casse alors la
 * compilation au lieu d'un écran. Les champs y sont facultatifs tant que l'API ne
 * les déclare pas obligatoires (@Schema(requiredMode = REQUIRED)).
 */
import type { components } from './schema';

export type Schema<Nom extends keyof components['schemas']> = components['schemas'][Nom];

/** Format unique des erreurs de l'API. */
export type ErreurApi = Schema<'ErreurApi'>;

/** Code stable d'une erreur : à tester plutôt que le texte du message. */
export type CodeErreur = NonNullable<ErreurApi['code']>;
