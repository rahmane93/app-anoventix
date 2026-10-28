import { webColumnStyle } from '@/src/lib/responsive';
import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

// ─── Langage visuel de l'administration ───────────────────────────────────────
// Outil de travail dense : listes pleine largeur séparées par des filets, sans
// ombre ; la couleur est réservée aux statuts et aux actions. Tous les écrans
// du module composent ces briques au lieu de redéfinir cartes et badges.

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

export const TONES: Record<Tone, { fg: string; bg: string; dot: string }> = {
  success: { fg: colors.successText, bg: colors.successLight, dot: colors.success },
  warning: { fg: colors.warningText, bg: colors.warningLight, dot: colors.warning },
  danger:  { fg: colors.errorText,   bg: colors.errorLight,   dot: colors.error },
  info:    { fg: colors.infoText,    bg: colors.infoLight,    dot: colors.info },
  neutral: { fg: colors.textSecondary, bg: colors.divider,    dot: colors.textMuted },
  primary: { fg: colors.primary,     bg: colors.primarySurface, dot: colors.primary },
};

/** Largeur de lecture sur le web : le back-office ne s'étire pas sur tout l'écran. */
export const webColumn: ViewStyle | undefined = webColumnStyle('detail');

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <View style={u.page}>
      <View style={[u.pageInner, webColumn]}>{children}</View>
    </View>
  );
}

// ─── Badge de statut ──────────────────────────────────────────────────────────

export function StatusBadge({ label, tone, icon }: { label: string; tone: Tone; icon?: IoniconName }) {
  const t = TONES[tone];
  return (
    <View style={[u.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={t.fg} /> : null}
      <AppText style={[u.badgeText, { color: t.fg }]} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

// ─── Avatar (initiales ou photo) ──────────────────────────────────────────────

export function initiales(nom: string | null | undefined): string {
  const mots = (nom ?? '').trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return '?';
  return mots.slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
}

export function Avatar({ name, uri, size = 36 }: { name: string | null | undefined; uri?: string | null; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={box} contentFit="cover" />;
  return (
    <View style={[u.avatar, box]}>
      <AppText style={[u.avatarText, { fontSize: size * 0.38 }]}>{initiales(name)}</AppText>
    </View>
  );
}

export function IconTile({ icon, tone = 'primary', size = 36 }: { icon: IoniconName; tone?: Tone; size?: number }) {
  const t = TONES[tone];
  return (
    <View style={[u.iconTile, { width: size, height: size, backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={size * 0.5} color={t.fg} />
    </View>
  );
}

// ─── Barre d'outils (recherche + filtres + compteur) ─────────────────────────

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <View style={u.toolbar}>{children}</View>;
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  loading,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  loading?: boolean;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={u.search}>
      <Ionicons name="search-outline" size={16} color={colors.textMuted} />
      <AppTextInput
        style={u.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        autoCorrect={false}
        onSubmitEditing={onSubmitEditing}
      />
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      {!loading && value ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Filtres exclusifs sur une seule ligne défilante. */
export function FilterBar<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={u.filters}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((o) => (
        <Chip key={o.key} label={o.label} selected={value === o.key} onPress={() => onChange(o.key)} style={u.filterChip} />
      ))}
    </ScrollView>
  );
}

export function ResultCount({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <View style={u.count}>
      <AppText style={u.countText}>{children}</AppText>
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
    </View>
  );
}

// ─── Lignes de liste ──────────────────────────────────────────────────────────

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  onPress,
  accessibilityLabel,
  chevron = !!onPress,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string | null;
  /** Ligne d'informations secondaires (badges, rôle, entreprise…). */
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  chevron?: boolean;
}) {
  const content = (
    <>
      {leading}
      <View style={u.rowBody}>
        <AppText style={u.rowTitle} numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText style={u.rowSubtitle} numberOfLines={1}>{subtitle}</AppText> : null}
        {meta ? <View style={u.rowMeta}>{meta}</View> : null}
      </View>
      {trailing ? <View style={u.rowTrailing}>{trailing}</View> : null}
      {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.placeholder} /> : null}
    </>
  );
  if (!onPress) return <View style={u.row}>{content}</View>;
  return (
    <TouchableOpacity
      style={u.row}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {content}
    </TouchableOpacity>
  );
}

/** Filet entre deux lignes, aligné sur le texte (après l'avatar de 36 px). */
export function RowSeparator({ inset = spacing.base + 36 + spacing.md }: { inset?: number }) {
  return (
    <View style={u.separatorWrap}>
      <View style={[u.separator, { marginLeft: inset }]} />
    </View>
  );
}

/** Élément de travail riche (signalement, message, annonce) : bloc pleine largeur. */
export function ItemBlock({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[u.block, style]}>{children}</View>;
}

export function BlockGap() {
  return <View style={u.blockGap} />;
}

/** Texte secondaire d'une ligne de méta, séparé par des points médians. */
export function MetaText({ children }: { children: React.ReactNode }) {
  return <AppText style={u.metaText} numberOfLines={1}>{children}</AppText>;
}

// ─── Sections (fiches détail, réglages) ───────────────────────────────────────

function SectionHeader({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <View style={u.sectionHeader}>
      <AppText style={u.sectionTitle} accessibilityRole="header">{title.toUpperCase()}</AppText>
      {trailing}
    </View>
  );
}

export function Section({
  title,
  trailing,
  footer,
  children,
  padded,
}: {
  title?: string;
  trailing?: React.ReactNode;
  /** Texte d'aide sous la section. */
  footer?: string;
  children: React.ReactNode;
  /** Contenu libre (formulaire, boutons) plutôt que des lignes. */
  padded?: boolean;
}) {
  return (
    <View style={u.section}>
      {title ? <SectionHeader title={title} trailing={trailing} /> : null}
      <View style={[u.sectionBody, padded && u.sectionBodyPadded]}>{children}</View>
      {footer ? <AppText style={u.sectionFooter}>{footer}</AppText> : null}
    </View>
  );
}

export function FieldRow({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value?: React.ReactNode;
  onPress?: () => void;
  /** Dernière ligne de la section : pas de filet. */
  last?: boolean;
}) {
  if (value == null || value === '') return null;
  const body = (
    <>
      <AppText style={u.fieldLabel}>{label}</AppText>
      <View style={u.fieldValueWrap}>
        {typeof value === 'string' ? (
          <AppText style={[u.fieldValue, onPress && u.fieldLink]} selectable={!onPress}>{value}</AppText>
        ) : value}
      </View>
    </>
  );
  const style = [u.field, !last && u.fieldDivider];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <TouchableOpacity style={style} onPress={onPress} activeOpacity={0.6} accessibilityRole="link">
      {body}
    </TouchableOpacity>
  );
}

// ─── États (chargement, vide, erreur) ─────────────────────────────────────────

export function LoadingState() {
  return (
    <View style={u.state}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  tone = 'neutral',
}: {
  icon: IoniconName;
  title: string;
  message?: string;
  /** « success » : file vidée, rien à traiter. */
  tone?: Tone;
}) {
  return (
    <View style={u.state}>
      <IconTile icon={icon} tone={tone} size={48} />
      <AppText style={u.stateTitle}>{title}</AppText>
      {message ? <AppText style={u.stateMessage}>{message}</AppText> : null}
    </View>
  );
}

/** Erreur de chargement : toujours avec une reprise possible. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={u.error} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={16} color={colors.errorText} />
      <AppText style={u.errorText}>{message}</AppText>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} hitSlop={8} accessibilityRole="button">
          <AppText style={u.errorRetry}>Réessayer</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={u.state}>
      <IconTile icon="cloud-offline-outline" tone="danger" size={48} />
      <AppText style={u.stateTitle}>Chargement impossible</AppText>
      <AppText style={u.stateMessage}>{message}</AppText>
      <Button title="Réessayer" variant="outline" size="sm" fullWidth={false} onPress={onRetry} />
    </View>
  );
}

export function FooterLoader({ visible }: { visible: boolean }) {
  return visible ? <ActivityIndicator color={colors.primary} style={u.footerLoader} /> : null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const u = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageInner: { flex: 1 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    maxWidth: 200,
  },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: '700', lineHeight: 16 },

  avatar: { backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700' },
  iconTile: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },

  toolbar: {
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  searchInput: { flex: 1, fontSize: typography.sizes.sm, color: colors.textPrimary, padding: 0 },
  filters: { paddingHorizontal: spacing.base, gap: spacing.xs },
  filterChip: { minHeight: 32, paddingHorizontal: spacing.md },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  countText: { fontSize: typography.sizes.xs, color: colors.textMuted, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 1 },
  rowTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary },
  rowSubtitle: { fontSize: typography.sizes.xs, color: colors.textMuted },
  rowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginTop: 3 },
  rowTrailing: { alignItems: 'flex-end', gap: 4 },
  separatorWrap: { backgroundColor: colors.white },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },

  block: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  blockGap: { height: spacing.sm },
  metaText: { fontSize: typography.sizes.xs, color: colors.textMuted, flexShrink: 1 },

  section: { marginTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xs,
    minHeight: 24,
  },
  sectionTitle: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6 },
  sectionBody: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  sectionBodyPadded: { padding: spacing.base, gap: spacing.md },
  sectionFooter: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.base,
    marginTop: spacing.xs,
    lineHeight: 17,
  },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.sm,
    marginLeft: spacing.base,
    paddingRight: spacing.base,
  },
  fieldDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  fieldLabel: { width: 120, fontSize: typography.sizes.sm, color: colors.textMuted },
  fieldValueWrap: { flex: 1, alignItems: 'flex-end' },
  fieldValue: { fontSize: typography.sizes.sm, color: colors.textPrimary, fontWeight: '600', textAlign: 'right' },
  fieldLink: { color: colors.primary },

  state: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing['3xl'], paddingHorizontal: spacing.xl },
  stateTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.xs },
  stateMessage: { fontSize: typography.sizes.sm, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },

  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.errorLight,
  },
  errorText: { flex: 1, fontSize: typography.sizes.sm, color: colors.errorText },
  errorRetry: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.errorText, textDecorationLine: 'underline' },

  footerLoader: { marginVertical: spacing.lg },
});
