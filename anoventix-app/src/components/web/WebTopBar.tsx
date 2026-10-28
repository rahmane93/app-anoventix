import { buildMediaUrl } from '@/src/api/annonce.api';
import AppText from '@/src/components/AppText';
import BrandText from '@/src/components/BrandText';
import { ANDROID_APK_URL } from '@/src/constants/download';
import { requireLogin } from '@/src/lib/auth-redirect';
import { isNavActive, useNavState, type NavItem } from '@/src/lib/nav-items';
import { WebContainer } from '@/src/lib/responsive';
import { getRoleLabels } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, interactive, layout, radius, spacing, typography, webShadow } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

// ─── Barre de navigation web desktop ──────────────────────────────────────────
// Remplace la tab bar mobile au-dessus de 768 px. Elle reste montée pour toutes
// les routes (fiche annonce, profils…) : un seul repère de navigation sur le web.

const web = (style: object) => style as ViewStyle;

function NavLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  return (
    <Pressable
      onPress={() => router.navigate(item.href)}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={s.link}
    >
      {({ hovered }: { hovered?: boolean }) => (
        <>
          <View style={s.linkInner}>
            <AppText style={[s.linkText, (active || hovered) && s.linkTextActive]}>{item.label}</AppText>
            {badge ? (
              <View style={s.badge}>
                <AppText style={s.badgeText}>{badge > 99 ? '99+' : badge}</AppText>
              </View>
            ) : null}
          </View>
          <View style={[s.indicator, active && s.indicatorActive, !active && hovered && s.indicatorHover]} />
        </>
      )}
    </Pressable>
  );
}

function UserMenu() {
  const { profile, user, flags } = useNavState();
  const logout = useAuthStore((st) => st.logout);
  const [open, setOpen] = useState(false);

  const name = [profile?.prenom, profile?.nom].filter(Boolean).join(' ') || profile?.email || user?.email || 'Mon compte';
  const initials = name.split(/\s+/).slice(0, 2).map((m) => m[0]?.toUpperCase()).join('');
  const role = getRoleLabels(profile?.roles ?? profile?.role)[0];

  const go = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <View style={s.menuAnchor}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel="Menu du compte"
        accessibilityState={{ expanded: open }}
        style={({ hovered }: { hovered?: boolean }) => [s.avatarBtn, (hovered || open) && s.avatarBtnHover]}
      >
        {profile?.photoProfil ? (
          <Image source={{ uri: buildMediaUrl(profile.photoProfil) }} style={s.avatar} contentFit="cover" />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <AppText style={s.avatarText}>{initials || '?'}</AppText>
          </View>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
      </Pressable>

      {open ? (
        <>
          {/* Clic à l'extérieur : ferme le menu. */}
          <Pressable style={web({ position: 'fixed', inset: 0, cursor: 'default' })} onPress={() => setOpen(false)} accessibilityElementsHidden />
          <View style={s.menu}>
            <View style={s.menuHead}>
              <AppText style={s.menuName} numberOfLines={1}>{name}</AppText>
              {role ? <AppText style={s.menuRole}>{role}</AppText> : null}
            </View>
            <MenuItem icon="person-outline" label="Mon profil" onPress={go(() => router.navigate('/(tabs)/profile'))} />
            <MenuItem icon="create-outline" label="Mes informations" onPress={go(() => router.push('/edit-profile'))} />
            {!flags.isStaff ? (
              <MenuItem icon="flag-outline" label="Mes signalements" onPress={go(() => router.push('/mes-signalements'))} />
            ) : null}
            <View style={s.menuSep} />
            <MenuItem
              icon="log-out-outline"
              label="Se déconnecter"
              danger
              onPress={go(async () => { await logout(); router.replace('/(tabs)/explore'); })}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

function MenuItem({ icon, label, onPress, danger }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.errorText : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      style={({ hovered }: { hovered?: boolean }) => [s.menuItem, hovered && { backgroundColor: danger ? colors.errorLight : interactive.hoverSurface }]}
    >
      <Ionicons name={icon} size={17} color={danger ? colors.errorText : colors.textSecondary} />
      <AppText style={[s.menuItemText, { color }]}>{label}</AppText>
    </Pressable>
  );
}

export function WebTopBar() {
  const pathname = usePathname();
  const { items, isAuthenticated, canPublish, unreadCount, identiteARegler } = useNavState();

  const publier = () =>
    isAuthenticated ? router.push('/(tabs)/publier') : requireLogin('publier', '/(tabs)/publier');

  return (
    <View style={s.bar} accessibilityRole="header">
      <WebContainer style={s.inner}>
        <Pressable onPress={() => router.navigate('/(tabs)/explore')} accessibilityRole="link" accessibilityLabel="Accueil Anoventix">
          <BrandText size={24} />
        </Pressable>

        <View style={s.nav} accessibilityRole="menubar">
          {items.filter((i) => i.visible).map((item) => (
            <NavLink
              key={item.key}
              item={item}
              active={isNavActive(pathname, item.match) || (item.key === 'explore' && pathname === '/')}
              badge={item.key === 'messagerie' ? unreadCount : undefined}
            />
          ))}
        </View>

        <View style={s.actions}>
          <Pressable
            onPress={() => Linking.openURL(ANDROID_APK_URL)}
            accessibilityRole="link"
            accessibilityLabel="Télécharger l'application Android"
            style={({ hovered }: { hovered?: boolean }) => [s.appLink, hovered && s.appLinkHover]}
          >
            <Ionicons name="logo-android" size={17} color={colors.primary} />
            <AppText style={s.appLinkText}>Application Android</AppText>
          </Pressable>
          {canPublish ? (
            <Pressable
              onPress={publier}
              accessibilityRole="button"
              accessibilityHint={identiteARegler ? "Une pièce d'identité validée est requise avant de publier" : undefined}
              style={({ hovered }: { hovered?: boolean }) => [s.publish, hovered && s.publishHover]}
            >
              <Ionicons name="add" size={18} color={colors.textOnAccent} />
              <AppText style={s.publishText}>Publier une annonce</AppText>
              {identiteARegler ? <View style={s.publishDot} /> : null}
            </Pressable>
          ) : null}
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              accessibilityRole="button"
              style={({ hovered }: { hovered?: boolean }) => [s.login, hovered && s.loginHover]}
            >
              <AppText style={s.loginText}>Se connecter</AppText>
            </Pressable>
          )}
        </View>
      </WebContainer>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    height: layout.topBarHeight,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 50,
    ...web({ position: 'sticky', top: 0, backdropFilter: 'saturate(180%) blur(12px)' }),
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xl'],
  },
  nav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  link: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  linkInner: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  linkText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.textSecondary,
  },
  linkTextActive: { color: colors.primary },
  indicator: {
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'transparent',
  },
  indicatorActive: { backgroundColor: colors.accent },
  indicatorHover: { backgroundColor: colors.divider },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: typography.fonts.extrabold, fontSize: 10, color: colors.white },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  appLinkHover: { backgroundColor: colors.primarySurface },
  appLinkText: { fontFamily: typography.fonts.semibold, fontSize: 14, color: colors.primary },
  publish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  publishHover: { backgroundColor: interactive.hoverAccent },
  // Étape à faire avant de publier (pièce d'identité).
  publishDot: {
    position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.error, borderWidth: 2, borderColor: colors.white,
  },
  publishText: { fontFamily: typography.fonts.bold, fontSize: 14, color: colors.textOnAccent },
  login: {
    height: 42,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
  },
  loginHover: { backgroundColor: colors.primarySurface },
  loginText: { fontFamily: typography.fonts.bold, fontSize: 14, color: colors.primary },
  menuAnchor: { position: 'relative', zIndex: 60 },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 3,
    paddingRight: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  avatarBtnHover: { borderColor: colors.border, ...web({ boxShadow: webShadow.sm }) },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: typography.fonts.bold, fontSize: 13, color: colors.white },
  menu: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    ...web({ boxShadow: webShadow.lg }),
  },
  menuHead: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider, marginBottom: spacing.xs },
  menuName: { fontFamily: typography.fonts.bold, fontSize: 14, color: colors.textPrimary },
  menuRole: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: 10 },
  menuItemText: { fontFamily: typography.fonts.semibold, fontSize: 14 },
  menuSep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginVertical: spacing.xs },
});
