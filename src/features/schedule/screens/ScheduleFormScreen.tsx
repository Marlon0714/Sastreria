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
  type CreateScheduleSchemaOutput,
} from "../domain/schemas";
import type { ScheduleStatus } from "../domain/types";
import { useDeleteSchedule } from "../hooks/useDeleteSchedule";
import { useScheduleForm } from "../hooks/useScheduleForm";

type Props = NativeStackScreenProps<ScheduleStackParamList, "ScheduleForm">;

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pendiente: "Pendiente",
  agendado: "Agendado",
  en_proceso: "En proceso",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
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
  } = useForm<CreateScheduleSchemaInput, unknown, CreateScheduleSchemaOutput>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      date: "",
      time: "",
      clientId: "",
      price: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (!schedule) return;
    reset({
      date: schedule.date ?? "",
      time: schedule.time ?? "",
      clientId: schedule.clientId,
      price: schedule.price,
      notes: schedule.notes ?? "",
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
      {schedule ? (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            Estado: {STATUS_LABELS[schedule.status]}
          </Text>
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Fecha (opcional)</Text>
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
        <Text style={styles.label}>Hora (opcional)</Text>
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
        <Text style={styles.label}>Precio (opcional)</Text>
        <Controller
          control={control}
          name="price"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              placeholder="Ej: 15000"
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
