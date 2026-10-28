import { Input } from '@/src/components/ui/input';
import type { EntrepriseFormData } from '@/src/lib/validation';
import { Controller, type useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import AppText from '@/src/components/AppText';
import { colors, spacing, typography } from '@/src/theme';

// Même limite que entrepriseSchema.description.
const DESCRIPTION_MAX = 200;

// Sous-formulaire réutilisable (création + édition entreprise).
export function EntrepriseFormFields({ form }: { form: ReturnType<typeof useForm<EntrepriseFormData>> }) {
  const { control, formState: { errors } } = form;
  return (
    <>
      <Controller
        control={control}
        name="nom"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Nom de l'entreprise *"
            placeholder="ex: Immo Guinée SARL"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.nom?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
          <Input
            label="Description *"
            placeholder="Présentation de votre agence…"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.description?.message}
            multiline
            numberOfLines={3}
            maxLength={DESCRIPTION_MAX}
          />
          <AppText style={styles.counter}>{(value ?? '').length}/{DESCRIPTION_MAX}</AppText>
          </>
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email professionnel *"
            placeholder="contact@agence.com"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />
      <Controller
        control={control}
        name="telephone"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Téléphone *"
            placeholder="+224 620 000 000"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.telephone?.message}
            keyboardType="phone-pad"
          />
        )}
      />
      <Controller
        control={control}
        name="adresse"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Adresse *"
            placeholder="ex: Kipé, Ratoma, Conakry"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.adresse?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="numeroRCCM"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Numéro RCCM *"
            placeholder="ex: RC-GN-2024-001"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.numeroRCCM?.message}
            autoCapitalize="characters"
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  counter: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
});
