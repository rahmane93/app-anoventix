import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { PasswordChecklist } from '@/src/components/ui/password-checklist';
import { SignupFormData, signupSchema } from '@/src/lib/validation';
import { useAuthStore } from '@/src/stores/auth.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { LEGAL_LINKS } from '@/src/constants/legal';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/src/components/ui/icon-button';
import { useShallow } from 'zustand/react/shallow';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type RoleOption = { value: 'PARTICULIER' | 'PROFESSIONNEL'; label: string; description: string; icon: IoniconsName };

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'PARTICULIER',   label: 'Particulier',    description: 'Acheteur ou vendeur individuel', icon: 'person-outline' },
  { value: 'PROFESSIONNEL', label: 'Professionnel',  description: 'Agent immobilier ou agence',     icon: 'business-outline' },
];

export default function RegisterScreen() {
  const { signup } = useAuthStore(useShallow((s) => ({ signup: s.signup })));
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { nom: '', prenom: '', email: '', telephone: '+224 ', password: '', confirmPassword: '', role: 'PARTICULIER', acceptCgu: false },
  });

  const onSubmit = async (data: SignupFormData) => {
    setApiError(null);
    setIsLoading(true);
    try {
      await signup({ nom: data.nom, prenom: data.prenom, email: data.email, telephone: data.telephone || undefined, password: data.password, role: data.role, acceptCgu: data.acceptCgu });
      setRegisteredEmail(data.email);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setApiError(error?.message ?? "Inscription impossible pour le moment. Vérifiez votre connexion puis réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Écran de confirmation email ───────────────────────────────────────────────
  if (registeredEmail) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successWrap}>
          <View style={s.successCard}>
            <View style={s.successIconWrap}>
              <Ionicons name="mail-outline" size={36} color={colors.primary} />
            </View>
            <AppText style={s.successTitle}>Vérifiez votre email</AppText>
            <AppText style={s.successBody}>
              Un lien d'activation a été envoyé à{'\n'}
              <AppText style={s.successEmail}>{registeredEmail}</AppText>
            </AppText>
            <AppText style={s.successHint}>
              Cliquez sur le lien dans l'email pour activer votre compte. Il expire dans 24 heures.
            </AppText>
            <Button title="Aller à la connexion" onPress={() => router.replace('/(auth)/login')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Navbar fixe hors du scroll */}
        <View style={s.navbar}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}
            accessibilityLabel="Retour"
          />
          <AppText style={s.navTitle}>Créer un compte</AppText>
          <View style={s.navSpacer} />
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Sous-titre */}
          <AppText style={s.subtitle}>Rejoignez AnoventiX et publiez vos annonces</AppText>

          {/* Formulaire */}
          <View style={s.form}>
            {apiError && <AlertBanner message={apiError} variant="error" />}

            {/* Type de compte en premier : il conditionne la suite du parcours
                (un professionnel devra créer son entreprise avant de publier). */}
            <View style={[s.roleSection, s.roleSectionFirst]}>
              <AppText style={s.roleLabel}>Type de compte</AppText>
              {errors.role && <AppText style={s.fieldError}>{errors.role.message}</AppText>}
              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <View style={s.roleRow}>
                    {ROLE_OPTIONS.map((opt) => {
                      const active = value === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[s.roleCard, active && s.roleCardActive]}
                          onPress={() => onChange(opt.value)}
                          activeOpacity={0.75}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                          accessibilityLabel={`${opt.label} : ${opt.description}`}
                        >
                          <View style={[s.roleIconWrap, active && s.roleIconWrapActive]}>
                            <Ionicons name={opt.icon} size={20} color={active ? colors.white : colors.textMuted} />
                          </View>
                          <AppText style={[s.roleCardTitle, active && s.roleCardTitleActive]}>{opt.label}</AppText>
                          <AppText style={s.roleCardDesc}>{opt.description}</AppText>
                          {active && (
                            <View style={s.roleCheck}>
                              <Ionicons name="checkmark" size={12} color={colors.white} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
            </View>

            {/* Prénom + Nom côte à côte */}
            <View style={s.row}>
              <View style={s.rowItem}>
                <Controller
                  control={control}
                  name="prenom"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Prénom"
                      placeholder="Houleymatou"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.prenom?.message}
                      autoComplete="given-name"
                    />
                  )}
                />
              </View>
              <View style={s.rowItem}>
                <Controller
                  control={control}
                  name="nom"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Nom"
                      placeholder="Diallo"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.nom?.message}
                      autoComplete="family-name"
                    />
                  )}
                />
              </View>
            </View>

            {/* Email */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Adresse email"
                  placeholder="houleymatou.diallo@gmail.com"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoComplete="email"
                />
              )}
            />

            {/* Téléphone (optionnel) : sert aussi d'identifiant de connexion */}
            <Controller
              control={control}
              name="telephone"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                <Input
                  label="Téléphone (recommandé)"
                  placeholder="+224 6XX XX XX XX"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.telephone?.message}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
                {!errors.telephone && (
                  <AppText style={s.fieldHint}>
                    Sans numéro, les acheteurs ne pourront pas vous joindre par WhatsApp ou par appel.
                  </AppText>
                )}
                </>
              )}
            />

            {/* Mot de passe */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                <Input
                  label="Mot de passe"
                  placeholder="Votre mot de passe"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                  isPassword
                  autoComplete="password-new"
                />
                <PasswordChecklist value={value} />
                </>
              )}
            />

            {/* Confirmation */}
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirmer le mot de passe"
                  placeholder="Répétez votre mot de passe"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.confirmPassword?.message}
                  isPassword
                  autoComplete="password-new"
                />
              )}
            />

            {/* Consentement CGU / confidentialité (obligatoire) */}
            <Controller
              control={control}
              name="acceptCgu"
              render={({ field: { onChange, value } }) => (
                <View style={s.cguWrap}>
                  <TouchableOpacity
                    style={s.cguRow}
                    onPress={() => onChange(!value)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: value }}
                    accessibilityLabel="J'accepte les conditions d'utilisation et la politique de confidentialité"
                  >
                    <View style={[s.checkbox, value && s.checkboxOn, !!errors.acceptCgu && s.checkboxError]}>
                      {value && <Ionicons name="checkmark" size={14} color={colors.white} />}
                    </View>
                    <AppText style={s.cguText}>
                      J’accepte les{' '}
                      <AppText style={s.cguLink} onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.cgu)}>
                        conditions d’utilisation
                      </AppText>
                      {' '}et la{' '}
                      <AppText style={s.cguLink} onPress={() => WebBrowser.openBrowserAsync(LEGAL_LINKS.confidentialite)}>
                        politique de confidentialité
                      </AppText>
                      .
                    </AppText>
                  </TouchableOpacity>
                  {errors.acceptCgu && <AppText style={s.fieldError}>{errors.acceptCgu.message}</AppText>}
                </View>
              )}
            />

            <Button title="Créer mon compte" onPress={() => handleSubmit(onSubmit)()} isLoading={isLoading} />
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <AppText style={s.footerText}>Déjà un compte ? </AppText>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <AppText style={s.footerLink}>Se connecter</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  navSpacer: { width: 40 }, // équilibre l'IconButton retour
  navTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Form
  form: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },

  // Role
  roleSection: { paddingTop: spacing.xs },
  roleSectionFirst: { paddingTop: 0, marginBottom: spacing.md },
  roleLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  fieldHint: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.sm },
  fieldError: { fontSize: typography.sizes.xs, color: colors.errorText, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
    position: 'relative',
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconWrapActive: { backgroundColor: colors.primary },
  roleCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  roleCardTitleActive: { color: colors.primary },
  roleCardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  roleCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CGU
  cguWrap: { marginTop: spacing.md, marginBottom: spacing.sm },
  cguRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxError: { borderColor: colors.error },
  cguText: { flex: 1, fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20 },
  cguLink: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { fontSize: typography.sizes.md, color: colors.textSecondary },
  footerLink: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: '700' },

  // Success
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
    backgroundColor: colors.background,
  },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    width: '100%',
    ...shadows.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  successBody: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  successEmail: {
    fontWeight: '700',
    color: colors.primary,
  },
  successHint: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
