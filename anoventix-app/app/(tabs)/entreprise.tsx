import { Image } from 'expo-image';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { EntrepriseFormFields } from '@/src/features/entreprise/EntrepriseFormFields';
import { MiniAnnonceCard } from '@/src/features/entreprise/MiniAnnonceCard';
import { AgentCard, InfoRow, SectionLabel } from '@/src/features/entreprise/parts';
import { styles } from '@/src/features/entreprise/styles';
import { useEntreprise } from '@/src/features/entreprise/useEntreprise';
import { LIST_PERF_PROPS } from '@/src/constants/list';
import { useBreakpoint, useCardGrid, webColumnStyle } from '@/src/lib/responsive';
import { colors, layout, spacing } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    type ViewStyle,
} from 'react-native';
import AppText from '@/src/components/AppText';

// ─── Écran principal ──────────────────────────────────────────────────────────
// Logique extraite dans useEntreprise ; cet écran ne fait que rendre.
// Mobile et web < 1200 : une colonne (FlatList, grille d'annonces virtualisée).
// Web ≥ 1200 : fiche + agents à gauche, annonces à droite.

export default function EntrepriseScreen() {
  const { isDesktop, isWide } = useBreakpoint();
  // Largeur alignée sur le titre de page (app/(tabs)/_layout) : detail / form.
  const grid = useCardGrid(240, 4, isWide ? 'detail' : 'form');
  const navigation = useNavigation();
  const {
    entreprise,
    annonces,
    isLoading,
    isSaving,
    error,
    successMsg,
    editOpen,
    setEditOpen,
    inviteOpen,
    setInviteOpen,
    agentFormMessage,
    setAgentFormMessage,
    agentsFeedback,
    removingAgentId,
    togglingAgentId,
    annonceReferenceFilter,
    setAnnonceReferenceFilter,
    isRefreshing,
    onRefresh,
    canManageEntreprise,
    isAgentProfessionnel,
    canAccessEntreprise,
    canViewAgents,
    canToggleAgents,
    entrepriseForm,
    agentForm,
    handleUploadPhoto,
    handleDeleteEntreprise,
    filteredAnnonces,
    onSubmitEntreprise,
    onSubmitAgent,
    handleRemoveAgent,
    handleToggleAgentStatus,
  } = useEntreprise();

  const toggleEdit = () => {
    if (!entreprise) return;
    entrepriseForm.reset({
      nom: entreprise.nom,
      description: entreprise.description ?? '',
      telephone: entreprise.telephone ?? '',
      email: entreprise.email ?? '',
      adresse: entreprise.adresse ?? '',
      pays: entreprise.pays ?? '',
      numeroRCCM: entreprise.numeroRCCM ?? '',
    });
    setEditOpen((v) => !v);
  };

  // Web desktop : actions de la fiche dans le titre de page (« Mon entreprise »).
  useEffect(() => {
    navigation.setOptions({
      headerRight: isDesktop && entreprise
        ? () => (
          <>
            <Button
              title="Voir la page publique"
              variant="outline"
              size="sm"
              fullWidth={false}
              leftIcon={<Ionicons name="open-outline" size={16} color={colors.primary} />}
              onPress={() => router.push(`/entreprise-publique/${entreprise.id}` as any)}
            />
            {canManageEntreprise ? (
              <Button
                title={editOpen ? 'Fermer' : 'Modifier'}
                size="sm"
                fullWidth={false}
                leftIcon={<Ionicons name={editOpen ? 'close-outline' : 'pencil-outline'} size={16} color={colors.white} />}
                onPress={toggleEdit}
                accessibilityState={{ expanded: editOpen }}
              />
            ) : null}
          </>
        )
        : undefined,
    });
    // toggleEdit ne lit que entreprise (déjà en dépendance) et des setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, isDesktop, entreprise, canManageEntreprise, editOpen]);

  // Premier chargement uniquement : un refetch ne doit pas masquer le contenu.
  if (isLoading && !entreprise) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText style={styles.loadingText}>Chargement…</AppText>
      </View>
    );
  }

  // ── Blocs de l'écran ──────────────────────────────────────────────────────

  const banners = (
    <>
      {successMsg && <AlertBanner message={successMsg} variant="success" />}
      {error && <AlertBanner message={error} variant="error" />}
    </>
  );

  // Pas encore d'entreprise : création, ou message selon le rôle.
  const sansEntreprise = !entreprise ? (
    <View style={[styles.headerStack, isDesktop && local.formBlock]}>
      {canManageEntreprise && (
        <>
          <View style={styles.emptyHeader}>
            <View style={styles.emptyIcon}>
              <Ionicons name="business" size={36} color={colors.primary} />
            </View>
            <AppText style={styles.emptyTitle}>Créez votre entreprise</AppText>
            <AppText style={styles.emptySubtitle}>
              Renseignez les informations de votre agence immobilière pour commencer à publier des annonces.
            </AppText>
          </View>

          <SectionLabel title="Informations de l'entreprise" />
          <View style={styles.card}>
            <EntrepriseFormFields form={entrepriseForm} />
            <Button
              title="Créer mon entreprise"
              onPress={entrepriseForm.handleSubmit(onSubmitEntreprise)}
              isLoading={isSaving}
              style={styles.btnTop}
            />
          </View>
        </>
      )}

      {isAgentProfessionnel && (
        <View style={styles.card}>
          <AppText style={styles.emptyInfo}>
            Aucune entreprise rattachée à votre compte pour le moment.
          </AppText>
        </View>
      )}

      {!canAccessEntreprise && (
        <View style={styles.card}>
          <AppText style={styles.emptyInfo}>
            Impossible d'afficher les informations de l'entreprise pour ce compte.
          </AppText>
        </View>
      )}
    </View>
  ) : null;

  const fiche = entreprise ? (
    <View style={styles.entrepriseHeader}>
      <View style={styles.entrepriseHeaderTop}>
        <TouchableOpacity
          onPress={canManageEntreprise ? handleUploadPhoto : undefined}
          activeOpacity={canManageEntreprise ? 0.75 : 1}
          style={styles.entreprisePhotoWrap}
          accessibilityRole={canManageEntreprise ? 'button' : 'image'}
          accessibilityLabel={canManageEntreprise ? "Modifier la photo de l'entreprise" : "Photo de l'entreprise"}
        >
          {entreprise.photoUrl ? (
            <Image source={{ uri: entreprise.photoUrl }} style={styles.entreprisePhoto} />
          ) : (
            <View style={styles.entrepriseIcon}>
              <Ionicons name="business" size={30} color={colors.primary} />
            </View>
          )}
          {canManageEntreprise && (
            <View style={styles.entreprisePhotoOverlay}>
              <Ionicons name="camera-outline" size={14} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={styles.entrepriseNom}>{entreprise.nom}</AppText>
          {entreprise.proprietaireUsername ? (
            <AppText style={styles.entrepriseProp}>{entreprise.proprietaireUsername}</AppText>
          ) : null}
        </View>
        {/* Desktop : « Modifier » est dans le titre de page. */}
        {canManageEntreprise && !isDesktop ? (
          <TouchableOpacity
            onPress={toggleEdit}
            style={styles.editBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={editOpen ? 'Fermer le formulaire' : "Modifier l'entreprise"}
            accessibilityState={{ expanded: editOpen }}
          >
            <Ionicons
              name={editOpen ? 'close-outline' : 'pencil-outline'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {entreprise.description ? (
        <AppText style={styles.entrepriseDescription}>{entreprise.description}</AppText>
      ) : null}

      {(entreprise.telephone || entreprise.email || entreprise.adresse || entreprise.pays || entreprise.numeroRCCM) ? (
        <View style={styles.entrepriseInfoList}>
          <InfoRow icon="call-outline" label="Téléphone" value={entreprise.telephone} />
          <InfoRow icon="mail-outline" label="Email" value={entreprise.email} />
          <InfoRow icon="location-outline" label="Adresse" value={entreprise.adresse} />
          <InfoRow icon="flag-outline" label="Pays" value={entreprise.pays} />
          <InfoRow icon="document-text-outline" label="N° RCCM" value={entreprise.numeroRCCM} />
        </View>
      ) : null}

      <View style={styles.entrepriseStatsRow}>
        <View style={styles.entrepriseStat}>
          <AppText style={styles.entrepriseStatValue}>{annonces.length}</AppText>
          <AppText style={styles.entrepriseStatLabel}>annonce{annonces.length !== 1 ? 's' : ''}</AppText>
        </View>
        <View style={styles.entrepriseStatDivider} />
        <View style={styles.entrepriseStat}>
          <AppText style={styles.entrepriseStatValue}>{(entreprise.agents ?? []).length}</AppText>
          <AppText style={styles.entrepriseStatLabel}>agent{(entreprise.agents ?? []).length !== 1 ? 's' : ''}</AppText>
        </View>
      </View>
    </View>
  ) : null;

  const edition = entreprise && editOpen && canManageEntreprise ? (
    <>
      <SectionLabel title="Modifier l'entreprise" />
      <View style={styles.card}>
        <EntrepriseFormFields form={entrepriseForm} />
        <Button
          title="Enregistrer les modifications"
          onPress={entrepriseForm.handleSubmit(onSubmitEntreprise)}
          isLoading={isSaving}
          style={styles.btnTop}
        />
      </View>
    </>
  ) : null;

  // Action irréversible pour le gérant : séparée de la modification, en fin d'écran.
  const zoneSensible = entreprise && canManageEntreprise ? (
    <View style={local.zoneSensible}>
      <SectionLabel title="Zone sensible" />
      <View style={[styles.card, local.zoneSensibleCard]}>
        <AppText style={local.zoneSensibleText}>
          Désactiver l'entreprise détache ses agents et ses annonces. Seul le support peut la réactiver.
        </AppText>
        <Button
          title="Désactiver l'entreprise"
          variant="dangerOutline"
          size="sm"
          fullWidth={false}
          leftIcon={<Ionicons name="power-outline" size={16} color={colors.errorText} />}
          onPress={handleDeleteEntreprise}
        />
      </View>
    </View>
  ) : null;

  const agents = entreprise && canViewAgents ? (
    <>
      <View style={styles.agentsSectionHeader}>
        <SectionLabel title={`Agents (${(entreprise.agents ?? []).length})`} />
        {canManageEntreprise ? (
          <Button
            title={inviteOpen ? 'Annuler' : 'Inviter'}
            size="sm"
            fullWidth={false}
            style={styles.inviteBtn}
            onPress={() => {
              setAgentFormMessage(null);
              setInviteOpen((v) => !v);
            }}
            accessibilityLabel={inviteOpen ? "Annuler l'invitation" : 'Inviter un agent'}
          />
        ) : null}
      </View>

      {/* ── Formulaire invitation ────────────────────────────────── */}
      {inviteOpen && canManageEntreprise && (
        <View style={styles.card}>
          <AppText style={styles.inviteNote}>
            L'agent recevra un email avec son mot de passe temporaire. Il devra le changer à sa première connexion.
          </AppText>
          <Controller
            control={agentForm.control}
            name="prenom"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Prénom *"
                placeholder="ex: Ibrahima"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={agentForm.formState.errors.prenom?.message}
                autoCapitalize="words"
              />
            )}
          />
          <Controller
            control={agentForm.control}
            name="nom"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nom *"
                placeholder="ex: Camara"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={agentForm.formState.errors.nom?.message}
                autoCapitalize="words"
              />
            )}
          />
          <Controller
            control={agentForm.control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email *"
                placeholder="ex: i.camara@agence.com"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={agentForm.formState.errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={agentForm.control}
            name="telephone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Téléphone *"
                placeholder="+224 621 000 000"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={agentForm.formState.errors.telephone?.message}
                keyboardType="phone-pad"
              />
            )}
          />
          <Button
            title="Envoyer l'invitation"
            onPress={agentForm.handleSubmit(onSubmitAgent)}
            isLoading={isSaving}
            style={styles.btnTop}
          />
          {agentFormMessage && (
            <View style={{ marginTop: spacing.sm }}>
              <AlertBanner
                message={agentFormMessage.text}
                variant={agentFormMessage.type}
              />
            </View>
          )}
        </View>
      )}

      {agentsFeedback && (
        <View style={{ marginBottom: spacing.sm }}>
          <AlertBanner message={agentsFeedback.text} variant={agentsFeedback.type} />
        </View>
      )}

      {/* ── Liste des agents ─────────────────────────────────────── */}
      {(entreprise.agents ?? []).length === 0 && !inviteOpen ? (
        <View style={styles.emptyAgents}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <AppText style={styles.emptyAgentsText}>
            {canManageEntreprise
              ? `Aucun agent pour le moment.${'\n'}Invitez votre premier collaborateur !`
              : 'Aucun agent rattaché à cette entreprise pour le moment.'}
          </AppText>
        </View>
      ) : (
        <View style={styles.agentsList}>
          {(entreprise.agents ?? []).map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onToggleStatus={() => handleToggleAgentStatus(agent)}
              onRemove={() => handleRemoveAgent(agent)}
              isToggling={togglingAgentId === agent.id}
              isRemoving={removingAgentId === agent.id}
              canToggle={canToggleAgents}
              canRemove={canManageEntreprise}
            />
          ))}
        </View>
      )}
    </>
  ) : null;

  const annoncesToolbar = entreprise ? (
    <>
      <View style={[styles.agentsSectionHeader, isWide && local.firstSectionHeader]}>
        <SectionLabel title={`Annonces (${annonces.length})`} />
        {/* Desktop : « Publier une annonce » est déjà dans la barre du haut. */}
        {!isDesktop ? (
          <Button
            title="Publier"
            size="sm"
            fullWidth={false}
            style={styles.inviteBtn}
            leftIcon={<Ionicons name="add-outline" size={18} color={colors.white} />}
            onPress={() => router.push('/(tabs)/publier')}
            accessibilityLabel="Publier une annonce"
          />
        ) : null}
      </View>

      <Input
        placeholder="Filtrer par référence ou titre…"
        accessibilityLabel="Filtrer les annonces par référence ou titre"
        leftIcon={<Ionicons name="search-outline" size={16} color={colors.textMuted} />}
        value={annonceReferenceFilter}
        onChangeText={setAnnonceReferenceFilter}
      />
    </>
  ) : null;

  const annoncesVides = entreprise ? (
    <View style={styles.emptyAgents}>
      <Ionicons name="home-outline" size={40} color={colors.textMuted} />
      <AppText style={styles.emptyAgentsText}>
        {annonces.length === 0
          ? 'Aucune annonce liée à cette entreprise.'
          : 'Aucune annonce ne correspond à cette recherche.'}
      </AppText>
    </View>
  ) : null;

  // ── Web ≥ 1200 : deux colonnes ────────────────────────────────────────────
  if (isWide && entreprise) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[webColumnStyle('detail'), local.wideContent]}
        keyboardShouldPersistTaps="handled"
      >
        {banners}
        <View style={local.cols}>
          <View style={local.colSide}>
            {fiche}
            {edition}
            {agents}
            {zoneSensible}
          </View>
          <View style={local.colMain}>
            {annoncesToolbar}
            {filteredAnnonces.length === 0 ? annoncesVides : (
              <View style={local.annoncesGrid}>
                {filteredAnnonces.map((item) => (
                  <View key={item.id} style={local.annonceCell}>
                    <MiniAnnonceCard item={item} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Mobile et web < 1200 : une colonne ────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    {/* FlatList (et non ScrollView + map) : la grille d'annonces est virtualisée ;
        tout le reste de l'écran est rendu en en-tête de liste. */}
    <FlatList
      {...LIST_PERF_PROPS}
      data={entreprise ? filteredAnnonces : []}
      keyExtractor={(a) => String(a.id)}
      key={grid.key}
      numColumns={2}
      columnWrapperStyle={styles.annoncesRow}
      {...grid.listProps}
      renderItem={({ item }) => grid.wrap(<MiniAnnonceCard item={item} />)}
      style={styles.scroll}
      contentContainerStyle={[styles.content, grid.contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        entreprise ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      ListHeaderComponent={
        <View style={styles.headerStack}>
          {banners}
          {sansEntreprise}
          {fiche}
          {edition}
          {agents}
          {annoncesToolbar}
        </View>
      }
      ListEmptyComponent={annoncesVides}
      ListFooterComponent={
        <View style={local.footer}>
          {zoneSensible}
        </View>
      }
    />
    </KeyboardAvoidingView>
  );
}

const GRID_GAP = spacing.base;

const local = StyleSheet.create({
  footer: { paddingTop: spacing.sm, paddingBottom: spacing['2xl'] },
  zoneSensible: { marginTop: spacing.base },
  zoneSensibleCard: {
    gap: spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.errorLight,
  },
  zoneSensibleText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  // Création d'entreprise sur desktop : largeur de formulaire, alignée à gauche
  // sous le titre de page.
  formBlock: { width: '100%', maxWidth: layout.maxWidth.form },
  wideContent: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing['4xl'],
    gap: spacing.sm,
  },
  cols: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2xl'] },
  colSide: { width: 400, flexShrink: 0, gap: spacing.sm },
  colMain: { flex: 1, minWidth: 0, gap: spacing.sm },
  // La fiche (colonne gauche) n'a pas d'intertitre : on aligne « Annonces » sur son haut.
  firstSectionHeader: { marginTop: spacing.sm },
  annoncesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: spacing.xs },
  annonceCell: {
    width: `calc((100% - ${GRID_GAP * 2}px) / 3)`,
  } as unknown as ViewStyle,
});
