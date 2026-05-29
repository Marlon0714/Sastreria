import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClientsStackParamList } from "../../../navigation/types";
import { ErrorView, LoadingView } from "../../../shared/components";
import SacoMeasurementGrid from "../components/SacoMeasurementGrid";
import {
  SACO_FORM_DEFAULTS,
  type SacoFormValues,
} from "../components/SacoMeasurementForm";
import { useSacoMeasurement } from "../hooks/useSacoMeasurement";
import { useUpsertSaco } from "../hooks/useUpsertSaco";

type Props = NativeStackScreenProps<
  ClientsStackParamList,
  "SacoMeasurementCreate"
>;

function toFormValues(
  measurement: Record<string, unknown> | null,
): SacoFormValues {
  if (!measurement) return SACO_FORM_DEFAULTS;
  return {
    espalda: measurement.espalda != null ? String(measurement.espalda) : "",
    hombro: measurement.hombro != null ? String(measurement.hombro) : "",
    talleDelantero:
      measurement.talleDelantero != null
        ? String(measurement.talleDelantero)
        : "",
    talleTrasero:
      measurement.talleTrasero != null ? String(measurement.talleTrasero) : "",
    distancia:
      measurement.distancia != null ? String(measurement.distancia) : "",
    separacion:
      measurement.separacion != null ? String(measurement.separacion) : "",
    pecho: measurement.pecho != null ? String(measurement.pecho) : "",
    cintura: measurement.cintura != null ? String(measurement.cintura) : "",
    base: measurement.base != null ? String(measurement.base) : "",
    largo: measurement.largo != null ? String(measurement.largo) : "",
    largoManga:
      measurement.largoManga != null ? String(measurement.largoManga) : "",
    anchoManga:
      measurement.anchoManga != null ? String(measurement.anchoManga) : "",
    escote: measurement.escote != null ? String(measurement.escote) : "",
    cuello: measurement.cuello != null ? String(measurement.cuello) : "",
    brazo: measurement.brazo != null ? String(measurement.brazo) : "",
    puno: measurement.puno != null ? String(measurement.puno) : "",
    notes: typeof measurement.notes === "string" ? measurement.notes : "",
  };
}

export default function SacoMeasurementDetailScreen({
  navigation,
  route,
}: Props) {
  const { clientId, mode } = route.params;
  const isFirstEntry = mode === "create";

  const { measurement, isLoading, error, reload } =
    useSacoMeasurement(clientId);
  const { upsertSaco, isSubmitting, error: saveError } = useUpsertSaco();

  const [isEditing, setIsEditing] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SacoFormValues>({ defaultValues: SACO_FORM_DEFAULTS });

  useEffect(() => {
    if (!isLoading) {
      if (measurement) {
        reset(toFormValues(measurement as unknown as Record<string, unknown>));
        setIsEditing(false);
      } else {
        reset(SACO_FORM_DEFAULTS);
        setIsEditing(true);
      }
    }
  }, [isLoading, measurement, reset]);

  const onSubmit = useCallback(
    async (values: SacoFormValues) => {
      const result = await upsertSaco({ ...values, clientId });
      if (result) {
        await reload();
        setSavedOnce(true);
        setIsEditing(false);
        reset(toFormValues(result as unknown as Record<string, unknown>));
      }
    },
    [clientId, reload, reset, upsertSaco],
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

      <SacoMeasurementGrid
        control={control}
        errors={errors}
        disabled={!isEditing}
      />

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <Pressable
              accessibilityLabel="Guardar medidas de saco"
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
                accessibilityLabel="Cancelar edición de saco"
                style={[styles.secondaryButton, styles.flex]}
                onPress={cancelEdit}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable
            accessibilityLabel="Editar medidas de saco"
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
          onPress={() => navigation.popTo("ClientDetail", { clientId })}
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
  skipButton: { paddingVertical: 12, alignItems: "center" },
  skipButtonText: {
    color: "#64748b",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
