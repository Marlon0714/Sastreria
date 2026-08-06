import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../shared/theme/colors";
import type { Schedule, ScheduleStatus } from "../domain/types";
import { OperarioPickerField } from "./OperarioPickerField";

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

interface ScheduleQuickActionSheetProps {
  visible: boolean;
  schedule: Schedule | null;
  clientLabel: string;
  isProcessing: boolean;
  error: string | null;
  onMarkReady: () => void;
  onMarkDelivered: () => void;
  onAssignOperario: (operarioId: string | undefined) => void;
  onViewDetail: () => void;
  onClose: () => void;
}

/**
 * Panel rápido para marcar el siguiente paso de un turno sin salir de la
 * Agenda — se abre al tocar la tarjeta en vez de navegar directo al
 * formulario completo. Muestra las MISMAS acciones y textos que la pantalla
 * de detalle (`ScheduleFormScreen`) para que un operario reconozca el botón
 * sea cual sea el camino por el que llegó.
 */
export function ScheduleQuickActionSheet({
  visible,
  schedule,
  clientLabel,
  isProcessing,
  error,
  onMarkReady,
  onMarkDelivered,
  onAssignOperario,
  onViewDetail,
  onClose,
}: ScheduleQuickActionSheetProps) {
  if (!schedule) {
    return null;
  }

  const canMarkReady =
    schedule.status !== "listo_para_entregar" && schedule.status !== "entregado";
  const canMarkDelivered = schedule.status !== "entregado";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Cerrar panel de turno"
        style={styles.backdrop}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.clientName} numberOfLines={1}>
          {clientLabel}
        </Text>
        <Text style={styles.currentStatus}>
          Estado actual: {STATUS_LABELS[schedule.status]}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Operario asignado</Text>
          <OperarioPickerField
            value={schedule.operarioId}
            onChange={onAssignOperario}
          />
        </View>

        {canMarkReady ? (
          <Pressable
            accessibilityLabel="Marcar listo para entregar"
            style={[styles.actionButton, isProcessing && styles.buttonDisabled]}
            onPress={onMarkReady}
            disabled={isProcessing}
          >
            <Ionicons name="bag-check-outline" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>
              Marcar listo para entregar
            </Text>
          </Pressable>
        ) : null}

        {canMarkDelivered ? (
          <Pressable
            accessibilityLabel="Marcar entregado"
            style={[styles.actionButton, isProcessing && styles.buttonDisabled]}
            onPress={onMarkDelivered}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark-done" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Marcar entregado</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityLabel="Ver turno completo"
          style={styles.secondaryButton}
          onPress={onViewDetail}
        >
          <Text style={styles.secondaryButtonText}>Ver turno completo</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Cerrar"
          style={styles.cancelButton}
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>Cerrar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.borderStrong,
    marginBottom: 6,
  },
  clientName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  currentStatus: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 15,
  },
});
