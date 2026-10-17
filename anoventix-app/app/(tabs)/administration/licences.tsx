import {
    adminGenererCle,
    adminGetModeLicence,
    adminGetReglagesLicence,
    adminListerCles,
    adminSetModeLicence,
    adminSetReglagesLicence,
} from '@/src/api/licence.api';
import AppText from '@/src/components/AppText';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { appAlert } from '@/src/components/ui/app-alert';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { IconButton } from '@/src/components/ui/icon-button';
import { Input } from '@/src/components/ui/input';
import { colors, radius, spacing, typography } from '@/src/theme';
import { CLE_TONE } from '@/src/features/admin/status';
import {
    ErrorBanner,
    FilterBar,
    RowSeparator,
    SearchField,
    Section,
    StatusBadge,
    webColumn,
} from '@/src/features/admin/ui';
import {
    STATUT_CLE_LABELS,
    TYPE_LICENCE_LABELS,
    type LicenceAdmin,
    type StatutCleLicence,
    type TypeLicence,
} from '@/src/types/licence.types';
import { formatDate, getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';

const TYPES: TypeLicence[] = ['PARTICULIER', 'PROFESSIONNEL'];

type FiltreStatut = StatutCleLicence | 'TOUTES';
const FILTRES: { key: FiltreStatut; label: string }[] = [
  { key: 'TOUTES', label: 'Toutes' },
  { key: 'LIBRE', label: 'Libres' },
  { key: 'ACTIVE', label: 'Actives' },
  { key: 'EXPIREE', label: 'Expirées' },
];

const PAGE_SIZE = 20;

/** Saisie d'un prix en GNF : chiffres seuls, vide = non renseigné. */
const versPrix = (t: string): number | null => (t.trim() ? Number(t) : null);
const chiffres = (t: string) => t.replace(/[^0-9]/g, '');

function partagerCle(cle: string) {
  Share.share({ message: cle });
}

// ─── Ligne clé ────────────────────────────────────────────────────────────────

function CleRow({ item }: { item: LicenceAdmin }) {
  return (
    <View style={s.cleRow}>
      <View style={s.cleBody}>
        <View style={s.cleHeader}>
          <AppText style={s.cleTexte} selectable>{item.cle}</AppText>
          <StatusBadge label={STATUT_CLE_LABELS[item.statut]} tone={CLE_TONE[item.statut]} />
        </View>
        <AppText style={s.cleMeta} numberOfLines={1}>
          {TYPE_LICENCE_LABELS[item.type]}
          {item.ownerEmail ? ` · ${item.ownerEmail}` : ` · créée le ${formatDate(item.createdAt)}`}
        </AppText>
        {item.dateDebut && item.dateFin && (
          <AppText style={s.cleMeta}>
            Du {formatDate(item.dateDebut)} au {formatDate(item.dateFin)}
          </AppText>
        )}
      </View>
      <IconButton
        icon="share-outline"
        variant="plain"
        size={20}
        color={colors.primary}
        onPress={() => partagerCle(item.cle)}
        accessibilityLabel={`Partager la clé ${item.cle}`}
      />
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

export default function AdminLicences() {
  const [modeActif, setModeActif] = useState<boolean | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  const [prixParticulier, setPrixParticulier] = useState('');
  const [prixProfessionnel, setPrixProfessionnel] = useState('');
  const [contactTelephone, setContactTelephone] = useState('');
  const [savingReglages, setSavingReglages] = useState(false);
  const [reglagesFeedback, setReglagesFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const [type, setType] = useState<TypeLicence>('PARTICULIER');
  const [cle, setCle] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [filtre, setFiltre] = useState<FiltreStatut>('TOUTES');
  const [recherche, setRecherche] = useState('');
  const [cles, setCles] = useState<LicenceAdmin[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingCles, setLoadingCles] = useState(false);
  const [clesError, setClesError] = useState<string | null>(null);

  const loadMode = async () => {
    setModeError(null);
    try {
      setModeActif(await adminGetModeLicence());
    } catch (err) {
      setModeError(getErrorMessage(err, 'Impossible de charger le mode licence.'));
    }
  };

  const loadReglages = async () => {
    try {
      const r = await adminGetReglagesLicence();
      setPrixParticulier(r.prixParticulier != null ? String(r.prixParticulier) : '');
      setPrixProfessionnel(r.prixProfessionnel != null ? String(r.prixProfessionnel) : '');
      setContactTelephone(r.contactTelephone ?? '');
    } catch (err) {
      setReglagesFeedback({ variant: 'error', message: getErrorMessage(err, 'Impossible de charger les tarifs.') });
    }
  };

  /** page 0 : remplace la liste ; sinon ajoute la page suivante. */
  const loadCles = async (statut: FiltreStatut, q: string, p = 0) => {
    setLoadingCles(true);
    setClesError(null);
    try {
      const res = await adminListerCles({
        statut: statut === 'TOUTES' ? undefined : statut,
        q: q.trim() || undefined,
        page: p,
        size: PAGE_SIZE,
      });
      setCles((prev) => (p === 0 ? res.data : [...prev, ...res.data]));
      setPage(res.currentPage);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalItems);
    } catch (err) {
      setClesError(getErrorMessage(err, 'Impossible de charger les clés.'));
    } finally {
      setLoadingCles(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadMode();
    loadReglages();
    loadCles(filtre, recherche);
    // Rechargement au retour sur l'écran avec les filtres en cours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const appliquerMode = async (actif: boolean) => {
    setSavingMode(true);
    try {
      setModeActif(await adminSetModeLicence(actif));
    } catch (err) {
      appAlert("Mode licence inchangé", getErrorMessage(err, 'Impossible de modifier le mode licence.'));
    } finally {
      setSavingMode(false);
    }
  };

  // Changement à fort impact sur tous les annonceurs : toujours confirmé.
  const handleToggleMode = (actif: boolean) => {
    appAlert(
      actif ? 'Activer le mode licence ?' : 'Désactiver le mode licence ?',
      actif
        ? "Au-delà de leurs annonces actives gratuites, les utilisateurs sans licence valide ne pourront plus publier ni remettre d'annonce en ligne.\n\n"
          + 'Les comptes qui en ont déjà davantage seront limités immédiatement (plus de publication ni de modification, redirection vers « Ma licence »). Leurs annonces restent visibles.'
        : 'La publication redevient illimitée pour tous, et les utilisateurs ne voient plus leur licence.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: actif ? 'Activer' : 'Désactiver', style: 'destructive', onPress: () => appliquerMode(actif) },
      ],
    );
  };

  const handleSaveReglages = async () => {
    setSavingReglages(true);
    setReglagesFeedback(null);
    try {
      const r = await adminSetReglagesLicence({
        prixParticulier: versPrix(prixParticulier),
        prixProfessionnel: versPrix(prixProfessionnel),
        contactTelephone: contactTelephone.trim() || null,
      });
      setContactTelephone(r.contactTelephone ?? '');
      setReglagesFeedback({ variant: 'success', message: 'Tarifs et contact enregistrés.' });
    } catch (err) {
      setReglagesFeedback({ variant: 'error', message: getErrorMessage(err, "Impossible d'enregistrer les tarifs.") });
    } finally {
      setSavingReglages(false);
    }
  };

  const handleGenerer = async () => {
    setGenerating(true);
    try {
      setCle(await adminGenererCle(type));
      loadCles(filtre, recherche);
    } catch (err) {
      appAlert("Clé non générée", getErrorMessage(err, 'Impossible de générer la clé.'));
    } finally {
      setGenerating(false);
    }
  };

  const changerFiltre = (f: FiltreStatut) => {
    setFiltre(f);
    loadCles(f, recherche);
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.container, webColumn]} keyboardShouldPersistTaps="handled">
      {/* Mode licence */}
      <Section
        title="Mode licence"
        footer={modeActif === null ? undefined : modeActif
          ? 'Les annonceurs doivent avoir une licence valide au-delà de leurs annonces actives gratuites.'
          : 'Publication illimitée pour tous. Les licences ne sont ni exigées ni visibles.'}
      >
        {modeError ? (
          <ErrorBanner message={modeError} onRetry={loadMode} />
        ) : modeActif === null ? (
          <ActivityIndicator color={colors.primary} style={s.inlineLoader} />
        ) : (
          <View style={s.switchRow}>
            <View style={s.flex}>
              <AppText style={s.switchLabel}>Licence obligatoire</AppText>
              <StatusBadge label={modeActif ? 'Activé' : 'Désactivé'} tone={modeActif ? 'success' : 'neutral'} />
            </View>
            {savingMode ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch
                value={modeActif}
                onValueChange={handleToggleMode}
                trackColor={{ true: colors.primary }}
                accessibilityLabel="Mode licence"
              />
            )}
          </View>
        )}
      </Section>

      {/* Tarifs et contact de vente */}
      <Section
        title="Tarifs et contact"
        padded
        footer="Affichés sur l’écran « Ma licence » : l’utilisateur vous contacte, paie hors application, puis vous lui envoyez une clé."
      >
        {reglagesFeedback && <AlertBanner message={reglagesFeedback.message} variant={reglagesFeedback.variant} />}
        <Input
          label="Prix licence particulier (GNF / an)"
          placeholder="Non renseigné"
          value={prixParticulier}
          onChangeText={(t) => setPrixParticulier(chiffres(t))}
          keyboardType="numeric"
        />
        <Input
          label="Prix licence professionnel (GNF / an)"
          placeholder="Non renseigné"
          value={prixProfessionnel}
          onChangeText={(t) => setPrixProfessionnel(chiffres(t))}
          keyboardType="numeric"
        />
        <Input
          label="Téléphone / WhatsApp de vente"
          placeholder="+224 6XX XX XX XX"
          value={contactTelephone}
          onChangeText={setContactTelephone}
          keyboardType="phone-pad"
        />
        <Button title="Enregistrer" onPress={handleSaveReglages} isLoading={savingReglages} />
      </Section>

      {/* Génération de clé */}
      <Section title="Générer une clé" padded footer="Licence valable 1 an à partir de son activation par l’utilisateur.">
        <View style={s.genRow}>
          <View style={s.chipsRow}>
            {TYPES.map((t) => (
              <Chip key={t} label={TYPE_LICENCE_LABELS[t]} selected={type === t} onPress={() => setType(t)} />
            ))}
          </View>
          <Button
            title="Générer"
            size="sm"
            fullWidth={false}
            onPress={handleGenerer}
            isLoading={generating}
            leftIcon={<Ionicons name="key-outline" size={16} color={colors.white} />}
          />
        </View>
        {cle && (
          <View style={s.cleBox}>
            <AppText style={s.cleGeneree} selectable>{cle}</AppText>
            <Button
              title="Partager"
              variant="secondary"
              size="sm"
              fullWidth={false}
              leftIcon={<Ionicons name="share-outline" size={16} color={colors.primary} />}
              onPress={() => partagerCle(cle)}
            />
          </View>
        )}
      </Section>

      {/* Liste des clés */}
      <Section title={`Clés (${totalItems})`}>
        <View style={s.clesTools}>
          <SearchField
            value={recherche}
            onChangeText={setRecherche}
            onSubmitEditing={() => loadCles(filtre, recherche)}
            placeholder="Clé ou email, puis Entrée"
            accessibilityLabel="Rechercher une clé ou un email"
          />
          <FilterBar options={FILTRES} value={filtre} onChange={changerFiltre} />
        </View>
        {clesError ? (
          <ErrorBanner message={clesError} onRetry={() => loadCles(filtre, recherche)} />
        ) : cles.length === 0 && !loadingCles ? (
          <AppText style={s.vide}>Aucune clé.</AppText>
        ) : (
          cles.map((c, i) => (
            <View key={c.id}>
              {i > 0 && <RowSeparator inset={spacing.base} />}
              <CleRow item={c} />
            </View>
          ))
        )}
        {loadingCles ? (
          <ActivityIndicator color={colors.primary} style={s.inlineLoader} />
        ) : page + 1 < totalPages ? (
          <Button title="Charger plus" variant="ghost" size="sm" onPress={() => loadCles(filtre, recherche, page + 1)} />
        ) : null}
      </Section>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: spacing['4xl'] },
  flex: { flex: 1, gap: 4 },
  inlineLoader: { marginVertical: spacing.base },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  switchLabel: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary },
  genRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cleBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.md,
  },
  cleGeneree: { flex: 1, fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary, letterSpacing: 1 },
  clesTools: {
    gap: spacing.sm, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  cleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  cleBody: { flex: 1, gap: 2 },
  cleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  cleTexte: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.5 },
  cleMeta: { fontSize: typography.sizes.xs, color: colors.textMuted },
  vide: { fontSize: typography.sizes.sm, color: colors.textMuted, padding: spacing.base },
});
