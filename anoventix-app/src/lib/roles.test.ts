import {
  getRoleFlags,
  getRoleLabel,
  getRoleLabels,
  hasRole,
  normalizeRole,
} from './roles';

describe('getRoleLabel', () => {
  it('retourne le libellé officiel pour un rôle connu', () => {
    expect(getRoleLabel('ROLE_ADMINISTRATEUR')).toBe('Administrateur');
    expect(getRoleLabel('ROLE_MODERATEUR')).toBe('Modérateur');
    expect(getRoleLabel('ROLE_AGENT_PROFESSIONNEL')).toBe('Agent professionnel');
  });

  it('trim les espaces avant le lookup', () => {
    expect(getRoleLabel('  ROLE_PARTICULIER  ')).toBe('Particulier');
  });

  it('retombe sur un titlecase pour un rôle inconnu', () => {
    expect(getRoleLabel('ROLE_SUPER_ADMIN')).toBe('Super Admin');
  });

  it('retourne une chaîne vide pour null/undefined/vide', () => {
    expect(getRoleLabel(null)).toBe('');
    expect(getRoleLabel(undefined)).toBe('');
    expect(getRoleLabel('')).toBe('');
  });
});

describe('getRoleLabels', () => {
  it('déduplique et préfixe les rôles sans ROLE_', () => {
    expect(getRoleLabels(['ROLE_PARTICULIER', 'PARTICULIER'])).toEqual([
      'Particulier',
    ]);
  });

  it('accepte un rôle unique sous forme de string', () => {
    expect(getRoleLabels('ROLE_PROFESSIONNEL')).toEqual(['Professionnel']);
  });

  it('retourne [] pour null/undefined', () => {
    expect(getRoleLabels(null)).toEqual([]);
    expect(getRoleLabels(undefined)).toEqual([]);
  });
});

describe('normalizeRole', () => {
  it('met en majuscules et trim', () => {
    expect(normalizeRole('  role_admin ')).toBe('ROLE_ADMIN');
  });

  it('retourne une chaîne vide pour une valeur absente', () => {
    expect(normalizeRole(null)).toBe('');
    expect(normalizeRole(undefined)).toBe('');
  });
});

describe('hasRole', () => {
  it('détecte un rôle présent (string ou array)', () => {
    expect(hasRole('ROLE_ADMINISTRATEUR', 'ROLE_ADMINISTRATEUR')).toBe(true);
    expect(hasRole(['ROLE_PARTICULIER'], 'ROLE_PARTICULIER')).toBe(true);
  });

  it('préfixe ROLE_ les rôles fournis (entrée), mais PAS les rôles attendus', () => {
    // Contrat réel : toRolesArray() ajoute ROLE_ aux rôles d'entrée,
    // donc 'PARTICULIER' en entrée matche l'attendu 'ROLE_PARTICULIER'.
    expect(hasRole('PARTICULIER', 'ROLE_PARTICULIER')).toBe(true);
    // En revanche, l'attendu n'est PAS préfixé : il doit être passé
    // avec ROLE_ (comme partout dans le code). Sans préfixe → pas de match.
    expect(hasRole('ROLE_PARTICULIER', 'PARTICULIER')).toBe(false);
  });

  it('est insensible à la casse (entrée ET attendu passent par normalizeRole)', () => {
    // L'attendu n'est pas RE-préfixé mais il EST mis en majuscules :
    // 'role_moderateur' → 'ROLE_MODERATEUR', donc match.
    expect(hasRole('ROLE_MODERATEUR', 'role_moderateur')).toBe(true);
    expect(hasRole('ROLE_moderateur', 'ROLE_MODERATEUR')).toBe(true);
  });

  it('reconnaît un préfixe role_ minuscule sans le double-préfixer', () => {
    expect(hasRole('role_moderateur', 'ROLE_MODERATEUR')).toBe(true);
    expect(hasRole(['role_administrateur'], 'ROLE_ADMINISTRATEUR')).toBe(true);
  });

  it('retourne false si aucun rôle attendu ne matche', () => {
    expect(hasRole(['ROLE_PARTICULIER'], 'ROLE_ADMINISTRATEUR')).toBe(false);
    expect(hasRole(null, 'ROLE_ADMINISTRATEUR')).toBe(false);
  });

  it('accepte plusieurs rôles attendus (OR)', () => {
    expect(
      hasRole('ROLE_MODERATEUR', 'ROLE_ADMINISTRATEUR', 'ROLE_MODERATEUR'),
    ).toBe(true);
  });
});

describe('getRoleFlags', () => {
  it('professionnel : peut gérer une entreprise et publier', () => {
    const f = getRoleFlags('ROLE_PROFESSIONNEL');
    expect(f.isProfessionnel).toBe(true);
    expect(f.canManageEntreprise).toBe(true);
    expect(f.canAccessEntreprise).toBe(true);
    expect(f.canPublishAnnonce).toBe(true);
  });

  it('agent professionnel : accès entreprise mais pas de gestion', () => {
    const f = getRoleFlags('ROLE_AGENT_PROFESSIONNEL');
    expect(f.isAgentProfessionnel).toBe(true);
    expect(f.canManageEntreprise).toBe(false);
    expect(f.canAccessEntreprise).toBe(true);
    expect(f.canPublishAnnonce).toBe(true);
  });

  it('particulier : peut publier mais pas gérer/accéder à une entreprise', () => {
    const f = getRoleFlags('ROLE_PARTICULIER');
    expect(f.isParticulier).toBe(true);
    expect(f.canManageEntreprise).toBe(false);
    expect(f.canAccessEntreprise).toBe(false);
    expect(f.canPublishAnnonce).toBe(true);
  });

  it('aucun rôle : tous les flags à false', () => {
    const f = getRoleFlags(null);
    expect(f).toEqual({
      isAdministrateur: false,
      isModerateur: false,
      isProfessionnel: false,
      isAgentProfessionnel: false,
      isParticulier: false,
      isStaff: false,
      canManageEntreprise: false,
      canAccessEntreprise: false,
      canPublishAnnonce: false,
    });
  });

  it('administrateur et modérateur : staff, sans publication', () => {
    for (const role of ['ROLE_ADMINISTRATEUR', 'ROLE_MODERATEUR']) {
      const f = getRoleFlags(role);
      expect(f.isStaff).toBe(true);
      expect(f.canPublishAnnonce).toBe(false);
    }
    expect(getRoleFlags('ROLE_PARTICULIER').isStaff).toBe(false);
  });
});
