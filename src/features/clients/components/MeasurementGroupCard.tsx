import { colors } from "../../../shared/theme/colors";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { StyleSheet, Text, TextInput, View } from "react-native";

export interface MeasurementGroupSubField<TFormValues extends FieldValues> {
  name: Path<TFormValues>;
  label: string;
  accessibilityLabel: string;
  errorMessage?: string;
}

interface MeasurementGroupCardProps<TFormValues extends FieldValues> {
  title: string;
  fields: MeasurementGroupSubField<TFormValues>[];
  control: Control<TFormValues>;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Tarjeta grande que agrupa 2+ sub-medidas independientes bajo un mismo
 * título (ej. "Pecho" con "Ajustado"/"Ancho", o "Manga" con 4 subcampos) —
 * a diferencia de `MeasurementCard`, que es una tarjeta chica de un solo
 * valor. Siempre ocupa el ancho completo de la fila en
 * `MeasurementGridSection` (no participa del cálculo de `cardWidth`, que
 * solo clona sobre `MeasurementCard`). Los subcampos envuelven de a 2 por
 * fila cuando hay más de 2.
 */
export function MeasurementGroupCard<TFormValues extends FieldValues>({
  title,
  fields,
  control,
  disabled = false,
  placeholder = "—",
}: MeasurementGroupCardProps<TFormValues>) {
  const hasError = fields.some((field) => field.errorMessage);

  return (
    <View
      style={[
        styles.card,
        disabled ? styles.cardDisabled : styles.cardEditable,
        hasError ? styles.cardError : undefined,
      ]}
    >
      <Text style={styles.title}>{title}</Text>
      <View style={styles.subFieldsRow}>
        {fields.map((sub) => (
          <Controller
            key={sub.name}
            control={control}
            name={sub.name}
            render={({ field: { onChange, value } }) => {
              const hasValue =
                typeof value === "string" && value.trim().length > 0;

              return (
                <View
                  style={styles.subField}
                  accessible={disabled}
                  accessibilityLabel={disabled ? sub.accessibilityLabel : undefined}
                >
                  <Text
                    style={[
                      styles.subLabel,
                      !hasValue && disabled ? styles.subLabelEmpty : undefined,
                    ]}
                  >
                    {sub.label}
                  </Text>
                  {disabled ? (
                    hasValue ? (
                      <View style={styles.valueRow}>
                        <Text style={styles.value}>{value}</Text>
                        <Text style={styles.unit}>cm</Text>
                      </View>
                    ) : (
                      <Text style={styles.valuePlaceholder}>
                        {placeholder}
                      </Text>
                    )
                  ) : (
                    <TextInput
                      accessibilityLabel={sub.accessibilityLabel}
                      style={styles.input}
                      value={typeof value === "string" ? value : ""}
                      onChangeText={onChange}
                      keyboardType="decimal-pad"
                      placeholder={placeholder}
                      placeholderTextColor={colors.textPlaceholder}
                    />
                  )}
                  {sub.errorMessage ? (
                    <Text style={styles.errorText}>{sub.errorMessage}</Text>
                  ) : null}
                </View>
              );
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  cardEditable: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  cardDisabled: {
    backgroundColor: "#f1f5f9",
  },
  cardError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  title: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.textMuted,
    fontWeight: "700",
  },
  subFieldsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  subField: {
    flexGrow: 1,
    flexBasis: "40%",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  subLabelEmpty: {
    color: colors.textPlaceholder,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  valuePlaceholder: {
    fontSize: 20,
    fontWeight: "400",
    color: colors.textPlaceholder,
  },
  unit: {
    fontSize: 12,
    color: colors.textPlaceholder,
    marginBottom: 3,
  },
  input: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
});
