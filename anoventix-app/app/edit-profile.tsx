import { webColumnStyle } from '@/src/lib/responsive';
import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Input } from '@/src/components/ui/input';
import { useUserStore } from '@/src/stores/user.store';
import { colors, radius, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,


    Platform,


    ScrollView,


    StyleSheet,


    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { Button } from '@/src/components/ui/button';
import { useShallow } from 'zustand/react/shallow';

export default function EditProfileScreen() {
  const { profile, isSaving, error, fetchProfile, updateProfile, clearError } = useUserStore(useShallow((s) => ({ profile: s.profile, isSaving: s.isSaving, error: s.error, fetchProfile: s.fetchProfile, updateProfile: s.updateProfile, clearError: s.clearError })));

  const [nom, setNom] = useState(profile?.nom ?? '');
  const [prenom, setPrenom] = useState(profile?.prenom ?? '');
  const [telephone, setTelephone] = useState(profile?.telephone ?? '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profil (re)chargé : les champs reprennent ses valeurs. Mise à jour pendant
  // le rendu plutôt que dans un effet (pas de rendu intermédiaire).
  const [profilRecopie, setProfilRecopie] = useState(profile);
  if (profile !== profilRecopie) {
    setProfilRecopie(profile);
    if (profile) {
      setNom(profile.nom ?? '');
      setPrenom(profile.prenom ?? '');
      setTelephone(profile.telephone ?? '');
    }
  }

  const handleSave = async () => {
    clearError();
    setSuccessMsg(null);
    try {
      await updateProfile({
        nom: nameIsLocked ? undefined : (nom.trim() || undefined),
        prenom: nameIsLocked ? undefined : (prenom.trim() || undefined),
        telephone: telephone.trim() || undefined,
      });
      await fetchProfile();
      setSuccessMsg('Profil mis à jour avec succès !');
    } catch {
      // erreur gérée dans le store
    }
  };

  const nameIsLocked =
    !!profile?.nom && !!profile?.prenom && profile?.statutPieceIdentite === 'VALIDEE';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, webColumnStyle('form')]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Banners ─────────────────────────────────────────────────── */}
      {(error || successMsg) && (
        <View style={styles.bannerArea}>
          {error ? <AlertBanner message={error} variant="error" /> : null}
          {successMsg ? <AlertBanner message={successMsg} variant="success" /> : null}
        </View>
      )}

      {/* ── Formulaire ──────────────────────────────────────────────── */}
      {nameIsLocked && (
        <>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <View style={styles.infoTextWrap}>
                <AppText style={styles.infoLabel}>Prénom</AppText>
                <AppText style={styles.infoValue}>{profile?.prenom}</AppText>
              </View>
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <View style={styles.infoTextWrap}>
                <AppText style={styles.infoLabel}>Nom</AppText>
                <AppText style={styles.infoValue}>{profile?.nom}</AppText>
              </View>
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
              </View>
            </View>
          </View>
          <AppText style={styles.infoNote}>
            Le nom et prénom ne peuvent plus être modifiés après validation de votre pièce d'identité.
          </AppText>
        </>
      )}
      <View style={styles.formCard}>
        {!nameIsLocked && (
          <>
            <Input
              label="Prénom"
              placeholder="Votre prénom"
              value={prenom}
              onChangeText={setPrenom}
              autoCapitalize="words"
            />
            <Input
              label="Nom"
              placeholder="Votre nom"
              value={nom}
              onChangeText={setNom}
              autoCapitalize="words"
            />
          </>
        )}
        <Input
          label="Téléphone"
          placeholder="+224 6 00 00 00 00"
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
        />
      </View>

      {/* ── Infos non modifiables ────────────────────────────────────── */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
          <View style={styles.infoTextWrap}>
            <AppText style={styles.infoLabel}>Adresse e-mail</AppText>
            <AppText style={styles.infoValue}>{profile?.email ?? '—'}</AppText>
          </View>
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
          </View>
        </View>
      </View>
      <AppText style={styles.infoNote}>
        L'adresse e-mail ne peut pas être modifiée.
      </AppText>

      {/* ── Bouton Enregistrer ───────────────────────────────────────── */}
      <Button
        title="Enregistrer les modifications"
        style={styles.saveBtn}
        onPress={handleSave}
        isLoading={isSaving}
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  bannerArea: {
    marginBottom: spacing.base,
    gap: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: spacing.base,
  },
  infoCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  lockBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoNote: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  saveBtn: {},
});
