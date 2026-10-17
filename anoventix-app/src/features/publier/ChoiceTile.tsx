import AppText from '@/src/components/AppText';
import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { s } from './styles';

/**
 * Tuile de choix du formulaire Publier (transaction, type de bien, usage,
 * documents). Sobre : icône grise au repos, couleur de la marque et coche
 * uniquement quand elle est sélectionnée.
 */
export function ChoiceTile({
  icon,
  label,
  selected,
  onPress,
  hasError,
  multiple,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  selected: boolean;
  onPress: () => void;
  hasError?: boolean;
  /** Sélection multiple (case à cocher) plutôt qu'un choix unique. */
  multiple?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.tile, selected && s.tileActive, hasError && !selected && s.chipError]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={label}
      accessibilityState={multiple ? { checked: selected } : { selected }}
    >
      {selected && (
        <View style={s.tileCheck}>
          <Ionicons name="checkmark" size={10} color={colors.white} />
        </View>
      )}
      <View style={[s.tileIconWrap, selected && s.tileIconWrapActive]}>
        <Ionicons name={icon} size={22} color={selected ? colors.primary : colors.textSecondary} />
      </View>
      <AppText style={[s.tileLabel, selected && s.tileLabelActive]} numberOfLines={2}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}
