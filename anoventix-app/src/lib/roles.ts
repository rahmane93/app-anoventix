import type { RoleAnnonceur } from '@/src/types/annonce.types';

// ─── Badge annonceur (libellés courts + couleurs) ────────────────────────────
// Source canonique partagée par les cartes (explore / annonce / favoris).
// Hex littéraux : garde ce module « lib » sans dépendance au thème.

export const ROLE_ANNONCEUR_LABELS: Record<RoleAnnonceur, string> = {
  PARTICULIER: 'Particulier',
  PROFESSIONNEL: 'Professionnel',
  AGENT_PROFESSIONNEL: 'Professionnel',
  MODERATEUR: 'Modérateur',
  ADMINISTRATEUR: 'Admin',
};

// Un même libellé = une même couleur (pro et agent affichent « Professionnel »).
// Teintes choisies pour rester lisibles (≥ 4.5:1) en texte sur leur fond à 18 %,
// et distinctes du code couleur Vente / Location / Bail.
export const ROLE_ANNONCEUR_COLORS: Record<RoleAnnonceur, string> = {
  PARTICULIER: '#1A3C6E',
  PROFESSIONNEL: '#0F766E',
  AGENT_PROFESSIONNEL: '#0F766E',
  MODERATEUR: '#4B5563',
  ADMINISTRATEUR: '#B91C1C',
};

// ─── Libellés officiels des rôles ────────────────────────────────────────────

export const ROLE_DISPLAY_LABELS: Record<string, string> = {
  ROLE_ADMINISTRATEUR: 'Administrateur',
  ROLE_MODERATEUR: 'Modérateur',
  ROLE_PROFESSIONNEL: 'Professionnel',
  ROLE_AGENT_PROFESSIONNEL: 'Agent professionnel',
  ROLE_PARTICULIER: 'Particulier',
  ROLE_USER: 'Utilisateur',
};

/**
 * Retourne le libellé lisible pour un rôle (ex. "ROLE_MODERATEUR" → "Modérateur").
 * Fallback : retire le préfixe ROLE_ et met en titlecase.
 */
export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return '';
  return ROLE_DISPLAY_LABELS[role.trim()]
    ?? role.replace(/^ROLE_/, '').replace(/_/g, ' ').toLowerCase()
         .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Retourne les libellés lisibles pour une liste de rôles, dédupliqués.
 */
export function getRoleLabels(roles?: string | string[] | null): string[] {
  const arr = toRolesArray(roles);
  return Array.from(new Set(arr.map(getRoleLabel).filter(Boolean)));
}

// ─────────────────────────────────────────────────────────────────────────────

export function normalizeRole(role: string | null | undefined): string {
  if (!role) return '';
  return role.trim().toUpperCase();
}

/** Normalise n'importe quelle forme de rôle(s) en tableau avec préfixe ROLE_. */
function toRolesArray(roles: string | string[] | null | undefined): string[] {
  if (!roles) return [];
  const arr = Array.isArray(roles) ? roles : [roles];
  // Détection du préfixe insensible à la casse : un rôle 'role_xxx' ne doit
  // pas être re-préfixé en 'ROLE_role_xxx' (double préfixe → jamais de match).
  return arr.filter(Boolean).map((r) => (/^ROLE_/i.test(r) ? r : `ROLE_${r}`));
}

export function hasRole(roles: string | string[] | null | undefined, ...expectedRoles: string[]): boolean {
  const normalizedRoles = toRolesArray(roles).map(normalizeRole);
  return expectedRoles.some((expectedRole) => normalizedRoles.includes(normalizeRole(expectedRole)));
}

/**
 * Calcule les flags de rôle à partir du tableau de rôles Spring Security.
 * Le backend peut envoyer le rôle comme string ou string[].
 */
export function getRoleFlags(roles?: string | string[] | null) {
  const isAdministrateur = hasRole(roles, 'ROLE_ADMINISTRATEUR');
  const isModerateur = hasRole(roles, 'ROLE_MODERATEUR');
  const isProfessionnel = hasRole(roles, 'ROLE_PROFESSIONNEL');
  const isAgentProfessionnel = hasRole(roles, 'ROLE_AGENT_PROFESSIONNEL');
  const isParticulier = hasRole(roles, 'ROLE_PARTICULIER');

  return {
    isAdministrateur,
    isModerateur,
    isProfessionnel,
    isAgentProfessionnel,
    isParticulier,
    // Compte de modération : pas de fonctions « utilisateur » (favoris, contact,
    // signalement, pièce d'identité, suppression de son propre compte).
    isStaff: isAdministrateur || isModerateur,
    canManageEntreprise: isProfessionnel,
    canAccessEntreprise: isProfessionnel || isAgentProfessionnel,
    canPublishAnnonce: isProfessionnel || isAgentProfessionnel || isParticulier,
  };
}
