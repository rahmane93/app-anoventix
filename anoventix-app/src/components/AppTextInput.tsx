import type { ComponentRef } from 'react';
import { forwardRef } from 'react';
import { KeyboardTypeOptions, StyleSheet, TextInput, TextInputProps } from 'react-native';
import { nunito } from './AppText';

/**
 * Caractères refusés selon le clavier : un clavier numérique ne suffit pas
 * (collage, clavier physique, web), la saisie est donc filtrée aussi.
 * `phone-pad` n'est pas filtré : il accepte déjà +, *, # et les séparateurs.
 */
const FORBIDDEN_CHARS: Partial<Record<KeyboardTypeOptions, RegExp>> = {
  'number-pad': /\D/g,
  numeric: /[^\d\s.,]/g,
  'decimal-pad': /[^\d\s.,]/g,
  'numbers-and-punctuation': /[^\d\s.,/:+-]/g,
};

/**
 * TextInput à la police de l'app (Nunito) : sans cela, la saisie s'affiche
 * dans la police système alors que tout le reste de l'interface est en Nunito.
 */
const AppTextInput = forwardRef<ComponentRef<typeof TextInput>, TextInputProps>(({ style, onChangeText, keyboardType, ...props }, ref) => {
  const forbidden = keyboardType ? FORBIDDEN_CHARS[keyboardType] : undefined;
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, fontFamily, ...rest } = flat;
  return (
    <TextInput
      ref={ref}
      style={[rest, { fontFamily: fontFamily ?? nunito(fontWeight).fontFamily }]}
      keyboardType={keyboardType}
      onChangeText={onChangeText && forbidden ? (text) => onChangeText(text.replace(forbidden, '')) : onChangeText}
      {...props}
    />
  );
});

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
