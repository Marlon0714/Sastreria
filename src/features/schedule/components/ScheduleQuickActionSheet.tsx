import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "../../../shared/theme/colors";
import { formatPrice } from "../../pricing/domain/strings";
import { evaluateDeliveryGuard } from "../domain/deliveryGuard";
import { parseDigitsOnlyAmount } from "../domain/priceInput";
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
  /**
   * Puramente controlado por props (igual que el resto del componente):
   * quien lo usa (`ScheduleDayViewScreen`) ya resolvió `useOwnerOnlyVisibility()`
   * y decide si este panel puede mostrar/tocar la marca del dueño. Sin esto,
   * ni el Switch ni ningún Text/accessibilityLabel relacionado se montan.
   */
  canToggleOwnerFlag: boolean;
  isTogglingOwnerFlag: boolean;
  onToggleOwnerFlag: () => void;
  /**
   * Guarda el precio del turno sin salir del panel (tarjeta inline de
   * "Precio no registrado", ver N-125). Devuelve el turno actualizado si se
   * guardó, o `null` si falló — en ese caso la tarjeta se deja abierta y el
   * `error` que ya expone el panel informa la falla.
   */
  onSaveInlinePrice: (price: number) => Promise<Schedule | null>;
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
  canToggleOwnerFlag,
  isTogglingOwnerFlag,
  onToggleOwnerFlag,
  onSaveInlinePrice,
}: ScheduleQuickActionSheetProps) {
  // Estado UI-only de la tarjeta de precio inline — no persiste directo
  // (mismo espíritu que `isFullyPaid`/`hasTime` en `ScheduleFormScreen`),
  // solo controla qué se muestra hasta que se presiona "Guardar y entregar".
  const [isEnteringPrice, setIsEnteringPrice] = useState(false);
  const [priceText, setPriceText] = useState("");
  const [priceInputError, setPriceInputError] = useState<string | null>(null);

  if (!schedule) {
    return null;
  }

  const isPending =
    schedule.status !== "listo_para_entregar" && schedule.status !== "entregado";
  const isDelivered = schedule.status === "entregado";
  const hasOperario = Boolean(schedule.operarioId);
  const canMarkReady = isPending && hasOperario;
  const canMarkDelivered = !isDelivered && hasOperario;

  const closeInlinePriceCard = (): void => {
    setIsEnteringPrice(false);
    setPriceText("");
    setPriceInputError(null);
  };

  // Paso (b): saldo pendiente. Se evalúa tanto de entrada como después de
  // guardar un precio nuevo desde la tarjeta inline — un precio recién
  // completado (acá o desde "Ver turno completo") podría, sumado a un abono
  // previo, seguir dejando saldo (ver Decisiones de Diseño, N-107/N-125).
  // Recibe el turno a evaluar (no siempre `schedule`: tras guardar el precio
  // inline se evalúa el turno YA actualizado, no el snapshot con el que se
  // abrió el panel).
  const confirmDelivery = (target: Schedule): void => {
    const { saldoPendiente } = evaluateDeliveryGuard(target);
    if (saldoPendiente != null && saldoPendiente > 0) {
      Alert.alert(
        "Saldo pendiente",
        `Este turno tiene un saldo pendiente de ${formatPrice(
          saldoPendiente,
        )}. Si continúas, se registrará como pagado en su totalidad. ¿Marcar como entregado de todas formas?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Confirmar", onPress: onMarkDelivered },
        ],
      );
      return;
    }
    onMarkDelivered();
  };

  // Paso (a): precio no registrado (incluye price === 0). A diferencia de
  // antes, ya no se abre un Alert para este caso — Android limita
  // `Alert.alert` a 3 botones en la práctica y ya no había espacio para un
  // 4to ("Escribir precio aquí") sin sacar otro (ver Decisiones de Diseño).
  // En su lugar se abre la tarjeta inline con estado local.
  const handleMarkDeliveredPress = (): void => {
    const { missingPrice } = evaluateDeliveryGuard(schedule);

    if (missingPrice) {
      setIsEnteringPrice(true);
      return;
    }

    confirmDelivery(schedule);
  };

  const handleSaveInlinePriceAndDeliver = async (): Promise<void> => {
    const price = parseDigitsOnlyAmount(priceText);
    // Vacío o en $0 es el mismo caso que originó el aviso — no es un precio
    // válido para completar acá.
    if (price == null || price <= 0) {
      setPriceInputError("Ingresa un precio válido para continuar.");
      return;
    }
    setPriceInputError(null);

    const updated = await onSaveInlinePrice(price);
    if (updated) {
      closeInlinePriceCard();
      // No se completa la entrega en un solo paso: se encadena el mismo
      // chequeo de saldo pendiente que ya usa el resto del flujo (ver
      // Decisiones de Diseño) reutilizando confirmDelivery con el turno ya
      // actualizado.
      confirmDelivery(updated);
    }
    // Si `updated` es null (falló), la tarjeta queda abierta — el `error`
    // que ya expone el panel informa la falla.
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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

          {canToggleOwnerFlag ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>😇 Personal</Text>
              <Switch
                accessibilityLabel="Personal"
                value={!!schedule.isOwnerFlagged}
                onValueChange={onToggleOwnerFlag}
                disabled={isTogglingOwnerFlag}
                trackColor={{ false: colors.border, true: colors.warningSoft }}
                thumbColor={schedule.isOwnerFlagged ? colors.warning : "#f4f3f4"}
              />
            </View>
          ) : null}

          {!hasOperario && !isDelivered ? (
            <Text style={styles.helperText}>
              Asigna un operario para poder marcar el turno como listo o
              entregado.
            </Text>
          ) : null}

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

          {canMarkDelivered && !isEnteringPrice ? (
            <Pressable
              accessibilityLabel="Marcar entregado"
              style={[styles.actionButton, isProcessing && styles.buttonDisabled]}
              onPress={handleMarkDeliveredPress}
              disabled={isProcessing}
            >
              <Ionicons name="checkmark-done" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Marcar entregado</Text>
            </Pressable>
          ) : null}

          {isEnteringPrice ? (
            <View style={styles.inlinePriceCard}>
              <Text style={styles.fieldLabel}>Precio no registrado</Text>
              <TextInput
                accessibilityLabel="Precio para entregar"
                style={styles.priceInput}
                placeholder="Ej: 15000"
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="numeric"
                value={priceText}
                onChangeText={(text) => {
                  setPriceText(text);
                  if (priceInputError) setPriceInputError(null);
                }}
              />
              {priceInputError ? (
                <Text style={styles.errorText}>{priceInputError}</Text>
              ) : null}

              <Pressable
                accessibilityLabel="Guardar y entregar"
                style={[
                  styles.actionButton,
                  isProcessing && styles.buttonDisabled,
                ]}
                onPress={() => void handleSaveInlinePriceAndDeliver()}
                disabled={isProcessing}
              >
                <Text style={styles.actionButtonText}>Guardar y entregar</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Entregar sin precio"
                style={styles.secondaryButton}
                onPress={() => confirmDelivery(schedule)}
              >
                <Text style={styles.secondaryButtonText}>
                  Entregar sin precio
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Completar en el turno completo"
                style={styles.secondaryButton}
                onPress={onViewDetail}
              >
                <Text style={styles.secondaryButtonText}>
                  Completar en el turno completo
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Cancelar"
                style={styles.cancelButton}
                onPress={closeInlinePriceCard}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          ) : null}

          {!isEnteringPrice ? (
            <Pressable
              accessibilityLabel="Ver turno completo"
              style={styles.secondaryButton}
              onPress={onViewDetail}
            >
              <Text style={styles.secondaryButtonText}>Ver turno completo</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel="Cerrar"
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cerrar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  helperText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
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
  inlinePriceCard: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
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
