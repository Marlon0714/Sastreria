import { colors } from "../../../shared/theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
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
import { findDuplicateByPhone } from "../../../shared/utils/textSearch";
import type { UpdateClientSchemaInput } from "../domain/schemas";
import type { Client } from "../domain/types";
import { useClientDetail } from "../hooks/useClientDetail";
import { useClientRepository } from "../hooks/ClientsDependenciesProvider";
import { useUpdateClient } from "../hooks/useUpdateClient";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientEdit">;

export default function ClientEditScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const [showPhone2, setShowPhone2] = useState(false);
  const [showPhone3, setShowPhone3] = useState(false);
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
  const clientRepository = useClientRepository();
  const [existingClients, setExistingClients] = useState<Client[]>([]);

  useEffect(() => {
    let cancelled = false;
    clientRepository.findAll().then((result) => {
      if (!cancelled) {
        setExistingClients(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clientRepository]);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<UpdateClientSchemaInput>({
    defaultValues: {
      id: clientId,
      firstName: "",
      lastName: "",
      phone: "",
      phone2: "",
      phone3: "",
      cedula: "",
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
        phone2: client.phones?.[0] ?? "",
        phone3: client.phones?.[1] ?? "",
        cedula: client.cedula ?? "",
        notes: client.notes ?? "",
      });
      setShowPhone2(Boolean(client.phones?.[0]));
      setShowPhone3(Boolean(client.phones?.[1]));
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

    const proceedUpdate = async (): Promise<void> => {
      const updated = await updateClient(values);
      if (updated) {
        navigation.goBack();
      }
    };

    const duplicatePhone = values.phone
      ? findDuplicateByPhone(existingClients, values.phone, clientId)
      : null;

    if (duplicatePhone) {
      Alert.alert(
        "Teléfono ya registrado",
        `Ya existe un cliente con este teléfono: ${duplicatePhone.firstName} ${duplicatePhone.lastName}. ¿Deseas guardarlo así de todos modos?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Guardar de todos modos",
            onPress: () => void proceedUpdate(),
          },
        ],
      );
      return;
    }

    void proceedUpdate();
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Editar cliente</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos personales</Text>

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
                  placeholderTextColor={colors.textPlaceholder}
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
                  placeholderTextColor={colors.textPlaceholder}
                />
              )}
            />
            {errors.lastName?.message ? (
              <Text style={styles.errorText}>{errors.lastName.message}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contacto</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Teléfono (opcional)</Text>
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
                  placeholderTextColor={colors.textPlaceholder}
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
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.textPlaceholder}
                  />
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
                    placeholderTextColor={colors.textPlaceholder}
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
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.textPlaceholder}
                  />
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
                    placeholderTextColor={colors.textPlaceholder}
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
                if (!showPhone2) {
                  setShowPhone2(true);
                } else if (getValues("phone2")?.trim()) {
                  // Si "Teléfono 2" queda vacío, guardar compacta el array
                  // de teléfonos y lo que se escriba en "Teléfono 3" pasaría
                  // a mostrarse como "Teléfono 2" al recargar — se exige
                  // llenar el anterior antes de destapar el siguiente.
                  setShowPhone3(true);
                }
              }}
              accessibilityLabel="Agregar teléfono adicional"
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addPhoneBtnText}>Agregar teléfono</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Otros datos</Text>

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
                  placeholderTextColor={colors.textPlaceholder}
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
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                />
              )}
            />
            {errors.notes?.message ? (
              <Text style={styles.errorText}>{errors.notes.message}</Text>
            ) : null}
          </View>
        </View>

        {submitError ? (
          <Text style={styles.errorText}>{submitError}</Text>
        ) : null}

        <Pressable
          accessibilityLabel="Guardar cambios del cliente"
          style={({ pressed }) => [
            styles.submitButton,
            isSubmitting ? styles.submitButtonDisabled : undefined,
            pressed && !isSubmitting ? styles.submitButtonPressed : null,
          ]}
          onPress={() => void onSubmit()}
          disabled={isSubmitting}
        >
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
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
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  phoneLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addPhoneBtn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    borderStyle: "dashed",
    paddingVertical: 10,
    alignItems: "center",
  },
  addPhoneBtnText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
