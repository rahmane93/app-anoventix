import {
    adminAffecterAcheteur,
    adminGetModeLicence,
    adminGetReglagesLicence,
    adminListerCles,
    adminSetModeLicence,
    adminSetReglagesLicence,
    adminVendreCle,
    type ModeLicence,
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
    MOYEN_PAIEMENT_LABELS,
    STATUT_CLE_LABELS,
    TYPE_LICENCE_LABELS,
    type LicenceAdmin,
    type MoyenPaiement,
    type StatutCleLicence,
} from '@/src/types/licence.types';
import { formatDate, getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';

const MOYENS = Object.keys(MOYEN_PAIEMENT_LABELS) as MoyenPaiement[];

type FiltreStatut = StatutCleLicence | 'TOUTES';
const FILTRES: { key: FiltreStatut; label: string }[] = [
  { key: 'TOUTES', label: 'Toutes' },
  { key: 'LIBRE', label: 'Libres' },
  { key: 'EN_ATTENTE', label: 'En attente' },
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

function CleRow({ item, onAffecter }: { item: LicenceAdmin; onAffecter: (item: LicenceAdmin) => void }) {
  const libreAuPorteur = item.statut === 'LIBRE' && !item.acheteurEmail;
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
        {item.acheteurEmail ? (
          <AppText style={s.cleMeta} numberOfLines={2}>
            Acheteur : {item.acheteurEmail}
            {item.montant != null ? ` · ${item.montant.toLocaleString('fr-FR')} GNF` : ''}
            {item.moyenPaiement ? ` · ${MOYEN_PAIEMENT_LABELS[item.moyenPaiement]}` : ''}
            {item.referencePaiement ? ` · réf. ${item.referencePaiement}` : ''}
            {item.generePar ? ` · par ${item.generePar}` : ''}
          </AppText>
        ) : libreAuPorteur ? (
          <AppText style={s.cleMeta}>Clé au porteur (avant la vente nominative)</AppText>
        ) : null}
        {item.statut === 'EN_ATTENTE' && (
          <AppText style={s.cleMeta}>Démarre à l’ouverture du mode licence</AppText>
        )}
        {item.dateDebut && item.dateFin && (
          <AppText style={s.cleMeta}>
            Du {formatDate(item.dateDebut)} au {formatDate(item.dateFin)}
          </AppText>
        )}
      </View>
      {libreAuPorteur && (
        <IconButton
          icon="person-add-outline"
          variant="plain"
          size={20}
          color={colors.primary}
          onPress={() => onAffecter(item)}
          accessibilityLabel={`Affecter un acheteur à la clé ${item.cle}`}
        />
      )}
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
  const [mode, setMode] = useState<ModeLicence | null>(null);
  const modeActif = mode ? mode.actif : null;
  const [modeError, setModeError] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  const [prixParticulier, setPrixParticulier] = useState('');
  const [prixProfessionnel, setPrixProfessionnel] = useState('');
  const [contactTelephone, setContactTelephone] = useState('');
  const [savingReglages, setSavingReglages] = useState(false);
  const [reglagesFeedback, setReglagesFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  // Vente d'une clé nominative (DEC-17) ; `affectation` = clé au porteur à laquelle on donne un acheteur.
  const [acheteur, setAcheteur] = useState('');
  const [montant, setMontant] = useState('');
  const [moyen, setMoyen] = useState<MoyenPaiement>('ORANGE_MONEY');
  const [reference, setReference] = useState('');
  const [affectation, setAffectation] = useState<LicenceAdmin | null>(null);
  const [cle, setCle] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [venteFeedback, setVenteFeedback] = useState<string | null>(null);

  const [filtre, setFiltre] = useState<FiltreStatut>('TOUTES');
  const [recherche, setRecherche] = useState('');
  // Période de vente (AAAA-MM-JJ) pour rapprocher les encaissements.
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [cles, setCles] = useState<LicenceAdmin[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingCles, setLoadingCles] = useState(false);
  const [clesError, setClesError] = useState<string | null>(null);

  const loadMode = async () => {
    setModeError(null);
    try {
      setMode(await adminGetModeLicence());
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
        du: /^\d{4}-\d{2}-\d{2}$/.test(du) ? du : undefined,
        au: /^\d{4}-\d{2}-\d{2}$/.test(au) ? au : undefined,
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
      setMode(await adminSetModeLicence(actif));
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
        ? "Le mode licence s'appliquera dans 30 jours. D'ici là, la publication reste libre.\n\n"
          + "Les comptes qui ont déjà plus d'annonces actives que le gratuit reçoivent un email aujourd'hui. À la date d'effet, les utilisateurs sans licence valide ne pourront plus publier, modifier ni remettre d'annonce en ligne ; leurs annonces restent visibles.\n\n"
          + 'Désactiver le mode reste immédiat.'
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

  const handleVendre = async () => {
    const montantNum = Number(montant);
    if (!acheteur.trim() || !montantNum) {
      setVenteFeedback("Renseignez l'acheteur (email ou téléphone) et le montant.");
      return;
    }
    if (moyen !== 'ESPECES' && !reference.trim()) {
      setVenteFeedback('La référence de la transaction est obligatoire (sauf en espèces).');
      return;
    }
    setVenteFeedback(null);
    setGenerating(true);
    try {
      const vente = {
        acheteur: acheteur.trim(),
        montant: montantNum,
        moyenPaiement: moyen,
        referencePaiement: reference.trim() || undefined,
      };
      if (affectation) {
        await adminAffecterAcheteur(affectation.id, vente);
        setAffectation(null);
        setCle(null);
      } else {
        setCle((await adminVendreCle(vente)).cle);
      }
      setAcheteur('');
      setMontant('');
      setReference('');
      loadCles(filtre, recherche);
    } catch (err) {
      appAlert('Vente non enregistrée', getErrorMessage(err, "La vente n'a pas pu être enregistrée."));
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
      <Section
        title={affectation ? `Affecter un acheteur à ${affectation.cle}` : 'Vendre une licence'}
        padded
        footer="La clé est nominative : seul le compte de l’acheteur peut l’activer, et il reçoit un reçu par email. Licence valable 1 an à partir de son activation."
      >
        {venteFeedback && <AlertBanner message={venteFeedback} variant="error" />}
        <Input
          label="Acheteur (email ou téléphone du compte)"
          value={acheteur}
          onChangeText={setAcheteur}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="acheteur@exemple.com"
        />
        <Input
          label="Montant payé (GNF)"
          value={montant}
          onChangeText={(t) => setMontant(chiffres(t))}
          keyboardType="numeric"
          placeholder="150000"
        />
        <AppText style={s.cleMeta}>Moyen de paiement</AppText>
        <View style={s.chipsRow}>
          {MOYENS.map((m) => (
            <Chip key={m} label={MOYEN_PAIEMENT_LABELS[m]} selected={moyen === m} onPress={() => setMoyen(m)} />
          ))}
        </View>
        <Input
          label={moyen === 'ESPECES' ? 'Référence (facultative en espèces)' : 'Référence de la transaction'}
          value={reference}
          onChangeText={setReference}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Ex. OM-2026-001"
        />
        <View style={s.genRow}>
          {affectation ? (
            <Button title="Annuler" variant="outline" size="sm" fullWidth={false} onPress={() => setAffectation(null)} />
          ) : null}
          <Button
            title={affectation ? 'Affecter' : 'Vendre'}
            size="sm"
            fullWidth={false}
            onPress={handleVendre}
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
            placeholder="Clé, email ou référence, puis Entrée"
            accessibilityLabel="Rechercher une clé, un email ou une référence de paiement"
          />
          <View style={s.periode}>
            <Input label="Vendues du" value={du} onChangeText={setDu} placeholder="AAAA-MM-JJ" onSubmitEditing={() => loadCles(filtre, recherche)} />
            <Input label="au" value={au} onChangeText={setAu} placeholder="AAAA-MM-JJ" onSubmitEditing={() => loadCles(filtre, recherche)} />
          </View>
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
              <CleRow item={c} onAffecter={(k) => { setAffectation(k); setCle(null); }} />
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
  periode: { flexDirection: 'row', gap: spacing.sm },
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
