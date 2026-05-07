import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import type { UpdateClientSchemaInput } from "../domain/schemas";
import { useClientDetail } from "../hooks/useClientDetail";
import { useUpdateClient } from "../hooks/useUpdateClient";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientEdit">;

export default function ClientEditScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const {
    client,
    isLoading,
    error: loadError,
    reload,
  } = useClientDetail(clientId);
  const {
    isSubmitting,
    error: submitError,
    updateClient,
    validate,
  } = useUpdateClient();

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<UpdateClientSchemaInput>({
    defaultValues: {
      id: clientId,
      firstName: "",
      lastName: "",
      phone: "",
      notes: "",
    },
  });

  // Pre-fill form once client data is loaded
  useEffect(() => {
    if (client) {
      reset({
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        notes: client.notes ?? "",
      });
    }
  }, [client, reset]);

  if (isLoading) {
    return <LoadingView message="Cargando datos del cliente..." />;
  }

  if (loadError || !client) {
    return (
      <ErrorView
        message={loadError ?? "No se encontró el cliente."}
        onRetry={() => void reload()}
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    const validationErrors = validate(values);
    const keys: (keyof UpdateClientSchemaInput)[] = [
      "firstName",
      "lastName",
      "phone",
      "notes",
    ];

    let hasErrors = false;
    for (const key of keys) {
      const validationError = validationErrors[key];
      if (validationError?.message) {
        hasErrors = true;
        setError(key, { type: "manual", message: validationError.message });
      }
    }

    if (hasErrors) {
      return;
    }

    const updated = await updateClient(values);
    if (updated) {
      navigation.goBack();
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Editar cliente</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre</Text>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder="Ej. Ana"
              />
            )}
          />
          {errors.firstName?.message ? (
            <Text style={styles.errorText}>{errors.firstName.message}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Apellido</Text>
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder="Ej. Torres"
              />
            )}
          />
          {errors.lastName?.message ? (
            <Text style={styles.errorText}>{errors.lastName.message}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
                placeholder="Ej. 3001234567"
              />
            )}
          />
          {errors.phone?.message ? (
            <Text style={styles.errorText}>{errors.phone.message}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Notas (opcional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={value}
                onChangeText={onChange}
                placeholder="Detalles relevantes del cliente"
                multiline
              />
            )}
          />
          {errors.notes?.message ? (
            <Text style={styles.errorText}>{errors.notes.message}</Text>
          ) : null}
        </View>

        {submitError ? (
          <Text style={styles.errorText}>{submitError}</Text>
        ) : null}

        <Pressable
          accessibilityLabel="Guardar cambios del cliente"
          style={[
            styles.submitButton,
            isSubmitting ? styles.submitButtonDisabled : undefined,
          ]}
          onPress={() => void onSubmit()}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
