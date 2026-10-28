import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { useMessagerieStore } from '@/src/stores/messagerie.store';
import { useUserStore } from '@/src/stores/user.store';
import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import React from 'react';

// ─── Navigation principale ────────────────────────────────────────────────────
// Source unique de la visibilité des sections selon le rôle : consommée par la
// barre d'onglets mobile ((tabs)/_layout) et par la barre du haut web.

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type NavKey =
  | 'explore'
  | 'messagerie'
  | 'favoris'
  | 'administration'
  | 'mes-annonces'
  | 'entreprise'
  | 'dashboard'
  | 'profile';

export interface NavItem {
  key: NavKey;
  href: Href;
  label: string;
  icon: IoniconName;
  iconActive: IoniconName;
  /** Préfixe de chemin qui marque l'item actif. */
  match: string;
  visible: boolean;
}

export function useNavState() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profile = useUserStore((s) => s.profile);
  // Sélecteur dérivé : ne re-rend que si le total de non-lus change.
  const totalUnread = useMessagerieStore((s) =>
    s.conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
  );

  const roles = profile?.roles ?? profile?.role ?? user?.roles;
  const flags = getRoleFlags(roles);
  const { isParticulier, isProfessionnel, isAgentProfessionnel, isAdministrateur, isModerateur } = flags;

  // Pas pour la modération : sans contact annonceur, la messagerie resterait vide
  // (les messages signalés sont dans Administration > Messages).
  const hasMessagerie = isAuthenticated && (isParticulier || isProfessionnel || isAgentProfessionnel);
  const hasAdministration = isAuthenticated && (isAdministrateur || isModerateur);
  // Publier exige une pièce d'identité validée : on le signale dès le bouton plutôt qu'au bout du parcours.
  const identiteARegler = hasMessagerie && !!profile && profile.statutPieceIdentite !== 'VALIDEE';
  const hasProDashboard = isAuthenticated && (isProfessionnel || isAgentProfessionnel);

  const items: NavItem[] = [
    { key: 'explore', href: '/(tabs)/explore', label: 'Accueil', icon: 'home-outline', iconActive: 'home', match: '/explore', visible: true },
    { key: 'messagerie', href: '/(tabs)/messagerie', label: 'Messagerie', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', match: '/messagerie', visible: hasMessagerie },
    { key: 'favoris', href: '/(tabs)/favoris', label: 'Favoris', icon: 'heart-outline', iconActive: 'heart', match: '/favoris', visible: isAuthenticated },
    { key: 'mes-annonces', href: '/(tabs)/mes-annonces', label: 'Mes annonces', icon: 'document-text-outline', iconActive: 'document-text', match: '/mes-annonces', visible: isAuthenticated && isAgentProfessionnel },
    { key: 'entreprise', href: '/(tabs)/entreprise', label: 'Entreprise', icon: 'business-outline', iconActive: 'business', match: '/entreprise', visible: isAuthenticated && isProfessionnel },
    { key: 'dashboard', href: '/(tabs)/dashboard', label: 'Statistiques', icon: 'bar-chart-outline', iconActive: 'bar-chart', match: '/dashboard', visible: hasProDashboard },
    { key: 'administration', href: '/(tabs)/administration', label: 'Administration', icon: 'shield-outline', iconActive: 'shield', match: '/administration', visible: hasAdministration },
  ];

  return {
    items,
    flags,
    isAuthenticated,
    profile,
    user,
    unreadCount: isAuthenticated ? totalUnread : 0,
    canPublish: isAuthenticated ? flags.canPublishAnnonce : true,
    identiteARegler,
  };
}

export function isNavActive(pathname: string, match: string): boolean {
  return pathname === match || pathname.startsWith(`${match}/`);
}
