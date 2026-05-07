import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface MeasurementCardProps<TFormValues extends FieldValues> {
  name: Path<TFormValues>;
  label: string;
  accessibilityLabel: string;
  control: Control<TFormValues>;
  errorMessage?: string;
  disabled?: boolean;
  placeholder?: string;
  cardWidth?: number;
}

export function MeasurementCard<TFormValues extends FieldValues>({
  name,
  label,
  accessibilityLabel,
  control,
  errorMessage,
  disabled = false,
  placeholder = "—",
  cardWidth,
}: MeasurementCardProps<TFormValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const hasValue = typeof value === "string" && value.trim().length > 0;

        if (disabled) {
          return (
            <View
              accessible={true}
              accessibilityLabel={accessibilityLabel}
              style={[
                styles.card,
                styles.cardDisabled,
                errorMessage ? styles.cardError : undefined,
                cardWidth !== undefined ? { width: cardWidth } : undefined,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  !hasValue ? styles.labelEmpty : undefined,
                ]}
              >
                {label}
              </Text>
              {hasValue ? (
                <View style={styles.valueRow}>
                  <Text style={styles.value}>{value}</Text>
                  <Text style={styles.unit}>cm</Text>
                </View>
              ) : (
                <Text style={styles.valuePlaceholder}>{placeholder}</Text>
              )}
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}
            </View>
          );
        }

        return (
          <View
            style={[
              styles.card,
              styles.cardEditable,
              errorMessage ? styles.cardError : undefined,
              cardWidth !== undefined ? { width: cardWidth } : undefined,
            ]}
          >
            <Text style={styles.label}>{label}</Text>
            <TextInput
              accessibilityLabel={accessibilityLabel}
              style={styles.input}
              value={typeof value === "string" ? value : ""}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              placeholder={placeholder}
              placeholderTextColor="#94a3b8"
            />
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    gap: 2,
  },
  cardEditable: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cardDisabled: {
    backgroundColor: "#f1f5f9",
  },
  cardError: {
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#64748b",
    fontWeight: "600",
  },
  labelEmpty: {
    color: "#94a3b8",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  valuePlaceholder: {
    fontSize: 22,
    fontWeight: "400",
    color: "#94a3b8",
  },
  unit: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 4,
  },
  input: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    padding: 0,
    flex: 1,
  },
  errorText: {
    fontSize: 11,
    color: "#b91c1c",
  },
});
