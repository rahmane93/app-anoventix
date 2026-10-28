import type { ComponentRef } from 'react';
import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { nunito } from './AppText';

/**
 * TextInput à la police de l'app (Nunito) : sans cela, la saisie s'affiche
 * dans la police système alors que tout le reste de l'interface est en Nunito.
 */
const AppTextInput = forwardRef<ComponentRef<typeof TextInput>, TextInputProps>(({ style, ...props }, ref) => {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, fontFamily, ...rest } = flat;
  return (
    <TextInput
      ref={ref}
      style={[rest, { fontFamily: fontFamily ?? nunito(fontWeight).fontFamily }]}
      {...props}
    />
  );
});

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
