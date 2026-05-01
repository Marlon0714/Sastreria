import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
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

function toFormValues(
  measurement: Record<string, unknown> | null,
): PantalonFormValues {
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

export default function PantalonMeasurementDetailScreen({
  navigation,
  route,
}: Props) {
  const { clientId, mode } = route.params;
  const isFirstEntry = mode === "create";

  const { measurement, isLoading, error, reload } =
    usePantalonMeasurement(clientId);
  const { upsertPantalon, isSubmitting, error: saveError } = useUpsertPantalon();

  const [isEditing, setIsEditing] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } =
    useForm<PantalonFormValues>({ defaultValues: PANTALON_FORM_DEFAULTS });

  useEffect(() => {
    if (!isLoading) {
      if (measurement) {
        reset(toFormValues(measurement as unknown as Record<string, unknown>));
        setIsEditing(false);
      } else {
        reset(PANTALON_FORM_DEFAULTS);
        setIsEditing(true);
      }
    }
  }, [isLoading, measurement, reset]);

  const onSubmit = useCallback(
    async (values: PantalonFormValues) => {
      const result = await upsertPantalon({ ...values, clientId });
      if (result) {
        await reload();
        setSavedOnce(true);
        setIsEditing(false);
        reset(toFormValues(result as unknown as Record<string, unknown>));
      }
    },
    [clientId, reload, reset, upsertPantalon],
  );

  const startEdit = useCallback(() => {
    reset(toFormValues(measurement as Record<string, unknown> | null));
    setIsEditing(true);
  }, [measurement, reset]);

  const cancelEdit = useCallback(() => {
    reset(toFormValues(measurement as Record<string, unknown> | null));
    setIsEditing(false);
  }, [measurement, reset]);

  if (isLoading) return <LoadingView message="Cargando medidas..." />;

  if (error) return <ErrorView message={error} onRetry={() => void reload()} />;

  const showSkip = isFirstEntry && !measurement && !savedOnce;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
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

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <Pressable
              accessibilityLabel="Guardar medidas de pantalón"
              style={[styles.primaryButton, styles.flex]}
              onPress={() => void handleSubmit(onSubmit)()}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Text>
            </Pressable>
            {measurement ? (
              <Pressable
                accessibilityLabel="Cancelar edición de pantalón"
                style={[styles.secondaryButton, styles.flex]}
                onPress={cancelEdit}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable
            accessibilityLabel="Editar medidas de pantalón"
            style={styles.primaryButton}
            onPress={startEdit}
          >
            <Text style={styles.primaryButtonText}>Editar</Text>
          </Pressable>
        )}
      </View>

      {showSkip ? (
        <Pressable
          accessibilityLabel="Continuar sin medidas"
          style={styles.skipButton}
          onPress={() => navigation.navigate("ClientDetail", { clientId })}
        >
          <Text style={styles.skipButtonText}>Continuar sin medidas</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: "#f8fafc" },
  errorBanner: { backgroundColor: "#fee2e2", borderRadius: 8, padding: 12 },
  errorBannerText: { color: "#991b1b", fontSize: 14 },
  actions: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    flex: 1,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#334155", fontWeight: "600", fontSize: 16 },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#64748b",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
