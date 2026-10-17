import { annonceHref } from '@/src/lib/annonce-url';
import { useBreakpoint, webColumnStyle } from '@/src/lib/responsive';
import { LicenceBloqueeNotice } from '@/src/features/licence/LicenceBloqueeNotice';
import { getRoleFlags } from '@/src/lib/roles';
import { useAuthStore } from '@/src/stores/auth.store';
import { useLicenceStore } from '@/src/stores/licence.store';
import { useProStore } from '@/src/stores/pro.store';
import { useUserStore } from '@/src/stores/user.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import type {
    ProStats,
    ProStatsAgentPerf,
    ProStatsConformite,
    ProStatsEquipe,
    ProStatsMessagerie,
    ProStatsPortefeuille,
    ProStatsTop5Item,
    ProStatsVisibilite,
} from '@/src/types/pro.types';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { useShallow } from 'zustand/react/shallow';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

// ─── Composants partagés ──────────────────────────────────────────────────────

// `periode` : les blocs ne couvrent pas tous la même durée (mois en cours ou
// depuis le début) ; on l'écrit plutôt que de laisser comparer l'incomparable.
function SectionTitle({ children, periode }: { children: string; periode?: string }) {
  return (
    <View style={s.sectionTitleRow}>
      <AppText style={s.sectionTitle} accessibilityRole="header">{children}</AppText>
      {periode ? <AppText style={s.sectionPeriode}>{periode}</AppText> : null}
    </View>
  );
}

// ─── À traiter ────────────────────────────────────────────────────────────────
// Ce qui demande une action, en tête d'écran ; absent quand tout est à jour.

interface ATraiterItem {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  tone: 'error' | 'warning';
  action?: { label: string; onPress: () => void };
}

function pluriel(n: number, mot: string): string {
  return `${fmt(n)} ${mot}${n > 1 ? 's' : ''}`;
}

function buildATraiter(stats: ProStats, isProfessionnel: boolean): ATraiterItem[] {
  const { messagerie, portefeuille, conformite } = stats;
  const items: ATraiterItem[] = [];
  // Pro : ses annonces sont listées (avec statut) sur l'écran Entreprise.
  const voirAnnonces = {
    label: 'Voir les annonces',
    onPress: () => router.push((isProfessionnel ? '/(tabs)/entreprise' : '/(tabs)/mes-annonces') as any),
  };
  const s_ = (n: number) => (n > 1 ? 's' : '');

  if (messagerie.messagesNonLus > 0) {
    items.push({
      key: 'messages',
      icon: 'chatbubble-ellipses-outline',
      text: `${pluriel(messagerie.messagesNonLus, 'message')} non lu${s_(messagerie.messagesNonLus)}`,
      tone: 'warning',
      action: { label: 'Ouvrir la messagerie', onPress: () => router.push('/(tabs)/messagerie' as any) },
    });
  }
  if (portefeuille.annoncesRejetees > 0) {
    items.push({
      key: 'rejetees',
      icon: 'close-circle-outline',
      text: `${pluriel(portefeuille.annoncesRejetees, 'annonce')} rejetée${s_(portefeuille.annoncesRejetees)} par la modération`,
      tone: 'error',
      action: voirAnnonces,
    });
  }
  if (portefeuille.annoncesMasquees > 0) {
    items.push({
      key: 'masquees',
      icon: 'eye-off-outline',
      text: `${pluriel(portefeuille.annoncesMasquees, 'annonce')} masquée${s_(portefeuille.annoncesMasquees)}, invisible${s_(portefeuille.annoncesMasquees)} du public`,
      tone: 'warning',
      action: voirAnnonces,
    });
  }
  if (!conformite.canCreateAnnonce) {
    items.push(conformite.limiteParLicence
      ? {
        key: 'quota',
        icon: 'ribbon-outline',
        text: 'Annonces gratuites épuisées : une licence est nécessaire pour publier',
        tone: 'error',
        action: { label: 'Voir ma licence', onPress: () => router.push('/licence') },
      }
      : { key: 'quota', icon: 'ban-outline', text: "Quota d'annonces atteint : publication impossible", tone: 'error' });
  }
  if (conformite.statutPieceIdentite === 'REJETEE' || !conformite.statutPieceIdentite) {
    const refusee = conformite.statutPieceIdentite === 'REJETEE';
    items.push({
      key: 'piece',
      icon: 'card-outline',
      text: refusee ? "Pièce d'identité refusée : envoyez-en une nouvelle" : "Pièce d'identité non fournie",
      tone: refusee ? 'error' : 'warning',
      action: { label: 'Ouvrir mon profil', onPress: () => router.push('/(tabs)/profile' as any) },
    });
  }
  if (conformite.nbAvertissements > 0) {
    items.push({
      key: 'avertissements',
      icon: 'warning-outline',
      text: `${pluriel(conformite.nbAvertissements, 'avertissement')} de la modération sur votre compte`,
      tone: 'warning',
    });
  }
  return items;
}

function BlocATraiter({ items }: { items: ATraiterItem[] }) {
  if (items.length === 0) return null;
  return (
    <View style={s.aTraiter}>
      <AppText style={s.aTraiterTitle} accessibilityRole="header">À traiter</AppText>
      {items.map((it, i) => {
        const color = it.tone === 'error' ? colors.errorText : colors.warningText;
        return (
          <View key={it.key} style={[s.aTraiterRow, i > 0 && s.aTraiterRowSep]}>
            <Ionicons name={it.icon} size={18} color={color} />
            <AppText style={s.aTraiterText}>{it.text}</AppText>
            {it.action ? (
              <TouchableOpacity onPress={it.action.onPress} accessibilityRole="link" hitSlop={8}>
                <AppText style={s.linkText}>{it.action.label}</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

function KpiRow({
  label,
  value,
  color = colors.textPrimary,
  icon,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={s.kpiRow}>
      {icon && <Ionicons name={icon} size={15} color={color} style={{ marginTop: 1 }} />}
      <AppText style={s.kpiLabel}>{label}</AppText>
      <AppText style={[s.kpiValue, { color }]}>{value}</AppText>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

// ─── Bloc 1 — Portefeuille ────────────────────────────────────────────────────

function BlocPortefeuille({ data }: { data: ProStatsPortefeuille }) {
  const { tauxConversionMois, repartitionParType } = data;

  const statuts = [
    { key: 'PUBLIEE', label: 'Publiées', value: data.annoncesPubliees, color: colors.successText },
    { key: 'MASQUEE', label: 'Masquées', value: data.annoncesMasquees, color: colors.warningText },
    { key: 'REJETEE', label: 'Rejetées', value: data.annoncesRejetees, color: colors.errorText },
  ];
  const clotures = [
    { key: 'VENDU', label: 'Vendues', value: data.clotureesVenduCeMois },
    { key: 'LOUE', label: 'Louées', value: data.clotureesLoueCeMois },
    { key: 'RETIRE', label: 'Retirées', value: data.clotureesRetireCeMois },
  ];
  const totalClotures = clotures.reduce((n, c) => n + (c.value ?? 0), 0);
  const TYPE_LABELS: Record<string, string> = {
    VENTE: 'Vente',
    LOCATION: 'Location',
    BAIL: 'Bail',
  };

  return (
    <Card>
      <View style={s.statRow}>
        {statuts.map((st) => (
          <View key={st.key} style={s.statCell}>
            <AppText style={[s.statNum, { color: st.color }]}>{fmt(st.value ?? 0)}</AppText>
            <AppText style={s.statLbl}>{st.label}</AppText>
          </View>
        ))}
      </View>

      <Divider />

      <AppText style={s.subLabel}>Clôtures ce mois-ci</AppText>
      {clotures.map((c) => (
        <KpiRow key={c.key} label={c.label} value={fmt(c.value ?? 0)} />
      ))}
      <KpiRow
        label="Taux de conversion"
        value={totalClotures > 0 ? pct(tauxConversionMois) : '—'}
        color={totalClotures > 0 ? colors.textPrimary : colors.textMuted}
        icon="trending-up-outline"
      />
      <AppText style={s.kpiHint}>
        {totalClotures > 0
          ? 'Part des clôtures du mois qui sont des ventes ou des locations.'
          : 'Aucune clôture ce mois-ci : le taux sera calculé à la première.'}
      </AppText>

      <Divider />

      <AppText style={s.subLabel}>Répartition par type</AppText>
      {Object.entries(repartitionParType ?? {}).map(([k, v]) => (
        <KpiRow key={k} label={TYPE_LABELS[k] ?? k} value={v} />
      ))}
    </Card>
  );
}

// ─── Bloc 2 — Visibilité ──────────────────────────────────────────────────────

function BlocVisibilite({ data }: { data: ProStatsVisibilite }) {
  const { totalVues, top5ParVues, totalFavoris } = data;
  return (
    <Card>
      <View style={s.statRow}>
        <View style={s.statCell}>
          <AppText style={[s.statNum, { color: colors.primary }]}>{fmt(totalVues)}</AppText>
          <AppText style={s.statLbl}>Vues totales</AppText>
        </View>
        <View style={s.statCell}>
          <AppText style={[s.statNum, { color: colors.primary }]}>{fmt(totalFavoris)}</AppText>
          <AppText style={s.statLbl}>Mis en favoris</AppText>
        </View>
      </View>

      {(top5ParVues ?? []).length > 0 && (
        <>
          <Divider />
          <AppText style={s.subLabel}>Top 5 annonces</AppText>
          {(top5ParVues ?? []).map((item: ProStatsTop5Item, i: number) => (
            <TouchableOpacity
              key={item.id}
              style={s.top5Row}
              onPress={() => router.push(annonceHref(item))}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${item.titre}, ${fmt(item.vueCount)} vues`}
            >
              <AppText style={s.top5Rank}>#{i + 1}</AppText>
              <View style={{ flex: 1 }}>
                <AppText style={s.top5Titre} numberOfLines={1}>{item.titre}</AppText>
                <AppText style={s.top5Ref}>{item.referenceAnnonce}</AppText>
              </View>
              <View style={s.top5Stats}>
                <View style={s.top5Stat}>
                  <Ionicons name="eye-outline" size={11} color={colors.textMuted} />
                  <AppText style={s.top5StatTxt}>{fmt(item.vueCount)}</AppText>
                </View>
                <View style={s.top5Stat}>
                  <Ionicons name="heart-outline" size={11} color={colors.error} />
                  <AppText style={s.top5StatTxt}>{fmt(item.nbFavoris)}</AppText>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </Card>
  );
}

// ─── Bloc 3 — Messagerie ──────────────────────────────────────────────────────

function BlocMessagerie({ data }: { data: ProStatsMessagerie }) {
  const { totalConversations, messagesNonLus, tauxReponse } = data;
  return (
    <Card>
      <View style={s.statRow}>
        <View style={s.statCell}>
          <AppText style={[s.statNum, { color: colors.primary }]}>{fmt(totalConversations)}</AppText>
          <AppText style={s.statLbl}>Conversations</AppText>
        </View>
        <View style={s.statCell}>
          <AppText style={[s.statNum, { color: messagesNonLus > 0 ? colors.errorText : colors.textMuted }]}>
            {fmt(messagesNonLus)}
          </AppText>
          <AppText style={s.statLbl}>Non lus</AppText>
        </View>
        <View style={s.statCell}>
          {/* Sans conversation, 0 % n'est pas un mauvais score : pas de valeur. */}
          <AppText style={[s.statNum, {
            color: totalConversations === 0 ? colors.textMuted : tauxReponse >= 80 ? colors.successText : colors.warningText,
          }]}>
            {totalConversations === 0 ? '—' : pct(tauxReponse)}
          </AppText>
          <AppText style={s.statLbl}>Taux réponse</AppText>
        </View>
      </View>
      <TouchableOpacity
        style={s.linkRow}
        onPress={() => router.push('/(tabs)/messagerie' as any)}
        activeOpacity={0.75}
        accessibilityRole="link"
      >
        <AppText style={s.linkText}>Ouvrir la messagerie</AppText>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </TouchableOpacity>
    </Card>
  );
}

// ─── Bloc 4 — Équipe (PROFESSIONNEL uniquement) ───────────────────────────────

// L'API renvoie aussi un libellé « Prénom Nom (email) » : sans les champs
// séparés (API pas encore redéployée), on en retire l'email.
function sansEmail(label: string | null | undefined): string {
  return (label ?? '').replace(/\s*\([^()]*@[^()]*\)\s*$/, '').trim();
}

function agentDisplayName(a: ProStatsAgentPerf): string {
  const full = [a.agentPrenom, a.agentNom].filter(Boolean).join(' ');
  return full || sansEmail(a.agentUsername) || a.agentEmail || '—';
}

/** Email affiché sous le nom : champ séparé, sinon extrait du libellé. */
function agentEmail(a: ProStatsAgentPerf): string | null {
  if (a.agentEmail) return a.agentEmail;
  return a.agentUsername?.match(/\(([^()]*@[^()]*)\)\s*$/)?.[1] ?? null;
}

function agentInitial(a: ProStatsAgentPerf): string {
  return (agentDisplayName(a)[0] ?? '?').toUpperCase();
}

function topAgentLabel(data: ProStatsEquipe): string | null {
  const full = [data.topAgentPrenom, data.topAgentNom].filter(Boolean).join(' ');
  return full || sansEmail(data.topAgentUsername) || data.topAgentEmail || null;
}

function BlocEquipe({ data }: { data: ProStatsEquipe }) {
  if (!data) return null;
  const { agentsActifs, agentsSuspendus, performances } = data;
  const topLabel = topAgentLabel(data);
  return (
    <Card>
      <View style={s.statRow}>
        <View style={s.statCell}>
          <AppText style={[s.statNum, { color: colors.successText }]}>{agentsActifs}</AppText>
          <AppText style={s.statLbl}>Agents actifs</AppText>
        </View>
        <View style={s.statCell}>
          <AppText style={[s.statNum, { color: agentsSuspendus > 0 ? colors.errorText : colors.textMuted }]}>
            {agentsSuspendus}
          </AppText>
          <AppText style={s.statLbl}>Suspendus</AppText>
        </View>
        {topLabel && (
          <View style={s.statCell}>
            <Ionicons name="trophy-outline" size={20} color={colors.accent} />
            <AppText style={s.topAgentName} numberOfLines={1}>{topLabel}</AppText>
            <AppText style={s.statLbl}>Meilleur agent</AppText>
          </View>
        )}
      </View>

      {(performances ?? []).length > 0 && (
        <>
          <Divider />
          <AppText style={s.subLabel}>Performances agents</AppText>
          {(performances ?? []).map((a: ProStatsAgentPerf) => (
            <View key={a.agentId} style={s.agentRow}>
              <View style={s.agentAvatar}>
                <AppText style={s.agentAvatarTxt}>{agentInitial(a)}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={s.agentName}>{agentDisplayName(a)}</AppText>
                {agentEmail(a) && agentEmail(a) !== agentDisplayName(a) ? (
                  <AppText style={s.agentEmail}>{agentEmail(a)}</AppText>
                ) : null}
              </View>
              <View style={s.top5Stats}>
                <View style={s.top5Stat}>
                  <Ionicons name="home-outline" size={11} color={colors.textMuted} />
                  <AppText style={s.top5StatTxt}>{a.nbAnnonces}</AppText>
                </View>
                <View style={s.top5Stat}>
                  <Ionicons name="eye-outline" size={11} color={colors.textMuted} />
                  <AppText style={s.top5StatTxt}>{fmt(a.totalVues)}</AppText>
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity
        style={s.linkRow}
        onPress={() => router.push('/(tabs)/entreprise' as any)}
        activeOpacity={0.75}
        accessibilityRole="link"
      >
        <AppText style={s.linkText}>Gérer l'équipe</AppText>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </TouchableOpacity>
    </Card>
  );
}

// ─── Bloc 5 — Conformité ──────────────────────────────────────────────────────

const PIECE_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
};
const PIECE_COLORS: Record<string, string> = {
  EN_ATTENTE: colors.warningText,
  VALIDEE: colors.successText,
  REJETEE: colors.errorText,
};

function BlocConformite({ data }: { data: ProStatsConformite }) {
  const { statutPieceIdentite, nbAvertissements, annoncesActives, quotaMax, annoncesRestantes, limiteParLicence } = data;
  const pieceColor = statutPieceIdentite ? (PIECE_COLORS[statutPieceIdentite] ?? colors.textMuted) : colors.textMuted;
  const pieceLabel = statutPieceIdentite ? (PIECE_LABELS[statutPieceIdentite] ?? statutPieceIdentite) : '—';
  const quotaUsed = quotaMax - annoncesRestantes;

  return (
    <Card>
      <KpiRow
        label="Pièce d'identité"
        value={pieceLabel}
        color={pieceColor}
        icon="card-outline"
      />
      <KpiRow
        label="Avertissements"
        value={nbAvertissements}
        color={nbAvertissements > 0 ? colors.errorText : colors.successText}
        icon="warning-outline"
      />

      <Divider />

      <AppText style={s.subLabel}>{limiteParLicence ? 'Annonces gratuites (sans licence)' : 'Quota annonces'}</AppText>
      <View style={s.quotaBar}>
        <View style={[s.quotaFill, { width: `${Math.min((quotaUsed / Math.max(quotaMax, 1)) * 100, 100)}%` as any }]} />
      </View>
      <AppText style={s.quotaText}>
        {annoncesActives} active{annoncesActives !== 1 ? 's' : ''} · {annoncesRestantes} restante{annoncesRestantes !== 1 ? 's' : ''} sur {quotaMax}
      </AppText>

      {limiteParLicence && (
        <TouchableOpacity onPress={() => router.push('/licence')} accessibilityRole="link">
          <AppText style={s.retryText}>Voir ma licence</AppText>
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function DashboardPro() {
  const { user } = useAuthStore(useShallow((s) => ({ user: s.user })));
  const { profile } = useUserStore(useShallow((s) => ({ profile: s.profile })));
  const { stats, isLoading, error, loadStats } = useProStore(useShallow((s) => ({ stats: s.stats, isLoading: s.isLoading, error: s.error, loadStats: s.loadStats })));

  const roles = profile?.roles ?? profile?.role ?? user?.roles;
  const { isProfessionnel } = getRoleFlags(roles);

  const licenceBloquee = useLicenceStore((st) => st.licence?.bloque ?? false);
  const loadLicence = useLicenceStore((st) => st.load);

  // Rechargé à chaque affichage : une annonce publiée ou clôturée entre-temps
  // doit se refléter sans tirer pour rafraîchir. Compte bloqué : les stats
  // répondraient 402 (redirection à chaque retour sur l'onglet).
  useFocusEffect(useCallback(() => {
    loadLicence().then((l) => { if (!l?.bloque) loadStats(); });
  }, [loadLicence, loadStats]));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isDesktop, isWide } = useBreakpoint();
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await loadStats(); } finally { setIsRefreshing(false); }
  };

  if (licenceBloquee) return <LicenceBloqueeNotice />;

  const aTraiter = stats ? buildATraiter(stats, isProfessionnel) : [];

  // Web ≥ 1200 px : deux colonnes explicites (et non un flex-wrap, qui laissait
  // des trous entre blocs de hauteurs différentes).
  const col = (children: React.ReactNode) =>
    isWide ? <View style={s.colWide}>{children}</View> : children;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.container, isDesktop && webColumnStyle('page'), isDesktop && s.containerDesktop]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.errorText} />
          <AppText style={s.errorText}>{error}</AppText>
          <TouchableOpacity onPress={handleRefresh} hitSlop={8} accessibilityRole="button">
            <AppText style={s.retryText}>Réessayer</AppText>
          </TouchableOpacity>
        </View>
      ) : null}

      {isLoading && !stats ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['2xl'] }} />
      ) : stats ? (
        <>
          <BlocATraiter items={aTraiter} />
          <View style={isWide ? s.gridWide : undefined}>
            {col(
              <>
                <SectionTitle>Portefeuille d'annonces</SectionTitle>
                <BlocPortefeuille data={stats.portefeuille} />

                <SectionTitle periode="Depuis le début">Leads & Messagerie</SectionTitle>
                <BlocMessagerie data={stats.messagerie} />

                <SectionTitle>Conformité & Compte</SectionTitle>
                <BlocConformite data={stats.conformite} />
              </>,
            )}
            {col(
              <>
                <SectionTitle periode="Depuis la publication">Visibilité & Engagement</SectionTitle>
                <BlocVisibilite data={stats.visibilite} />

                {isProfessionnel && stats.equipe && (
                  <>
                    <SectionTitle periode="Vues depuis la publication">Équipe</SectionTitle>
                    <BlocEquipe data={stats.equipe} />
                  </>
                )}
              </>,
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.base, paddingBottom: spacing['4xl'] },
  containerDesktop: { paddingHorizontal: 32, paddingTop: 0 },
  gridWide: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  colWide: { flex: 1, minWidth: 0 },
  aTraiter: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningLight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  aTraiterTitle: { fontSize: typography.sizes.md, fontWeight: '800', color: colors.textPrimary, paddingVertical: spacing.xs },
  aTraiterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, flexWrap: 'wrap' },
  aTraiterRowSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  aTraiterText: { flex: 1, minWidth: 180, fontSize: typography.sizes.sm, color: colors.textPrimary, fontWeight: '600' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  sectionPeriode: { fontSize: typography.sizes.xs, color: colors.textMuted },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.errorLight, padding: spacing.md,
    borderRadius: radius.md, marginBottom: spacing.md,
  },
  errorText: { fontSize: typography.sizes.sm, color: colors.errorText, flex: 1 },
  retryText: { fontSize: typography.sizes.sm, color: colors.errorText, fontWeight: '700', textDecorationLine: 'underline' },
  kpiHint: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 2 },
  topAgentName: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginTop: 4, textAlign: 'center' },
  sectionTitle: {
    fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.base, marginBottom: spacing.sm,
    gap: spacing.xs, ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  subLabel: {
    fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 0.5, marginBottom: 2,
  },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statNum: { fontSize: typography.sizes['2xl'], fontWeight: '800' },
  statLbl: { fontSize: typography.sizes.xs, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  kpiRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  kpiLabel: { flex: 1, fontSize: typography.sizes.sm, color: colors.textSecondary },
  kpiValue: { fontSize: typography.sizes.sm, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  top5Row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  top5Rank: { fontSize: typography.sizes.xs, fontWeight: '800', color: colors.textMuted, width: 22, textAlign: 'center' },
  top5Titre: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  top5Ref: { fontSize: typography.sizes.xs, color: colors.textMuted },
  top5Stats: { flexDirection: 'row', gap: spacing.sm },
  top5Stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  top5StatTxt: { fontSize: typography.sizes.xs, color: colors.textMuted },
  agentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  agentAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center',
  },
  agentAvatarTxt: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.primary },
  agentName: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  agentEmail: { fontSize: typography.sizes.xs, color: colors.textMuted },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: spacing.xs, marginTop: spacing.xs, minHeight: 44, alignSelf: 'flex-end',
  },
  linkText: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: '600' },
  quotaBar: {
    height: 6, backgroundColor: colors.border, borderRadius: radius.full,
    marginVertical: spacing.sm, overflow: 'hidden',
  },
  quotaFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  quotaText: { fontSize: typography.sizes.xs, color: colors.textMuted, textAlign: 'right' },
});
