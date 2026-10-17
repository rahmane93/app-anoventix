import { StyleSheet, View } from 'react-native';
import { colors } from '@/src/theme';
import AppText from './AppText';

/**
 * Libellé de marque « AnoventiX » — rendu unique et cohérent dans toute l'app :
 * « Anovent » en couleur primaire + « iX » en couleur accent.
 * La taille est ajustable selon le contexte (header, écran de connexion…).
 */
export default function BrandText({ size = 30 }: { size?: number }) {
  return (
    <View style={s.row}>
      <AppText style={[s.base, { fontSize: size, color: colors.primary }]}>Anovent</AppText>
      <AppText style={[s.base, { fontSize: size, color: colors.accent }]}>iX</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  base: { fontWeight: '800', letterSpacing: -0.5 },
});
