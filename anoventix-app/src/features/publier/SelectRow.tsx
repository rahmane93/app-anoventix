import { colors } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import AppText from "@/src/components/AppText";
import { s } from "./styles";

export function SelectRow({
  label,
  value,
  placeholder,
  options,
  onSelect,
  disabled = false,
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (v: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={s.field}>
      <AppText style={s.fieldLabel}>{label}</AppText>
      <TouchableOpacity
        style={[
          s.selectBtn,
          disabled && s.selectBtnDisabled,
          !!error && s.selectBtnError,
        ]}
        onPress={() => !disabled && setOpen((v) => !v)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${label}${value ? `, ${value}` : `, ${placeholder}`}`}
        accessibilityState={{ disabled, expanded: open }}
      >
        <AppText
          style={[s.selectBtnText, !value && { color: colors.textMuted }]}
        >
          {value || placeholder}
        </AppText>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {open && (
        <View style={s.dropdown}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.dropdownItem, value === opt && s.dropdownItemActive]}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={opt}
                accessibilityState={{ selected: value === opt }}
              >
                <AppText
                  style={[
                    s.dropdownText,
                    value === opt && s.dropdownTextActive,
                  ]}
                >
                  {opt}
                </AppText>
                {value === opt && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!!error && <AppText style={s.errorText}>{error}</AppText>}
    </View>
  );
}
