import { type ReactElement } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { ArregloLabelData } from "../domain/types";
import { ArregloLabelView } from "./ArregloLabelView";

interface LabelPreviewModalProps {
  visible: boolean;
  label: ArregloLabelData;
  onClose: () => void;
  /**
   * Si se omite, el modal queda en modo "solo ver" (un único botón
   * "Cerrar"). Si viene, se muestran "Confirmar impresión"/"Cancelar" y
   * `onClose` se usa para cancelar.
   */
  onConfirm?: () => void;
  isConfirming?: boolean;
  /** Ej. "Mostrador" — solo se muestra cuando hay `onConfirm`. */
  targetName?: string;
}

/**
 * Vista previa de `ArregloLabelView`, reutilizada tanto para "ver diseño de
 * etiqueta" con datos de ejemplo (`PrinterSettingsScreen`, sin `onConfirm`)
 * como para el paso de confirmación antes de un envío de impresión real
 * (`PrintArregloLabelButton`, con `onConfirm`). Mismo patrón visual de modal
 * que `OfflineActorPickerModal`.
 *
 * `ArregloLabelView` tiene ancho fijo en `ARREGLO_LABEL_WIDTH_PX` (384,
 * pensado como puntos físicos de impresora, no como tamaño de pantalla), así
 * que se envuelve en un `ScrollView` horizontal para que nunca se recorte en
 * pantallas angostas, en vez de escalarla.
 */
export function LabelPreviewModal({
  visible,
  label,
  onClose,
  onConfirm,
  isConfirming = false,
  targetName,
}: LabelPreviewModalProps): ReactElement {
  const isConfirmMode = onConfirm != null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isConfirmMode ? "Confirmar impresión" : "Vista previa de etiqueta"}
          </Text>
          {isConfirmMode && targetName ? (
            <Text style={styles.subtitle}>Se enviará a: {targetName}</Text>
          ) : null}

          <ScrollView horizontal contentContainerStyle={styles.previewScrollContent}>
            <ArregloLabelView label={label} />
          </ScrollView>

          {isConfirmMode ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                accessibilityLabel="Cancelar"
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isConfirming}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Confirmar impresión"
                style={[styles.button, styles.confirmButton, isConfirming && styles.buttonDisabled]}
                onPress={onConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Imprimir</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity accessibilityLabel="Cerrar" style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          )}
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
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12,
  },
  previewScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
  },
  cancelButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 15,
  },
  confirmButton: {
    backgroundColor: "#2563eb",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  closeButton: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
  },
});
