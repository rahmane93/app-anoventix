import { isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

// ─── Téléphone ────────────────────────────────────────────────────────────────
// Normalise la saisie : retire les espaces et convertit le préfixe « 00 » en
// « + » (format international reconnu par libphonenumber-js).
const normalizePhone = (v: string) => v.replace(/\s+/g, '').replace(/^00/, '+');
const PHONE_INVALID_MSG = 'Numéro de téléphone invalide (ex: +224622757044 ou +33749875410)';

// ─── Mot de passe ─────────────────────────────────────────────────────────────
// Règles uniques (inscription, réinitialisation, changement) — aussi affichées
// en checklist sous le champ. « Spécial » = tout caractère non alphanumérique
// (- _ . ! @ …), et pas seulement une liste restreinte.
// Identique à la règle de l'API (MotDePasse.java) : les deux sont testées sur les
// mêmes cas limites (anoventix-api/src/test/resources/cas-mots-de-passe.json).

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

export const PASSWORD_CHECKS: { label: string; test: (v: string) => boolean }[] = [
  {
    label: `Entre ${PASSWORD_MIN} et ${PASSWORD_MAX} caractères`,
    test: (v) => v.length >= PASSWORD_MIN && v.length <= PASSWORD_MAX,
  },
  { label: 'Une minuscule', test: (v) => /[a-z]/.test(v) },
  { label: 'Une majuscule', test: (v) => /[A-Z]/.test(v) },
  { label: 'Un chiffre', test: (v) => /[0-9]/.test(v) },
  { label: 'Un caractère spécial (- _ ! @ …)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const passwordRules = z
  .string()
  .min(PASSWORD_MIN, `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères`)
  .max(PASSWORD_MAX, `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX} caractères`)
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial');

// ─── Signup Schema ────────────────────────────────────────────────────────────

export const signupSchema = z
  .object({
    nom: z
      .string()
      .min(1, 'Le nom est requis')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
    prenom: z
      .string()
      .min(1, 'Le prénom est requis')
      .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
    email: z
      .string()
      .email('Adresse email invalide')
      .max(100, "L'email ne peut pas dépasser 100 caractères")
      .toLowerCase(),
    // Optionnel : permet ensuite de se connecter par téléphone.
    // Le champ est pré-rempli « +224 » : l'indicatif seul vaut champ vide.
    telephone: z
      .string()
      .transform(normalizePhone)
      .transform((v) => (v === '+224' ? '' : v))
      .refine((v) => v === '' || isValidPhoneNumber(v), PHONE_INVALID_MSG),
    password: passwordRules,
    confirmPassword: z.string(),
    role: z.enum(['PARTICULIER', 'PROFESSIONNEL'], {
      error: 'Veuillez sélectionner un type de compte',
    }),
    acceptCgu: z.boolean().refine((v) => v, {
      message: "Vous devez accepter les conditions d'utilisation",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

// ─── Signin Schema ────────────────────────────────────────────────────────────

export const signinSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Ce champ est requis'),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis'),
});

export type SigninFormData = z.infer<typeof signinSchema>;

// ─── Forgot Password Schema ───────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Adresse email invalide')
    .toLowerCase(),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ─── Reset Password Schema ────────────────────────────────────────────────────

export const resetPasswordSchema = z
  .object({
    email: z.string().email('Adresse email invalide').toLowerCase(),
    token: z.string().trim().min(1, 'Saisissez le code reçu par email'),
    newPassword: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ─── Change Password Schema ──────────────────────────────────────

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'L\'ancien mot de passe est requis'),
    newPassword: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: 'Le nouveau mot de passe doit être différent de l\'ancien',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ─── Entreprise Schema ──────────────────────────────────────────

// Tous les champs du formulaire sont obligatoires (marqués « * »).
export const entrepriseSchema = z.object({
  nom: z.string().trim().min(1, "Le nom de l'entreprise est obligatoire").max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  description: z.string().trim().min(1, 'La description est obligatoire').max(200, 'La description ne peut pas dépasser 200 caractères'),
  telephone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z
        .string()
        .min(1, 'Le téléphone est obligatoire')
        .refine((v) => isValidPhoneNumber(v), PHONE_INVALID_MSG),
    ),
  email: z.string().trim().min(1, "L'email est obligatoire").email("Format d'email invalide").max(100, "L'email ne peut pas dépasser 100 caractères"),
  adresse: z.string().trim().min(1, "L'adresse est obligatoire").max(100, "L'adresse ne peut pas dépasser 100 caractères"),
  numeroRCCM: z.string().trim().min(1, 'Le numéro RCCM est obligatoire').max(50, 'Le numéro RCCM ne peut pas dépasser 50 caractères'),
});

export type EntrepriseFormData = z.infer<typeof entrepriseSchema>;

// ─── Agent Schema ─────────────────────────────────────────────────

export const agentSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis').max(50, 'Nom trop long'),
  prenom: z.string().trim().min(1, 'Le prénom est requis').max(50, 'Prénom trop long'),
  email: z.string().trim().email('Adresse email invalide').max(100, "L'email ne peut pas dépasser 100 caractères").toLowerCase(),
  telephone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z
        .string()
        .min(1, 'Le numéro de téléphone est obligatoire')
        .refine((v) => isValidPhoneNumber(v), PHONE_INVALID_MSG),
    ),
});

export type AgentFormData = z.infer<typeof agentSchema>;
