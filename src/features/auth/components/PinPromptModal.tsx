import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PinPromptModalProps {
  visible: boolean;
  error: string | null;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}

const PIN_LENGTH = 4;

export function PinPromptModal({
  visible,
  error,
  onSubmit,
  onCancel,
}: PinPromptModalProps) {
  const [pin, setPin] = useState("");

  const handleSubmit = (): void => {
    onSubmit(pin);
    setPin("");
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
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleCancel}
              accessibilityLabel="Cancelar"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                pin.length !== PIN_LENGTH ? styles.confirmButtonDisabled : null,
              ]}
              onPress={handleSubmit}
              disabled={pin.length !== PIN_LENGTH}
              accessibilityLabel="Confirmar PIN"
            >
              <Text style={styles.confirmText}>Confirmar</Text>
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
    color: "#ef4444",
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
