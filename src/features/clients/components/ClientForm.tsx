import React from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createClientSchema,
  type CreateClientSchemaInput,
} from "../domain/schemas";

interface ClientFormProps {
  onSubmit: (data: CreateClientSchemaInput) => void;
  submitLabel?: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  onSubmit,
  submitLabel = "Guardar",
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClientSchemaInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      notes: "",
    },
  });

  return (
    <View style={styles.container}>
      <Text>Nombre</Text>
      <Controller
        control={control}
        name="firstName"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.firstName && (
        <Text style={styles.error}>{errors.firstName.message}</Text>
      )}

      <Text>Apellido</Text>
      <Controller
        control={control}
        name="lastName"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.lastName && (
        <Text style={styles.error}>{errors.lastName.message}</Text>
      )}

      <Text>Teléfono</Text>
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            keyboardType="phone-pad"
          />
        )}
      />
      {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}

      <Text>Notas</Text>
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            multiline
          />
        )}
      />
      {errors.notes && <Text style={styles.error}>{errors.notes.message}</Text>}

      <Button title={submitLabel} onPress={handleSubmit(onSubmit)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 8, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginBottom: 4,
  },
  error: { color: "red", fontSize: 12 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
