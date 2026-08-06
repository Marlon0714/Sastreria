import { colors } from "../../../shared/theme/colors";
import { Ionicons } from "@expo/vector-icons";
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
              placeholderTextColor={colors.textPlaceholder}
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
              placeholderTextColor={colors.textPlaceholder}
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
              placeholderTextColor={colors.textPlaceholder}
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
          <>
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>{pricingStrings.save}</Text>
          </>
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
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  required: {
    color: colors.danger,
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
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  saveButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
