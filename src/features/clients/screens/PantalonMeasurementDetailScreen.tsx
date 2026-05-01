import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import PantalonMeasurementForm, {
  PANTALON_FORM_DEFAULTS,
  type PantalonFormValues,
} from "../components/PantalonMeasurementForm";
import { usePantalonMeasurement } from "../hooks/usePantalonMeasurement";
import { useUpsertPantalon } from "../hooks/useUpsertPantalon";

type Props = NativeStackScreenProps<ClientsStackParamList, "PantalonMeasurementDetail">;

function toFormValues(measurement: Record<string, unknown> | null): PantalonFormValues {
  if (!measurement) return PANTALON_FORM_DEFAULTS;
  return {
    largo: measurement.largo != null ? String(measurement.largo) : "",
    cintura: measurement.cintura != null ? String(measurement.cintura) : "",
    base: measurement.base != null ? String(measurement.base) : "",
    tiro: measurement.tiro != null ? String(measurement.tiro) : "",
    pierna: measurement.pierna != null ? String(measurement.pierna) : "",
    rodilla: measurement.rodilla != null ? String(measurement.rodilla) : "",
    bota: measurement.bota != null ? String(measurement.bota) : "",
    notes: typeof measurement.notes === "string" ? measurement.notes : "",
  };
}

export default function PantalonMeasurementDetailScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const { measurement, isLoading, error, reload } = usePantalonMeasurement(clientId);
  const { upsertPantalon, isSubmitting, error: saveError } = useUpsertPantalon();
  const [isEditing, setIsEditing] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<PantalonFormValues>({
    defaultValues: PANTALON_FORM_DEFAULTS,
  });

  const startEdit = useCallback(() => {
    reset(toFormValues(measurement as Record<string, unknown> | null));
    setIsEditing(true);
  }, [measurement, reset]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    reset(PANTALON_FORM_DEFAULTS);
  }, [reset]);

  const onSubmit = useCallback(
    async (values: PantalonFormValues) => {
      const result = await upsertPantalon({ ...values, clientId });
      if (result) {
        await reload();
        setIsEditing(false);
      }
    },
    [clientId, reload, upsertPantalon],
  );

  if (isLoading) return <LoadingView message="Cargando medidas..." />;

  if (error) return <ErrorView message={error} onRetry={() => void reload()} />;

  if (!measurement && !isEditing) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay medidas de pantalón registradas.</Text>
        <Pressable
          accessibilityLabel="Agregar medidas de pantalón"
          style={styles.primaryButton}
          onPress={() => navigation.replace("PantalonMeasurementCreate", { clientId })}
        >
          <Text style={styles.primaryButtonText}>Agregar medidas</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {saveError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{saveError}</Text>
        </View>
      ) : null}

      <PantalonMeasurementForm
        control={control}
        errors={errors}
        disabled={!isEditing}
      />

      {isEditing ? (
        <View style={styles.row}>
          <Pressable
            accessibilityLabel="Guardar cambios de pantalón"
            style={[styles.primaryButton, styles.flex]}
            onPress={() => void handleSubmit(onSubmit)()}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Cancelar edición de pantalón"
            style={[styles.secondaryButton, styles.flex]}
            onPress={cancelEdit}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Editar medidas de pantalón"
          style={styles.primaryButton}
          onPress={startEdit}
        >
          <Text style={styles.primaryButtonText}>Editar</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: "#f8fafc" },
  emptyContainer: {
    flex: 1,
    padding: 16,
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  emptyText: { fontSize: 15, color: "#64748b", textAlign: "center" },
  errorBanner: { backgroundColor: "#fee2e2", borderRadius: 8, padding: 12 },
  errorBannerText: { color: "#991b1b", fontSize: 14 },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { color: "#334155", fontWeight: "600", fontSize: 16 },
});
