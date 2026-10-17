import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { STEP_ICONS, STEPS } from './constants';
import { s } from './styles';

/**
 * Progression du formulaire. Les étapes terminées sont cliquables pour y
 * revenir directement ; les suivantes restent inactives (validation oblige).
 */
export function StepIndicator({
  current,
  onStepPress,
}: {
  current: number;
  onStepPress: (index: number) => void;
}) {
  return (
    <View
      style={s.stepRow}
      accessibilityRole="progressbar"
      accessibilityLabel={`Étape ${current + 1} sur ${STEPS.length} : ${STEPS[current]}`}
    >
      {STEPS.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <React.Fragment key={i}>
            <TouchableOpacity
              style={s.stepItem}
              onPress={() => onStepPress(i)}
              disabled={!isDone}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isDone ? `Revenir à l'étape ${label}` : label}
              accessibilityState={{ disabled: !isDone, selected: isActive }}
            >
              <View style={[
                s.stepCircle,
                { backgroundColor: isDone || isActive ? colors.primary : colors.border },
                isActive && s.stepCircleRing,
              ]}>
                <Ionicons
                  name={isDone ? 'checkmark' : STEP_ICONS[i]}
                  size={14}
                  color={isDone || isActive ? colors.white : colors.textMuted}
                />
              </View>
              <AppText style={[s.stepLabel, isActive && s.stepLabelActive, isDone && s.stepLabelDone]}>
                {label}
              </AppText>
            </TouchableOpacity>
            {i < STEPS.length - 1 && (
              <View style={[s.stepLine, isDone && s.stepLineActive]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
