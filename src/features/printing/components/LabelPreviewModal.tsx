import { type ReactElement } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  onChooseTarget?: () => void;
  isConfirming?: boolean;
  /** Ej. "Mostrador" — solo se muestra cuando hay `onConfirm`. */
  targetName?: string;
  inverted?: boolean;
  onToggleInverted?: (inverted: boolean) => void;
}

/**
 * Vista previa de `ArregloLabelView`, reutilizada tanto para "ver diseño de
 * etiqueta" con datos de ejemplo (`PrinterSettingsScreen`, sin `onConfirm`)
 * como para el paso de confirmación antes de un envío de impresión real
 * (`PrintArregloLabelButton`, con `onConfirm`). Mismo patrón visual de modal
 * que `OfflineActorPickerModal`.
 *
 * `ArregloLabelView` tiene lienzo fijo en `ARREGLO_LABEL_CANVAS_WIDTH_PX`
 * (pensado como puntos físicos de impresora, no como tamaño de pantalla), así
 * que se envuelve en un `ScrollView` horizontal para que nunca se recorte en
 * pantallas angostas, en vez de escalarla.
 */
export function LabelPreviewModal({
  visible,
  label,
  onClose,
  onConfirm,
  onChooseTarget,
  isConfirming = false,
  targetName,
  inverted = false,
  onToggleInverted,
}: LabelPreviewModalProps): ReactElement {
  const isConfirmMode = onConfirm != null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isConfirmMode ? "Confirmar impresión" : "Vista previa de etiqueta"}
          </Text>
          {isConfirmMode && targetName ? (
            <Text style={styles.subtitle}>Se enviará a: {targetName}</Text>
          ) : null}
          {isConfirmMode && onChooseTarget && (
            <TouchableOpacity
              accessibilityLabel="Cambiar impresora"
              onPress={onChooseTarget}
              disabled={isConfirming}
              style={styles.changeTarget}
            >
              <Ionicons name="print-outline" size={18} color="#1d4ed8" />
              <Text style={styles.changeTargetText}>Cambiar impresora</Text>
            </TouchableOpacity>
          )}

          {onToggleInverted ? (
            <View style={styles.invertRow}>
              <View style={styles.invertCopy}>
                <Text style={styles.invertTitle}>Probar fondo negro</Text>
                <Text style={styles.invertDescription}>
                  Invierte el diseño solo para esta impresión.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Probar fondo negro"
                value={inverted}
                onValueChange={onToggleInverted}
                disabled={isConfirming}
              />
            </View>
          ) : null}

          <ScrollView
            horizontal
            contentContainerStyle={styles.previewScrollContent}
          >
            <ArregloLabelView label={label} inverted={inverted} />
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
                style={[
                  styles.button,
                  styles.confirmButton,
                  isConfirming && styles.buttonDisabled,
                ]}
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
            <TouchableOpacity
              accessibilityLabel="Cerrar"
              style={styles.closeButton}
              onPress={onClose}
            >
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
  changeTarget: {
    alignSelf: "center",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  changeTargetText: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 14,
  },
  invertRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  invertCopy: {
    flex: 1,
    gap: 2,
  },
  invertTitle: {
    color: "#1e293b",
    fontSize: 14,
    fontWeight: "700",
  },
  invertDescription: {
    color: "#64748b",
    fontSize: 12,
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
