import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
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
import type { CreateClientSchemaInput } from "../domain/schemas";
import { useCreateClient } from "../hooks/useCreateClient";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientCreate">;

export default function ClientCreateScreen({ navigation }: Props) {
  const { isSubmitting, error, createClient, validate } = useCreateClient();
  const [showPhone2, setShowPhone2] = useState(false);
  const [showPhone3, setShowPhone3] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateClientSchemaInput>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      phone2: "",
      phone3: "",
      cedula: "",
      notes: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const validationErrors = validate(values);
    const keys: (keyof CreateClientSchemaInput)[] = [
      "firstName",
      "lastName",
      "phone",
      "phone2",
      "phone3",
      "cedula",
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

    const createdClient = await createClient(values, reset);
    if (createdClient) {
      navigation.replace("ClientDetail", { clientId: createdClient.id });
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nuevo cliente</Text>

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

        {/* Teléfonos adicionales dinámicos */}
        {showPhone2 ? (
          <View style={styles.fieldGroup}>
            <View style={styles.phoneLabelRow}>
              <Text style={styles.label}>Teléfono 2 (opcional)</Text>
              <Pressable
                onPress={() => {
                  setValue("phone2", "");
                  setValue("phone3", "");
                  setShowPhone2(false);
                  setShowPhone3(false);
                }}
                accessibilityLabel="Eliminar teléfono 2"
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            </View>
            <Controller
              control={control}
              name="phone2"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  placeholder="Ej. 3101234567"
                />
              )}
            />
            {errors.phone2?.message ? (
              <Text style={styles.errorText}>{errors.phone2.message}</Text>
            ) : null}
          </View>
        ) : null}

        {showPhone2 && showPhone3 ? (
          <View style={styles.fieldGroup}>
            <View style={styles.phoneLabelRow}>
              <Text style={styles.label}>Teléfono 3 (opcional)</Text>
              <Pressable
                onPress={() => {
                  setValue("phone3", "");
                  setShowPhone3(false);
                }}
                accessibilityLabel="Eliminar teléfono 3"
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            </View>
            <Controller
              control={control}
              name="phone3"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  placeholder="Ej. 6011234567"
                />
              )}
            />
            {errors.phone3?.message ? (
              <Text style={styles.errorText}>{errors.phone3.message}</Text>
            ) : null}
          </View>
        ) : null}

        {!showPhone2 || !showPhone3 ? (
          <Pressable
            style={styles.addPhoneBtn}
            onPress={() => {
              if (!showPhone2) setShowPhone2(true);
              else setShowPhone3(true);
            }}
            accessibilityLabel="Agregar teléfono adicional"
          >
            <Text style={styles.addPhoneBtnText}>＋ Agregar teléfono</Text>
          </Pressable>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Cédula (opcional)</Text>
          <Controller
            control={control}
            name="cedula"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                keyboardType="number-pad"
                placeholder="Ej. 1020304050"
              />
            )}
          />
          {errors.cedula?.message ? (
            <Text style={styles.errorText}>{errors.cedula.message}</Text>
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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          accessibilityLabel="Guardar cliente"
          style={[
            styles.submitButton,
            isSubmitting ? styles.submitButtonDisabled : undefined,
          ]}
          onPress={() => void onSubmit()}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Guardando..." : "Guardar cliente"}
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
  sectionLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  phoneLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  removeBtnText: {
    fontSize: 16,
    color: "#94a3b8",
    paddingHorizontal: 4,
  },
  addPhoneBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    borderStyle: "dashed",
    paddingVertical: 10,
    alignItems: "center",
  },
  addPhoneBtnText: {
    color: "#0f766e",
    fontWeight: "600",
    fontSize: 14,
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
