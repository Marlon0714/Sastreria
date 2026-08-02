import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { LoadingView } from "../../../shared/components";
import { ClientPickerField } from "../components/ClientPickerField";
import {
  createScheduleSchema,
  type CreateScheduleSchemaInput,
} from "../domain/schemas";
import type { ScheduleStatus } from "../domain/types";
import { useDeleteSchedule } from "../hooks/useDeleteSchedule";
import { useScheduleForm } from "../hooks/useScheduleForm";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleForm">;

const STATUS_OPTIONS: ScheduleStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export default function ScheduleFormScreen({ navigation, route }: Props) {
  const { scheduleId } = route.params;
  const { schedule, isLoading, isSubmitting, error, submit } =
    useScheduleForm(scheduleId);
  const { deleteSchedule, isDeleting } = useDeleteSchedule();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateScheduleSchemaInput>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      date: "",
      time: "",
      clientId: "",
      notes: "",
      status: "pending",
    },
  });

  useEffect(() => {
    if (!schedule) return;
    reset({
      date: schedule.date,
      time: schedule.time,
      clientId: schedule.clientId,
      notes: schedule.notes ?? "",
      status: schedule.status,
    });
  }, [schedule, reset]);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Fecha</Text>
        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.date && styles.inputError]}
              placeholder="AAAA-MM-DD"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.date ? (
          <Text style={styles.errorText}>{errors.date.message}</Text>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Hora</Text>
        <Controller
          control={control}
          name="time"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.time && styles.inputError]}
              placeholder="HH:MM"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.time ? (
          <Text style={styles.errorText}>{errors.time.message}</Text>
        ) : null}
      </View>

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
        <Text style={styles.label}>Estado</Text>
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((status) => {
                const isActive = value === status;
                return (
                  <Pressable
                    key={status}
                    accessibilityLabel={`Estado ${STATUS_LABELS[status]}`}
                    style={[
                      styles.statusChip,
                      isActive ? styles.statusChipActive : null,
                    ]}
                    onPress={() => onChange(status)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isActive ? styles.statusChipTextActive : null,
                      ]}
                    >
                      {STATUS_LABELS[status]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
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
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  statusChipActive: {
    borderColor: "#0f766e",
    backgroundColor: "#ccfbf1",
  },
  statusChipText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  statusChipTextActive: {
    color: "#115e59",
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
