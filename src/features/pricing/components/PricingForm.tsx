import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createPricingServiceSchema,
  type CreatePricingServiceInput,
  PRICING_CATEGORIES,
  PRICING_CATEGORY_LABELS,
} from "../domain/pricingService";
import { pricingStrings } from "../domain/strings";

type Props = {
  initialValues?: Partial<CreatePricingServiceInput>;
  onSubmit: (data: CreatePricingServiceInput) => void;
  submitting: boolean;
  error?: string | null;
};

const CATEGORY_ICONS = { arreglo: "✂️", confeccion: "🧵" } as const;

export default function PricingForm({
  initialValues,
  onSubmit,
  submitting,
  error,
}: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePricingServiceInput>({
    resolver: zodResolver(createPricingServiceSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      price: initialValues?.price ?? 0,
      category: initialValues?.category ?? "arreglo",
      notes: initialValues?.notes ?? "",
    },
  });

  return (
    <View style={styles.container}>
      {/* Categoría */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Categoría</Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View style={styles.categoryRow}>
              {PRICING_CATEGORIES.map((cat) => {
                const isActive = value === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                    ]}
                    onPress={() => onChange(cat)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isActive && styles.categoryChipTextActive,
                      ]}
                    >
                      {CATEGORY_ICONS[cat]} {PRICING_CATEGORY_LABELS[cat]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </View>

      {/* Nombre */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>
          Nombre del servicio <Text style={styles.required}>*</Text>
        </Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Ej: Dobladillo pantalón"
              placeholderTextColor="#94a3b8"
              accessibilityLabel="Nombre"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="sentences"
            />
          )}
        />
        {errors.name && (
          <Text style={styles.errorText}>{errors.name.message}</Text>
        )}
      </View>

      {/* Precio */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>
          Precio (COP) <Text style={styles.required}>*</Text>
        </Text>
        <Controller
          control={control}
          name="price"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              placeholder="Ej: 15000"
              placeholderTextColor="#94a3b8"
              accessibilityLabel="Precio"
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={(v) => {
                const n = parseFloat(v.replace(/[^0-9.]/g, ""));
                onChange(isNaN(n) ? 0 : n);
              }}
              value={value === 0 ? "" : String(value)}
            />
          )}
        />
        {errors.price && (
          <Text style={styles.errorText}>{errors.price.message}</Text>
        )}
      </View>

      {/* Notas */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Notas (opcional)</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Descripción, detalles del servicio..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ""}
            />
          )}
        />
        {errors.notes && (
          <Text style={styles.errorText}>{errors.notes.message}</Text>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          submitting && styles.saveButtonDisabled,
          pressed && !submitting && styles.saveButtonPressed,
        ]}
        onPress={handleSubmit(onSubmit)}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{pricingStrings.save}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  fieldGroup: {
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  required: {
    color: "#ef4444",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  categoryChipActive: {
    borderColor: "#1e40af",
    backgroundColor: "#dbeafe",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  categoryChipTextActive: {
    color: "#1e40af",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: "#1e40af",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  saveButtonPressed: {
    backgroundColor: "#1e3a8a",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
