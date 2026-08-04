import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
import type { Schedule, ScheduleStatus } from "../domain/types";
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

const CORRECTION_STATUS_OPTIONS: ScheduleStatus[] = [
  "pendiente",
  "agendado",
  "en_proceso",
  "listo_para_entregar",
  "entregado",
];

export default function ScheduleFormScreen({ navigation, route }: Props) {
  const { scheduleId } = route.params;
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
      clientId: "",
      price: undefined,
      operarioId: undefined,
      notes: "",
      isPriority: false,
    },
  });

  const dateValue = useWatch({ control, name: "date" });

  useEffect(() => {
    setDisplaySchedule(schedule);
  }, [schedule]);

  useEffect(() => {
    if (!schedule) return;
    setHasTime(!!schedule.time);
    reset({
      date: schedule.date,
      time: schedule.time,
      clientId: schedule.clientId,
      price: schedule.price,
      operarioId: schedule.operarioId,
      notes: schedule.notes ?? "",
      isPriority: schedule.isPriority,
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
    <ScrollView contentContainerStyle={styles.container}>
      {displaySchedule ? (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            Estado: {STATUS_LABELS[displaySchedule.status]}
          </Text>
        </View>
      ) : null}

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

      <Pressable
        accessibilityLabel="Con hora específica"
        style={styles.timeToggle}
        onPress={() => {
          const next = !hasTime;
          setHasTime(next);
          if (!next) {
            setValue("time", undefined);
          }
        }}
      >
        <Text style={styles.timeToggleText}>
          {hasTime ? "☑" : "☐"} Con hora específica
        </Text>
      </Pressable>

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
            <Pressable
              accessibilityLabel="Prioritario"
              style={styles.timeToggle}
              onPress={() => onChange(!value)}
            >
              <Text style={styles.timeToggleText}>
                {value ? "☑" : "☐"} Prioritario
              </Text>
            </Pressable>
          )}
        />
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Cliente</Text>
        <Controller
          control={control}
          name="clientId"
          render={({ field: { onChange, value } }) => (
            <ClientPickerField
              value={value}
              onChange={onChange}
              errorMessage={errors.clientId?.message}
            />
          )}
        />
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
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={(text) => {
                const digitsOnly = text.replace(/[^0-9.]/g, "");
                onChange(digitsOnly === "" ? undefined : parseFloat(digitsOnly));
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

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Notas (opcional)</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Detalles del turno"
              placeholderTextColor="#94a3b8"
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
        style={[styles.saveButton, isSubmitting ? styles.buttonDisabled : null]}
        onPress={() => void onSubmit()}
        disabled={isSubmitting}
      >
        <Text style={styles.saveButtonText}>
          {isSubmitting ? "Guardando..." : "Guardar turno"}
        </Text>
      </Pressable>

      {scheduleId && displaySchedule ? (
        <View style={styles.statusActionsGroup}>
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
    gap: 14,
    backgroundColor: "#f8fafc",
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  timeToggle: {
    paddingVertical: 4,
  },
  timeToggleText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  statusActionsGroup: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 14,
  },
  statusActionButton: {
    backgroundColor: "#0f766e",
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
    color: "#b45309",
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
    borderColor: "#fbbf24",
    backgroundColor: "#fffbeb",
  },
  correctionChipText: {
    color: "#92400e",
    fontWeight: "600",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ccfbf1",
  },
  statusBadgeText: {
    color: "#115e59",
    fontWeight: "700",
    fontSize: 13,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  deleteButton: {
    borderColor: "#b91c1c",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
