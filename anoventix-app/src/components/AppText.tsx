import { createContext, useContext } from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { typography } from '@/src/theme';

// Nunito est chargée en 5 fichiers distincts (une famille par graisse).
// Avec une police personnalisée, `fontWeight` ne sélectionne pas le bon
// fichier : le gras est simulé (iOS) ou ignoré (Android). On traduit donc
// la graisse demandée en famille Nunito correspondante.
const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': typography.fonts.regular,
  '200': typography.fonts.regular,
  '300': typography.fonts.regular,
  '400': typography.fonts.regular,
  normal: typography.fonts.regular,
  '500': typography.fonts.medium,
  '600': typography.fonts.semibold,
  '700': typography.fonts.bold,
  bold: typography.fonts.bold,
  '800': typography.fonts.extrabold,
  '900': typography.fonts.extrabold,
};

/** Style de police Nunito correspondant à une graisse (utilisable hors AppText, ex. TextInput). */
export function nunito(weight?: TextStyle['fontWeight']): TextStyle {
  return { fontFamily: FAMILY_BY_WEIGHT[String(weight ?? '400')] ?? typography.fonts.regular };
}

// Famille du AppText parent : un AppText imbriqué sans graisse propre en hérite
// (ex. « 12 résultats pour <AppText couleur>« villa »</AppText> » reste en gras).
const ParentFamily = createContext<string | null>(null);

export default function AppText({ style, ...props }: TextProps) {
  const parentFamily = useContext(ParentFamily);
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, fontFamily, ...rest } = flat;
  const family =
    fontFamily ??
    (fontWeight != null ? nunito(fontWeight).fontFamily! : parentFamily ?? typography.fonts.regular);
  return (
    <ParentFamily.Provider value={family}>
      <Text style={[rest, { fontFamily: family }]} {...props} />
    </ParentFamily.Provider>
  );
}
