import React from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createPricingServiceSchema,
  CreatePricingServiceInput,
} from "../domain/pricingService";
import { pricingStrings } from "../domain/strings";
import { z } from "zod";

type Props = {
  initialValues?: Partial<CreatePricingServiceInput>;
  onSubmit: (data: CreatePricingServiceInput) => void;
  submitting: boolean;
  error?: string | null;
};

export default function PricingForm({
  initialValues,
  onSubmit,
  submitting,
  error,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreatePricingServiceInput>({
    resolver: zodResolver(createPricingServiceSchema),
    defaultValues: initialValues,
  });

  React.useEffect(() => {
    if (initialValues) {
      Object.entries(initialValues).forEach(([key, value]) => {
        setValue(key as keyof CreatePricingServiceInput, value as any);
      });
    }
  }, [initialValues, setValue]);

  return (
    <View>
      <Text style={styles.label}>{pricingStrings.addPricing}</Text>
      <TextInput
        style={styles.input}
        {...register("name")}
        placeholder="Ej: Dobladillo pantalón"
      />
      {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

      <Text style={styles.label}>Precio</Text>
      <TextInput
        style={styles.input}
        {...register("price")}
        placeholder="Ej: 15000"
        keyboardType="numeric"
      />
      {errors.price && <Text style={styles.error}>{errors.price.message}</Text>}

      <Text style={styles.label}>Notas (opcional)</Text>
      <TextInput
        style={styles.input}
        {...register("notes")}
        placeholder="Notas adicionales"
      />
      {errors.notes && <Text style={styles.error}>{errors.notes.message}</Text>}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={submitting ? pricingStrings.save + "..." : pricingStrings.save}
        onPress={handleSubmit(onSubmit)}
        disabled={submitting}
      />
      {submitting && <ActivityIndicator style={{ marginTop: 8 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: "bold",
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  error: {
    color: "#b00020",
    marginBottom: 4,
  },
});
