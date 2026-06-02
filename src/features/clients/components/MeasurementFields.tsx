import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface MeasurementNumberFieldProps<TFormValues extends FieldValues> {
  name: Path<TFormValues>;
  label: string;
  control: Control<TFormValues>;
  errorMessage?: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Campo numérico de medida reutilizable para CamisaMeasurementForm y
 * PantalonMeasurementForm. El valor se maneja como string en el formulario
 * y la conversión a número la realiza el schema Zod en el padre.
 *
 * El prop `disabled` cubre el modo vista de las pantallas Detail.
 */
export function MeasurementNumberField<TFormValues extends FieldValues>({
  name,
  label,
  control,
  errorMessage,
  disabled = false,
  placeholder = "—",
}: MeasurementNumberFieldProps<TFormValues>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <TextInput
            accessibilityLabel={label}
            style={[styles.input, disabled ? styles.inputDisabled : undefined]}
            value={typeof value === "string" ? value : ""}
            onChangeText={onChange}
            editable={!disabled}
            keyboardType="decimal-pad"
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
          />
        )}
      />
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

interface MeasurementNotesFieldProps<TFormValues extends FieldValues> {
  name: Path<TFormValues>;
  control: Control<TFormValues>;
  errorMessage?: string;
  disabled?: boolean;
}

export function MeasurementNotesField<TFormValues extends FieldValues>({
  name,
  control,
  errorMessage,
  disabled = false,
}: MeasurementNotesFieldProps<TFormValues>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Notas (opcional)</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <TextInput
            accessibilityLabel="Notas"
            style={[
              styles.input,
              styles.notesInput,
              disabled ? styles.inputDisabled : undefined,
            ]}
            value={typeof value === "string" ? value : ""}
            onChangeText={onChange}
            editable={!disabled}
            multiline
            placeholder="Detalles adicionales"
            placeholderTextColor="#94a3b8"
          />
        )}
      />
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
  },
  notesInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 12,
    color: "#b91c1c",
  },
});
