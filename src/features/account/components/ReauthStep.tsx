import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../../../shared/theme/colors";
import { useReauth } from "../hooks/useReauth";

const PIN_LENGTH = 4;

type ReauthMethod = "password" | "pin";

interface ReauthStepProps {
  onVerified: () => void;
  onCancel: () => void;
}

/**
 * Confirma que quien está haciendo el cambio es el dueño de la cuenta, antes
 * de dejar cambiar correo/contraseña/PIN — con contraseña o con PIN, lo que
 * el operario tenga a mano.
 */
export function ReauthStep({ onVerified, onCancel }: ReauthStepProps) {
  const { isVerifying, error, verifyPassword, verifyPin } = useReauth();
  const [method, setMethod] = useState<ReauthMethod>("password");
  const [value, setValue] = useState("");

  const selectMethod = (next: ReauthMethod): void => {
    setMethod(next);
    setValue("");
  };

  const handleConfirm = async (): Promise<void> => {
    const ok =
      method === "password"
        ? await verifyPassword(value)
        : await verifyPin(value);
    if (ok) {
      onVerified();
    }
  };

  const canSubmit =
    method === "password" ? value.length > 0 : value.length === PIN_LENGTH;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirma que eres tú</Text>

      <View style={styles.methodRow}>
        <Pressable
          accessibilityLabel="Usar contraseña"
          accessibilityState={{ selected: method === "password" }}
          style={[
            styles.methodChip,
            method === "password" && styles.methodChipActive,
          ]}
          onPress={() => selectMethod("password")}
        >
          <Text
            style={[
              styles.methodChipText,
              method === "password" && styles.methodChipTextActive,
            ]}
          >
            Contraseña
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Usar PIN"
          accessibilityState={{ selected: method === "pin" }}
          style={[styles.methodChip, method === "pin" && styles.methodChipActive]}
          onPress={() => selectMethod("pin")}
        >
          <Text
            style={[
              styles.methodChipText,
              method === "pin" && styles.methodChipTextActive,
            ]}
          >
            PIN
          </Text>
        </Pressable>
      </View>

      <TextInput
        accessibilityLabel={method === "password" ? "Contraseña actual" : "PIN actual"}
        style={styles.input}
        value={value}
        onChangeText={(text) =>
          setValue(
            method === "pin"
              ? text.replace(/\D/g, "").slice(0, PIN_LENGTH)
              : text,
          )
        }
        secureTextEntry
        keyboardType={method === "pin" ? "number-pad" : "default"}
        placeholder={method === "password" ? "Tu contraseña" : "····"}
        placeholderTextColor={colors.textPlaceholder}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        <Pressable accessibilityLabel="Cancelar" onPress={onCancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Confirmar identidad"
          style={[
            styles.confirmButton,
            (!canSubmit || isVerifying) && styles.disabled,
          ]}
          disabled={!canSubmit || isVerifying}
          onPress={() => void handleConfirm()}
        >
          <Text style={styles.confirmText}>
            {isVerifying ? "Verificando..." : "Continuar"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  methodRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  methodChipTextActive: {
    color: colors.primary,
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
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  disabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
