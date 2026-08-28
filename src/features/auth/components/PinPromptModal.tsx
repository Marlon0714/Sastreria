import { colors } from "../../../shared/theme/colors";
import { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { PIN_LOCKOUT_MS } from "../hooks/useIdentityGate";

interface PinPromptModalProps {
  visible: boolean;
  error: string | null;
  onSubmit: (pin: string) => void | Promise<void>;
  onCancel: () => void;
}

const PIN_LENGTH = 4;

// Prefijo fijo del mensaje que useIdentityGate.registerFailedPinAttempt()
// setea al llegar al límite de intentos — se usa para distinguir "está en
// cooldown" de un simple "PIN incorrecto" sin acoplar este componente a la
// lógica interna del hook.
const LOCKOUT_MESSAGE_PREFIX = "Demasiados intentos fallidos.";
const PIN_LOCKOUT_SECONDS = Math.ceil(PIN_LOCKOUT_MS / 1000);

export function PinPromptModal({
  visible,
  error,
  onSubmit,
  onCancel,
}: PinPromptModalProps) {
  const [pin, setPin] = useState("");
  // Evita que un doble-tap dispare dos verificaciones concurrentes del
  // mismo PIN mientras la promesa de onSubmit está en curso.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLockedOut = error?.startsWith(LOCKOUT_MESSAGE_PREFIX) ?? false;
  // Cuenta regresiva visible durante el cooldown de 30s — antes el mensaje
  // era estático y el botón Confirmar seguía habilitado (solo se cortaba
  // la llamada al backend al presionarlo).
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!isLockedOut) {
      setLockoutSecondsLeft(null);
      return;
    }

    setLockoutSecondsLeft(PIN_LOCKOUT_SECONDS);
    const intervalId = setInterval(() => {
      setLockoutSecondsLeft((seconds) => {
        if (seconds === null || seconds <= 1) {
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isLockedOut]);

  const isLockedOutNow = isLockedOut && (lockoutSecondsLeft ?? 0) > 0;
  const displayError =
    isLockedOutNow && lockoutSecondsLeft !== null
      ? `${LOCKOUT_MESSAGE_PREFIX} Espera ${lockoutSecondsLeft} ${
          lockoutSecondsLeft === 1 ? "segundo" : "segundos"
        } e intenta de nuevo.`
      : error;
  const isConfirmDisabled =
    pin.length !== PIN_LENGTH || isSubmitting || isLockedOutNow;

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onSubmit(pin);
    } finally {
      setIsSubmitting(false);
      setPin("");
    }
  };

  const handleCancel = (): void => {
    setPin("");
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>¿Quién eres?</Text>
          <Text style={styles.subtitle}>
            Ingresa tu PIN de {PIN_LENGTH} dígitos para continuar
          </Text>

          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(text) =>
              setPin(text.replace(/\D/g, "").slice(0, PIN_LENGTH))
            }
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            accessibilityLabel="PIN"
            autoFocus
            editable={!isSubmitting}
          />

          {displayError && <Text style={styles.error}>{displayError}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isSubmitting}
              accessibilityLabel="Cancelar"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                isConfirmDisabled ? styles.confirmButtonDisabled : null,
              ]}
              onPress={handleSubmit}
              disabled={isConfirmDisabled}
              accessibilityLabel="Confirmar PIN"
            >
              <Text style={styles.confirmText}>
                {isSubmitting ? "Verificando..." : "Confirmar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 24,
    letterSpacing: 8,
    color: "#1e293b",
    backgroundColor: "#f9fafb",
    textAlign: "center",
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  cancelText: {
    fontSize: 14,
    color: "#64748b",
  },
  confirmButton: {
    backgroundColor: "#6366f1",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
