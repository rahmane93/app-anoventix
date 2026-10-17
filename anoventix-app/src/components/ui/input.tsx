import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '../AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { colors, radius, spacing, typography } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Affiche un bouton œil pour les champs mot de passe */
  isPassword?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      isPassword = false,
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const hasError = Boolean(error);
    const secureText = isPassword ? !isVisible : false;

    return (
      <View style={styles.wrapper}>
        {label && <AppText style={styles.label}>{label}</AppText>}

        <View
          style={[
            styles.container,
            isFocused && styles.containerFocused,
            hasError && styles.containerError,
          ]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

          <AppTextInput
            ref={ref}
            style={[styles.input, leftIcon ? styles.inputWithLeftIcon : null, style]}
            placeholderTextColor={colors.placeholder}
            // Le lecteur d'écran annonce l'erreur avec le champ concerné.
            accessibilityLabel={hasError && label ? `${label}, erreur : ${error}` : label}
            secureTextEntry={secureText}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            autoCapitalize="none"
            {...props}
          />

          {isPassword ? (
            <TouchableOpacity
              style={styles.iconRight}
              onPress={() => setIsVisible((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              <Ionicons
                name={isVisible ? 'eye-off' : 'eye'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            rightIcon && <View style={styles.iconRight}>{rightIcon}</View>
          )}
        </View>

        {hasError && <AppText style={styles.errorText}>{error}</AppText>}
      </View>
    );
  },
);

Input.displayName = 'Input';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 54,
    elevation: 0,
  },
  containerFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.white,
  },
  containerError: {
    borderColor: colors.error,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontWeight: typography.weights.regular,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  iconLeft: {
    paddingLeft: spacing.base,
  },
  iconRight: {
    paddingRight: spacing.base,
    paddingLeft: spacing.xs,
  },

  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.errorText,
    marginTop: spacing.xs,
    fontWeight: typography.weights.medium,
  },
});
