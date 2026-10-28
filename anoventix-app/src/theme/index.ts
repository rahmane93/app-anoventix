// ─── Palette Anoventix ────────────────────────────────────────────────────────

export const colors = {
  // Primaire — bleu immobilier professionnel
  primary:        '#1A3C6E',
  primaryLight:   '#2A5FA8',
  primaryDark:    '#0F2444',
  primarySurface: '#EEF3FB', // fond léger : chips sélectionnées, états actifs, tags

  // Accent — or/ambre
  accent:      '#D4A017',
  accentLight: '#F0BB30',
  accentSurface: '#FDF6E3', // fond léger accent

  // Surfaces & fonds
  white:           '#FFFFFF',
  background:      '#F2F2F2', // fond général — gris neutre clair
  headerBackground:'#FFFFFF', // en-tête — blanc épuré
  headerText:      '#111827', // texte/icônes sur header blanc
  surface:         '#FFFFFF', // cartes, modales, panneaux
  surfaceElevated: '#FFFFFF', // cartes avec ombre (même valeur, sémantiquement distinct)

  // Bordures & séparateurs
  border:      '#D1D5DB', // bordures principales — gris neutre (cohérent avec le fond #F2F2F2)
  borderFocus: '#2A5FA8', // bordure au focus
  divider:     '#E5E7EB', // séparateurs fins, lignes de liste
  track:       '#E5E7EB', // gris neutre : étapes à venir, pistes de progression

  // Texte
  textPrimary:   '#111827', // titres, contenus principaux
  textSecondary: '#4B5563', // texte secondaire
  textMuted:     '#6B7280', // texte atténué — ≈ 4.8:1 sur blanc (WCAG AA)
  textOnPrimary: '#FFFFFF', // texte sur fond primaire
  textOnAccent:  '#1A1A1A', // texte sur fond accent

  // Inputs
  inputBackground: '#FFFFFF', // fond des champs de saisie — blanc pour la lisibilité

  // États sémantiques
  success:      '#10B981',
  successLight: '#D1FAE5',
  error:        '#EF4444',
  errorLight:   '#FEE2E2',
  warning:      '#F59E0B',
  warningLight: '#FEF3C7',
  info:         '#3B82F6',
  infoLight:    '#DBEAFE',
  whatsapp:     '#25D366', // couleur de marque WhatsApp (icône)
  favorite:     '#E53935', // cœur « favori » actif (sur photo ou fond clair)

  // Texte sémantique sur fond clair (…Light) ou blanc : teintes foncées
  // pour atteindre 4.5:1 (le vert / orange / rouge vifs ci-dessus sont
  // réservés aux icônes, pastilles et fonds).
  successText: '#047857',
  errorText:   '#B91C1C',
  warningText: '#92400E',
  infoText:    '#1D4ED8',

  // Surfaces secondaires (photos en chargement, cartes, bulles de messagerie)
  photoPlaceholder: '#EAEDF3', // fond d'une photo avant chargement / sans photo
  mapBackground:    '#E8EEF5', // fond d'une carte avant chargement des tuiles
  bubbleReceived:   '#F4F4F6', // bulle de message reçu
  onDarkMuted:      '#CBD5E1', // texte secondaire sur fond sombre (caméra)
  onDarkError:      '#FCA5A5', // erreur sur fond sombre (caméra)

  // Utilitaires
  overlay:     'rgba(0, 0, 0, 0.5)',
  placeholder: '#6B7280', // ≥ 4.5:1 sur blanc (WCAG AA) : un placeholder reste du texte à lire
} as const;

/**
 * Variante lisible (≥ 4.5:1) d'une couleur d'état vive, pour un texte ou pour
 * un fond plein sous texte blanc. Les autres couleurs sont renvoyées telles quelles.
 */
export function readableColor(c: string): string {
  switch (c) {
    case colors.success: return colors.successText;
    case colors.warning: return colors.warningText;
    case colors.error:   return colors.errorText;
    case colors.info:    return colors.infoText;
    default:             return c;
  }
}

// ─── Types d'annonce ──────────────────────────────────────────────────────────
// Code couleur unique Vente / Location / Bail, partagé par toutes les cartes,
// la fiche et les filtres. `fg` sert de texte sur `bg` et de fond plein avec
// texte blanc (contraste ≥ 4.5:1 dans les deux cas — l'ambre `accent` pur
// n'est pas lisible en texte blanc).

export const typeAnnonceColors = {
  VENTE:    { fg: colors.primary, bg: colors.primarySurface },
  LOCATION: { fg: '#8A5A00',      bg: colors.accentSurface },
  BAIL:     { fg: '#5B4A8A',      bg: '#F0EDF8' },
} as const;

// ─── Typographie ──────────────────────────────────────────────────────────────

export const typography = {
  fonts: {
    regular:   'Nunito_400Regular',
    medium:    'Nunito_500Medium',
    semibold:  'Nunito_600SemiBold',
    bold:      'Nunito_700Bold',
    extrabold: 'Nunito_800ExtraBold',
  },
  sizes: {
    '2xs': 10, // badges, compteurs
    xs:    12, // labels discrets, timestamps
    sm:    14, // corps secondaire, captions
    md:    16, // corps principal
    lg:    18, // sous-titres
    xl:    20, // titres d'écran
    '2xl': 24, // grands titres
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    regular:   '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight:   1.2,
    snug:    1.35,
    normal:  1.5,
    relaxed: 1.7,
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radius = {
  xs:   4,  // badges, tags compacts
  sm:   8,  // boutons sm, icônes
  md:   12, // cartes, inputs
  lg:   16, // boutons principaux, panneaux
  xl:   24, // grands conteneurs, bottom sheets
  '2xl': 32,
  full:  9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#1A3C6E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1A3C6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#1A3C6E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  lg: {
    shadowColor: '#1A3C6E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
} as const;

// ─── Mise en page web ─────────────────────────────────────────────────────────
// Le web desktop a sa propre grille (breakpoints, colonnes centrées). Sur natif,
// ces valeurs ne sont jamais atteintes : `useBreakpoint` renvoie toujours `compact`.

export const layout = {
  breakpoints: { medium: 768, wide: 1200 },
  maxWidth: {
    page:   1280, // listes, grilles d'annonces
    detail: 1160, // fiche annonce, profils
    form:   720,  // formulaires, parcours de publication
    auth:   440,  // cartes de connexion
  },
  topBarHeight: 68,
  gutter: 32, // marge latérale desktop
} as const;

/** Ombres CSS (web uniquement) : plus douces et nettes que l'émulation RN. */
export const webShadow = {
  sm:    '0 1px 2px rgba(15, 36, 68, 0.06), 0 1px 3px rgba(15, 36, 68, 0.08)',
  md:    '0 4px 12px rgba(15, 36, 68, 0.08), 0 2px 4px rgba(15, 36, 68, 0.04)',
  lg:    '0 18px 40px rgba(15, 36, 68, 0.14), 0 4px 10px rgba(15, 36, 68, 0.06)',
  focus: '0 0 0 3px rgba(42, 95, 168, 0.35)',
} as const;

/** États interactifs web (survol). */
export const interactive = {
  hoverSurface: '#F7F9FC',
  hoverPrimary: '#15325C',
  hoverAccent:  '#C29214',
} as const;
