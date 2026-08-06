import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ScheduleStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import { OfflineActorPickerModal } from "../../auth/components/OfflineActorPickerModal";
import { PinPromptModal } from "../../auth/components/PinPromptModal";
import { useIdentityGate } from "../../auth/hooks/useIdentityGate";
import { ClientPickerField } from "../components/ClientPickerField";
import { OperarioPickerField } from "../components/OperarioPickerField";
import { ScheduleDateTimePickerField } from "../components/ScheduleDateTimePickerField";
import { ScheduleHistoryList } from "../components/ScheduleHistoryList";
import {
  createScheduleSchema,
  type CreateScheduleSchemaInput,
  type CreateScheduleSchemaOutput,
} from "../domain/schemas";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_CATEGORY_LABELS,
  type Schedule,
  type ScheduleCategory,
  type ScheduleStatus,
} from "../domain/types";
import { colors } from "../../../shared/theme/colors";
import { useDeleteSchedule } from "../hooks/useDeleteSchedule";
import { useScheduleForm } from "../hooks/useScheduleForm";
import { useScheduleStatusActions } from "../hooks/useScheduleStatusActions";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleForm">;

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

// Mismos emojis que usa Precios para arreglo/confección.
const CATEGORY_ICONS: Record<ScheduleCategory, string> = {
  arreglo: "✂️",
  confeccion: "🧵",
};

const CORRECTION_STATUS_OPTIONS: ScheduleStatus[] = [
  "pendiente",
  "agendado",
  "en_proceso",
  "listo_para_entregar",
  "entregado",
];

export default function ScheduleFormScreen({ navigation, route }: Props) {
  const { scheduleId, category: categoryParam } = route.params;
  const identityGate = useIdentityGate();
  const { schedule, isLoading, isSubmitting, error, submit } = useScheduleForm(
    scheduleId,
    identityGate,
  );
  const { deleteSchedule, isDeleting } = useDeleteSchedule(identityGate);
  const statusActions = useScheduleStatusActions(scheduleId ?? "", identityGate);
  const [displaySchedule, setDisplaySchedule] = useState<Schedule | null>(
    null,
  );
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [clientMode, setClientMode] = useState<"registrado" | "sinRegistrar">(
    "registrado",
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateScheduleSchemaInput, unknown, CreateScheduleSchemaOutput>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      date: undefined,
      time: undefined,
      clientId: undefined,
      unregisteredClientName: "",
      price: undefined,
      operarioId: undefined,
      notes: "",
      isPriority: false,
      category: categoryParam ?? "arreglo",
    },
  });

  const dateValue = useWatch({ control, name: "date" });

  useEffect(() => {
    setDisplaySchedule(schedule);
  }, [schedule]);

  useEffect(() => {
    if (!schedule) return;
    setHasTime(!!schedule.time);
    setClientMode(schedule.unregisteredClientName ? "sinRegistrar" : "registrado");
    reset({
      date: schedule.date,
      time: schedule.time,
      clientId: schedule.clientId,
      unregisteredClientName: schedule.unregisteredClientName ?? "",
      price: schedule.price,
      operarioId: schedule.operarioId,
      notes: schedule.notes ?? "",
      isPriority: schedule.isPriority,
      category: schedule.category,
    });
  }, [schedule, reset]);

  // "Prioritario" solo tiene sentido para turnos ya agendados (con fecha) —
  // si se le quita la fecha, deja de aplicar.
  useEffect(() => {
    if (!dateValue) {
      setValue("isPriority", false);
    }
  }, [dateValue, setValue]);

  const handleMarkReady = async (): Promise<void> => {
    const updated = await statusActions.markReady();
    if (updated) {
      setDisplaySchedule(updated);
      setHistoryRefreshToken((token) => token + 1);
    }
  };

  const handleMarkDelivered = async (): Promise<void> => {
    const updated = await statusActions.markDelivered();
    if (updated) {
      setDisplaySchedule(updated);
      setHistoryRefreshToken((token) => token + 1);
    }
  };

  const handleApplyCorrection = (newStatus: ScheduleStatus): void => {
    Alert.alert(
      "Confirmar corrección manual",
      `¿Cambiar el estado a "${STATUS_LABELS[newStatus]}"? Esta acción queda registrada como corrección manual, no como transición automática.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            const updated = await statusActions.applyCorrection(newStatus);
            if (updated) {
              setDisplaySchedule(updated);
              setHistoryRefreshToken((token) => token + 1);
            }
            setIsCorrectionOpen(false);
          },
        },
      ],
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await submit(values);
    if (result) {
      navigation.goBack();
    }
  });

  const onDelete = () => {
    if (!scheduleId) return;
    Alert.alert(
      "Eliminar turno",
      "¿Seguro que deseas eliminar este turno? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteSchedule(scheduleId);
            if (ok) navigation.goBack();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <LoadingView message="Cargando turno..." />;
  }

  if (scheduleId && !schedule) {
    return (
      <ErrorView
        message="Este turno ya no existe o no se pudo cargar."
        retryLabel="Volver"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {displaySchedule ? (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            Estado: {STATUS_LABELS[displaySchedule.status]}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Categoría</Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View style={styles.categoryRow}>
              {SCHEDULE_CATEGORIES.map((category) => {
                const isActive = value === category;
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                    ]}
                    onPress={() => onChange(category)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isActive && styles.categoryChipTextActive,
                      ]}
                    >
                      {CATEGORY_ICONS[category]}{" "}
                      {SCHEDULE_CATEGORY_LABELS[category]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cuándo</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Fecha (opcional)</Text>
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <ScheduleDateTimePickerField
                mode="date"
                value={value}
                onChange={onChange}
                placeholder="Sin fecha"
                accessibilityLabel="Fecha"
                errorMessage={errors.date?.message}
              />
            )}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Con hora específica</Text>
          <Switch
            accessibilityLabel="Con hora específica"
            value={hasTime}
            onValueChange={(next) => {
              setHasTime(next);
              if (!next) {
                setValue("time", undefined);
              }
            }}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={hasTime ? colors.primary : "#f4f3f4"}
          />
        </View>

        {hasTime ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Hora</Text>
            <Controller
              control={control}
              name="time"
              render={({ field: { onChange, value } }) => (
                <ScheduleDateTimePickerField
                  mode="time"
                  value={value}
                  onChange={onChange}
                  placeholder="Sin hora"
                  accessibilityLabel="Hora"
                  allowClear={false}
                  errorMessage={errors.time?.message}
                />
              )}
            />
          </View>
        ) : null}

        {dateValue ? (
          <Controller
            control={control}
            name="isPriority"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>⭐ Prioritario</Text>
                <Switch
                  accessibilityLabel="Prioritario"
                  value={!!value}
                  onValueChange={onChange}
                  trackColor={{
                    false: colors.border,
                    true: colors.dangerSoft,
                  }}
                  thumbColor={value ? colors.danger : "#f4f3f4"}
                />
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalles</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Cliente</Text>
          <View style={styles.clientModeToggle}>
            <Pressable
              accessibilityLabel="Cliente registrado"
              accessibilityRole="tab"
              accessibilityState={{ selected: clientMode === "registrado" }}
              style={[
                styles.clientModeButton,
                clientMode === "registrado" && styles.clientModeButtonActive,
              ]}
              onPress={() => {
                setClientMode("registrado");
                setValue("unregisteredClientName", "");
              }}
            >
              <Text
                style={[
                  styles.clientModeButtonText,
                  clientMode === "registrado" &&
                    styles.clientModeButtonTextActive,
                ]}
              >
                Cliente registrado
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Sin registrar"
              accessibilityRole="tab"
              accessibilityState={{ selected: clientMode === "sinRegistrar" }}
              style={[
                styles.clientModeButton,
                clientMode === "sinRegistrar" && styles.clientModeButtonActive,
              ]}
              onPress={() => {
                setClientMode("sinRegistrar");
                setValue("clientId", undefined);
              }}
            >
              <Text
                style={[
                  styles.clientModeButtonText,
                  clientMode === "sinRegistrar" &&
                    styles.clientModeButtonTextActive,
                ]}
              >
                Sin registrar
              </Text>
            </Pressable>
          </View>

          {clientMode === "registrado" ? (
            <Controller
              control={control}
              name="clientId"
              render={({ field: { onChange, value } }) => (
                <ClientPickerField
                  value={value ?? ""}
                  onChange={onChange}
                  errorMessage={errors.clientId?.message}
                />
              )}
            />
          ) : (
            <>
              <Controller
                control={control}
                name="unregisteredClientName"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    accessibilityLabel="Nombre del cliente"
                    style={[
                      styles.input,
                      errors.clientId && styles.inputError,
                    ]}
                    placeholder="Nombre de quien agenda"
                    placeholderTextColor={colors.textPlaceholder}
                    value={value ?? ""}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.clientId ? (
                <Text style={styles.errorText}>
                  {errors.clientId.message}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Precio (opcional)</Text>
          <Controller
            control={control}
            name="price"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                placeholder="Ej: 15000"
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={(text) => {
                  const digitsOnly = text.replace(/[^0-9.]/g, "");
                  onChange(
                    digitsOnly === "" ? undefined : parseFloat(digitsOnly),
                  );
                }}
                value={value === undefined ? "" : String(value)}
              />
            )}
          />
          {errors.price ? (
            <Text style={styles.errorText}>{errors.price.message}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Operario asignado (opcional)</Text>
          <Controller
            control={control}
            name="operarioId"
            render={({ field: { onChange, value } }) => (
              <OperarioPickerField
                value={value}
                onChange={onChange}
                errorMessage={errors.operarioId?.message}
              />
            )}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notas</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Detalles del turno"
              placeholderTextColor={colors.textPlaceholder}
              value={value}
              onChangeText={onChange}
              multiline
            />
          )}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        accessibilityLabel="Guardar turno"
        style={({ pressed }) => [
          styles.saveButton,
          isSubmitting ? styles.buttonDisabled : null,
          pressed && !isSubmitting ? styles.saveButtonPressed : null,
        ]}
        onPress={() => void onSubmit()}
        disabled={isSubmitting}
      >
        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
        <Text style={styles.saveButtonText}>
          {isSubmitting ? "Guardando..." : "Guardar turno"}
        </Text>
      </Pressable>

      {scheduleId && displaySchedule ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Estado del turno</Text>

          {statusActions.error ? (
            <Text style={styles.errorText}>{statusActions.error}</Text>
          ) : null}

          {displaySchedule.status !== "listo_para_entregar" &&
          displaySchedule.status !== "entregado" ? (
            <Pressable
              accessibilityLabel="Marcar listo para entregar"
              style={[
                styles.statusActionButton,
                statusActions.isProcessing ? styles.buttonDisabled : null,
              ]}
              onPress={() => void handleMarkReady()}
              disabled={statusActions.isProcessing}
            >
              <Ionicons name="bag-check-outline" size={18} color="#ffffff" />
              <Text style={styles.statusActionButtonText}>
                Marcar listo para entregar
              </Text>
            </Pressable>
          ) : null}

          {displaySchedule.status !== "entregado" ? (
            <Pressable
              accessibilityLabel="Marcar entregado"
              style={[
                styles.statusActionButton,
                statusActions.isProcessing ? styles.buttonDisabled : null,
              ]}
              onPress={() => void handleMarkDelivered()}
              disabled={statusActions.isProcessing}
            >
              <Ionicons name="checkmark-done" size={18} color="#ffffff" />
              <Text style={styles.statusActionButtonText}>
                Marcar entregado
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel="Corrección manual de estado"
            style={styles.correctionToggle}
            onPress={() => setIsCorrectionOpen((open) => !open)}
          >
            <Text style={styles.correctionToggleText}>
              {isCorrectionOpen ? "Cancelar corrección" : "Corrección manual"}
            </Text>
          </Pressable>

          {isCorrectionOpen ? (
            <View style={styles.correctionRow}>
              {CORRECTION_STATUS_OPTIONS.filter(
                (status) => status !== displaySchedule.status,
              ).map((status) => (
                <Pressable
                  key={status}
                  accessibilityLabel={`Corregir a ${STATUS_LABELS[status]}`}
                  style={styles.correctionChip}
                  onPress={() => handleApplyCorrection(status)}
                  disabled={statusActions.isProcessing}
                >
                  <Text style={styles.correctionChipText}>
                    {STATUS_LABELS[status]}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {scheduleId ? (
        <Pressable
          accessibilityLabel="Eliminar turno"
          style={[styles.deleteButton, isDeleting ? styles.buttonDisabled : null]}
          onPress={onDelete}
          disabled={isDeleting}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteButtonText}>
            {isDeleting ? "Eliminando..." : "Eliminar turno"}
          </Text>
        </Pressable>
      ) : null}

      {scheduleId ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionTitle}>Historial</Text>
          <ScheduleHistoryList
            scheduleId={scheduleId}
            refreshToken={historyRefreshToken}
          />
        </View>
      ) : null}

      <PinPromptModal
        visible={identityGate.isPinPromptVisible}
        error={identityGate.pinError}
        onSubmit={(pin) => void identityGate.submitPin(pin)}
        onCancel={identityGate.cancelPinPrompt}
      />
      <OfflineActorPickerModal
        visible={identityGate.isOfflineActorPickerVisible}
        operarios={identityGate.offlineOperarios}
        isLoading={identityGate.isLoadingOfflineOperarios}
        onSelect={identityGate.submitOfflineActor}
        onCancel={identityGate.cancelOfflineActorPicker}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    backgroundColor: colors.background,
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
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
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
  categoryRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  statusActionButton: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  statusActionButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  correctionToggle: {
    alignItems: "center",
    paddingVertical: 8,
  },
  correctionToggleText: {
    color: colors.warning,
    fontWeight: "600",
    fontSize: 13,
  },
  correctionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  correctionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  correctionChipText: {
    color: colors.warning,
    fontWeight: "600",
    fontSize: 13,
  },
  clientModeToggle: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: 10,
    padding: 3,
    gap: 2,
    marginBottom: 8,
  },
  clientModeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  clientModeButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  clientModeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  clientModeButtonTextActive: {
    color: colors.primary,
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
  inputError: {
    borderColor: colors.danger,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  statusBadgeText: {
    color: colors.primaryPressed,
    fontWeight: "700",
    fontSize: 13,
  },
  saveButton: {
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
  saveButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderColor: colors.danger,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
