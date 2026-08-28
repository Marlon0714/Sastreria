import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../../shared/theme/colors";
import { useIdentityStore } from "../../../shared/state/identityStore";
import { ReauthStep } from "../components/ReauthStep";
import { useAccountActions } from "../hooks/useAccountActions";

const PIN_LENGTH = 4;

type EditableField = "email" | "password" | "pin";

interface MyAccountScreenProps {
  navigation: { navigate: (screen: "MyActivity") => void };
}

const NEW_VALUE_LABELS: Record<EditableField, string> = {
  email: "Nuevo correo",
  password: "Nueva contraseña",
  pin: "Nuevo PIN",
};

export default function MyAccountScreen({ navigation }: MyAccountScreenProps) {
  const displayName = useIdentityStore(
    (state) => state.ownProfile?.displayName ?? "",
  );
  const role = useIdentityStore((state) => state.ownProfile?.role ?? null);
  const roleLabel = role === "owner" ? "Dueño" : "Operario";
  const {
    currentEmail,
    isLoadingEmail,
    isSubmitting,
    error,
    changeEmail,
    changePassword,
    changePin,
    clearError,
  } = useAccountActions();

  const [editingField, setEditingField] = useState<EditableField | null>(
    null,
  );
  const [isReauthed, setIsReauthed] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const startEditing = (field: EditableField): void => {
    setEditingField(field);
    setIsReauthed(false);
    setNewValue("");
    setConfirmValue("");
    setFormError(null);
    setSuccessMessage(null);
    // Sin esto, el error de un intento anterior (ej. "Cambiar contraseña"
    // fallido) queda pegado bajo el formulario de OTRO campo (ej. "PIN")
    // que el usuario abre después, antes de haber enviado nada ahí.
    clearError();
  };

  const cancelEditing = (): void => {
    setEditingField(null);
    setIsReauthed(false);
    clearError();
  };

  const handleSubmit = async (): Promise<void> => {
    setFormError(null);

    if (editingField === "email") {
      const trimmed = newValue.trim();
      if (!trimmed || !trimmed.includes("@")) {
        setFormError("Escribe un correo válido.");
        return;
      }
      const ok = await changeEmail(trimmed);
      if (ok) {
        // El mensaje es deliberadamente neutro: si en Supabase está
        // habilitada la confirmación de cambio de correo, el usuario recibe
        // igual el correo pidiéndole confirmar; si está deshabilitada
        // (Authentication → Settings en el dashboard), el cambio ya quedó
        // aplicado. La app no controla ese comportamiento.
        setSuccessMessage("Correo actualizado.");
        cancelEditing();
      }
      return;
    }

    if (editingField === "password") {
      if (newValue.length < 6) {
        setFormError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (newValue !== confirmValue) {
        setFormError("Las contraseñas no coinciden.");
        return;
      }
      const ok = await changePassword(newValue);
      if (ok) {
        setSuccessMessage("Contraseña actualizada.");
        cancelEditing();
      }
      return;
    }

    if (editingField === "pin") {
      if (newValue.length !== PIN_LENGTH) {
        setFormError(`El PIN debe tener ${PIN_LENGTH} dígitos.`);
        return;
      }
      const ok = await changePin(newValue);
      if (ok) {
        setSuccessMessage("PIN actualizado.");
        cancelEditing();
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{roleLabel}</Text>
        </View>

        <Pressable
          accessibilityLabel="Ver mis arreglos"
          style={styles.activityButton}
          onPress={() => navigation.navigate("MyActivity")}
        >
          <Ionicons name="cut-outline" size={20} color={colors.primary} />
          <Text style={styles.activityButtonText}>Mis arreglos</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>

        {successMessage ? (
          <Text style={styles.success}>{successMessage}</Text>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cuenta</Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Correo</Text>
              <Text style={styles.rowValue}>
                {isLoadingEmail ? "Cargando..." : currentEmail}
              </Text>
            </View>
            {editingField !== "email" ? (
              <Pressable
                accessibilityLabel="Cambiar correo"
                onPress={() => startEditing("email")}
              >
                <Text style={styles.changeText}>Cambiar</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Contraseña</Text>
              <Text style={styles.rowValue}>••••••••</Text>
            </View>
            {editingField !== "password" ? (
              <Pressable
                accessibilityLabel="Cambiar contraseña"
                onPress={() => startEditing("password")}
              >
                <Text style={styles.changeText}>Cambiar</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>PIN</Text>
              <Text style={styles.rowValue}>••••</Text>
            </View>
            {editingField !== "pin" ? (
              <Pressable
                accessibilityLabel="Cambiar PIN"
                onPress={() => startEditing("pin")}
              >
                <Text style={styles.changeText}>Cambiar</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {editingField ? (
          <View style={styles.card}>
            {!isReauthed ? (
              <ReauthStep
                onVerified={() => setIsReauthed(true)}
                onCancel={cancelEditing}
              />
            ) : (
              <View style={styles.editForm}>
                <Text style={styles.title}>
                  {NEW_VALUE_LABELS[editingField]}
                </Text>

                <TextInput
                  accessibilityLabel={NEW_VALUE_LABELS[editingField]}
                  style={styles.input}
                  value={newValue}
                  onChangeText={(text) =>
                    setNewValue(
                      editingField === "pin"
                        ? text.replace(/\D/g, "").slice(0, PIN_LENGTH)
                        : text,
                    )
                  }
                  secureTextEntry={editingField !== "email"}
                  keyboardType={
                    editingField === "email"
                      ? "email-address"
                      : editingField === "pin"
                        ? "number-pad"
                        : "default"
                  }
                  autoCapitalize="none"
                  placeholderTextColor={colors.textPlaceholder}
                />

                {editingField === "password" ? (
                  <TextInput
                    accessibilityLabel="Confirmar contraseña nueva"
                    style={styles.input}
                    value={confirmValue}
                    onChangeText={setConfirmValue}
                    secureTextEntry
                    placeholder="Confirmar contraseña"
                    placeholderTextColor={colors.textPlaceholder}
                  />
                ) : null}

                {formError ? (
                  <Text style={styles.error}>{formError}</Text>
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.buttonRow}>
                  <Pressable
                    accessibilityLabel="Cancelar cambio"
                    onPress={cancelEditing}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Guardar cambio"
                    style={[
                      styles.saveButton,
                      isSubmitting && styles.disabled,
                    ]}
                    disabled={isSubmitting}
                    onPress={() => void handleSubmit()}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSubmitting ? "Guardando..." : "Guardar"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 16,
    gap: 16,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  role: {
    fontSize: 13,
    color: colors.textMuted,
  },
  activityButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 16,
  },
  activityButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  success: {
    color: colors.success,
    fontSize: 13,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowInfo: {
    gap: 2,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  rowValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  changeText: {
    color: colors.primary,
    fontWeight: "600",
  },
  editForm: {
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  disabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
