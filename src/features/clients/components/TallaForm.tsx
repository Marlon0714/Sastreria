import { Controller, type Control, type FieldErrors } from "react-hook-form";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { TallaType } from "../domain/types";

export interface TallaFormValues {
  type: TallaType;
  value: string;
  notes: string;
}

export const TALLA_FORM_DEFAULTS: TallaFormValues = {
  type: "camisa",
  value: "",
  notes: "",
};

const TALLA_OPTIONS: Array<{ type: TallaType; label: string; emoji: string }> =
  [
    { type: "camisa", label: "Camisa", emoji: "👔" },
    { type: "pantalon", label: "Pantalón", emoji: "👖" },
    { type: "saco", label: "Saco", emoji: "🧥" },
    { type: "chaleco", label: "Chaleco", emoji: "🦺" },
  ];

interface TallaFormProps {
  control: Control<TallaFormValues>;
  errors: FieldErrors<TallaFormValues>;
  disabled?: boolean;
  lockType?: boolean;
}

export default function TallaForm({
  control,
  errors,
  disabled = false,
  lockType = false,
}: TallaFormProps) {
  return (
    <View style={styles.container}>
      {/* Tipo */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Tipo</Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) =>
            lockType ? (
              <Text style={styles.lockedType}>
                {TALLA_OPTIONS.find((o) => o.type === value)?.emoji}{" "}
                {TALLA_OPTIONS.find((o) => o.type === value)?.label}
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsContainer}
              >
                {TALLA_OPTIONS.map((option) => {
                  const selected = value === option.type;
                  return (
                    <TouchableOpacity
                      key={option.type}
                      style={[
                        styles.chip,
                        selected ? styles.chipSelected : null,
                      ]}
                      onPress={() => onChange(option.type)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Tipo ${option.label}`}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected ? styles.chipTextSelected : null,
                        ]}
                      >
                        {option.emoji} {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )
          }
        />
        {errors.type ? (
          <Text style={styles.errorText}>{errors.type.message}</Text>
        ) : null}
      </View>

      {/* Valor */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Talla</Text>
        <Controller
          control={control}
          name="value"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, disabled ? styles.inputDisabled : null]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Ej: M, 38, 40/32"
              autoCapitalize="characters"
              editable={!disabled}
              accessibilityLabel="Valor de talla"
            />
          )}
        />
        {errors.value ? (
          <Text style={styles.errorText}>{errors.value.message}</Text>
        ) : null}
      </View>

      {/* Notas */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Notas (opcional)</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[
                styles.input,
                styles.inputMultiline,
                disabled ? styles.inputDisabled : null,
              ]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Observaciones adicionales..."
              multiline
              numberOfLines={3}
              editable={!disabled}
              accessibilityLabel="Notas de talla"
            />
          )}
        />
        {errors.notes ? (
          <Text style={styles.errorText}>{errors.notes.message}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  chipsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  chipSelected: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  chipText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#ffffff",
  },
  lockedType: {
    fontSize: 15,
    color: "#0f172a",
    paddingVertical: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },
  errorText: {
    fontSize: 12,
    color: "#b91c1c",
  },
});
