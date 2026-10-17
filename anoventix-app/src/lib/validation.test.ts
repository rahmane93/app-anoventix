import {
  agentSchema,
  changePasswordSchema,
  entrepriseSchema,
  forgotPasswordSchema,
  PASSWORD_CHECKS,
  passwordRules,
  resetPasswordSchema,
  signinSchema,
  signupSchema,
} from './validation';

/** Récupère les messages d'erreur indexés par chemin de champ. */
function errorsByPath(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    map[issue.path.join('.')] = issue.message;
  }
  return map;
}

const STRONG_PWD = 'Abcdef1!';

// Cas limites partagés avec l'API (MotDePasseTest) : même verdict des deux côtés (ECART-01).
const CAS_MOTS_DE_PASSE: { valides: string[]; invalides: string[] } = require('../../../anoventix-api/src/test/resources/cas-mots-de-passe.json');

describe('passwordRules (règle commune avec l’API)', () => {
  it.each(CAS_MOTS_DE_PASSE.valides)('accepte %p', (motDePasse) => {
    expect(passwordRules.safeParse(motDePasse).success).toBe(true);
    expect(PASSWORD_CHECKS.every((c) => c.test(motDePasse))).toBe(true);
  });

  it.each(CAS_MOTS_DE_PASSE.invalides)('refuse %p', (motDePasse) => {
    expect(passwordRules.safeParse(motDePasse).success).toBe(false);
    expect(PASSWORD_CHECKS.every((c) => c.test(motDePasse))).toBe(false);
  });
});

describe('signupSchema', () => {
  const valid = {
    nom: 'Bah',
    prenom: 'Rahmane',
    email: 'Rahmane@Example.COM',
    telephone: '',
    password: STRONG_PWD,
    confirmPassword: STRONG_PWD,
    role: 'PARTICULIER' as const,
    acceptCgu: true,
  };

  it('accepte un téléphone vide ou valide, refuse un numéro invalide', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
    expect(signupSchema.safeParse({ ...valid, telephone: '+224 622 75 70 44' }).success).toBe(true);
    expect(signupSchema.safeParse({ ...valid, telephone: '123' }).success).toBe(false);
    // Champ pré-rempli « +224 » laissé tel quel : équivaut à « pas de numéro ».
    const bare = signupSchema.safeParse({ ...valid, telephone: '+224 ' });
    expect(bare.success).toBe(true);
    expect(bare.data?.telephone).toBe('');
  });

  it('exige l’acceptation des conditions d’utilisation', () => {
    const res = signupSchema.safeParse({ ...valid, acceptCgu: false });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(errorsByPath(res.error).acceptCgu).toBe(
        "Vous devez accepter les conditions d'utilisation",
      );
    }
  });

  it('accepte tout caractère non alphanumérique comme caractère spécial', () => {
    for (const password of ['Abcdefg1-', 'Abcdefg1_', 'Abcdefg1 ', 'Abcdefg1€']) {
      const res = signupSchema.safeParse({ ...valid, password, confirmPassword: password });
      expect(res.success).toBe(true);
    }
  });

  it('accepte des données valides et normalise l’email en minuscules', () => {
    const res = signupSchema.safeParse(valid);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe('rahmane@example.com');
  });

  it('rejette un mot de passe trop court / sans majuscule / chiffre / spécial', () => {
    // NB : le schéma n'exige PAS de minuscule (seuls maj + chiffre + spécial
    // + 8 car. sont requis), donc chaque cas ci-dessous viole une règle requise.
    for (const password of ['shrt1!A', 'abcdef1!', 'Abcdefgh', 'Abcdefg1']) {
      const res = signupSchema.safeParse({
        ...valid,
        password,
        confirmPassword: password,
      });
      expect(res.success).toBe(false);
    }
  });

  it('rejette quand les mots de passe ne correspondent pas (path confirmPassword)', () => {
    const res = signupSchema.safeParse({ ...valid, confirmPassword: 'Other1!x' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(errorsByPath(res.error).confirmPassword).toBe(
        'Les mots de passe ne correspondent pas',
      );
    }
  });

  it('rejette un rôle hors enum', () => {
    const res = signupSchema.safeParse({ ...valid, role: 'ADMIN' });
    expect(res.success).toBe(false);
  });

  it('rejette nom/prénom vides ou > 50 caractères', () => {
    expect(signupSchema.safeParse({ ...valid, nom: '' }).success).toBe(false);
    expect(
      signupSchema.safeParse({ ...valid, prenom: 'x'.repeat(51) }).success,
    ).toBe(false);
  });
});

describe('signinSchema', () => {
  it('exige identifier et password', () => {
    expect(signinSchema.safeParse({ identifier: '', password: '' }).success).toBe(
      false,
    );
    expect(
      signinSchema.safeParse({ identifier: 'a@b.com', password: 'x' }).success,
    ).toBe(true);
  });
});

describe('forgotPasswordSchema', () => {
  it('rejette un email invalide, accepte et minusculise un email valide', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
    const res = forgotPasswordSchema.safeParse({ email: 'A@B.CO' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe('a@b.co');
  });
});

describe('resetPasswordSchema', () => {
  const base = {
    email: 'a@b.com',
    token: 'tok123',
    newPassword: STRONG_PWD,
    confirmPassword: STRONG_PWD,
  };

  it('accepte un payload valide', () => {
    expect(resetPasswordSchema.safeParse(base).success).toBe(true);
  });

  it('exige un token non vide', () => {
    expect(resetPasswordSchema.safeParse({ ...base, token: '' }).success).toBe(
      false,
    );
  });

  it('rejette une confirmation différente', () => {
    const res = resetPasswordSchema.safeParse({
      ...base,
      confirmPassword: 'Zzzzzz1!',
    });
    expect(res.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepte un changement valide', () => {
    const res = changePasswordSchema.safeParse({
      oldPassword: 'OldPwd1!',
      newPassword: STRONG_PWD,
      confirmPassword: STRONG_PWD,
    });
    expect(res.success).toBe(true);
  });

  it('rejette si le nouveau mot de passe est identique à l’ancien', () => {
    const res = changePasswordSchema.safeParse({
      oldPassword: STRONG_PWD,
      newPassword: STRONG_PWD,
      confirmPassword: STRONG_PWD,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(errorsByPath(res.error).newPassword).toBe(
        'Le nouveau mot de passe doit être différent de l\'ancien',
      );
    }
  });

  it('exige l’ancien mot de passe', () => {
    expect(
      changePasswordSchema.safeParse({
        oldPassword: '',
        newPassword: STRONG_PWD,
        confirmPassword: STRONG_PWD,
      }).success,
    ).toBe(false);
  });
});

describe('entrepriseSchema', () => {
  const valid = {
    nom: 'Anoventix SARL',
    description: 'Agence immobilière à Conakry',
    telephone: '+224622757044',
    email: 'contact@anoventix.com',
    adresse: 'Kipé, Ratoma, Conakry',
    numeroRCCM: 'RC-GN-2024-001',
  };

  it('accepte une entreprise complète', () => {
    expect(entrepriseSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['nom', 'description', 'telephone', 'email', 'adresse', 'numeroRCCM'] as const)(
    'exige le champ %s (vide ou espaces refusés)',
    (champ) => {
      expect(entrepriseSchema.safeParse({ ...valid, [champ]: '' }).success).toBe(false);
      expect(entrepriseSchema.safeParse({ ...valid, [champ]: '   ' }).success).toBe(false);
    },
  );

  it('valide le format international du téléphone', () => {
    expect(entrepriseSchema.safeParse({ ...valid, telephone: '00224622757044' }).success).toBe(true);
    expect(entrepriseSchema.safeParse({ ...valid, telephone: '0123' }).success).toBe(false);
  });

  it('rejette un email mal formé', () => {
    expect(entrepriseSchema.safeParse({ ...valid, email: 'pas-un-email' }).success).toBe(false);
  });
});

describe('agentSchema', () => {
  it('minusculise l’email et exige nom/prénom', () => {
    const res = agentSchema.safeParse({
      nom: 'Bah',
      prenom: 'Rahmane',
      email: 'AGENT@MAIL.COM',
      telephone: '+224622757044',
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe('agent@mail.com');
    expect(
      agentSchema.safeParse({
        nom: '',
        prenom: 'R',
        email: 'a@b.com',
      }).success,
    ).toBe(false);
  });
});
