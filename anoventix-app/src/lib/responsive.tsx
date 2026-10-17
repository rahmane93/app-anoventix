import { layout, spacing } from '@/src/theme';
import React from 'react';
import { Platform, StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native';

// ─── Responsive web ───────────────────────────────────────────────────────────
// Les mises en page desktop ne concernent que le web : sur iOS/Android le
// breakpoint vaut toujours `compact`, le rendu natif reste donc inchangé.

export type Breakpoint = 'compact' | 'medium' | 'wide';

const IS_WEB = Platform.OS === 'web';

export function breakpointFor(width: number): Breakpoint {
  if (!IS_WEB) return 'compact';
  if (width >= layout.breakpoints.wide) return 'wide';
  if (width >= layout.breakpoints.medium) return 'medium';
  return 'compact';
}

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const bp = breakpointFor(width);
  return {
    bp,
    width,
    isWeb: IS_WEB,
    /** Web ≥ 768 : navigation par barre du haut, grilles, colonnes. */
    isDesktop: bp !== 'compact',
    /** Web ≥ 1200 : mises en page à panneaux latéraux. */
    isWide: bp === 'wide',
  };
}

/**
 * Nombre de colonnes d'une grille de cartes : autant que possible avec une
 * largeur minimale par carte, bornées à `maxCols`. Toujours 1 hors desktop web.
 */
export function useGridColumns(minCardWidth: number, maxCols: number, maxWidth: number = layout.maxWidth.page) {
  const { width, isDesktop } = useBreakpoint();
  if (!isDesktop) return 1;
  const available = Math.min(width, maxWidth) - layout.gutter * 2;
  return Math.max(1, Math.min(maxCols, Math.floor(available / minCardWidth)));
}

export type ContainerSize = keyof typeof layout.maxWidth;

/** Style de colonne centrée (web desktop uniquement). */
export function webColumnStyle(size: ContainerSize): ViewStyle | undefined {
  if (!IS_WEB) return undefined;
  return { width: '100%', maxWidth: layout.maxWidth[size], alignSelf: 'center' };
}

/**
 * Colonne centrée à largeur de lecture sur le web desktop. Sur mobile (et natif),
 * c'est un simple `View` transparent : les marges existantes s'appliquent.
 */
export function WebContainer({
  size = 'page',
  gutter = true,
  style,
  children,
}: {
  size?: ContainerSize;
  /** Ajoute la marge latérale desktop. */
  gutter?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { isDesktop } = useBreakpoint();
  if (!isDesktop) return <View style={style}>{children}</View>;
  return (
    <View style={[webColumnStyle(size), gutter && { paddingHorizontal: layout.gutter }, style]}>
      {children}
    </View>
  );
}

// ─── Grilles de cartes ────────────────────────────────────────────────────────

const GRID_GAP = 24;

/**
 * Props d'une FlatList de cartes en grille sur le web desktop. Sur mobile :
 * objets vides, la liste garde sa colonne unique et ses marges d'origine.
 *
 *   const grid = useCardGrid(300, 4);
 *   <FlatList key={grid.key} {...grid.listProps}
 *     contentContainerStyle={[styles.list, grid.contentStyle]}
 *     renderItem={({ item }) => grid.wrap(<Card … />)} />
 */
export function useCardGrid(minCardWidth = 300, maxCols = 4, size: ContainerSize = 'page') {
  const { isDesktop } = useBreakpoint();
  const cols = useGridColumns(minCardWidth, maxCols, layout.maxWidth[size]);

  if (!isDesktop) {
    return {
      isGrid: false,
      cols: 1,
      key: 'list',
      listProps: {},
      contentStyle: undefined,
      wrap: (node: React.ReactElement) => node,
    } as const;
  }

  // Largeur max de cellule : la dernière rangée incomplète ne s'étire pas.
  const cellStyle = {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: `calc((100% - ${GRID_GAP * (cols - 1)}px) / ${cols})`,
  } as unknown as ViewStyle;

  return {
    isGrid: true,
    cols,
    key: `grid-${cols}`,
    listProps: {
      numColumns: cols,
      columnWrapperStyle: cols > 1 ? { gap: GRID_GAP } : undefined,
    },
    contentStyle: [
      webColumnStyle(size),
      { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, paddingBottom: spacing['4xl'], gap: GRID_GAP },
    ] as StyleProp<ViewStyle>,
    wrap: (node: React.ReactElement) => <View style={cellStyle}>{node}</View>,
  } as const;
}

// ─── Survol (web) ─────────────────────────────────────────────────────────────

/**
 * État de survol pour les composants qui n'exposent pas `hovered` (TouchableOpacity) :
 * à étaler sur un `View` englobant. No-op sur natif.
 */
export function useHover() {
  const [hovered, setHovered] = React.useState(false);
  const handlers = IS_WEB
    ? ({ onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } as object)
    : {};
  return [hovered, handlers] as const;
}
